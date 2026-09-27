/** dev/prod 참조를 대조하는 수동 S3 이미지 정리. 기본은 삭제 없는 보고서 생성이다. */
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, writeFile, appendFile, unlink, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify, parseArgs } from 'node:util';

const exec = promisify(execFile);
const DAY = 86_400_000;
const GRACE_DAYS = 7;
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const KEY = `posts/\\d{4}/(?:0[1-9]|1[0-2])/${UUID}(?:_(?:688|og))?\\.(?:webp|jpg)`;
const managedKey = new RegExp(`^${KEY}$`, 'i');
const textObject = /\.(?:html|json|js|css|xml|txt|svg)$/i;
const tables = {
  posts: 'id,content,thumbnail,image_alts',
  post_translations: 'id,content,image_alts',
  post_drafts: 'id,form_data,translation_data,image_alts',
};
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const hash = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const family = (key) => key.replace(/(?:_(?:688|og))?\.(?:webp|jpg)$/i, '').toLowerCase();

export function collectReferences(value, references = new Set()) {
  if (value && typeof value === 'object') {
    for (const entry of Object.values(value)) collectReferences(entry, references);
  } else if (typeof value === 'string') {
    const normalized = value
      .replace(/\\u([0-9a-f]{4})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
      .replace(/\\\//g, '/')
      .replace(/&#(?:x([0-9a-f]+)|(\d+));/gi, (_, hex, dec) =>
        String.fromCodePoint(Math.min(0x10ffff, parseInt(hex ?? dec, hex ? 16 : 10))),
      )
      .replace(/%([0-9a-f]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
    for (const match of normalized.matchAll(new RegExp(`${KEY}\\b`, 'gi'))) {
      references.add(family(match[0]));
    }
  }
  return references;
}

export function validateConfig(input, env = process.env) {
  const result = {};
  for (const stage of ['dev', 'prod']) {
    const item = input[stage];
    assert(item && typeof item === 'object', `${stage} 설정이 필요합니다.`);
    for (const field of [
      'awsProfile',
      'region',
      'accountId',
      'mediaBucket',
      'staticBucket',
      'supabaseUrlEnv',
      'supabaseKeyEnv',
    ]) {
      assert(
        typeof item[field] === 'string' && item[field].trim() && !item[field].includes('REPLACE'),
        `${stage}.${field}를 지정하세요.`,
      );
    }
    assert(/^\d{12}$/.test(item.accountId), `${stage} AWS accountId가 올바르지 않습니다.`);
    for (const bucket of [item.mediaBucket, item.staticBucket]) {
      assert(
        /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(bucket),
        `${stage} 버킷명이 올바르지 않습니다.`,
      );
    }
    const url = new URL(env[item.supabaseUrlEnv]);
    assert(
      url.protocol === 'https:' &&
        url.pathname === '/' &&
        !url.search &&
        !url.hash &&
        !url.username &&
        !url.password,
      `${stage} Supabase HTTPS origin이 필요합니다.`,
    );
    const secret = env[item.supabaseKeyEnv];
    let serviceRole = false;
    try {
      serviceRole =
        JSON.parse(Buffer.from(secret.split('.')[1], 'base64url').toString()).role ===
        'service_role';
    } catch {
      /* JWT가 아닌 secret key도 허용한다. */
    }
    assert(
      secret?.startsWith('sb_secret_') || serviceRole,
      `${stage}: RLS 누락 방지를 위해 secret/service_role 키가 필요합니다.`,
    );
    result[stage] = { ...item, supabaseUrl: url.origin, secret };
  }
  assert(
    result.dev.supabaseUrl !== result.prod.supabaseUrl,
    'dev/prod DB가 같습니다. 환경 매핑을 확인하세요.',
  );
  const mediaBuckets = new Set(Object.values(result).map((item) => item.mediaBucket));
  assert(
    Object.values(result).every((item) => !mediaBuckets.has(item.staticBucket)),
    '미디어 버킷과 정적 배포 버킷을 구분하세요.',
  );
  if (result.dev.mediaBucket === result.prod.mediaBucket) {
    assert(
      result.dev.accountId === result.prod.accountId && result.dev.region === result.prod.region,
      '공유 미디어 버킷의 계정/리전이 다릅니다.',
    );
  }
  return result;
}

export function configIdentity(config) {
  return hash(
    Object.fromEntries(
      Object.entries(config).map(([stage, { secret: _secret, ...item }]) => [stage, item]),
    ),
  );
}

export async function queryTable(config, table, fetcher = fetch) {
  assert(table in tables, '지원하지 않는 테이블입니다.');
  const rows = [];
  let total;
  const ids = new Set();
  while (total === undefined || rows.length < total) {
    const url = new URL(`/rest/v1/${table}`, config.supabaseUrl);
    url.search = new URLSearchParams({
      select: tables[table],
      order: 'id.asc',
      offset: String(rows.length),
      limit: '1000',
    }).toString();
    const headers = { apikey: config.secret, Prefer: 'count=exact' };
    if (!config.secret.startsWith('sb_secret_')) headers.Authorization = `Bearer ${config.secret}`;
    const response = await fetcher(url, {
      headers,
      redirect: 'error',
      signal: AbortSignal.timeout(30000),
    });
    assert(response.ok, `${table} 조회 실패 (HTTP ${response.status}). 정리를 중단합니다.`);
    const range = response.headers.get('content-range');
    assert(/^(?:\d+-\d+|\*)\/\d+$/.test(range ?? ''), `${table} 전체 개수를 확인하지 못했습니다.`);
    const count = Number(range.split('/')[1]);
    assert(Number.isSafeInteger(count), `${table} 전체 개수가 유효하지 않습니다.`);
    assert(
      total === undefined || total === count,
      `${table} 조회 중 데이터가 바뀌었습니다. 다시 실행하세요.`,
    );
    total = count;
    const page = await response.json();
    assert(
      Array.isArray(page) && (page.length > 0 || total === 0),
      `${table} 페이지가 누락되었습니다.`,
    );
    const [start, end] = range.split('/')[0].split('-').map(Number);
    assert(
      total === 0
        ? range === '*/0' && page.length === 0 && rows.length === 0
        : Number.isSafeInteger(start) &&
            Number.isSafeInteger(end) &&
            start === rows.length &&
            end === start + page.length - 1 &&
            end < total &&
            page.length <= 1000,
      `${table} 응답 범위가 요청 위치 또는 실제 행 수와 일치하지 않습니다.`,
    );
    for (const row of page) {
      assert(row.id && !ids.has(row.id), `${table} 중복/누락 페이지입니다.`);
      assert(
        tables[table].split(',').every((field) => Object.hasOwn(row, field)),
        `${table} 참조 필드가 누락되었습니다.`,
      );
      ids.add(row.id);
      rows.push(row);
    }
    assert(rows.length <= total, `${table} 개수가 일치하지 않습니다.`);
  }
  return rows;
}

async function aws(config, service, operation, args = []) {
  try {
    const { stdout } = await exec(
      'aws',
      [
        service,
        operation,
        ...args,
        '--profile',
        config.awsProfile,
        '--region',
        config.region,
        '--output',
        'json',
        '--no-cli-pager',
        '--no-cli-auto-prompt',
      ],
      {
        timeout: 120000,
        maxBuffer: 32 * 1024 * 1024,
        env: { ...process.env, AWS_PAGER: '', AWS_IGNORE_CONFIGURED_ENDPOINT_URLS: 'true' },
      },
    );
    return stdout.trim() ? JSON.parse(stdout) : {};
  } catch {
    throw new Error(
      `AWS ${service} ${operation} 실패 (${config.awsProfile}). 권한/CLI/계정을 확인하세요. 작업을 중단합니다.`,
    );
  }
}

const bucketArgs = (config, bucket) => [
  '--bucket',
  bucket,
  '--expected-bucket-owner',
  config.accountId,
];
export async function listObjects(config, bucket, prefix = '', call = aws) {
  const objects = [];
  const seen = new Set();
  let token;
  do {
    const page = await call(config, 's3api', 'list-objects-v2', [
      ...bucketArgs(config, bucket),
      '--prefix',
      prefix,
      '--no-paginate',
      '--max-keys',
      '1000',
      ...(token ? ['--continuation-token', token] : []),
    ]);
    assert(typeof page.IsTruncated === 'boolean', 'S3 목록의 완료 여부가 누락되었습니다.');
    for (const object of page.Contents ?? []) {
      assert(
        typeof object.Key === 'string' &&
          !seen.has(object.Key) &&
          object.ETag &&
          Number.isFinite(Date.parse(object.LastModified)) &&
          Number.isSafeInteger(object.Size) &&
          object.Size >= 0,
        'S3 목록 항목이 유효하지 않습니다.',
      );
      seen.add(object.Key);
      objects.push({
        key: object.Key,
        etag: object.ETag,
        modifiedAt: object.LastModified,
        bytes: object.Size,
      });
    }
    const next = page.IsTruncated ? page.NextContinuationToken : undefined;
    assert(!page.IsTruncated || (next && next !== token), 'S3 목록 페이지가 누락되었습니다.');
    token = next;
  } while (token);
  return objects.sort((a, b) => a.key.localeCompare(b.key));
}

export function selectCandidates(objects, references, now = Date.now()) {
  const groups = new Map();
  const excluded = { referenced: 0, recent: 0, unmanaged: 0 };
  for (const object of objects) {
    if (!managedKey.test(object.key)) {
      excluded.unmanaged++;
      continue;
    }
    const id = family(object.key);
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id).push(object);
  }
  const candidates = [];
  for (const [id, group] of groups) {
    if (references.has(id)) excluded.referenced += group.length;
    else if (group.some((object) => now - Date.parse(object.modifiedAt) < GRACE_DAYS * DAY))
      excluded.recent += group.length;
    else candidates.push(...group);
  }
  return { candidates, excluded };
}

export async function scan(config, stage, { call = aws, fetcher = fetch, now = Date.now() } = {}) {
  const references = new Set();
  const sources = {};
  const directory = await mkdtemp(join(tmpdir(), 'eunminlog-media-scan-'));
  const download = join(directory, 'object');
  try {
    for (const name of ['dev', 'prod']) {
      const env = config[name];
      const identity = await call(env, 'sts', 'get-caller-identity');
      assert(identity.Account === env.accountId, `${name} AWS 계정이 설정과 다릅니다.`);
      sources[name] = {};
      for (const table of Object.keys(tables)) {
        const rows = await queryTable(env, table, fetcher);
        sources[name][table] = rows.length;
        collectReferences(rows, references);
      }
      const objects = await listObjects(env, env.staticBucket, '', call);
      assert(
        objects.some((object) => object.key.endsWith('.html')),
        `${name} 배포 HTML이 없습니다. 배포 참조를 확인할 수 없어 중단합니다.`,
      );
      const texts = objects.filter((object) => textObject.test(object.key));
      for (const object of texts) {
        assert(
          object.bytes <= 32 * 1024 * 1024,
          '32MB를 넘는 배포 텍스트는 별도 검토가 필요합니다.',
        );
        const meta = await call(env, 's3api', 'get-object', [
          ...bucketArgs(env, env.staticBucket),
          '--key',
          object.key,
          '--if-match',
          object.etag,
          download,
        ]);
        assert(
          !meta.ContentEncoding || meta.ContentEncoding === 'identity',
          '압축된 배포 텍스트는 별도 검토가 필요합니다.',
        );
        collectReferences(
          new TextDecoder('utf-8', { fatal: true }).decode(await readFile(download)),
          references,
        );
        await unlink(download);
      }
      assert(
        hash(objects) === hash(await listObjects(env, env.staticBucket, '', call)),
        `${name} 배포 중 변경을 감지했습니다. 다시 실행하세요.`,
      );
      sources[name].deployedTextFiles = texts.length;
    }
    const target = config[stage];
    const objects = await listObjects(target, target.mediaBucket, 'posts/', call);
    const { candidates, excluded } = selectCandidates(objects, references, now);
    const versioning = await call(
      target,
      's3api',
      'get-bucket-versioning',
      bucketArgs(target, target.mediaBucket),
    );
    return {
      schemaVersion: 1,
      stage,
      bucket: target.mediaBucket,
      configHash: configIdentity(config),
      observedAt: new Date(now).toISOString(),
      graceDays: GRACE_DAYS,
      versioning: versioning.Status ?? 'Disabled',
      sources,
      excluded,
      totalObjects: objects.length,
      candidateBytes: candidates.reduce((sum, item) => sum + item.bytes, 0),
      candidates,
    };
  } finally {
    await unlink(download).catch((error) => {
      if (error.code !== 'ENOENT') throw error;
    });
    await rmdir(directory);
  }
}

export function deletionPlan(previous, current, maxDelete = 100, now = Date.now()) {
  assert(
    previous.schemaVersion === 1 &&
      previous.stage === current.stage &&
      previous.bucket === current.bucket &&
      previous.configHash === current.configHash,
    '보고서의 환경/버킷/설정이 일치하지 않습니다.',
  );
  const age = now - Date.parse(previous.observedAt);
  assert(
    Number.isFinite(age) && age >= GRACE_DAYS * DAY,
    '최초 보고서 작성 후 최소 7일이 지나야 삭제할 수 있습니다.',
  );
  assert(Array.isArray(previous.candidates), '보고서 후보 목록이 없습니다.');
  const before = new Map(previous.candidates.map((item) => [item.key, item]));
  assert(before.size === previous.candidates.length, '보고서에 중복 키가 있습니다.');
  const changedFamilies = new Set();
  for (const item of current.candidates) {
    const old = before.get(item.key);
    if (
      !old ||
      old.etag !== item.etag ||
      old.bytes !== item.bytes ||
      old.modifiedAt !== item.modifiedAt
    )
      changedFamilies.add(family(item.key));
  }
  const plan = current.candidates.filter((item) => !changedFamilies.has(family(item.key)));
  assert(
    plan.every((item) => managedKey.test(item.key)),
    '관리 대상 외 파일은 삭제할 수 없습니다.',
  );
  assert(
    Number.isSafeInteger(maxDelete) && maxDelete > 0 && plan.length <= maxDelete,
    `삭제 후보 ${plan.length}개가 상한 ${maxDelete}개를 초과합니다. 보고서를 검토하세요.`,
  );
  return plan;
}

export async function applyPlan(config, plan, logFile, call = aws) {
  await writeFile(logFile, '', { flag: 'wx', mode: 0o600 });
  for (const item of plan) {
    await appendFile(
      logFile,
      JSON.stringify({ action: 'attempt', at: new Date().toISOString(), ...item }) + '\n',
    );
    try {
      const result = await call(config, 's3api', 'delete-object', [
        ...bucketArgs(config, config.mediaBucket),
        '--key',
        item.key,
        '--if-match',
        item.etag,
      ]);
      await appendFile(
        logFile,
        JSON.stringify({ action: 'deleted', key: item.key, result }) + '\n',
      );
    } catch (error) {
      await appendFile(
        logFile,
        JSON.stringify({ action: 'failed-or-unknown', key: item.key }) + '\n',
      );
      throw error;
    }
  }
}

export function parseOptions(args) {
  const { values } = parseArgs({
    args,
    options: {
      env: { type: 'string' },
      config: { type: 'string' },
      report: { type: 'string' },
      apply: { type: 'boolean' },
      'dry-run': { type: 'boolean' },
      help: { type: 'boolean' },
      'confirm-bucket': { type: 'string' },
      'maintenance-confirmed': { type: 'boolean' },
      'max-delete': { type: 'string', default: '100' },
    },
  });
  if (values.help) return values;
  assert(
    ['dev', 'prod'].includes(values.env) && values.config && values.report,
    '--env dev|prod, --config, --report가 모두 필요합니다.',
  );
  assert(!(values.apply && values['dry-run']), '--apply와 --dry-run을 함께 지정할 수 없습니다.');
  assert(
    Number.isSafeInteger(Number(values['max-delete'])) && Number(values['max-delete']) > 0,
    '--max-delete는 양의 정수여야 합니다.',
  );
  if (values.apply)
    assert(
      values['maintenance-confirmed'] && values['confirm-bucket'],
      '삭제하려면 양쪽 편집/업로드/배포 중지 확인(--maintenance-confirmed)과 --confirm-bucket이 필요합니다.',
    );
  return values;
}

export async function main(args = process.argv.slice(2)) {
  const options = parseOptions(args);
  if (options.help) {
    console.log(
      '수동 S3 정리: --env dev|prod --config CONFIG.json --report REPORT.json [--dry-run]\n삭제: 같은 보고서 작성 7일 후 --apply --confirm-bucket BUCKET --maintenance-confirmed [--max-delete 100]\n양쪽 DB·배포본을 항상 조회합니다. docs/media-cleanup.md를 먼저 읽으세요.',
    );
    return;
  }
  const config = validateConfig(JSON.parse(await readFile(options.config, 'utf8')));
  const target = config[options.env];
  const previous = options.apply ? JSON.parse(await readFile(options.report, 'utf8')) : null;
  if (options.apply) {
    assert(options['confirm-bucket'] === target.mediaBucket, '확인 버킷이 대상 버킷과 다릅니다.');
    deletionPlan(previous, {
      schemaVersion: 1,
      stage: options.env,
      bucket: target.mediaBucket,
      configHash: configIdentity(config),
      candidates: [],
    });
  }
  console.log(
    `[${options.env}] 대상: ${target.mediaBucket} / AWS ${target.accountId}. dev/prod 참조를 모두 조회합니다.`,
  );
  const report = await scan(config, options.env);
  if (!options.apply) {
    await writeFile(options.report, JSON.stringify(report, null, 2) + '\n', {
      flag: 'wx',
      mode: 0o600,
    });
    console.log(
      `삭제 없음. 후보 ${report.candidates.length}개 / ${report.candidateBytes} bytes. 보고서: ${options.report}`,
    );
  } else {
    const plan = deletionPlan(previous, report, Number(options['max-delete']));
    const logFile = `${options.report}.apply-${Date.now()}.jsonl`;
    console.log(
      `재검증 통과 ${plan.length}개. 버전 관리: ${report.versioning}. 감사 로그: ${logFile}`,
    );
    await applyPlan(target, plan, logFile);
    console.log(`처리 완료 ${plan.length}개. 버전 관리가 켜져 있으면 이전 버전은 남습니다.`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
