import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import {
  buildManifest,
  deployStatic,
  MANIFEST_KEY,
  PENDING_KEY,
  planDeployment,
} from './deploy-static-core.mjs';

const BUCKET = 'test-static';
const clone = (value) => structuredClone(value);
const deferred = () => {
  let resolve;
  const promise = new Promise((done) => (resolve = done));
  return { promise, resolve };
};

class MemoryStore {
  json = new Map();
  files = new Map();
  events = [];
  before = async () => {};
  after = async () => {};

  async operation(type, key, action) {
    const event = { type, key };
    this.events.push(event);
    await this.before(event);
    const result = await action();
    await this.after(event);
    return result;
  }

  async readJson(key) {
    return this.operation('read', key, () => clone(this.json.get(key) ?? null));
  }

  async listKeys() {
    return this.operation('list', null, () => [...this.files.keys(), ...this.json.keys()]);
  }

  async writeJson(key, value) {
    return this.operation('write', key, () => this.json.set(key, clone(value)));
  }

  async uploadFile(key, localPath, metadata) {
    return this.operation('upload', key, async () => {
      this.files.set(key, { bytes: await readFile(localPath), metadata: clone(metadata) });
    });
  }

  async deleteKeys(keys) {
    return this.operation('delete', [...keys], () => {
      for (const key of keys) this.files.delete(key);
    });
  }

  async deleteControl(key) {
    return this.operation('control-delete', key, () => this.json.delete(key));
  }
}

async function fixture(t, files = { 'index.html': '<h1>old</h1>', 'old.js': 'old' }) {
  const distDir = await mkdtemp(path.join(os.tmpdir(), 'static-deploy-test-'));
  t.after(() => rm(distDir, { recursive: true, force: true }));
  const store = new MemoryStore();
  async function setFiles(next) {
    await rm(distDir, { recursive: true, force: true });
    await mkdir(distDir, { recursive: true });
    for (const [key, bytes] of Object.entries(next)) {
      const target = path.join(distDir, key);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, bytes);
    }
  }
  await setFiles(files);
  const deploy = (options = {}) =>
    deployStatic({ distDir, bucket: BUCKET, store, concurrency: 1, ...options });
  async function seed() {
    await deploy();
    store.events = [];
  }
  async function assertRemoteMatches() {
    const current = await buildManifest(distDir, BUCKET);
    assert.deepEqual([...store.files.keys()].sort(), Object.keys(current.files).sort());
    for (const [key, metadata] of Object.entries(current.files)) {
      assert.deepEqual(store.files.get(key).bytes, await readFile(path.join(distDir, key)), key);
      assert.deepEqual(store.files.get(key).metadata, metadata, key);
    }
    assert.deepEqual(store.json.get(MANIFEST_KEY), current);
    assert.equal(store.json.has(PENDING_KEY), false);
  }
  return { distDir, store, setFiles, deploy, seed, assertRemoteMatches };
}

const mutations = (store) => store.events.filter((event) => !['read', 'list'].includes(event.type));

test('bootstrap uploads all files, removes stale objects, and protects control objects', async (t) => {
  const f = await fixture(t);
  f.store.files.set('stale/index.html', { bytes: Buffer.from('stale') });
  f.store.json.set('_deploy/operator.json', { protected: true });
  const result = await f.deploy();
  assert.deepEqual(result, {
    uploaded: 2,
    deleted: 1,
    skipped: 0,
    totalFiles: 2,
    uploadBytes: 15,
    bootstrap: true,
    recovering: false,
    dryRun: false,
  });
  assert.deepEqual(f.store.json.get('_deploy/operator.json'), { protected: true });
  await f.assertRemoteMatches();
});

test('unchanged output performs no content or control writes and does not list S3', async (t) => {
  const f = await fixture(t);
  await f.seed();
  const result = await f.deploy();
  assert.equal(result.uploaded, 0);
  assert.equal(result.deleted, 0);
  assert.equal(result.skipped, 2);
  assert.deepEqual(mutations(f.store), []);
  assert.equal(
    f.store.events.some((event) => event.type === 'list'),
    false,
  );
  await f.assertRemoteMatches();
});

test('same-size content modification uploads only the modified page', async (t) => {
  const f = await fixture(t);
  await f.seed();
  await f.setFiles({ 'index.html': '<h1>new</h1>', 'old.js': 'old' });
  const result = await f.deploy();
  assert.equal(result.uploaded, 1);
  assert.deepEqual(
    f.store.events.filter((e) => e.type === 'upload').map((e) => e.key),
    ['index.html'],
  );
  await f.assertRemoteMatches();
});

test('publication uploads the new page while retaining unchanged pages', async (t) => {
  const f = await fixture(t);
  await f.seed();
  await f.setFiles({
    'index.html': '<h1>old</h1>',
    'old.js': 'old',
    'post/new/index.html': 'new post',
  });
  const result = await f.deploy();
  assert.equal(result.uploaded, 1);
  assert.equal(result.skipped, 2);
  assert.equal(result.deleted, 0);
  await f.assertRemoteMatches();
});

test('deletion removes an obsolete page without uploading unchanged files', async (t) => {
  const f = await fixture(t, { 'index.html': 'home', 'post/old/index.html': 'old post' });
  await f.seed();
  await f.setFiles({ 'index.html': 'home' });
  const result = await f.deploy();
  assert.equal(result.uploaded, 0);
  assert.equal(result.deleted, 1);
  await f.assertRemoteMatches();
});

for (const [field, oldValue] of [
  ['contentType', 'text/plain'],
  ['cacheControl', 'max-age=60'],
]) {
  test(`${field}-only changes replace the S3 object even when bytes match`, async (t) => {
    const f = await fixture(t);
    await f.seed();
    f.store.json.get(MANIFEST_KEY).files['index.html'][field] = oldValue;
    f.store.files.get('index.html').metadata[field] = oldValue;
    const result = await f.deploy();
    assert.equal(result.uploaded, 1);
    await f.assertRemoteMatches();
  });
}

test('manifest hashes exact bytes and preserves existing cache policy by path', async (t) => {
  const bytes = Buffer.from([0, 255, 128, 1]);
  const f = await fixture(t, {
    'index.html': '',
    'ads.txt': 'ads',
    'api/feed/v2/ko/all/1.json': '{}',
    'robots.txt': 'robots',
    '_astro/main.js': 'js',
    'images/picture.webp': bytes,
    'unknown.bin': bytes,
  });
  const manifest = await buildManifest(f.distDir, BUCKET);
  assert.equal(
    manifest.files['images/picture.webp'].sha256,
    createHash('sha256').update(bytes).digest('hex'),
  );
  assert.equal(manifest.files['images/picture.webp'].size, 4);
  for (const key of ['index.html', 'ads.txt', 'api/feed/v2/ko/all/1.json']) {
    assert.equal(manifest.files[key].cacheControl, 'no-cache', key);
  }
  for (const key of ['robots.txt', '_astro/main.js', 'images/picture.webp', 'unknown.bin']) {
    assert.equal(manifest.files[key].cacheControl, 'public, max-age=31536000, immutable', key);
  }
  assert.equal(manifest.files['images/picture.webp'].contentType, 'image/webp');
  assert.equal(manifest.files['unknown.bin'].contentType, 'application/octet-stream');
  assert.equal(manifest.files['index.html'].contentEncoding, null);
});

test('assets upload before HTML, deletions follow uploads, and manifest commits last', async (t) => {
  const f = await fixture(t, {
    'index.html': 'home',
    '_astro/main.js': 'js',
    'z/page.html': 'page',
  });
  f.store.files.set('stale.html', {});
  await f.deploy();
  assert.deepEqual(
    mutations(f.store).map((e) => [e.type, e.key]),
    [
      ['write', PENDING_KEY],
      ['upload', '_astro/main.js'],
      ['upload', 'index.html'],
      ['upload', 'z/page.html'],
      ['delete', ['stale.html']],
      ['write', MANIFEST_KEY],
      ['control-delete', PENDING_KEY],
    ],
  );
});

for (const phase of ['pending-write', 'upload', 'delete', 'manifest-write', 'pending-delete']) {
  test(`${phase} failure retains recovery information and rerun reaches current output`, async (t) => {
    const f = await fixture(t);
    await f.seed();
    const previous = clone(f.store.json.get(MANIFEST_KEY));
    await f.setFiles({ 'index.html': '<h1>new</h1>', 'new.js': 'new' });
    f.store.before = async ({ type, key }) => {
      if (
        (phase === 'pending-write' && type === 'write' && key === PENDING_KEY) ||
        (phase === 'upload' && type === 'upload' && key === 'index.html') ||
        (phase === 'delete' && type === 'delete') ||
        (phase === 'manifest-write' && type === 'write' && key === MANIFEST_KEY) ||
        (phase === 'pending-delete' && type === 'control-delete')
      )
        throw new Error(`injected ${phase}`);
    };
    await assert.rejects(f.deploy(), new RegExp(`injected ${phase}`));
    if (phase === 'pending-write') {
      assert.equal(f.store.json.has(PENDING_KEY), false);
      assert.equal(mutations(f.store).length, 1);
      assert.equal(f.store.files.has('new.js'), false);
    } else {
      assert.equal(f.store.json.has(PENDING_KEY), true);
    }
    if (phase !== 'pending-delete') assert.deepEqual(f.store.json.get(MANIFEST_KEY), previous);
    f.store.before = async () => {};
    const retry = await f.deploy();
    assert.equal(retry.recovering, phase !== 'pending-write');
    await f.assertRemoteMatches();
  });
}

for (const phase of ['upload', 'delete', 'manifest-write', 'pending-delete']) {
  test(`${phase} committed but response failed is safe to rerun`, async (t) => {
    const f = await fixture(t);
    await f.seed();
    await f.setFiles({ 'index.html': '<h1>new</h1>', 'new.js': 'new' });
    f.store.after = async ({ type, key }) => {
      if (
        (phase === 'upload' && type === 'upload' && key === 'new.js') ||
        (phase === 'delete' && type === 'delete') ||
        (phase === 'manifest-write' && type === 'write' && key === MANIFEST_KEY) ||
        (phase === 'pending-delete' && type === 'control-delete')
      )
        throw new Error('response lost');
    };
    await assert.rejects(f.deploy(), /response lost/);
    f.store.after = async () => {};
    await f.deploy();
    await f.assertRemoteMatches();
  });
}

test('rollback after partial upload restores old bytes despite matching successful manifest', async (t) => {
  const f = await fixture(t, { 'index.html': 'old', 'asset.js': 'old' });
  await f.seed();
  await f.setFiles({ 'index.html': 'new', 'asset.js': 'new' });
  f.store.before = async ({ type, key }) => {
    if (type === 'upload' && key === 'index.html') throw new Error('HTML upload failed');
  };
  await assert.rejects(f.deploy(), /HTML upload failed/);
  assert.equal(f.store.files.get('asset.js').bytes.toString(), 'new');
  await f.setFiles({ 'index.html': 'old', 'asset.js': 'old' });
  f.store.before = async () => {};
  const retry = await f.deploy();
  assert.equal(retry.uploaded, 2);
  await f.assertRemoteMatches();
});

test('new file uploaded by a failed build is removed when next build omits it', async (t) => {
  const f = await fixture(t);
  await f.seed();
  await f.setFiles({ 'index.html': 'new', 'temporary.js': 'new' });
  f.store.before = async ({ type, key }) => {
    if (type === 'upload' && key === 'index.html') throw new Error('failed');
  };
  await assert.rejects(f.deploy(), /failed/);
  assert.equal(f.store.files.has('temporary.js'), true);
  await f.setFiles({ 'index.html': '<h1>old</h1>', 'old.js': 'old' });
  f.store.before = async () => {};
  await f.deploy();
  await f.assertRemoteMatches();
});

test('repeated failure preserves original pending orphan paths until a successful retry', async (t) => {
  const f = await fixture(t);
  await f.seed();
  await f.setFiles({ 'index.html': 'new', 'temporary.js': 'new' });
  f.store.before = async ({ type, key }) => {
    if (type === 'upload' && key === 'index.html') throw new Error('failed');
  };
  await assert.rejects(f.deploy(), /failed/);
  await f.setFiles({ 'index.html': 'another', 'another.js': 'new' });
  await assert.rejects(f.deploy(), /failed/);
  assert.ok(f.store.json.get(PENDING_KEY).keys.includes('temporary.js'));
  assert.ok(f.store.json.get(PENDING_KEY).keys.includes('another.js'));
  f.store.before = async () => {};
  await f.deploy();
  await f.assertRemoteMatches();
});

test('dry-run reports planned changes without mutating S3 state', async (t) => {
  const f = await fixture(t);
  f.store.files.set('obsolete.html', {});
  const result = await f.deploy({ dryRun: true });
  assert.equal(result.uploaded, 2);
  assert.equal(result.deleted, 1);
  assert.equal(result.dryRun, true);
  assert.deepEqual(mutations(f.store), []);
  assert.deepEqual([...f.store.files.keys()], ['obsolete.html']);
  assert.equal(f.store.json.size, 0);
});

test('bootstrap after failure recovers uploaded files even without a successful manifest', async (t) => {
  const f = await fixture(t);
  f.store.before = async ({ type, key }) => {
    if (type === 'upload' && key === 'index.html') throw new Error('failed');
  };
  await assert.rejects(f.deploy(), /failed/);
  assert.equal(f.store.json.has(MANIFEST_KEY), false);
  f.store.before = async () => {};
  const retry = await f.deploy();
  assert.equal(retry.bootstrap, true);
  assert.equal(retry.recovering, true);
  await f.assertRemoteMatches();
});

for (const [label, mutate] of [
  [
    'manifest schema',
    (store) => {
      store.json.get(MANIFEST_KEY).schemaVersion = 99;
    },
  ],
  [
    'manifest bucket',
    (store) => {
      store.json.get(MANIFEST_KEY).bucket = 'another-bucket';
    },
  ],
  [
    'manifest hash',
    (store) => {
      store.json.get(MANIFEST_KEY).files['index.html'].sha256 = 'bad';
    },
  ],
  [
    'manifest path',
    (store) => {
      store.json.get(MANIFEST_KEY).files['../escape'] = clone(
        store.json.get(MANIFEST_KEY).files['index.html'],
      );
    },
  ],
  [
    'pending schema',
    (store) => {
      store.json.set(PENDING_KEY, { schemaVersion: 2, bucket: BUCKET, keys: [] });
    },
  ],
  [
    'pending bucket',
    (store) => {
      store.json.set(PENDING_KEY, { schemaVersion: 1, bucket: 'wrong', keys: [] });
    },
  ],
  [
    'pending path',
    (store) => {
      store.json.set(PENDING_KEY, {
        schemaVersion: 1,
        bucket: BUCKET,
        keys: ['_deploy/manifest.json'],
      });
    },
  ],
  [
    'pending duplicates',
    (store) => {
      store.json.set(PENDING_KEY, {
        schemaVersion: 1,
        bucket: BUCKET,
        keys: ['index.html', 'index.html'],
      });
    },
  ],
]) {
  test(`invalid ${label} stops before any mutation`, async (t) => {
    const f = await fixture(t);
    await f.seed();
    mutate(f.store);
    await assert.rejects(f.deploy(), /Invalid/);
    assert.deepEqual(mutations(f.store), []);
  });
}

for (const key of [MANIFEST_KEY, PENDING_KEY]) {
  test(`permission failure reading ${key} stops before mutation`, async (t) => {
    const f = await fixture(t);
    f.store.before = async (event) => {
      if (event.type === 'read' && event.key === key) throw new Error('AccessDenied');
    };
    await assert.rejects(f.deploy(), /AccessDenied/);
    assert.deepEqual(mutations(f.store), []);
  });
}

test('bootstrap listing failure does not create a pending journal', async (t) => {
  const f = await fixture(t);
  f.store.before = async ({ type }) => {
    if (type === 'list') throw new Error('list failed');
  };
  await assert.rejects(f.deploy(), /list failed/);
  assert.deepEqual(mutations(f.store), []);
});

test('missing index.html rejects incomplete output before contacting S3', async (t) => {
  const f = await fixture(t, { 'asset.js': 'js' });
  await assert.rejects(f.deploy(), /index.html/);
  assert.deepEqual(f.store.events, []);
});

test('symbolic links reject output before contacting S3', async (t) => {
  const f = await fixture(t);
  await symlink(path.join(f.distDir, 'index.html'), path.join(f.distDir, 'link.html'));
  await assert.rejects(f.deploy(), /symlink/);
  assert.deepEqual(f.store.events, []);
});

test('control-prefix collisions reject output before contacting S3', async (t) => {
  const f = await fixture(t, { 'index.html': 'home', '_deploy/manifest.json': '{}' });
  await assert.rejects(f.deploy(), /Invalid deployment file key/);
  assert.deepEqual(f.store.events, []);
});

test('deletes are batched at 1000 keys and all obsolete objects are removed', async (t) => {
  const f = await fixture(t, { 'index.html': 'home' });
  for (let index = 0; index < 1001; index++) f.store.files.set(`old-${index}.html`, {});
  const result = await f.deploy();
  assert.equal(result.deleted, 1001);
  assert.deepEqual(
    f.store.events.filter((e) => e.type === 'delete').map((e) => e.key.length),
    [1000, 1],
  );
  await f.assertRemoteMatches();
});

test('a failed concurrent upload waits for in-flight uploads and does not schedule remaining files', async (t) => {
  const f = await fixture(t, {
    'index.html': 'home',
    'a.js': 'a',
    'b.js': 'b',
    'c.js': 'c',
  });
  const secondStarted = deferred();
  const releaseSecond = deferred();
  const firstFailed = deferred();
  const originalUpload = f.store.uploadFile.bind(f.store);
  f.store.uploadFile = async (key, ...args) => {
    if (key === 'a.js') {
      await secondStarted.promise;
      firstFailed.resolve();
      throw new Error('first failed');
    }
    if (key === 'b.js') {
      secondStarted.resolve();
      await releaseSecond.promise;
    }
    return originalUpload(key, ...args);
  };
  let settled = false;
  const run = f.deploy({ concurrency: 2 });
  const observed = run.then(
    () => {
      settled = true;
    },
    () => {
      settled = true;
    },
  );
  await firstFailed.promise;
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(settled, false);
  releaseSecond.resolve();
  await assert.rejects(run, /first failed/);
  await observed;
  assert.equal(f.store.files.has('b.js'), true);
  assert.equal(f.store.files.has('c.js'), false);
  assert.equal(f.store.files.has('index.html'), false);
  assert.equal(f.store.json.has(MANIFEST_KEY), false);
  assert.equal(f.store.json.has(PENDING_KEY), true);
});

test('plan identifies pending-only orphans even when the old manifest never contained them', async (t) => {
  const f = await fixture(t);
  const current = await buildManifest(f.distDir, BUCKET);
  const plan = planDeployment(current, clone(current), {
    schemaVersion: 1,
    bucket: BUCKET,
    keys: ['new-orphan.js', 'index.html'],
  });
  assert.deepEqual(plan.uploads, ['index.html']);
  assert.deepEqual(plan.deletes, ['new-orphan.js']);
  assert.deepEqual(plan.skipped, ['old.js']);
});

test('pending write committed but response failed leaves content untouched and rerun succeeds', async (t) => {
  const f = await fixture(t);
  await f.seed();
  await f.setFiles({ 'index.html': 'new', 'new.js': 'new' });
  f.store.after = async ({ type, key }) => {
    if (type === 'write' && key === PENDING_KEY) throw new Error('journal response lost');
  };
  await assert.rejects(f.deploy(), /journal response lost/);
  assert.equal(f.store.json.has(PENDING_KEY), true);
  assert.equal(f.store.files.has('new.js'), false);
  assert.equal(f.store.files.get('index.html').bytes.toString(), '<h1>old</h1>');
  f.store.after = async () => {};
  await f.deploy();
  await f.assertRemoteMatches();
});

test('partial batch deletion failure retries remaining obsolete keys safely', async (t) => {
  const f = await fixture(t, { 'index.html': 'home', 'old-a.js': 'a', 'old-b.js': 'b' });
  await f.seed();
  await f.setFiles({ 'index.html': 'home' });
  const originalDelete = f.store.deleteKeys.bind(f.store);
  f.store.deleteKeys = async (keys) => {
    f.store.files.delete(keys[0]);
    throw new Error('one object denied');
  };
  await assert.rejects(f.deploy(), /one object denied/);
  assert.equal(f.store.files.has('old-a.js'), false);
  assert.equal(f.store.files.has('old-b.js'), true);
  f.store.deleteKeys = originalDelete;
  await f.deploy();
  await f.assertRemoteMatches();
});

test('dry-run while recovering preserves the pending journal and partial state', async (t) => {
  const f = await fixture(t);
  await f.seed();
  f.store.json.set(PENDING_KEY, {
    schemaVersion: 1,
    bucket: BUCKET,
    keys: ['index.html', 'orphan.js'],
  });
  f.store.files.set('orphan.js', { bytes: Buffer.from('orphan') });
  const before = clone(f.store.json.get(PENDING_KEY));
  const result = await f.deploy({ dryRun: true });
  assert.equal(result.recovering, true);
  assert.equal(result.uploaded, 1);
  assert.equal(result.deleted, 1);
  assert.deepEqual(mutations(f.store), []);
  assert.deepEqual(f.store.json.get(PENDING_KEY), before);
  assert.equal(f.store.files.has('orphan.js'), true);
});

test('invalid concurrency and dry-run options fail before S3 access', async (t) => {
  const f = await fixture(t);
  for (const concurrency of [0, -1, 65, 1.5, NaN, '8']) {
    await assert.rejects(f.deploy({ concurrency }), /concurrency/);
  }
  await assert.rejects(f.deploy({ dryRun: 'true' }), /dryRun/);
  assert.deepEqual(f.store.events, []);
});

test('invalid bucket fails before S3 access', async (t) => {
  const f = await fixture(t);
  for (const bucket of ['', 'another/bucket', ' leading', 'bad\nbucket']) {
    await assert.rejects(f.deploy({ bucket }), /bucket/);
  }
  assert.deepEqual(f.store.events, []);
});

test('a __proto__ file is treated as an ordinary own manifest entry', async (t) => {
  const files = Object.fromEntries([
    ['index.html', 'home'],
    ['__proto__', 'safe'],
  ]);
  const f = await fixture(t, files);
  await f.deploy();
  assert.equal(Object.hasOwn(f.store.json.get(MANIFEST_KEY).files, '__proto__'), true);
  assert.equal(f.store.files.get('__proto__').bytes.toString(), 'safe');
  await f.assertRemoteMatches();
});
