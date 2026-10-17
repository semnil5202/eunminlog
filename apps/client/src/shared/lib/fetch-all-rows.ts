type PageResult<T> = {
  data: T[] | null;
  count: number | null;
  error: { message: string } | null;
};

/** 전체 행을 범위 조회하고 건수·고유 키를 검증한다.
 * @param fetchPage 동일 조건과 고유한 정렬로 범위를 조회하는 함수
 * @param getKey 행의 고유 키를 반환하는 함수
 * @param name 오류에 표시할 조회 이름
 */
export const fetchAllRows = async <T>(
  fetchPage: (from: number, to: number) => PromiseLike<PageResult<T>>,
  getKey: (row: T) => string,
  name: string,
): Promise<T[]> => {
  const rows: T[] = [];
  const keys = new Set<string>();
  let expectedCount: number | undefined;

  do {
    const { data, count, error } = await fetchPage(rows.length, rows.length + 499);
    if (error) throw new Error(`${name} failed: ${error.message}`);
    if (!data || count === null || !Number.isSafeInteger(count) || count < 0) {
      throw new Error(`${name} failed: missing rows or exact count`);
    }
    expectedCount ??= count;
    if (count !== expectedCount)
      throw new Error(`${name} failed: row count changed during collection`);
    if (data.length === 0 && rows.length < expectedCount) {
      throw new Error(`${name} failed: collection ended before the exact count`);
    }
    for (const row of data) {
      const key = getKey(row);
      if (keys.has(key)) throw new Error(`${name} failed: duplicate row during collection`);
      keys.add(key);
      rows.push(row);
    }
    if (rows.length > expectedCount) throw new Error(`${name} failed: rows exceed the exact count`);
  } while (rows.length < expectedCount);

  return rows;
};
