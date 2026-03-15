/**
 * 날짜 포맷 유틸리티.
 * @param dateStr ISO 8601 날짜 문자열
 * @param locale BCP 47 로케일 코드
 */
export const formatDate = (dateStr: string, locale: string): string =>
  new Date(dateStr).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Seoul',
  });
