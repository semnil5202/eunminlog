import assert from 'node:assert/strict';
import test from 'node:test';
import { fetchAllRows } from './fetch-all-rows.ts';

const key = (row) => row.id;
const source = Array.from({ length: 1203 }, (_, id) => ({ id: String(id) }));

for (const cap of [500, 73]) {
  test(`1,203행: 서버 응답 상한 ${cap}행에서도 전체 수집`, async () => {
    const requests = [];
    const rows = await fetchAllRows(
      (from, to) => {
        requests.push([from, to]);
        return Promise.resolve({
          data: source.slice(from, Math.min(to + 1, from + cap)),
          count: source.length,
          error: null,
        });
      },
      key,
      'posts',
    );
    assert.deepEqual(rows, source);
    assert.equal(requests.length, Math.ceil(source.length / cap));
    assert.equal(requests[1][0], cap);
  });
}

test('0건은 한 번 조회하고 빈 배열 반환', async () => {
  let calls = 0;
  assert.deepEqual(
    await fetchAllRows(
      () => {
        calls++;
        return Promise.resolve({ data: [], count: 0, error: null });
      },
      key,
      'posts',
    ),
    [],
  );
  assert.equal(calls, 1);
});

const failures = [
  [
    '중간 조회 실패',
    { data: null, count: null, error: { message: 'network failure' } },
    /network failure/,
  ],
  ['전체 건수 전 빈 응답', { data: [], count: 3, error: null }, /ended before/],
  ['중복 행', { data: [{ id: 'A' }], count: 3, error: null }, /duplicate row/],
  ['수집 중 건수 변경', { data: [{ id: 'B' }], count: 4, error: null }, /count changed/],
  ['전체 건수 누락', { data: [{ id: 'B' }], count: null, error: null }, /exact count/],
  ['행 데이터 누락', { data: null, count: 3, error: null }, /missing rows/],
  [
    '전체 건수 초과',
    { data: [{ id: 'B' }, { id: 'C' }, { id: 'D' }], count: 3, error: null },
    /exceed/,
  ],
];

for (const [name, secondPage, expected] of failures) {
  test(`${name}: 부분 결과를 반환하지 않고 실패`, async () => {
    await assert.rejects(
      fetchAllRows(
        (from) =>
          Promise.resolve(from === 0 ? { data: [{ id: 'A' }], count: 3, error: null } : secondPage),
        key,
        'posts',
      ),
      expected,
    );
  });
}
