'use server';

export async function generateSummary(
  _title: string,
  _content: string,
): Promise<string> {
  // TODO: GPT-4o API 연동
  await new Promise((resolve) => setTimeout(resolve, 1500));

  return '광장시장 120년 전통의 빈대떡 맛집\n바삭한 겉면과 촉촉한 속의 완벽 조화\n주말 방문 추천, 대기 30분 이상';
}
