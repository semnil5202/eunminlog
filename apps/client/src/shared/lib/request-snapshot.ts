import type { AsyncLocalStorage } from 'node:async_hooks';

export type RequestSnapshot<T> = { snapshot?: Promise<T> };

/** 요청 안에서는 수집 Promise를 공유하고 요청 밖에서는 새로 수집한다.
 * @param storage 요청별 수집 상태를 보관하는 저장소
 * @param collect 최신 데이터를 수집하는 함수
 */
export const getRequestSnapshot = <T>(
  storage: AsyncLocalStorage<RequestSnapshot<T>> | undefined,
  collect: () => Promise<T>,
): Promise<T> => {
  const store = storage?.getStore();
  if (!store) return collect();
  store.snapshot ??= collect();
  return store.snapshot;
};
