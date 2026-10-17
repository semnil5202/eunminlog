import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, writeFile, rm, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createS3Store } from './deploy-static-s3.mjs';
import { parseArgs } from './deploy-static.mjs';

function mockStore(handler) {
  const calls = [];
  return {
    calls,
    store: createS3Store({
      bucket: 'test-static',
      client: {
        async send(command) {
          assert.equal(command.input.Bucket, 'test-static');
          calls.push(command);
          return handler(command, calls.length);
        },
      },
    }),
  };
}

test('S3 JSON reads only classify NoSuchKey as missing', async () => {
  const { store } = mockStore(() => {
    throw Object.assign(new Error('missing'), { name: 'NoSuchKey' });
  });
  assert.equal(await store.readJson('_deploy/manifest.json'), null);
  for (const name of ['AccessDenied', 'NoSuchBucket', 'TimeoutError']) {
    const { store } = mockStore(() => {
      throw Object.assign(new Error(name), { name, $metadata: { httpStatusCode: 404 } });
    });
    await assert.rejects(store.readJson('key'), { name });
  }
  const valid = mockStore(() => ({ Body: { transformToString: async () => '{"ok":true}' } }));
  assert.deepEqual(await valid.store.readJson('key'), { ok: true });
  const invalid = mockStore(() => ({ Body: { transformToString: async () => 'broken' } }));
  await assert.rejects(invalid.store.readJson('key'), SyntaxError);
});

test('S3 listing follows every continuation page and rejects malformed cycles', async () => {
  const { store, calls } = mockStore((command, count) =>
    count === 1
      ? { Contents: [{ Key: 'a' }], IsTruncated: true, NextContinuationToken: 'next' }
      : { Contents: [{ Key: 'b' }], IsTruncated: false },
  );
  assert.deepEqual(await store.listKeys(), ['a', 'b']);
  assert.equal(calls[1].input.ContinuationToken, 'next');
  for (const token of [undefined, 'repeat']) {
    const broken = mockStore(() => ({ IsTruncated: true, NextContinuationToken: token }));
    await assert.rejects(broken.store.listKeys(), /continuation token/);
  }
});

test('S3 streaming upload carries exact bytes, checksum and cache metadata', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 's3-adapter-'));
  try {
    const file = path.join(dir, 'page.html');
    const bytes = Buffer.from('<html>한글</html>');
    await writeFile(file, bytes);
    const { store, calls } = mockStore(async (command) => {
      const chunks = [];
      for await (const chunk of command.input.Body) chunks.push(chunk);
      assert.deepEqual(Buffer.concat(chunks), bytes);
      return {};
    });
    await store.uploadFile('page.html', file, {
      size: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      contentType: 'text/html',
      cacheControl: 'no-cache',
      contentEncoding: null,
    });
    assert.equal(calls[0].input.ContentLength, bytes.length);
    assert.equal(calls[0].input.ContentType, 'text/html');
    assert.equal(calls[0].input.CacheControl, 'no-cache');
    assert.equal(
      calls[0].input.ChecksumSHA256,
      createHash('sha256').update(bytes).digest('base64'),
    );
    assert.equal(calls[0].input.ContentEncoding, undefined);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('S3 control writes are no-store and delete partial errors fail the run', async () => {
  const { store, calls } = mockStore(() => ({}));
  await store.writeJson('_deploy/pending.json', { keys: ['index.html'] });
  assert.equal(calls[0].input.CacheControl, 'no-store');
  assert.deepEqual(JSON.parse(calls[0].input.Body.toString()), { keys: ['index.html'] });
  await store.deleteKeys(['old.html']);
  assert.deepEqual(calls[1].input.Delete.Objects, [{ Key: 'old.html' }]);
  await store.deleteControl('_deploy/pending.json');
  assert.equal(calls[2].input.Key, '_deploy/pending.json');
  const partial = mockStore(() => ({ Errors: [{ Key: 'old.html', Code: 'AccessDenied' }] }));
  await assert.rejects(partial.store.deleteKeys(['old.html']), /old.html: AccessDenied/);
});

test('CLI rejects invalid arguments before any remote operations', () => {
  assert.deepEqual(parseArgs(['--bucket', 'test', '--dry-run', '--concurrency', '2'], {}), {
    bucket: 'test',
    distDir: 'apps/client/dist',
    dryRun: true,
    concurrency: 2,
  });
  assert.equal(parseArgs([], { S3_BUCKET: 'test' }).bucket, 'test');
  for (const args of [
    [],
    ['--bucket'],
    ['--unknown'],
    ['--bucket', 'test', '--concurrency', '0'],
    ['--bucket', 'test', '--concurrency', 'NaN'],
    ['--bucket', 'test', '--dry-run', '--dry-run'],
    ['--bucket', 'bad/bucket'],
  ]) {
    assert.throws(() => parseArgs(args, {}));
  }
});

test('workflow uses environment lock and keeps CloudFront steps after hashed upload', async () => {
  const workflow = await readFile(
    new URL('../../.github/workflows/deploy-client.yml', import.meta.url),
    'utf8',
  );
  assert.match(
    workflow,
    /group: deploy-client-\$\{\{ github.ref_name == 'main' && 'production' \|\| 'development' \}\}/,
  );
  assert.match(workflow, /cancel-in-progress: false/);
  assert.doesNotMatch(workflow, /aws s3 sync/);
  const upload = workflow.indexOf('node infra/scripts/deploy-static.mjs');
  assert.ok(upload > workflow.indexOf('configure-aws-credentials'));
  assert.ok(workflow.indexOf('name: Update CloudFront Function') > upload);
  assert.ok(workflow.indexOf('name: Invalidate CloudFront cache') > upload);
  assert.match(workflow, /--paths "\/\*"/);
});
