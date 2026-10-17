import { pathToFileURL } from 'node:url';
import { deployStatic } from './deploy-static-core.mjs';
import { createS3Store } from './deploy-static-s3.mjs';

/** CLI 인자를 검증하고 배포 옵션을 반환한다.
 * @param {string[]} args 명령행 인자
 * @param {object} env 환경변수
 */
export function parseArgs(args, env = process.env) {
  const options = {
    distDir: 'apps/client/dist',
    bucket: env.S3_BUCKET,
    concurrency: 8,
    dryRun: false,
  };
  const fields = { '--dist': 'distDir', '--bucket': 'bucket', '--concurrency': 'concurrency' };
  const seen = new Set();
  for (let index = 0; index < args.length; index++) {
    const flag = args[index];
    if (seen.has(flag)) throw new Error(`Duplicate argument: ${flag}`);
    seen.add(flag);
    if (flag === '--dry-run') options.dryRun = true;
    else if (Object.hasOwn(fields, flag)) {
      const value = args[++index];
      if (!value || value.startsWith('--')) throw new Error(`Missing value: ${flag}`);
      options[fields[flag]] = flag === '--concurrency' ? Number(value) : value;
    } else throw new Error(`Unknown argument: ${flag}`);
  }
  if (!options.bucket || /[\s/\\\0\r\n]/u.test(options.bucket))
    throw new Error('Valid --bucket or S3_BUCKET is required');
  if (
    !Number.isInteger(options.concurrency) ||
    options.concurrency < 1 ||
    options.concurrency > 64
  ) {
    throw new Error('--concurrency must be an integer between 1 and 64');
  }
  return options;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const options = parseArgs(process.argv.slice(2));
    const started = performance.now();
    const summary = await deployStatic({ ...options, store: createS3Store(options) });
    console.log(
      JSON.stringify({
        ...summary,
        elapsedSeconds: Number(((performance.now() - started) / 1000).toFixed(3)),
      }),
    );
  } catch (error) {
    console.error(`S3 deployment failed: ${error.message}`);
    process.exitCode = 1;
  }
}
