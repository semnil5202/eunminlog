import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, readdir, unlink, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  validateConfig,
  configIdentity,
  collectReferences,
  selectCandidates,
  queryTable,
  listObjects,
  scan,
  deletionPlan,
  applyPlan,
  parseOptions,
} from './cleanup-orphan-media.mjs';

const now = Date.parse('2026-09-26T00:00:00Z');
const day = 86_400_000;
const key = (n, suffix = '') =>
  `posts/2026/08/00000000-0000-0000-0000-${String(n).padStart(12, '0')}${suffix}.webp`;
const object = (name, age = 30) => ({
  key: name,
  etag: '"abc"',
  modifiedAt: new Date(now - age * day).toISOString(),
  bytes: 100,
});
const raw = Object.fromEntries(
  ['dev', 'prod'].map((stage) => [
    stage,
    {
      awsProfile: `${stage}-profile`,
      region: 'ap-northeast-2',
      accountId: '123456789012',
      mediaBucket: `${stage}-media`,
      staticBucket: `${stage}-static`,
      supabaseUrlEnv: `${stage}_URL`,
      supabaseKeyEnv: `${stage}_KEY`,
    },
  ]),
);
const env = {
  dev_URL: 'https://dev.example.test',
  prod_URL: 'https://prod.example.test',
  dev_KEY: 'sb_secret_dev',
  prod_KEY: 'sb_secret_prod',
};
const config = () => validateConfig(structuredClone(raw), env);
const report = (items, stage = 'dev', age = 10) => ({
  schemaVersion: 1,
  stage,
  bucket: `${stage}-media`,
  configHash: configIdentity(config()),
  observedAt: new Date(now - age * day).toISOString(),
  candidates: items,
});
const response = (rows, total = rows.length, offset = 0) =>
  new Response(JSON.stringify(rows), {
    headers: { 'content-range': rows.length ? `${offset}-${offset + rows.length - 1}/${total}` : '*/0' },
  });
const post = (id, content = '') => ({ id, content, thumbnail: '', image_alts: [] });

test('환경을 필수 지정하고 잘못된 옵션/암묵적인 삭제를 거부한다', () => {
  assert.throws(() => parseOptions([]));
  const base = ['--env', 'prod', '--config', 'config.json', '--report', 'report.json'];
  assert.equal(parseOptions(base).apply, undefined);
  assert.throws(() => parseOptions([...base, '--apply']));
  assert.throws(() => parseOptions([...base, '--max-delete', 'NaN']));
  assert.throws(() => parseOptions([...base, '--aply']));
  assert.throws(() => parseOptions([...base, '--apply', '--dry-run']));
});

test('dev/prod 설정 혼용, 익명 키와 미디어/정적 버킷 혼용을 차단한다', () => {
  assert.equal(config().prod.mediaBucket, 'prod-media');
  assert.throws(() => validateConfig({ dev: raw.dev }, env));
  assert.throws(() => validateConfig(raw, { ...env, prod_URL: env.dev_URL }));
  assert.throws(() => validateConfig(raw, { ...env, prod_KEY: 'sb_publishable_not_admin' }));
  assert.throws(() =>
    validateConfig({ ...raw, prod: { ...raw.prod, staticBucket: raw.dev.mediaBucket } }, env),
  );
  const shared = validateConfig(
    { ...raw, prod: { ...raw.prod, mediaBucket: raw.dev.mediaBucket } },
    env,
  );
  assert.equal(shared.prod.mediaBucket, shared.dev.mediaBucket);
  assert.equal(
    configIdentity(config()),
    configIdentity(validateConfig(raw, { ...env, dev_KEY: 'sb_secret_rotated' })),
  );
});

test('URL/본문/임시저장/이스케이프 참조에서 파생 파일도 같은 가족으로 보호한다', () => {
  const references = collectReferences({
    thumbnail: `https://cdn.test/${key(1, '_688')}`,
    content: `<img src="https://cdn.test/${key(2, '_og')}">`,
    form_data: { content: `https:\\/\\/cdn.test\\/${key(3).replaceAll('/', '\\/')}` },
    translation_data: [{ content: `https://cdn.test/${encodeURIComponent(key(4))}` }],
    escaped: key(5).replaceAll('/', '\\u002f'),
    entities: key(6).replaceAll('/', '&#47;'),
  });
  assert.equal(references.size, 6);
  const result = selectCandidates(
    [1, 2, 3, 4, 5, 6].flatMap((n) => [
      object(key(n)),
      object(key(n, '_688')),
      object(key(n, '_og')),
    ]),
    references,
    now,
  );
  assert.equal(result.candidates.length, 0);
  assert.equal(result.excluded.referenced, 18);
});

test('신규 파생 파일이 있으면 전체 묶음을 보류하고 미지의 경로는 삭제하지 않는다', () => {
  const result = selectCandidates(
    [
      object(key(1)),
      object(key(1, '_688'), 1),
      object(key(2)),
      object('posts/old-photo.png'),
      object('fonts/font.woff2'),
    ],
    new Set(),
    now,
  );
  assert.deepEqual(result.candidates, [object(key(2))]);
  assert.deepEqual(result.excluded, { referenced: 0, recent: 2, unmanaged: 2 });
});

test('DB 서버의 페이지 제한이 작아도 전체 count까지 조회한다', async () => {
  const offsets = [];
  const rows = await queryTable(config().dev, 'posts', async (url) => {
    const offset = Number(url.searchParams.get('offset'));
    offsets.push(offset);
    return response([post(String(offset))], 3, offset);
  });
  assert.equal(rows.length, 3);
  assert.deepEqual(offsets, [0, 1, 2]);
});

test('DB 응답 범위의 시작·끝·전체 개수와 실제 행 수를 대조한다', async () => {
  for (const range of ['1-1/3', '0-1/3', '0-3/3', '*/3', '0-0/0', '0-0/9007199254740992']) {
    await assert.rejects(
      queryTable(config().dev, 'posts', async () =>
        new Response(JSON.stringify([post('one')]), { headers: { 'content-range': range } }),
      ),
      /범위|개수/,
    );
  }
  assert.deepEqual(await queryTable(config().dev, 'posts', async () => response([])), []);
  await assert.rejects(
    queryTable(config().dev, 'posts', async (url) =>
      response([post(String(url.searchParams.get('offset')))], 3, 0),
    ),
    /응답 범위/,
  );
});

test('DB 실패/페이지 누락/필드 누락/조회 중 개수 변경은 정리를 중단한다', async () => {
  await assert.rejects(
    queryTable(config().dev, 'posts', async () => new Response('', { status: 403 })),
  );
  await assert.rejects(queryTable(config().dev, 'posts', async () => new Response('[]')));
  await assert.rejects(
    queryTable(config().dev, 'posts', async () => response([{ id: 'only-id' }])),
  );
  let count = 1;
  await assert.rejects(
    queryTable(config().dev, 'posts', async () => response([post(String(count++))], count)),
  );
});

test('S3 목록은 다음 토큰으로 끝까지 조회하며 불완전한 목록을 거부한다', async () => {
  let calls = 0;
  const result = await listObjects(
    config().dev,
    'dev-media',
    'posts/',
    async (_config, _service, _operation, args) => {
      calls++;
      assert.ok(args.includes('--expected-bucket-owner'));
      if (calls === 2) assert.ok(args.includes('page-two'));
      return {
        IsTruncated: calls === 1,
        NextContinuationToken: 'page-two',
        Contents: [
          { Key: key(calls), ETag: '"abc"', LastModified: object(key(1)).modifiedAt, Size: 100 },
        ],
      };
    },
  );
  assert.equal(result.length, 2);
  await assert.rejects(
    listObjects(config().dev, 'dev-media', '', async () => ({ IsTruncated: true })),
  );
});

test('삭제는 7일 전 같은 환경 보고서의 변경 없는 후보로만 제한한다', () => {
  const previous = report([object(key(1)), object(key(2)), object(key(3))]);
  const current = report(
    [
      object(key(1)),
      { ...object(key(2)), etag: '"changed"' },
      object(key(3)),
      object(key(3, '_688')),
      object(key(4)),
    ],
    'dev',
    0,
  );
  assert.deepEqual(deletionPlan(previous, current, 100, now), [object(key(1))]);
  assert.throws(() => deletionPlan(report([object(key(1))], 'prod'), current, 100, now));
  assert.throws(() => deletionPlan(report([], 'dev', 6), current, 100, now));
  assert.throws(() => deletionPlan({ ...previous, configHash: 'other-db' }, current, 100, now));
  assert.throws(() =>
    deletionPlan(
      report([object(key(1)), object(key(2))]),
      report([object(key(1)), object(key(2))]),
      1,
      now,
    ),
  );
  assert.deepEqual(deletionPlan(previous, report([]), 100, now), []);
});

function mockScan({ wrongAccount = false, noHtml = false, dbError = false } = {}) {
  const calls = [];
  const fetcher = async (url) => {
    if (dbError && url.hostname.startsWith('prod')) return new Response('', { status: 500 });
    const table = url.pathname.split('/').at(-1);
    const rows =
      table === 'posts'
        ? [post('post', url.hostname.startsWith('prod') ? `https://cdn.test/${key(1)}` : '')]
        : table === 'post_drafts'
          ? [
              {
                id: 'draft',
                form_data: { thumbnail: key(2) },
                translation_data: null,
                image_alts: [],
              },
            ]
          : [{ id: 'translation', content: key(5), image_alts: [] }];
    return response(rows);
  };
  const call = async (cfg, service, operation, args = []) => {
    calls.push({ cfg, service, operation, args });
    if (operation === 'get-caller-identity')
      return { Account: wrongAccount ? '000000000000' : cfg.accountId };
    if (operation === 'get-bucket-versioning') return {};
    const bucket = args[args.indexOf('--bucket') + 1];
    if (operation === 'get-object') {
      await writeFile(args.at(-1), `<img src="https://cdn.test/${key(3, '_688')}">`);
      return {};
    }
    assert.equal(operation, 'list-objects-v2');
    const entries = bucket.endsWith('static')
      ? noHtml
        ? []
        : [object('index.html')]
      : [1, 2, 3, 4, 5].flatMap((n) => [object(key(n)), object(key(n, '_688'))]);
    return {
      IsTruncated: false,
      Contents: entries.map((item) => ({
        Key: item.key,
        ETag: item.etag,
        LastModified: item.modifiedAt,
        Size: item.bytes,
      })),
    };
  };
  return { calls, fetcher, call, now };
}

test('dev 스캔도 prod DB, 양쪽 임시저장·번역·실제 배포본을 보호한다', async () => {
  const mocks = mockScan();
  const result = await scan(config(), 'dev', mocks);
  assert.deepEqual(
    result.candidates.map((item) => item.key),
    [key(4, '_688'), key(4)].sort((a, b) => a.localeCompare(b)),
  );
  assert.equal(result.bucket, 'dev-media');
  assert.equal(result.sources.prod.posts, 1);
  assert.equal(result.sources.dev.deployedTextFiles, 1);
  assert.equal(
    mocks.calls.some((item) => item.operation.startsWith('delete')),
    false,
  );
});

test('prod를 선택하면 prod 버킷만 후보로 조회한다', async () => {
  const mocks = mockScan();
  const result = await scan(config(), 'prod', mocks);
  assert.equal(result.bucket, 'prod-media');
  const mediaLists = mocks.calls.filter(
    (item) => item.operation === 'list-objects-v2' && item.args.includes('posts/'),
  );
  assert.equal(mediaLists.length, 1);
  assert.ok(mediaLists[0].args.includes('prod-media'));
});

test('계정 불일치, 배포본 누락, 다른 환경 DB 실패는 삭제 후보 확정을 중단한다', async () => {
  for (const options of [{ wrongAccount: true }, { noHtml: true }, { dbError: true }]) {
    await assert.rejects(scan(config(), 'dev', mockScan(options)));
  }
});

test('스캔 중 배포 변경과 읽을 수 없는 배포 텍스트는 실패로 처리한다', async () => {
  for (const failure of ['changed', 'compressed', 'invalid-utf8', 'read-error']) {
    const mocks = mockScan();
    const original = mocks.call;
    let staticLists = 0;
    mocks.call = async (cfg, service, operation, args = []) => {
      if (operation === 'get-object' && failure === 'read-error') throw new Error('read failed');
      const result = await original(cfg, service, operation, args);
      if (operation === 'list-objects-v2' && args.includes('dev-static')) {
        staticLists++;
        if (failure === 'changed' && staticLists === 2) result.Contents[0].ETag = '"new-deploy"';
      }
      if (operation === 'get-object' && failure === 'compressed') result.ContentEncoding = 'gzip';
      if (operation === 'get-object' && failure === 'invalid-utf8')
        await writeFile(args.at(-1), Buffer.from([0xff]));
      return result;
    };
    await assert.rejects(scan(config(), 'dev', mocks));
    assert.equal(
      mocks.calls.some((item) => item.operation.startsWith('delete')),
      false,
    );
  }
});

test('삭제 요청은 ETag/소유 계정을 고정하고 중간 실패 시 중단·기록한다', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'cleanup-audit-test-'));
  const log = join(directory, 'audit.jsonl');
  let calls = 0;
  try {
    await assert.rejects(
      applyPlan(
        config().dev,
        [object(key(1)), object(key(2)), object(key(3))],
        log,
        async (_config, _service, operation, args) => {
          calls++;
          assert.equal(operation, 'delete-object');
          assert.ok(args.includes('--if-match'));
          assert.ok(args.includes('123456789012'));
          assert.ok(!args.includes('--version-id'));
          if (calls === 2) throw new Error('simulated failure');
          return { DeleteMarker: true, VersionId: 'marker' };
        },
      ),
    );
    assert.equal(calls, 2);
    const lines = (await readFile(log, 'utf8')).trim().split('\n').map(JSON.parse);
    assert.deepEqual(
      lines.map((line) => line.action),
      ['attempt', 'deleted', 'attempt', 'failed-or-unknown'],
    );
    assert.equal(lines[1].result.VersionId, 'marker');
  } finally {
    for (const file of await readdir(directory)) await unlink(join(directory, file));
    await rmdir(directory);
  }
});
