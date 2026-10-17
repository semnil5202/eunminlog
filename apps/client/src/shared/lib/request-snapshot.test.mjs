import assert from 'node:assert/strict';
import { AsyncLocalStorage } from 'node:async_hooks';
import test from 'node:test';
import { getRequestSnapshot } from './request-snapshot.ts';

const deferred = () => {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

test('같은 요청의 동시 호출은 완료 전부터 같은 수집 Promise를 공유', async () => {
  const storage = new AsyncLocalStorage();
  const pending = deferred();
  let calls = 0;
  await storage.run({}, async () => {
    const collect = () => {
      calls++;
      return pending.promise;
    };
    const first = getRequestSnapshot(storage, collect);
    const second = getRequestSnapshot(storage, collect);
    assert.strictEqual(first, second);
    assert.equal(calls, 1);
    pending.resolve({ version: 1 });
    assert.deepEqual(await first, { version: 1 });
    assert.strictEqual(getRequestSnapshot(storage, collect), first);
  });
});

test('다른 요청과 겹치는 요청은 각각 최신 값을 독립 수집', async () => {
  const storage = new AsyncLocalStorage();
  let version = 0;
  const collect = () => Promise.resolve({ version: ++version });
  const results = await Promise.all([
    storage.run({}, async () => {
      const result = await getRequestSnapshot(storage, collect);
      assert.strictEqual(await getRequestSnapshot(storage, collect), result);
      return result;
    }),
    storage.run({}, () => getRequestSnapshot(storage, collect)),
  ]);
  assert.deepEqual(results, [{ version: 1 }, { version: 2 }]);
  assert.deepEqual(await storage.run({}, () => getRequestSnapshot(storage, collect)), {
    version: 3,
  });
});

test('수집 실패는 같은 요청에서 재시도하거나 부분 데이터로 대체하지 않고 전파', async () => {
  const storage = new AsyncLocalStorage();
  const error = new Error('collection failed');
  let calls = 0;
  await storage.run({}, async () => {
    const collect = () => {
      calls++;
      return Promise.reject(error);
    };
    const first = getRequestSnapshot(storage, collect);
    const second = getRequestSnapshot(storage, collect);
    assert.strictEqual(first, second);
    await assert.rejects(first, (actual) => actual === error);
    await assert.rejects(second, (actual) => actual === error);
    assert.equal(calls, 1);
  });
  assert.deepEqual(
    await storage.run({}, () => getRequestSnapshot(storage, () => Promise.resolve('fresh'))),
    'fresh',
  );
});

test('요청 컨텍스트나 저장소가 없으면 매번 새로 수집', async () => {
  const storage = new AsyncLocalStorage();
  let calls = 0;
  const collect = () => Promise.resolve(++calls);
  assert.equal(await getRequestSnapshot(storage, collect), 1);
  assert.equal(await getRequestSnapshot(storage, collect), 2);
  assert.equal(await getRequestSnapshot(undefined, collect), 3);
});
