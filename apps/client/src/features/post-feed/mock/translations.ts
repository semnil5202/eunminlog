/**
 * Mock translation data demonstrating the PostTranslation structure.
 * Mirrors the Supabase `post_translations` table (docs/database.md).
 *
 * Coverage: post-1, post-11 in English; post-11 in Japanese.
 * This subset is intentional — Supabase queries will return no row when
 * no translation exists, which getLocalizedPost() handles via fallback.
 *
 * UNIQUE constraint (post_id, locale) is enforced at the array level —
 * no duplicate (post_id + locale) combinations are present.
 */

import type { PostTranslation } from '@/shared/types/post';

export const MOCK_TRANSLATIONS: PostTranslation[] = [
  // ──────────────────────────────────────────────
  // post-1 (광장시장 빈대떡) › English
  // ──────────────────────────────────────────────
  {
    id: 'trans-1',
    post_id: 'post-1',
    locale: 'en',
    title: 'Gwangjang Market Bindaetteok — 70 Years of Tradition',
    description:
      "Seoul's oldest traditional market hides a legendary mung-bean pancake alley. Experience crispy-outside, moist-inside bindaetteok made the same way it has been for seven decades.",
    content: `## Gwangjang Market Bindaetteok

Established in 1905, Gwangjang Market is Seoul's first permanent public market. At its heart lies the famous bindaetteok (mung-bean pancake) alley.

### Menu & Prices
- Mung-bean pancake (1 piece): KRW 4,000
- Yukhoe (raw beef): KRW 15,000
- Mayak gimbap (bite-size rolls): KRW 3,000

### Verdict
Over seven decades of hand-crafted flavour shine through every bite. Pair the perfectly drained, crispy pancakes with a glass of sweet rice wine (dongdongju) for the ultimate combo.`,
    place_name: 'Gwangjang Market Bindaetteok Alley',
    address: '88 Changgyeonggung-ro, Jongno-gu, Seoul',
    created_at: '2025-01-16T06:00:00.000Z',
    updated_at: '2025-01-16T06:00:00.000Z',
  },

  // ──────────────────────────────────────────────
  // post-11 (오사카 도톤보리 먹방) › English
  // ──────────────────────────────────────────────
  {
    id: 'trans-2',
    post_id: 'post-11',
    locale: 'en',
    title: 'Osaka Dotonbori Food Tour — Takoyaki, Kushikatsu & More',
    description:
      "A complete 3-night, 4-day Osaka food itinerary. We compare the top three takoyaki shops, dig into Shinsekai kushikatsu, and explore Kuromon Market's fresh seafood.",
    content: `## Osaka Food Tour — 3 Nights, 4 Days

### Dotonbori Takoyaki Top 3 Comparison
| Shop | Price | Highlight |
|------|-------|-----------|
| Aizuya | ¥700 / 6 pcs | Crispy outside, gooey inside |
| Dotonbori Kuidaore | ¥800 / 6 pcs | Loaded with toppings |
| Hanadako | ¥600 / 6 pcs | Budget-friendly, fast |

### Must-Visit Spots
- Kuromon Market: Opens 8 AM, eat fresh seafood on the spot
- Kushikatsu Daruma in Shinsekai: Never double-dip the sauce — it's the rule
- Namba Yatai: Evening yakiniku street stalls

### Verdict
Osaka's street-food scene rivals Tokyo at a noticeably lower price point. The city rewards anyone willing to simply walk and eat.`,
    place_name: 'Dotonbori',
    address: '1-6 Dotonbori, Chuo-ku, Osaka, Japan',
    created_at: '2025-01-07T06:00:00.000Z',
    updated_at: '2025-01-07T06:00:00.000Z',
  },

  // ──────────────────────────────────────────────
  // post-11 (오사카 도톤보리 먹방) › Japanese
  // ──────────────────────────────────────────────
  {
    id: 'trans-3',
    post_id: 'post-11',
    locale: 'ja',
    title: '大阪道頓堀グルメツアー — たこ焼き・串カツ・黒門市場を完全制覇',
    description:
      '大阪3泊4日の食い倒れ旅行記。道頓堀たこ焼き三大店比較から新世界の串カツ、黒門市場の海鮮まで徹底ガイドします。',
    content: `## 大阪グルメ旅 3泊4日

### 道頓堀たこ焼き三大店 比較
| 店名 | 価格 | ポイント |
|------|------|----------|
| 会津屋 | 700円/6個 | 外カリ中トロ |
| 道頓堀くいだおれ | 800円/6個 | 具材たっぷり |
| はなだこ | 600円/6個 | コスパ最高 |

### 必訪スポット
- 黒門市場: 朝8時開場、その場で海鮮を食べ歩き
- 新世界・串カツだるま: ソースの二度漬け厳禁ルールを守ること
- なんば屋台: 夕方から焼肉三昧

### 総評
大阪は東京よりも物価が安く、食のクオリティは決して負けていません。歩いて食べるだけで最高の旅になります。`,
    place_name: '道頓堀',
    address: '日本 大阪市 中央区 道頓堀 1-6',
    created_at: '2025-01-07T07:00:00.000Z',
    updated_at: '2025-01-07T07:00:00.000Z',
  },
];
