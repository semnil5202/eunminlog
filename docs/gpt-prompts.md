# GPT 프롬프트 설계

모델: **GPT-5 Mini** (`gpt-5-mini`)

> 모든 프롬프트는 `apps/admin/src/shared/constants/prompts.ts`에 중앙 집중 관리된다.
> 5개 프롬프트: `SUMMARY_SYSTEM_PROMPT`, `SLUG_SYSTEM_PROMPT`, `EXTRACT_TERMS_SYSTEM_PROMPT`, `buildTranslateSystemPrompt`, `CATEGORY_TRANSLATE_SYSTEM_PROMPT`

---

## 1. 요약 생성 (`streamSummary`)

트리거: "요약 생성" 버튼 클릭
입력: `title`, `content` (HTML)
출력: 3줄 요약 문자열 (줄바꿈 구분)

### System Prompt

```
당신은 한국어 블로그 포스트 요약 전문가입니다.
주어진 제목과 본문을 바탕으로 SEO 메타 설명에 적합한 '자연스러운 3줄 요약'을 작성해주세요.

규칙:
- 전체 내용을 1~2개의 완성된 문장으로 구성한 뒤, 이를 자연스럽게 3줄로 나누어 작성
- 말투: "~하며,", "~이고,", "~입니다."와 같이 문장이 끊기지 않고 이어지는 느낌 강조
- 첫째 줄: 장소/제품의 특징을 매력적인 형용사와 함께 소개
- 둘째 줄: 실제 방문/사용 시 느낀 가장 핵심적인 장점이나 분위기
- 셋째 줄: 독자의 방문/구매를 유도하는 부드러운 권유나 총평
- 각 줄은 25~40자 이내로 작성 (너무 짧게 단답형으로 쓰지 말 것)
- 이모지, 해시태그 사용 금지 및 HTML 태그 제외 텍스트만 참고
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

## 2. 슬러그 추천 (`fetchSlugSuggestions`)

트리거: 슬러그 입력 필드의 "추천" 버튼 클릭
입력: `text` (한국어 카테고리명 또는 게시글 제목)
출력: 영문 slug 후보 3개

### System Prompt

```
당신은 URL slug 생성 전문가입니다.
주어진 한국어 텍스트를 기반으로 영문 URL slug 후보 3개를 추천해주세요.

규칙:
- 소문자 영문, 숫자, 하이픈(-)만 사용
- 2~4단어, 최대 40자
- SEO 친화적이고 의미가 명확한 slug
- 한국어 의미를 잘 반영하되, 직역보다 자연스러운 영어 표현 선호

응답은 반드시 JSON 객체로 작성해주세요. 형식: {"slugs": ["slug-1", "slug-2", "slug-3"]}
```

### 응답 형식 (JSON)

```json
{ "slugs": ["slug-1", "slug-2", "slug-3"] }
```

---

## 3. 번역 용어 추출 (`fetchExtractTerms`)

트리거: "번역본 생성하기" 버튼 클릭 (번역 전 첫 번째 단계)
입력: `content` (HTML), `placeName?`, `address?`
출력: `FlaggedTerm[]` -- `{ original: string, suggestions: string[] }`

### System Prompt

```
당신은 한국어->다국어 번역을 위한 용어 추출 전문가입니다.
자동 번역 시 오역 가능성이 높은 '한국어 특유의 표현'만 골라주세요.

추출 제외 대상 (절대 포함 금지):
- 숫자 및 단위: 300kcal, 10kg, 5km, 20도, 100% 등 (SI 단위 포함)
- 일반적인 영문 명칭: iPhone, Coffee, Menu, Best 등 세계 공용 영단어
- 장소명/주소/브랜드명 (별도 처리되므로 제외)
- 이미 널리 알려진 음식 이름 (파스타, 스테이크, 아메리카노 등)

추출 집중 대상:
- 한국어 구어체/신조어: 가성비, 내돈내산, 존맛탱, 웨이팅 맛집 등
- 특정 매장에서만 쓰는 고유 메뉴명: (예: 두쫀쿠, 쑥떡와플)
- 번역 시 의미가 변질될 수 있는 관용구: (예: 입가심, 손맛, 아점)

응답 형식: {"terms": [{"original": "용어", "suggestions": ["영어추천"]}]}
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
{
  "terms": [
    {
      "original": "존맛탱",
      "suggestions": ["Super delicious", "Incredibly tasty"]
    },
    {
      "original": "가성비",
      "suggestions": []
    }
  ]
}
```

### 파싱

JSON 배열 파싱 -> `FlaggedTerm[]` 타입으로 변환.
빈 배열 `[]` 반환 시 용어 검토 단계를 건너뛰고 바로 번역 요청.

---

## 4. 본문 번역 (`fetchTranslatePost`)

트리거: 용어 검토 완료 후 "번역 요청" 또는 flagged 용어 없을 때 자동 실행
입력: `title`, `content` (HTML), `placeName?`, `address?`, `confirmedTerms[]`, `imageAlts?`, `thumbnailAlt?`
출력: `TranslationResult[]` -- 7개 언어 번역 결과 (언어별 개별 호출, `Promise.allSettled` 병렬)

대상 언어: `en`, `ja`, `zh-CN`, `zh-TW`, `id`, `vi`, `th`

### System Prompt (언어별 동적 생성 -- `buildTranslateSystemPrompt(locale)`)

```
당신은 전문 번역가입니다. 한국어 본문을 {언어명}({locale})로 완벽하게 번역하세요.

최우선 엄수 규칙:
1. HTML 태그 보호: 모든 HTML 태그(h1, h2, h3, h4, h5, p, ul, ol, li, table, thead, tbody, tr, td, th, div, span, img, a, br, hr, blockquote, figure, figcaption 등)는 원본 그대로 유지하세요. 태그 내부의 속성값(src, href, style, class, width, height 등의 URL이나 수치)은 절대 수정하거나 이스케이프(예: &quot;, \) 처리하지 마세요. 따옴표는 반드시 원본 형태 그대로 유지해야 합니다.
2. 100% 번역: 단 한 문장도 한국어로 남겨두지 마세요. 본문의 시작부터 끝까지 반드시 {언어명}로 출력해야 합니다.
3. 이미지/썸네일 alt: 이미지의 설명(alt)도 해당 언어의 문맥에 맞게 SEO 최적화하여 번역하세요.
4. 플레이스홀더: {{IMG_0}} 형태의 문자열은 절대 건드리지 마세요.
5. 어조: 블로그 특유의 친근한 어조를 유지하되, 해당 언어권 사용자가 읽기에 자연스러운 문장 구조를 사용하세요.
6. 확정 번역 용어가 제공됩니다. 영어(en) 번역 시에는 확정된 번역을 그대로 사용하세요. 다른 언어에서는 확정 용어를 참고하되, 해당 언어에 자연스러운 표현으로 번역해주세요.
7. 장소명(place_name)과 주소(address)가 제공되면 언어별 규칙에 따라 표기해주세요.
8. 3줄 요약(description)은 plain text입니다. 줄바꿈(\n)을 유지하고 텍스트만 번역해주세요.

응답은 반드시 순수 JSON 객체여야 합니다.
형식: {"title": "...", "content": "...", "description": "...", "place_name": "...", "address": "...", "image_alts": ["..."], "thumbnail_alt": "..."}
```

**언어별 장소명/주소 표기 규칙** (프롬프트 내에서 locale에 따라 동적 삽입):

| locale  | 규칙                                            |
| ------- | ----------------------------------------------- |
| `ja`    | 카타카나 또는 한자. 주소는 일본식 순서          |
| `zh-CN` | 한자. 주소는 중국식 순서                        |
| `zh-TW` | 한자. 주소는 중국식 순서                        |
| `th`    | 태국 문자 음차 또는 원어 유지. 태국식 주소 순서 |
| `en`    | 로마자. 주소는 영어권 역순 표기                 |
| 기타    | 로마자. 해당 언어권 자연스러운 순서             |

### 응답 형식 (JSON)

```json
{
  "title": "Gangnam Hidden Gem Pasta Restaurant",
  "content": "<p>Today I visited a pasta restaurant...</p>",
  "description": "Line 1\nLine 2\nLine 3",
  "place_name": "Pasta Lab",
  "address": "123 Gangnam-daero, Gangnam-gu, Seoul",
  "image_alts": ["Alt text 1", "Alt text 2"],
  "thumbnail_alt": "Thumbnail alt text"
}
```

### 파싱

JSON 객체 파싱 -> `TranslationResult` 타입으로 변환.
`place_name`, `address`는 원본에 없으면 응답에서도 생략.

### 선택적 번역 모드 (2026-03-09 추가)

> `buildTranslateSystemPrompt(locale)` 함수에서 `selectiveOptions`가 전달될 때 프롬프트에 추가되는 규칙.

선택적 번역 시, 체크된 필드와 본문 섹션만 GPT에 전달한다. 본문이 섹션 단위로 전달되면 응답도 `content_sections` 형식으로 반환해야 한다.

#### 추가 프롬프트 규칙

```
--- 선택적 번역 모드 ---
아래에 제공된 필드와 본문 섹션만 번역하세요.

본문이 content_sections 형식으로 제공됩니다:
[{"index": 0, "html": "<p>...</p>"}, {"index": 3, "html": "<h2>...</h2>"}]

응답도 동일한 content_sections 형식으로 반환하세요:
{"content_sections": [{"index": 0, "html": "<p>번역된 내용</p>"}, {"index": 3, "html": "<h2>번역된 제목</h2>"}]}

각 섹션의 index는 원본과 동일하게 유지하세요.
```

#### 선택적 번역 응답 형식 (JSON)

```json
{
  "title": "...",
  "content_sections": [
    { "index": 0, "html": "<p>Translated paragraph...</p>" },
    { "index": 3, "html": "<h2>Translated heading</h2>" }
  ],
  "description": "..."
}
```

#### 머지 로직

1. GPT 응답의 `content_sections`를 파싱
2. 기존 번역 content를 `splitHtmlToSections()`로 분할
3. 응답의 각 `{ index, html }`로 해당 인덱스의 섹션을 교체
4. `reassembleSections()`로 재조립하여 최종 content 생성

---

## 5. 카테고리명 번역 (`translateCategoryName`)

트리거: 카테고리 생성 페이지에서 "AI 카테고리 번역" 버튼 클릭
입력: 한국어 카테고리명
출력: 7개 언어 번역 결과

### System Prompt

```
한국어 카테고리명을 각 언어로 간결하게 번역하세요.
반드시 JSON 형식으로 반환: { "en": "...", "ja": "...", "zh-CN": "...", "zh-TW": "...", "id": "...", "vi": "...", "th": "..." }
```

### 응답 형식 (JSON)

```json
{
  "en": "Restaurants",
  "ja": "グルメ",
  "zh-CN": "美食",
  "zh-TW": "美食",
  "id": "Restoran",
  "vi": "Nha hang",
  "th": "ร้านอาหาร"
}
```

---

## API 호출 공통 설정

> 모델명, temperature 등 API 설정은 [`secrets-reference.md` 섹션 5](secrets-reference.md#5-gpt-api-공통-설정)를 참조한다.

### 프롬프트 소스 파일 위치

```
apps/admin/src/shared/constants/prompts.ts
```

- `SUMMARY_SYSTEM_PROMPT` -- 요약 생성
- `SLUG_SYSTEM_PROMPT` -- 슬러그 추천
- `EXTRACT_TERMS_SYSTEM_PROMPT` -- 번역 용어 추출
- `buildTranslateSystemPrompt(locale)` -- 언어별 본문 번역 (동적 생성)
- `CATEGORY_TRANSLATE_SYSTEM_PROMPT` -- 카테고리명 다국어 번역

### GPT API 호출 파일 위치

| 기능                   | 파일                                         |
| ---------------------- | -------------------------------------------- |
| 요약 생성, 슬러그 추천 | `features/post-editor/api/client.ts`         |
| 용어 추출, 본문 번역   | `features/translation/api/client.ts`         |
| 카테고리명 번역        | `features/category-management/api/client.ts` |
