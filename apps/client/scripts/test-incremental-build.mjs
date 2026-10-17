import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeFixture, scenarios } from './test-fixtures/incremental-data.mjs';

const app = fileURLToPath(new URL('../', import.meta.url));
const temporary = await mkdtemp(path.join(os.tmpdir(), 'eunminlog-incremental-'));
const project = path.join(temporary, 'client');
const cache = path.join(temporary, 'cache');
const dist = path.join(temporary, 'dist');
const fixtureFile = path.join(temporary, 'fixture.json');
const preload = fileURLToPath(new URL('./test-fixtures/supabase-preload.mjs', import.meta.url));
const cli = path.join(app, 'node_modules/astro/bin/astro.mjs');
const results = [];
let sequence = 0;

await mkdir(project);
for (const file of ['src', 'public', 'package.json', 'tsconfig.json']) {
  await cp(path.join(app, file), path.join(project, file), { recursive: true });
}
await symlink(path.join(app, 'node_modules'), path.join(project, 'node_modules'), 'dir');
await cp(path.join(app, '../../pnpm-lock.yaml'), path.join(project, 'pnpm-lock.yaml'));
await cp(path.join(app, 'astro.config.mjs'), path.join(project, 'astro.base.mjs'));
await writeFile(
  path.join(project, 'astro.config.mjs'),
  `import base from './astro.base.mjs';
export default {
  ...base,
  cacheDir: '../cache/',
  outDir: '../dist/',
  vite: { ...base.vite, cacheDir: new URL('../vite-cache/', import.meta.url).pathname },
};
`,
);

async function hashes(directory, relative = '') {
  const files = {};
  for (const entry of await readdir(path.join(directory, relative), { withFileTypes: true })) {
    const name = path.join(relative, entry.name);
    if (entry.isDirectory()) Object.assign(files, await hashes(directory, name));
    else
      files[name] = createHash('sha256')
        .update(await readFile(path.join(directory, name)))
        .digest('hex');
  }
  return files;
}

function assertSameOutput(actual, expected, message) {
  const names = new Set([...Object.keys(actual), ...Object.keys(expected)]);
  const differences = [...names].filter((name) => actual[name] !== expected[name]);
  assert.equal(differences.length, 0, `${message}: ${differences.slice(0, 20).join(', ')}`);
}

async function build(label, fixture, { force = false, cap = 500, env = {} } = {}) {
  const id = `${String(++sequence).padStart(2, '0')}-${label}`;
  const reportFile = path.join(temporary, `${id}.requests.json`);
  await writeFile(fixtureFile, JSON.stringify(fixture));
  const startedAt = performance.now();
  const result = spawnSync(
    process.execPath,
    ['--import', preload, cli, 'build', ...(force ? ['--force'] : [])],
    {
      cwd: project,
      env: {
        ...process.env,
        SUPABASE_URL: 'https://fixture.invalid',
        SUPABASE_SERVICE_ROLE_KEY: 'fixture-only-key',
        PUBLIC_STAGE: 'development',
        ASTRO_TELEMETRY_DISABLED: '1',
        NO_COLOR: '1',
        INCREMENTAL_FIXTURE_FILE: fixtureFile,
        INCREMENTAL_REPORT_FILE: reportFile,
        INCREMENTAL_FIXTURE_CAP: String(cap),
        ...env,
      },
      encoding: 'utf8',
      maxBuffer: 20 * 1024 * 1024,
      timeout: 180_000,
    },
  );
  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  await writeFile(path.join(temporary, `${id}.log`), output);
  assert.equal(
    result.status,
    0,
    `${label}: build failed (${result.error?.message ?? ''})\n${output.slice(-8000)}`,
  );
  const report = JSON.parse(await readFile(reportFile, 'utf8'));
  assert.deepEqual(report.forbidden, [], `${label}: attempted real or unrecognized network access`);
  for (const [table, rows] of Object.entries(fixture)) {
    const calls = report.requests.filter((request) => request.table === table);
    assert.equal(
      calls.length,
      Math.max(1, Math.ceil(rows.length / cap)),
      `${label}: ${table} should be collected once, including pagination`,
    );
    assert.equal(
      calls.reduce((sum, call) => sum + call.returned, 0),
      rows.length,
      `${label}: ${table} collection incomplete`,
    );
  }
  const manifest = JSON.parse(await readFile(path.join(cache, 'incremental-build.json'), 'utf8'));
  const keyedPaths = Object.values(manifest.routes).flatMap((route) => Object.keys(route.paths));
  assert.ok(keyedPaths.length > 0, `${label}: no eligible cached paths`);
  const restored = [...output.matchAll(/\((?:restored|cached)\)/g)].length;
  const record = {
    label,
    seconds: Number(((performance.now() - startedAt) / 1000).toFixed(2)),
    restored,
    keyedPaths: keyedPaths.length,
    requests: report.requests.length,
  };
  results.push(record);
  console.log(JSON.stringify(record));
  const files = await hashes(dist);
  await writeFile(path.join(temporary, `${id}.outputs.json`), JSON.stringify(files, null, 2));
  return { files, restored, keyedPaths };
}

try {
  const baseline = makeFixture();
  const cold = await build('cold', baseline, { force: true });
  assert.equal(cold.restored, 0, 'forced baseline must render all paths');
  await cp(dist, path.join(temporary, 'cold-dist'), { recursive: true });
  const warm = await build('unchanged', baseline);
  assert.equal(
    warm.restored,
    cold.keyedPaths.length,
    'unchanged build must reuse every eligible path',
  );
  assertSameOutput(warm.files, cold.files, 'unchanged output differs from cold build');
  await cp(cache, path.join(temporary, 'baseline-cache'), { recursive: true });

  const selected = process.argv.slice(2);
  for (const name of selected)
    assert.ok(
      scenarios.some(([scenario]) => scenario === name),
      `Unknown scenario: ${name}`,
    );
  for (const [name, mutate] of scenarios.filter(
    ([name]) => selected.length === 0 || selected.includes(name),
  )) {
    await rm(cache, { recursive: true, force: true });
    await cp(path.join(temporary, 'baseline-cache'), cache, { recursive: true });
    const fixture = structuredClone(baseline);
    mutate(fixture);
    const incremental = await build(`${name}-incremental`, fixture);
    const forced = await build(`${name}-force`, fixture, { force: true });
    assertSameOutput(
      incremental.files,
      forced.files,
      `${name}: stale, missing, or differing output vs full rebuild`,
    );
    assert.notDeepEqual(
      incremental.files,
      cold.files,
      `${name}: fixture change did not affect output`,
    );
    assert.equal(forced.restored, 0, `${name}: --force incorrectly restored paths`);
    if (name === 'last-category-delete') {
      assert.ok(!incremental.files['travel/index.html'], 'empty category route remains');
      assert.ok(
        !incremental.files['en/travel/index.html'],
        'empty translated category route remains',
      );
    }
    if (name === 'slug-category') {
      assert.ok(!incremental.files['cafe/hotplace/post-1/index.html'], 'old slug remains');
      assert.ok(incremental.files['travel/domestic/moved-post/index.html'], 'new slug missing');
    }
    if (name === 'delete')
      assert.ok(!incremental.files['cafe/hotplace/post-1/index.html'], 'deleted post remains');
    if (name === 'multilingual-off') {
      assert.ok(
        !incremental.files['en/cafe/hotplace/post-1/index.html'],
        'disabled locale route remains',
      );
      assert.ok(
        incremental.files['cafe/hotplace/post-1/index.html'],
        'default locale route unexpectedly removed',
      );
    }
  }
  const tenPosts = structuredClone(baseline);
  const removeEleven = scenarios.find(([name]) => name === 'feed-11-to-10')[1];
  removeEleven(tenPosts);
  await build('feed-ten-baseline', tenPosts, { force: true });
  const elevenPosts = structuredClone(baseline);
  const addedPage = await build('feed-10-to-11-incremental', elevenPosts);
  const addedPageForced = await build('feed-10-to-11-force', elevenPosts, { force: true });
  assertSameOutput(
    addedPage.files,
    addedPageForced.files,
    'new feed JSON differs from full rebuild',
  );
  assert.ok(
    Object.keys(addedPage.files).some((name) => name.includes('cafe') && name.endsWith('/2.json')),
    'new category feed JSON missing',
  );
  const paginated = await build('response-cap-three', baseline, { force: true, cap: 3 });
  assertSameOutput(paginated.files, cold.files, 'server row cap changed generated output');
  for (const [name, env] of [
    ['site-environment', { PUBLIC_STAGE: 'production' }],
    ['ad-environment', { PUBLIC_AD_MEDIATION_ENABLED: 'false' }],
  ]) {
    await rm(cache, { recursive: true, force: true });
    await cp(path.join(temporary, 'baseline-cache'), cache, { recursive: true });
    const incremental = await build(`${name}-incremental`, baseline, { env });
    const forced = await build(`${name}-force`, baseline, { force: true, env });
    assertSameOutput(
      incremental.files,
      forced.files,
      `${name}: environment change left stale output`,
    );
  }
  await rm(cache, { recursive: true, force: true });
  await cp(path.join(temporary, 'baseline-cache'), cache, { recursive: true });
  const footerPath = path.join(project, 'src/shared/components/layout/Footer.astro');
  const footerSource = await readFile(footerPath, 'utf8');
  await writeFile(
    footerPath,
    footerSource.replace('All rights reserved.', 'All rights reserved. fixture-template-check'),
  );
  const templateIncremental = await build('template-incremental', baseline);
  const templateForced = await build('template-force', baseline, { force: true });
  assertSameOutput(
    templateIncremental.files,
    templateForced.files,
    'template dependency change left stale output',
  );
  assert.notDeepEqual(
    templateIncremental.files,
    cold.files,
    'template change did not reach output',
  );
  assert.equal(
    templateIncremental.restored,
    0,
    'shared footer change must invalidate dependent pages',
  );
  await writeFile(path.join(temporary, 'summary.json'), JSON.stringify(results, null, 2));
  console.log(`PASS: ${results.length} isolated builds; artifacts: ${temporary}`);
} catch (error) {
  console.error(`FAIL; artifacts preserved: ${temporary}`);
  throw error;
}
