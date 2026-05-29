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
- 본문 전체를 읽고, 핵심 정보(장소/제품 특징, 메뉴/기능, 가격대, 위치, 분위기, 장단점 등)를 최대한 많이 3줄 안에 압축
- 전체 내용을 1~2개의 완성된 문장으로 구성한 뒤, 이를 자연스럽게 3줄로 나누어 작성
- 말투: "~하며,", "~이고,", "~입니다."와 같이 문장이 끊기지 않고 이어지는 느낌 강조
- 첫째 줄: 장소/제품이 무엇인지 + 가장 두드러지는 특징 소개
- 둘째 줄: 본문에서 다루는 구체적 정보 요약 (대표 메뉴, 가격, 구성, 핵심 장점 등)
- 셋째 줄: 총평 또는 추천 포인트 (누구에게 좋은지, 재방문 의사, 만족도 등)
- 각 줄은 25~40자 이내로 작성 (너무 짧게 단답형으로 쓰지 말 것)
- 감성적 수식어보다 구체적 사실 정보를 우선하세요 (예: "분위기 좋은" → "통창석이 있는 2층 카페")
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

트리거: "번역본 생성하기" 버튼 클릭 (번역 전 첫 번째 단계). TranslationSheet 재번역 시에도 호출 (용어 검토 → 재번역 흐름).
입력: `content` (HTML), `placeName?`, `address?`
출력: `FlaggedTerm[]` -- `{ original: string, suggestions: Record<string, string>[] }`

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

각 용어당 최대 3개의 추천 번역을 제공하세요.
각 추천은 7개 목표 언어(en, ja, zh-CN, zh-TW, id, vi, th)의 번역을 포함해야 합니다.

응답 형식: {"terms": [{"original": "용어", "suggestions": [{"en": "...", "ja": "...", "zh-CN": "...", "zh-TW": "...", "id": "...", "vi": "...", "th": "..."}]}]}
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
      "suggestions": [
        {
          "en": "Super delicious",
          "ja": "超おいしい",
          "zh-CN": "超好吃",
          "zh-TW": "超好吃",
          "id": "Sangat lezat",
          "vi": "Cực ngon",
          "th": "อร่อยมาก"
        },
        {
          "en": "Incredibly tasty",
          "ja": "めちゃうま",
          "zh-CN": "特别好吃",
          "zh-TW": "特別好吃",
          "id": "Luar biasa enak",
          "vi": "Ngon tuyệt",
          "th": "อร่อยสุดๆ"
        }
      ]
    },
    {
      "original": "가성비",
      "suggestions": [
        {
          "en": "Great value",
          "ja": "コスパ",
          "zh-CN": "性价比高",
          "zh-TW": "CP值高",
          "id": "Nilai terbaik",
          "vi": "Giá trị tốt",
          "th": "คุ้มค่า"
        }
      ]
    }
  ]
}
```

### 파싱

JSON 배열 파싱 -> `FlaggedTerm[]` 타입으로 변환.
빈 배열 `[]` 반환 시 용어 검토 단계를 건너뛰고 바로 번역 요청.

---

## 4. 수동 번역 (`buildTranslationPrompt`)

> 자동 번역 API(`fetchTranslatePost`)는 품질 이슈로 비활성화. 현재는 프롬프트 복사 → 외부 AI 결과 붙여넣기 방식으로 운영.

트리거: ManualTranslationSheet에서 "프롬프트 복사" 버튼 클릭
소스: `features/translation/lib/prompt-builder.ts` → `buildTranslationPrompt()`
파서: `features/translation/lib/prompt-parser.ts` → `parseTranslationResult()`

대상 언어: `en`, `ja`, `zh-CN`, `zh-TW`, `id`, `vi`, `th`

### 프롬프트 구조

`buildTranslationPrompt()`가 시스템 프롬프트 + 원문 데이터를 하나의 문자열로 조합하여 클립보드에 복사한다. 사용자가 외부 AI에 붙여넣고 결과를 받아온다.

### 최우선 엄수 규칙 (8개)

1. **HTML 태그 보호** — 태그명, 속성, 구조, style 속성값, 따옴표 원본 유지. 텍스트 콘텐츠만 번역
2. **100% 번역** — 한국어 잔류 금지
3. **고유명사 처리** — 음역 또는 "음역(보충설명)" 형태
4. **신조어/밈 처리** — 웹 검색으로 의미 파악 후 자연스럽게 번역
5. **어조** — 현지 인기 블로그 문체 참고, 동일 형용사/관용구 2회 이상 반복 금지
6. **한국 음식/메뉴명 번역** — 직역 금지, 해당 언어권 통용 표현으로 의역. 한국 고유 음식은 설명 덧붙이기
7. **이미지 alt 텍스트** — SEO 최적화 번역
8. **장소명/주소/시간/날짜 표기** — 언어별 표기 규칙 적용

### 언어별 장소명/주소/시간 표기 규칙

| locale     | 표기                                                              |
| ---------- | ----------------------------------------------------------------- |
| `en`       | 로마자. 주소 역순(번지→도로→구→시→국가). 12시간제, Month DD, YYYY |
| `ja`       | 카타카나/한자. 일본식 주소 순서. 24시간제, YYYY年MM月DD日         |
| `zh-CN/TW` | 한자. 중국식 주소 순서. 24시간제, YYYY年MM月DD日                  |
| `th`       | 태국 문자 음차. 태국식 주소/날짜                                  |
| `id`       | 로마자. 인도네시아식 순서. DD Bulan YYYY                          |
| `vi`       | 로마자. 베트남식 순서. DD tháng MM năm YYYY                       |

### 출력 규칙

- 코드블록(```)이나 마크다운 포맷으로 감싸지 않고 plain text로 즉시 반환
- 번역 결과 외의 텍스트(설명, 인사, 이모지 등) 출력 금지
- `---LOCALE:en---`부터 바로 시작, 마지막 CONTENT 종료 시 즉시 종료
- 원문에 없는 필드 추가 금지

### 응답 형식 (구분자 기반)

```
---LOCALE:{locale}---
---TITLE---
(번역된 제목)
---DESCRIPTION---
(번역된 3줄 요약, 줄바꿈 유지)
---PLACE_NAME---
(번역된 장소명)
---ADDRESS---
(번역된 주소)
---PRICE_PREFIX---
(번역된 가격설명)
---THUMBNAIL_ALT---
(번역된 썸네일 alt)
---IMAGE_ALTS---
(번역된 이미지 alt, 번호순)
---CONTENT---
(번역된 HTML 본문)
```

필드는 원문에 존재하는 것만 포함. `formType === 'product-review'`일 때는 PLACE_NAME/ADDRESS/PRICE_PREFIX 대신 PRODUCT_NAMES/PURCHASE_SOURCES/PRICE_PREFIXES가 포함된다.

### 파싱

`parseTranslationResult(rawInput)`:

1. `---LOCALE:{locale}---` 구분자로 locale별 블록 분할
2. 각 블록에서 `---FIELD---` 마커로 필드 추출
3. 번호 리스트 필드(IMAGE_ALTS 등)는 `parseNumberedList()`로 배열 변환
4. `ParsedLocaleResult[]` 반환 → `toTranslationResults()`로 DB 저장 형식 변환

### 자동 번역 API (비활성화)

`features/translation/api/client.ts`의 `fetchTranslatePost()`는 GPT-5 Mini API를 직접 호출하는 자동 번역이다. JSON 응답 형식, 선택적 번역 모드(섹션 단위 재번역) 지원. 품질 이슈(한국어 잔류, 태그 누락 등)로 현재 비활성화 상태이며, 코드는 재도입 시를 위해 유지.

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
