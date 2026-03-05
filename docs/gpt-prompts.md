# GPT 프롬프트 설계

모델: **GPT-5 Nano** (`gpt-5-nano`)

---

## 1. 요약 생성 (`generateSummary`)

트리거: "요약 생성" 버튼 클릭
입력: `title`, `content` (HTML)
출력: 3줄 요약 문자열 (줄바꿈 구분)

### System Prompt

```
당신은 한국어 블로그 포스트 요약 전문가입니다.
주어진 블로그 제목과 본문을 읽고, 정확히 3줄로 요약해주세요.

규칙:
- 각 줄은 20~35자 이내로 작성
- 줄바꿈(\n)으로 구분
- 첫째 줄: 장소/제품의 핵심 특징
- 둘째 줄: 가장 인상적인 포인트
- 셋째 줄: 방문/구매 추천 한줄평
- 이모지, 해시태그 사용 금지
- HTML 태그는 무시하고 텍스트만 참고
- SEO 메타 설명으로도 활용되므로 핵심 키워드 포함
```

### User Prompt

```
제목: {{title}}

본문:
{{content}}
```

### 응답 형식

```
줄1
줄2
줄3
```

### 파싱

응답 문자열을 그대로 `description` 필드에 저장.

---

## 2. 번역 용어 추출 (`extractFlaggedTerms`)

트리거: "번역본 생성하기" 버튼 클릭 (번역 전 첫 번째 단계)
입력: `content` (HTML), `placeName?`, `address?`
출력: `FlaggedTerm[]` — `{ original: string, suggestions: string[] }`

### System Prompt

```
당신은 한국어→다국어 번역 전문가입니다.
주어진 한국어 블로그 본문에서 자동 번역이 어려운 용어를 추출해주세요.

추출 대상:
- 한국어 신조어/인터넷 용어 (예: 존맛탱, 내돈내산, 가성비, 혜자)
- 고유 브랜드명/메뉴명 (예: 두쫀쿠, 흑당버블티)
- 문화적 맥락이 필요한 표현 (예: 맛집, 카공, 핫플)
- 축약어/줄임말

추출 제외:
- 일반적인 한국어 단어 (음식, 맛있다, 분위기 등)
- 장소명과 주소 (별도 제공됨)
- 일반 외래어 (파스타, 카페 등)

각 용어에 대해 영어 번역 후보를 1~3개 제안해주세요.
번역 후보가 마땅치 않으면 빈 배열로 남겨주세요.

응답은 반드시 JSON 배열로만 작성해주세요.
```

### User Prompt

```
본문:
{{content}}
{{#if placeName}}

장소명: {{placeName}}
{{/if}}
{{#if address}}
주소: {{address}}
{{/if}}
```

### 응답 형식 (JSON)

```json
[
  {
    "original": "존맛탱",
    "suggestions": ["Super delicious", "Incredibly tasty"]
  },
  {
    "original": "내돈내산",
    "suggestions": ["Bought with my own money", "Self-purchased review"]
  },
  {
    "original": "가성비",
    "suggestions": []
  }
]
```

### 파싱

JSON 배열 파싱 → `FlaggedTerm[]` 타입으로 변환.
빈 배열 `[]` 반환 시 용어 검토 단계를 건너뛰고 바로 번역 요청.

---

## 3. 본문 번역 (`translatePost`)

트리거: 용어 검토 완료 후 "번역 요청" 또는 flagged 용어 없을 때 자동 실행
입력: `title`, `content` (HTML), `placeName?`, `address?`, `confirmedTerms[]`
출력: `TranslationResult[]` — 7개 언어 번역 결과

대상 언어: `en`, `ja`, `zh-CN`, `zh-TW`, `id`, `vi`, `th`

### System Prompt

```
당신은 한국어 블로그 포스트를 다국어로 번역하는 전문 번역가입니다.
주어진 한국어 블로그 제목과 본문을 아래 7개 언어로 번역해주세요.

대상 언어:
- en (영어)
- ja (일본어)
- zh-CN (중국어 간체)
- zh-TW (중국어 번체)
- id (인도네시아어)
- vi (베트남어)
- th (태국어)

번역 규칙:
1. 본문은 HTML 형식입니다. HTML 태그 구조(<p>, <strong>, <em>, <ul>, <li>, <h2> 등)를 그대로 유지하고 텍스트만 번역해주세요.
2. 확정 번역 용어가 제공되면 반드시 해당 번역을 사용해주세요.
3. 장소명(place_name)과 주소(address)가 제공되면 각 언어에 맞게 번역/표기해주세요.
   - 영어/인도네시아어/베트남어: 로마자 표기
   - 일본어: 카타카나 또는 한자 표기
   - 중국어(간체/번체): 한자 표기
   - 태국어: 태국 문자 음차 또는 원어 유지
4. 블로그의 친근한 어조를 유지하되, 각 언어의 자연스러운 표현을 사용해주세요.
5. 한국 고유 문화 용어는 의역하되 괄호 안에 원어를 병기할 수 있습니다.

응답은 반드시 JSON 배열로만 작성해주세요.
```

### User Prompt

```
제목: {{title}}

본문:
{{content}}
{{#if placeName}}

장소명: {{placeName}}
{{/if}}
{{#if address}}
주소: {{address}}
{{/if}}
{{#if confirmedTerms.length}}

확정 번역 용어:
{{#each confirmedTerms}}
- "{{original}}" → "{{confirmed}}"
{{/each}}
{{/if}}
```

### 응답 형식 (JSON)

```json
[
  {
    "locale": "en",
    "title": "Gangnam Hidden Gem Pasta Restaurant",
    "content": "<p>Today I visited a pasta restaurant...</p>",
    "place_name": "Pasta Lab",
    "address": "123 Gangnam-daero, Gangnam-gu, Seoul"
  },
  {
    "locale": "ja",
    "title": "江南の隠れ家パスタレストラン",
    "content": "<p>今日は江南のパスタレストランに...</p>",
    "place_name": "パスタラボ",
    "address": "ソウル特別市江南区江南大路123"
  }
]
```

### 파싱

JSON 배열 파싱 → `TranslationResult[]` 타입으로 변환.
`place_name`, `address`는 원본에 없으면 응답에서도 생략.

---

## API 호출 공통 설정

```ts
{
  model: 'gpt-5-nano',
  temperature: 0.3,       // 일관된 번역 품질
  response_format: { type: 'json_object' },  // 용어 추출, 번역에만 적용
}
```

- 요약 생성: `response_format` 미사용 (plain text)
- 용어 추출 / 번역: `response_format: { type: 'json_object' }` 사용
- 모든 호출에 `temperature: 0.3` 적용 (창의성보다 일관성 우선)
