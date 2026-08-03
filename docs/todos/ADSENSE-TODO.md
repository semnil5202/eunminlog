# AdSense·쿠팡 광고 운영 가이드

> 상태: Display·In-article·Search Native In-feed Production 슬롯 요청 활성화, Feed Native In-feed 비활성, AdSense 승인 대기

## 1. 운영 원칙

- Local·Development 빌드는 활성 지면에 Google Publisher Tag(GPT) 공식 공개 샘플을 표시한다. 비활성 Feed에는 슬롯을 만들지 않으며 운영 AdSense·쿠팡 요청과 GA4 광고 이벤트도 만들지 않는다.
- GPT가 정상 응답했지만 빈 슬롯이면 `GPT TEST AD · NO FILL`, SDK 로드·slot 정의·요청 실패면 `GPT TEST AD · LOAD FAILED`를 표시한다. 둘 다 provider `none`이다.
- Production 빌드는 GPT 샘플 분기를 항상 비활성화한다.
- Production의 `PUBLIC_AD_MEDIATION_ENABLED=false`는 사이트 심사용 AdSense base tag만 로드하고 광고 단위 요청은 만들지 않는다.
- Production의 `PUBLIC_AD_MEDIATION_ENABLED=true`는 코드에 정의된 지면별 unit 설정으로 AdSense를 요청한다.
- `ADVERTISEMENT_MEDIATION_CONFIG.slots`는 실제 노출 위치 키별 활성 상태를 관리한다. 현재 `feed.first`, `feed.second`는 비활성이고 `search.first`, `search.second`, `article.first`, `article.second`, `postTop`, `sidebar`는 활성이다.
- 비활성 슬롯 키는 예약 DOM, AdSense·GPT 요청, 쿠팡 fallback, GA4 광고 이벤트를 모두 생성하지 않는다. 전역 `enabled`는 Production AdSense 요청 여부만 제어하며 슬롯별 활성 상태와 독립적이다.
- AdSense의 `data-ad-status="unfilled"`만 쿠팡으로 전환한다. `filled`와 `unfill-optimized`는 Google이 관리하는 AdSense 지면으로 유지한다.
- 시간 초과, 스크립트 오류, 차단, 상태 미확인은 쿠팡으로 전환하지 않고 예약 영역을 비워 둔다.
- 두 광고가 모두 없더라도 최소 예약 영역을 제거하지 않는다. Native creative의 가변 높이를 허용하며 field p75 CLS 0.1 이하를 가드레일로 삼는다.
- `postTop`만 즉시 요청하며 나머지 슬롯은 `IntersectionObserver`의 300px 사전 영역에서 요청한다.
- Display는 고정 크기를 유지하고 Native는 `min-height: 250px`만 예약한다. 광고를 고정 높이로 자르거나 `overflow-hidden`을 적용하지 않는다.

### 1.1 환경별 실제 네트워크 동작

| 환경/플래그          | AdSense 기본 스크립트                   | AdSense 슬롯 경매 요청           | 기본 표시     |
| -------------------- | --------------------------------------- | -------------------------------- | ------------- |
| Local·Development    | 없음                                    | 없음                             | GPT 공개 샘플 |
| Production + `false` | 사이트 심사·Google CMP 연동을 위해 로드 | 없음 (`adsbygoogle.push` 미실행) | 쿠팡 배너     |
| Production + `true`  | 로드                                    | 지면이 호출 범위에 들어올 때 1회 | AdSense 우선  |

`PUBLIC_AD_MEDIATION_ENABLED=false`는 모든 Google 네트워크 요청을 차단하는 값이 아니라 실제 광고 슬롯 경매를 중지하는 승인 전 운영 모드다. Local·Development에서만 운영 AdSense 기본 스크립트까지 완전히 제외한다.

### 1.2 쿠팡 fallback과 Google CMP

- 쿠팡 fallback 검증은 Production 운영 플래그가 켜진 상태에서 AdSense가 `data-ad-status="unfilled"`를 반환했을 때 AdSense를 숨기고 쿠팡 배너 하나만 표시하는지 확인하는 테스트다. `unfill-optimized`는 Google 지면을 유지하며 오류, 차단, 상태 미확인에서는 쿠팡을 표시하지 않고 투명한 예약 공간을 유지한다.
- CMP(Consent Management Platform)는 사용자의 광고·쿠키 동의를 수집하고 Google에 유효한 동의 신호를 전달하는 동의 관리 플랫폼이다. 자체 쿠키 고지 배너와 별개이며, EEA·영국·스위스 대상 Google 인증 CMP 메시지는 AdSense 콘솔에서 관리한다.
- In-article은 Local·Development에서 GPT 샘플만 사용한다. Production `false`에서는 쿠팡만, Production `true`에서는 AdSense `filled`·`unfill-optimized` → AdSense, `unfilled` → 쿠팡, 오류·차단·미확정 → 투명한 최소 예약 영역 순서로 동작한다.
- 빈 예약 공간은 AdSense 심사·크롤러 요구사항이 아니라 CLS와 상태 안전성을 위한 구현 선택이다. 현재 활성 지면의 `unfilled`에는 쿠팡 fallback이 있으므로 앱이 임의로 collapse하지 않는다. `unfill-optimized`는 Google 관리 지면을 그대로 표시하고 오류·차단·미확정은 최종 실패 신호가 아니므로 최소 공간을 유지한다.
- 향후 쿠팡 fallback이 없는 지면을 추가할 때만 `data-ad-status="unfilled"`가 확정되고 슬롯이 viewport 밖인 경우에 한해 지면별 opt-in collapse를 적용한다. 광고 `<ins>`와 위치 메타데이터는 DOM에 유지한다.

## 2. 지면과 예약 크기

| 지면               | 형식              | 예약/크기              | 호출 시점 | slot ID      | 추가 설정                       |
| ------------------ | ----------------- | ---------------------- | --------- | ------------ | ------------------------------- |
| 게시글 상단 Mobile | Display           | 300×50                 | 즉시      | `8174224200` | `postTop.mobile`, 고정 크기     |
| 게시글 상단 PC     | Display           | 468×60                 | 즉시      | `1564849758` | `postTop.desktop`, 고정 크기    |
| 우측 사이드바      | Display           | PC 300×250             | 지연      | `3939731651` | 고정 크기                       |
| 피드 index 1, 4    | Native In-feed    | 현재 DOM 미생성        | 비활성    | `6392269057` | `feed.first`, `feed.second`     |
| 검색 index 1, 4    | Native In-feed    | `w-full min-h-[250px]` | 지연      | `6392269057` | `search.first`, `search.second` |
| 본문 H2 경계       | Native In-article | `w-full min-h-[250px]` | 지연      | `5322463062` | `fluid`, full-width responsive  |

Feed 설정은 보존하지만 현재 비활성이다. Search는 같은 Native In-feed unit을 index 1, 4에서 사용하고 Article은 같은 Native In-article unit을 최대 2곳에서 반복 사용한다. 활성 지면의 각 DOM 노출은 고유한 logical slot/position을 사용하며 인기글 104px 광고 지면은 사용하지 않는다.

PostTop은 AdSense 콘솔에서 생성한 Mobile 300×50과 PC 468×60 고정형 unit을 `lg` breakpoint로 선택해 한 DOM 슬롯에서 하나만 요청한다. Sidebar도 별도 300×250 고정형 unit을 사용한다. 세 지면 모두 `data-ad-format="auto"`를 사용하지 않고 광고 요청 직전에 현재 예약 컨테이너의 픽셀 크기를 `<ins>` 인라인 스타일로 고정한다. 최소 높이도 동일하게 예약해 `unfilled` 전환 후 쿠팡 fallback에서 컨테이너가 접히지 않게 한다.

AdSense `<ins>`는 슬롯 등록 시 미리 생성하지 않는다. 즉시 또는 lazy 진입한 슬롯을 공통 요청 큐에서 하나씩 처리하고, 대상 컨테이너에 `<ins>`를 추가한 직후 `push({})`를 호출한다. Google이 `data-adsbygoogle-status`로 요청 접수를 표시한 뒤 다음 슬롯을 처리해, 상세 페이지의 Article·Sidebar처럼 DOM 순서가 다른 여러 지면에서도 요청 대상이 어긋나지 않게 한다.

기존 responsive display unit `5190868026`(PostTop), `3048186343`(Sidebar)은 코드에서 제거했으며 AdSense 콘솔에서도 보관 처리했다. 보고서 이력 확인이 필요하면 `보관된 단위 포함` 필터로 다시 조회할 수 있다.

Feed는 AdSense 실제 노출을 확인한 뒤 필요한 슬롯 키의 `enabled`를 각각 `true`로 전환하면 2번째·5번째 카드 직전(index 1, 4)에 삽입한다. 그전에는 공백을 포함한 광고 DOM을 만들지 않는다. Search는 현재 동일 위치에서 활성화되어 Sidebar와 같이 최소 공간을 예약한 뒤 뷰포트 300px 전부터 AdSense를 요청하고 `unfilled`이면 쿠팡 다이나믹 위젯으로 전환한다.

### 2.1 쿠팡 fallback 지면 구성

쿠팡 파트너스에서 300×250 다이나믹 iframe 지원을 확인하고 지면별 위젯을 생성했다. 동적 상품은 위치별로 다른 카테고리를 사용하지만 실제 노출 상품은 쿠팡 응답에 따라 달라진다.

Feed fallback 설정과 widget ID는 재활성화를 위해 보존하지만 해당 슬롯 키가 비활성인 동안 호출하지 않는다. Search fallback은 활성 상태다.

| 지면           | fallback     | 카테고리      | 광고·widget ID | 반응형 조건    |
| -------------- | ------------ | ------------- | -------------- | -------------- |
| PostTop        | 고정 320×50  | 범용          | `1012831`      | PC·Mobile 공통 |
| Feed index 1   | 동적 300×250 | 주방용품      | `1013218`      | PC·Mobile 공통 |
| Feed index 4   | 동적 300×250 | 식품          | `1013216`      | PC·Mobile 공통 |
| Article 1      | 동적 300×250 | 뷰티          | `1013228`      | PC·Mobile 공통 |
| Article 2      | 동적 300×250 | 생활용품      | `1013219`      | PC·Mobile 공통 |
| Search index 1 | 동적 300×250 | 식품          | `1013216`      | PC·Mobile 공통 |
| Search index 4 | 동적 300×250 | 뷰티          | `1013228`      | PC·Mobile 공통 |
| Sidebar        | 동적 300×250 | 헬스·건강식품 | `1013229`      | PC `lg` 이상만 |

- Production 운영 플래그가 켜진 경로에서는 AdSense가 `data-ad-status="unfilled"`를 확정한 뒤에만 쿠팡 이미지 URL 또는 동적 iframe `src`를 설정한다. `filled`, `unfill-optimized`, 오류, 차단, 상태 미확인에는 쿠팡 네트워크 요청을 만들지 않는다.
- PostTop은 기존 즉시 로딩 정책을 유지한다. 나머지는 AdSense 지연 요청 범위와 연동하며, `unfilled` 확정 시 슬롯이 아직 호출 범위 밖이면 쿠팡도 계속 지연한다.
- Mobile에서 숨겨지는 Sidebar는 광고 DOM 등록 여부와 관계없이 AdSense 경매, 쿠팡 이미지, 동적 위젯 스크립트·iframe 요청을 모두 만들지 않는다.
- 고정 배너는 원본 비율과 명시 크기를 유지한다. 동적 위젯은 공급 코드가 요구하는 최소 크기를 예약하고 `overflow-hidden`으로 상품, CTA, 광고 표기를 자르지 않으며 field p75 CLS 0.1 이하를 검증한다.
- 고정 쿠팡 fallback은 `role="complementary"`, 광고 접근성 라벨, `rel="sponsored noopener"`를 유지한다. 동적 iframe에도 광고 라벨과 제목을 제공하며, 실패 시 다른 쿠팡 광고로 연쇄 요청하지 않고 기존 예약 영역을 provider `none`으로 남긴다.
- 같은 페이지의 Feed·Article 반복 슬롯은 서로 다른 광고 식별자를 사용한다. 다만 동적 위젯의 실제 상품 다양성은 쿠팡 응답에 따라 달라지므로 ID 분리만으로 서로 다른 상품 노출을 보장하지 않는다.
- 다이나믹 iframe은 교차 출처이므로 앱의 DOM click listener로 내부 상품 클릭을 감지할 수 없다. 쿠팡 리포트의 클릭·수익을 기준으로 확인하고 GA4 `ad_click`은 고정 anchor fallback에만 기록한다.
- 모바일 핵심 지면에는 반복 구매 가능성이 높은 주방용품·식품·뷰티·생활용품을 배치한다. Feed는 주방용품, 식품 순서로 재활성화에 대비하고, 활성 Article은 뷰티, 생활용품 순서로 성과를 측정한다.
- Sidebar의 헬스·건강식품은 PC에서만 노출되므로 모바일 성과와 합산해 카테고리 우열을 판단하지 않는다. 기기·지면별 슬롯 조회 대비 쿠팡 클릭·주문·수익을 비교하며, 쿠팡 리포트가 widget ID 구분을 제공하지 않으면 생성 코드에서 지원하는 별도 추적 식별자를 사용한다.
- 카테고리 실험 중에는 위치·크기·호출 조건을 고정한다. 총수익보다 슬롯 조회당 클릭률, 주문 전환율, 슬롯 조회 1,000회당 수익을 우선 비교하고 충분한 노출이 쌓이기 전에는 카테고리를 교체하지 않는다.

## 3. 코드 구성

| 경로                                 | 역할                                          |
| ------------------------------------ | --------------------------------------------- |
| `shared/constants/ad.ts`             | 운영 플래그, AdSense ID, 쿠팡 배너 중앙 설정  |
| `shared/components/ad/AdSlot.astro`  | 최소 예약 영역과 슬롯 메타데이터              |
| `shared/lib/ad/gpt-sample.ts`        | Local·Development GPT 공개 샘플과 상태 marker |
| `shared/lib/ad/mediation.ts`         | 단일 요청, 지연 로딩, `data-ad-status` 중재   |
| `shared/lib/analytics/ad-tracker.ts` | provider별 노출·조회 및 쿠팡 클릭 추적        |

## 4. Production GitHub Variable

| 변수                          | 값/용도                              |
| ----------------------------- | ------------------------------------ |
| `PUBLIC_AD_MEDIATION_ENABLED` | 승인 전 `false`, 승인·검증 후 `true` |

publisher client ID, unit ID, layout key는 공개 식별자이므로 코드에 고정한다. Repository Variable은 운영 활성 플래그만 관리한다. Local·Development의 GPT 공개 샘플은 운영 unit ID를 사용하지 않으며 Production에서는 production 빌드 가드로 제거한다.

2026-08-03 사용자 승인에 따라 `PUBLIC_AD_MEDIATION_ENABLED=true`로 전환했다. 이 값은 다음 Production 빌드·배포부터 적용된다. 기존 `PUBLIC_ADSENSE_*_SLOT_ID` Repository Variables 5개는 workflow에서 더 이상 참조하지 않는 legacy 값이며, 외부 설정 정리 승인을 받은 뒤 삭제할 수 있다.

## 5. 미결 사항과 승인 후 체크리스트

현재 코드·광고 단위·문서 연결과 Local·Development GPT 미리보기는 완료했다. 2026-08-03 기준 Supabase REST 응답 `200`과 Client SSG 86페이지 전체 빌드를 확인했으므로 `fetchCategoryTree: TypeError: fetch failed`는 샌드박스 DNS 제한에 의한 검증 환경 오류로 종결한다.

승인 전에는 긴 게시글 In-article, Mobile/PC Display GPT 미리보기와 다음 Production 배포의 슬롯 요청을 검증한다. 활성 Search는 검색 결과 변경 시 슬롯 재생성·지연 요청·쿠팡 전환을 검증하고, Feed는 승인 후 활성화해 무한스크롤을 검증한다. CMP·실제 광고 상태·GA4·field CLS는 AdSense 승인과 Production 트래픽이 있어야 완료할 수 있다.

1. 코드의 Display/Native unit ID와 In-feed layout key가 AdSense 콘솔 값과 일치하는지 확인한다.
2. Google 인증 CMP 메시지가 게시 국가에서 정상 노출되는지 확인한다.
3. Local·Development에서 GPT 공식 샘플 외 AdSense·쿠팡 네트워크 요청과 GA4 광고 이벤트가 0건인지 확인한다. GPT `NO FILL`과 `LOAD FAILED`가 구분되고 provider `none`인지 확인한다.
4. 다음 Production 빌드·배포에서 활성 플래그가 반영되고 각 슬롯의 `adsbygoogle.push`가 정확히 1회인지 확인한다.
5. `filled`, `unfilled`, `unfill-optimized`(provider `adsense`), 차단/오류 시나리오를 확인하고 무한스크롤·본문 스크롤을 포함한 field p75 CLS가 0.1 이하인지 측정한다.
6. GA4에서 `ad_provider=adsense|coupang`을 분리하고, AdSense iframe 클릭 이벤트는 수집하지 않는지 확인한다.

검색 페이지의 `noindex, follow`는 광고 운영과 무관하게 유지한다.

Production에는 `NO FILL`·`LOAD FAILED` 등 기술 marker를 표시하지 않는다.
