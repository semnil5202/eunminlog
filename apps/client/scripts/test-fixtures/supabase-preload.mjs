import { readFileSync, writeFileSync } from 'node:fs';

const fixture = JSON.parse(readFileSync(process.env.INCREMENTAL_FIXTURE_FILE, 'utf8'));
const requests = [];
const forbidden = [];
const cap = Number(process.env.INCREMENTAL_FIXTURE_CAP ?? 500);

process.on('exit', () => {
  writeFileSync(process.env.INCREMENTAL_REPORT_FILE, JSON.stringify({ requests, forbidden }));
});

globalThis.fetch = async (input, init = {}) => {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
  const method = init.method ?? (input instanceof Request ? input.method : 'GET');
  const table = url.pathname.split('/').at(-1);
  if (
    url.origin !== 'https://fixture.invalid' ||
    !url.pathname.startsWith('/rest/v1/') ||
    method !== 'GET' ||
    !fixture[table]
  ) {
    forbidden.push(`${method} ${url.origin}${url.pathname}`);
    throw new Error(
      `Fixture blocked unexpected network request: ${method} ${url.origin}${url.pathname}`,
    );
  }
  const headers = new Headers(init.headers ?? (input instanceof Request ? input.headers : {}));
  let rows = [...fixture[table]];
  for (const [field, condition] of url.searchParams) {
    if (!condition.startsWith('eq.')) continue;
    rows = rows.filter((row) => String(row[field]) === condition.slice(3));
  }
  const order = url.searchParams.get('order')?.split(',') ?? [];
  rows.sort((a, b) => {
    for (const item of order) {
      const [field, direction] = item.split('.');
      const result = a[field] < b[field] ? -1 : a[field] > b[field] ? 1 : 0;
      if (result) return direction === 'desc' ? -result : result;
    }
    return 0;
  });
  const total = rows.length;
  const range = headers.get('range')?.split('-').map(Number);
  const from = Number(url.searchParams.get('offset') ?? range?.[0] ?? 0);
  const limit = Number(url.searchParams.get('limit') ?? (range ? range[1] - range[0] + 1 : cap));
  rows = rows.slice(from, from + Math.min(limit, cap));
  requests.push({ table, from, returned: rows.length, total });
  return new Response(JSON.stringify(rows), {
    status: 200,
    headers: {
      'content-type': 'application/json',
      'content-range': `${from}-${from + rows.length - 1}/${total}`,
    },
  });
};
