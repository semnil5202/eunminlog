import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { lstat, readdir } from 'node:fs/promises';
import path from 'node:path';

export const MANIFEST_KEY = '_deploy/manifest.json';
export const PENDING_KEY = '_deploy/pending.json';

const CONTENT_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.json': 'application/json',
  '.map': 'application/json',
  '.xml': 'application/xml',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.markdown': 'text/markdown',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.pdf': 'application/pdf',
  '.webmanifest': 'application/manifest+json',
  '.wasm': 'application/wasm',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.gz': 'application/gzip',
  '.br': 'application/octet-stream',
};

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isControlKey = (key) => key === '_deploy' || key.startsWith('_deploy/');

function validateBucket(bucket) {
  if (typeof bucket !== 'string' || !bucket.trim() || /[\s/\\\0\r\n]/u.test(bucket)) {
    throw new Error('Invalid deployment bucket');
  }
}

function validateKey(key) {
  if (
    typeof key !== 'string' ||
    !key ||
    key.startsWith('/') ||
    /[\\\0\r\n]/u.test(key) ||
    key.split('/').some((part) => !part || part === '.' || part === '..') ||
    isControlKey(key)
  ) {
    throw new Error(`Invalid deployment file key: ${JSON.stringify(key)}`);
  }
}

function validateEnvelope(value, bucket, label) {
  if (!isObject(value) || value.schemaVersion !== 1 || value.bucket !== bucket) {
    throw new Error(`Invalid ${label}: schema version or bucket mismatch`);
  }
}

function validateManifest(manifest, bucket) {
  validateEnvelope(manifest, bucket, 'deployment manifest');
  if (!isObject(manifest.files) || !Object.hasOwn(manifest.files, 'index.html')) {
    throw new Error('Invalid deployment manifest: missing files or index.html');
  }
  for (const [key, metadata] of Object.entries(manifest.files)) {
    validateKey(key);
    if (
      !isObject(metadata) ||
      typeof metadata.sha256 !== 'string' ||
      !/^[a-f0-9]{64}$/u.test(metadata.sha256) ||
      !Number.isSafeInteger(metadata.size) ||
      metadata.size < 0 ||
      typeof metadata.contentType !== 'string' ||
      !metadata.contentType ||
      /[\0\r\n]/u.test(metadata.contentType) ||
      typeof metadata.cacheControl !== 'string' ||
      !metadata.cacheControl ||
      /[\0\r\n]/u.test(metadata.cacheControl) ||
      metadata.contentEncoding !== null
    ) {
      throw new Error(`Invalid deployment manifest metadata: ${key}`);
    }
  }
}

function validatePending(pending, bucket) {
  validateEnvelope(pending, bucket, 'pending deployment');
  if (!Array.isArray(pending.keys)) throw new Error('Invalid pending deployment: missing keys');
  for (const key of pending.keys) validateKey(key);
  if (new Set(pending.keys).size !== pending.keys.length) {
    throw new Error('Invalid pending deployment: duplicate keys');
  }
}

function sameMetadata(current, previous) {
  return (
    current.sha256 === previous.sha256 &&
    current.size === previous.size &&
    current.contentType === previous.contentType &&
    current.cacheControl === previous.cacheControl &&
    current.contentEncoding === previous.contentEncoding
  );
}

/** 빌드 출력의 내용 해시와 업로드 메타데이터 목록을 생성한다.
 * @param {string} distDir 빌드 출력 디렉터리
 * @param {string} bucket 대상 버킷
 */
export async function buildManifest(distDir, bucket) {
  validateBucket(bucket);
  const root = path.resolve(distDir);
  const rootStat = await lstat(root);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) {
    throw new Error('Deployment output must be a directory without symlinks');
  }
  const files = {};
  async function walk(directory, prefix = '') {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name, 'en'));
    for (const entry of entries) {
      const key = prefix ? `${prefix}/${entry.name}` : entry.name;
      validateKey(key);
      const absolutePath = path.join(directory, entry.name);
      const stats = await lstat(absolutePath);
      if (stats.isSymbolicLink()) throw new Error(`Deployment symlink is forbidden: ${key}`);
      if (stats.isDirectory()) {
        await walk(absolutePath, key);
        continue;
      }
      if (!stats.isFile()) throw new Error(`Unsupported deployment file: ${key}`);
      const hash = createHash('sha256');
      for await (const chunk of createReadStream(absolutePath)) hash.update(chunk);
      const metadata = {
        sha256: hash.digest('hex'),
        size: stats.size,
        contentType: CONTENT_TYPES[path.extname(key).toLowerCase()] ?? 'application/octet-stream',
        cacheControl:
          key.endsWith('.html') || key === 'ads.txt' || key.startsWith('api/feed/')
            ? 'no-cache'
            : 'public, max-age=31536000, immutable',
        contentEncoding: null,
      };
      Object.defineProperty(files, key, { value: metadata, enumerable: true });
    }
  }
  await walk(root);
  const manifest = { schemaVersion: 1, bucket, files };
  validateManifest(manifest, bucket);
  return manifest;
}

/** 현재·직전 성공·미완료 목록으로 업로드와 삭제 대상을 계산한다.
 * @param {object} current 이번 출력 목록
 * @param {object|null} previous 직전 성공 목록
 * @param {object|null} pending 미완료 작업의 대상 목록
 * @param {string[]} remoteKeys 첫 전환 시 원격 키 목록
 */
export function planDeployment(current, previous = null, pending = null, remoteKeys = []) {
  validateBucket(current?.bucket);
  const { bucket } = current;
  validateManifest(current, bucket);
  if (previous !== null) validateManifest(previous, bucket);
  if (pending !== null) validatePending(pending, bucket);
  if (!Array.isArray(remoteKeys)) throw new Error('Invalid remote key list');
  const remoteFiles = remoteKeys.filter((key) => {
    if (typeof key === 'string' && isControlKey(key)) return false;
    validateKey(key);
    return true;
  });
  const dirty = new Set(pending?.keys ?? []);
  const uploads = [];
  const skipped = [];
  for (const key of Object.keys(current.files).sort()) {
    const old = previous && Object.hasOwn(previous.files, key) ? previous.files[key] : null;
    if (dirty.has(key) || !old || !sameMetadata(current.files[key], old)) uploads.push(key);
    else skipped.push(key);
  }
  const candidates = new Set([
    ...Object.keys(previous?.files ?? {}),
    ...dirty,
    ...(previous === null ? remoteFiles : []),
  ]);
  const deletes = [...candidates].filter((key) => !Object.hasOwn(current.files, key)).sort();
  return {
    uploads,
    deletes,
    skipped,
    bootstrap: previous === null,
    recovering: pending !== null,
  };
}

async function uploadGroup(keys, concurrency, upload) {
  let next = 0;
  let failed = false;
  let firstError;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, keys.length) }, async () => {
      while (!failed && next < keys.length) {
        const key = keys[next++];
        try {
          await upload(key);
        } catch (error) {
          failed = true;
          firstError ??= error;
        }
      }
    }),
  );
  if (failed) throw firstError;
}

/** 미완료 작업을 기록하고 변경 파일만 순서대로 배포한다.
 * @param {object} options 출력 경로·스토리지·동시 처리 수·드라이런 설정
 */
export async function deployStatic({ distDir, bucket, store, concurrency = 8, dryRun = false }) {
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 64) {
    throw new Error('Deployment concurrency must be an integer between 1 and 64');
  }
  if (typeof dryRun !== 'boolean') throw new Error('dryRun must be a boolean');
  const current = await buildManifest(distDir, bucket);
  const [previous, pending] = await Promise.all([
    store.readJson(MANIFEST_KEY),
    store.readJson(PENDING_KEY),
  ]);
  if (previous !== null) validateManifest(previous, bucket);
  if (pending !== null) validatePending(pending, bucket);
  const remoteKeys = previous === null ? await store.listKeys() : [];
  const plan = planDeployment(current, previous, pending, remoteKeys);
  const summary = {
    uploaded: plan.uploads.length,
    deleted: plan.deletes.length,
    skipped: plan.skipped.length,
    totalFiles: Object.keys(current.files).length,
    uploadBytes: plan.uploads.reduce((total, key) => total + current.files[key].size, 0),
    bootstrap: plan.bootstrap,
    recovering: plan.recovering,
    dryRun,
  };
  if (dryRun || (!plan.uploads.length && !plan.deletes.length && pending === null)) {
    return summary;
  }
  const journalKeys = [
    ...new Set([...plan.uploads, ...plan.deletes, ...(pending?.keys ?? [])]),
  ].sort();
  await store.writeJson(PENDING_KEY, { schemaVersion: 1, bucket, keys: journalKeys });
  const upload = (key) => store.uploadFile(key, path.resolve(distDir, key), current.files[key]);
  await uploadGroup(
    plan.uploads.filter((key) => !key.endsWith('.html')),
    concurrency,
    upload,
  );
  await uploadGroup(
    plan.uploads.filter((key) => key.endsWith('.html')),
    concurrency,
    upload,
  );
  for (let index = 0; index < plan.deletes.length; index += 1000) {
    await store.deleteKeys(plan.deletes.slice(index, index + 1000));
  }
  await store.writeJson(MANIFEST_KEY, current);
  await store.deleteControl(PENDING_KEY);
  return summary;
}
