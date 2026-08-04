import type { CoupangDynamicAdvertisementVariant } from '@/shared/lib/ad/coupang-variant';

export type AdvertisementPlacement = 'feed' | 'search' | 'article' | 'postTop' | 'sidebar';

export const ADVERTISEMENT_SLOT_KEY = {
  feedFirst: 'feed.first',
  feedSecond: 'feed.second',
  searchFirst: 'search.first',
  searchSecond: 'search.second',
  articleFirst: 'article.1',
  articleSecond: 'article.2',
  articleThird: 'article.3',
  articleFourth: 'article.4',
  articleFifth: 'article.5',
  articleSixth: 'article.6',
  articleSeventh: 'article.7',
  articleEighth: 'article.8',
  articleNinth: 'article.9',
  articleTenth: 'article.10',
  postTop: 'postTop',
  sidebar: 'sidebar',
} as const;

export const ADVERTISEMENT_ARTICLE_SLOT_KEYS = [
  ADVERTISEMENT_SLOT_KEY.articleFirst,
  ADVERTISEMENT_SLOT_KEY.articleSecond,
  ADVERTISEMENT_SLOT_KEY.articleThird,
  ADVERTISEMENT_SLOT_KEY.articleFourth,
  ADVERTISEMENT_SLOT_KEY.articleFifth,
  ADVERTISEMENT_SLOT_KEY.articleSixth,
  ADVERTISEMENT_SLOT_KEY.articleSeventh,
  ADVERTISEMENT_SLOT_KEY.articleEighth,
  ADVERTISEMENT_SLOT_KEY.articleNinth,
  ADVERTISEMENT_SLOT_KEY.articleTenth,
] as const;

export type AdvertisementSlotKey =
  (typeof ADVERTISEMENT_SLOT_KEY)[keyof typeof ADVERTISEMENT_SLOT_KEY];

export const ADVERTISEMENT_UNIT_KEY = {
  feed: 'feed',
  article: 'article',
  postTopMobile: 'postTop.mobile',
  postTopDesktop: 'postTop.desktop',
  sidebar: 'sidebar',
} as const;

export type AdvertisementUnitKey =
  (typeof ADVERTISEMENT_UNIT_KEY)[keyof typeof ADVERTISEMENT_UNIT_KEY];

export type CoupangFixedAdvertisementConfig = {
  kind: 'fixed';
  href: string;
  imageUrl: string;
  imageAlt: string;
  width: number;
  height: number;
  referrerPolicy: 'unsafe-url';
};

export type CoupangDynamicAdvertisementConfig = {
  kind: 'dynamic';
  title: string;
  defaultVariant: CoupangDynamicAdvertisementVariant;
  largeScreenVariant?: CoupangDynamicAdvertisementVariant;
  referrerPolicy: 'unsafe-url';
};

export type CoupangAdvertisementConfig =
  | CoupangFixedAdvertisementConfig
  | CoupangDynamicAdvertisementConfig;

type AdSenseConfig = {
  clientId: string | null;
  units: Record<AdvertisementUnitKey, AdSenseUnitConfig | null>;
};

export type AdSenseUnitConfig = {
  slotId: string;
  format: 'fixed' | 'fluid';
  layout?: 'in-article';
  layoutKey?: string;
};

type AdvertisementMediationConfig = {
  enabled: boolean;
  previewProvider: 'gpt-sample' | null;
  slots: Record<AdvertisementSlotKey, AdvertisementSlotConfig>;
  adsense: AdSenseConfig;
  coupang: Record<AdvertisementPlacement, readonly CoupangAdvertisementConfig[]>;
};

export type AdvertisementSlotConfig = {
  enabled: boolean;
  placement: AdvertisementPlacement;
  adsenseUnitKey: AdvertisementUnitKey;
  largeScreenAdSenseUnitKey?: AdvertisementUnitKey;
};

const normalizeAdSenseClientId = (value: string | undefined): string | null =>
  value && /^ca-pub-\d+$/.test(value) ? value : null;

const isProductionBuild = import.meta.env.PUBLIC_STAGE === 'production';
const adSenseClientId = 'ca-pub-8569467907518315';

const feedAdSenseUnit: AdSenseUnitConfig = {
  slotId: '6392269057',
  format: 'fluid',
  layoutKey: '-6t+ed+2i-1n-4w',
};

const articleAdSenseUnit: AdSenseUnitConfig = {
  slotId: '5322463062',
  format: 'fluid',
  layout: 'in-article',
};

const coupangPostTopAdvertisement: CoupangAdvertisementConfig = {
  kind: 'fixed',
  href: 'https://link.coupang.com/a/fXfpeQKCAe',
  imageUrl:
    'https://ads-partners.coupang.com/banners/1013691?trackingCode=AF7680558&subId=&traceId=V0-301-7e6e8eb8ddfa1bfb-I1013691&w=728&h=90',
  imageAlt: '쿠팡 로켓 반려동물용품 카테고리 배너',
  width: 728,
  height: 90,
  referrerPolicy: 'unsafe-url',
};

const createCoupangDynamicAdvertisementVariant = (
  widgetIdentifier: string,
  width: number,
  height: number,
): CoupangDynamicAdvertisementVariant => ({
  sourceUrl: `https://ads-partners.coupang.com/widgets.html?id=${widgetIdentifier}&template=carousel&trackingCode=AF7680558&subId=&width=${width}&height=${height}&tsource=`,
  width,
  height,
});

const createCoupangDynamicAdvertisement = (
  widgetIdentifier: string,
  title: string,
  largeScreenWidgetIdentifier?: string,
): CoupangDynamicAdvertisementConfig => ({
  kind: 'dynamic',
  title,
  defaultVariant: createCoupangDynamicAdvertisementVariant(widgetIdentifier, 300, 250),
  largeScreenVariant: largeScreenWidgetIdentifier
    ? createCoupangDynamicAdvertisementVariant(largeScreenWidgetIdentifier, 680, 140)
    : undefined,
  referrerPolicy: 'unsafe-url',
});

const coupangFeedAdvertisements = [
  createCoupangDynamicAdvertisement('1013218', '쿠팡 주방용품 베스트 상품', '1014089'),
  createCoupangDynamicAdvertisement('1013216', '쿠팡 식품 베스트 상품', '1014085'),
] as const;

const coupangArticleAdvertisements = [
  createCoupangDynamicAdvertisement('1013216', '쿠팡 식품 베스트 상품', '1014085'),
  createCoupangDynamicAdvertisement('1013219', '쿠팡 생활용품 베스트 상품', '1014086'),
  createCoupangDynamicAdvertisement('1013228', '쿠팡 뷰티 베스트 상품', '1014087'),
  createCoupangDynamicAdvertisement('1013229', '쿠팡 헬스/건강식품 베스트 상품', '1014088'),
  createCoupangDynamicAdvertisement('1013218', '쿠팡 주방용품 베스트 상품', '1014089'),
  createCoupangDynamicAdvertisement('1013426', '쿠팡 반려동물용품 베스트 상품', '1014090'),
  createCoupangDynamicAdvertisement('1013427', '쿠팡 출산/유아동 베스트 상품', '1014091'),
  createCoupangDynamicAdvertisement('1013428', '쿠팡 홈인테리어 베스트 상품', '1014092'),
  createCoupangDynamicAdvertisement('1013429', '쿠팡 스포츠/레저 베스트 상품', '1014093'),
  createCoupangDynamicAdvertisement('1013220', '쿠팡 가전디지털 베스트 상품', '1014094'),
] as const;

const coupangSearchAdvertisements = [
  createCoupangDynamicAdvertisement('1013216', '쿠팡 식품 베스트 상품', '1014085'),
  createCoupangDynamicAdvertisement('1013228', '쿠팡 뷰티 베스트 상품', '1014087'),
] as const;

const coupangSidebarAdvertisements = [
  createCoupangDynamicAdvertisement('1013229', '쿠팡 헬스/건강식품 베스트 상품'),
] as const;

export const ADVERTISEMENT_MEDIATION_CONFIG: AdvertisementMediationConfig = {
  enabled: isProductionBuild && import.meta.env.PUBLIC_AD_MEDIATION_ENABLED === 'true',
  previewProvider: isProductionBuild ? null : 'gpt-sample',
  slots: {
    [ADVERTISEMENT_SLOT_KEY.feedFirst]: {
      enabled: false,
      placement: 'feed',
      adsenseUnitKey: ADVERTISEMENT_UNIT_KEY.feed,
    },
    [ADVERTISEMENT_SLOT_KEY.feedSecond]: {
      enabled: false,
      placement: 'feed',
      adsenseUnitKey: ADVERTISEMENT_UNIT_KEY.feed,
    },
    [ADVERTISEMENT_SLOT_KEY.searchFirst]: {
      enabled: true,
      placement: 'search',
      adsenseUnitKey: ADVERTISEMENT_UNIT_KEY.feed,
    },
    [ADVERTISEMENT_SLOT_KEY.searchSecond]: {
      enabled: true,
      placement: 'search',
      adsenseUnitKey: ADVERTISEMENT_UNIT_KEY.feed,
    },
    [ADVERTISEMENT_SLOT_KEY.articleFirst]: {
      enabled: true,
      placement: 'article',
      adsenseUnitKey: ADVERTISEMENT_UNIT_KEY.article,
    },
    [ADVERTISEMENT_SLOT_KEY.articleSecond]: {
      enabled: true,
      placement: 'article',
      adsenseUnitKey: ADVERTISEMENT_UNIT_KEY.article,
    },
    [ADVERTISEMENT_SLOT_KEY.articleThird]: {
      enabled: true,
      placement: 'article',
      adsenseUnitKey: ADVERTISEMENT_UNIT_KEY.article,
    },
    [ADVERTISEMENT_SLOT_KEY.articleFourth]: {
      enabled: true,
      placement: 'article',
      adsenseUnitKey: ADVERTISEMENT_UNIT_KEY.article,
    },
    [ADVERTISEMENT_SLOT_KEY.articleFifth]: {
      enabled: true,
      placement: 'article',
      adsenseUnitKey: ADVERTISEMENT_UNIT_KEY.article,
    },
    [ADVERTISEMENT_SLOT_KEY.articleSixth]: {
      enabled: true,
      placement: 'article',
      adsenseUnitKey: ADVERTISEMENT_UNIT_KEY.article,
    },
    [ADVERTISEMENT_SLOT_KEY.articleSeventh]: {
      enabled: true,
      placement: 'article',
      adsenseUnitKey: ADVERTISEMENT_UNIT_KEY.article,
    },
    [ADVERTISEMENT_SLOT_KEY.articleEighth]: {
      enabled: true,
      placement: 'article',
      adsenseUnitKey: ADVERTISEMENT_UNIT_KEY.article,
    },
    [ADVERTISEMENT_SLOT_KEY.articleNinth]: {
      enabled: true,
      placement: 'article',
      adsenseUnitKey: ADVERTISEMENT_UNIT_KEY.article,
    },
    [ADVERTISEMENT_SLOT_KEY.articleTenth]: {
      enabled: true,
      placement: 'article',
      adsenseUnitKey: ADVERTISEMENT_UNIT_KEY.article,
    },
    [ADVERTISEMENT_SLOT_KEY.postTop]: {
      enabled: true,
      placement: 'postTop',
      adsenseUnitKey: ADVERTISEMENT_UNIT_KEY.postTopMobile,
      largeScreenAdSenseUnitKey: ADVERTISEMENT_UNIT_KEY.postTopDesktop,
    },
    [ADVERTISEMENT_SLOT_KEY.sidebar]: {
      enabled: true,
      placement: 'sidebar',
      adsenseUnitKey: ADVERTISEMENT_UNIT_KEY.sidebar,
    },
  },
  adsense: {
    clientId: isProductionBuild ? normalizeAdSenseClientId(adSenseClientId) : null,
    units: {
      feed: isProductionBuild ? feedAdSenseUnit : null,
      article: isProductionBuild ? articleAdSenseUnit : null,
      [ADVERTISEMENT_UNIT_KEY.postTopMobile]: isProductionBuild
        ? { slotId: '8174224200', format: 'fixed' }
        : null,
      [ADVERTISEMENT_UNIT_KEY.postTopDesktop]: isProductionBuild
        ? { slotId: '1564849758', format: 'fixed' }
        : null,
      sidebar: isProductionBuild ? { slotId: '3939731651', format: 'fixed' } : null,
    },
  },
  coupang: {
    feed: isProductionBuild ? coupangFeedAdvertisements : [],
    search: isProductionBuild ? coupangSearchAdvertisements : [],
    article: isProductionBuild ? coupangArticleAdvertisements : [],
    postTop: isProductionBuild ? [coupangPostTopAdvertisement] : [],
    sidebar: isProductionBuild ? coupangSidebarAdvertisements : [],
  },
};

/** 광고 지면 키에 대응하는 활성화 상태를 반환한다. */
export const isAdvertisementSlotEnabled = (slotKey: AdvertisementSlotKey): boolean =>
  ADVERTISEMENT_MEDIATION_CONFIG.slots[slotKey].enabled;

/** 지면과 논리 순번에 대응하는 쿠팡 fallback 설정을 반환한다. */
export const getCoupangAdvertisementConfig = (
  placement: AdvertisementPlacement,
  fallbackIndex: number,
): CoupangAdvertisementConfig | null => {
  const advertisements = ADVERTISEMENT_MEDIATION_CONFIG.coupang[placement];
  return advertisements[fallbackIndex] ?? null;
};

export const isAdSenseConfigured =
  isProductionBuild && ADVERTISEMENT_MEDIATION_CONFIG.adsense.clientId !== null;
