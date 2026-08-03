export type AdvertisementPlacement = 'feed' | 'search' | 'article' | 'postTop' | 'sidebar';

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
  sourceUrl: string;
  title: string;
  width: number;
  height: number;
  referrerPolicy: 'unsafe-url';
};

export type CoupangAdvertisementConfig =
  | CoupangFixedAdvertisementConfig
  | CoupangDynamicAdvertisementConfig;

type AdSenseConfig = {
  clientId: string | null;
  units: Record<AdvertisementPlacement, AdSenseUnitConfig | null>;
};

export type AdSenseUnitConfig = {
  slotId: string;
  format: 'auto' | 'fluid';
  layout?: 'in-article';
  layoutKey?: string;
};

type AdvertisementMediationConfig = {
  enabled: boolean;
  previewProvider: 'gpt-sample' | null;
  adsense: AdSenseConfig;
  coupang: Record<AdvertisementPlacement, readonly CoupangAdvertisementConfig[]>;
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
  href: 'https://link.coupang.com/a/fRDp3noMFM',
  imageUrl:
    'https://ads-partners.coupang.com/banners/1012831?trackingCode=AF7680558&subId=&traceId=V0-301-879dd1202e5c73b2-I1012831&w=320&h=50',
  imageAlt: '쿠팡 카테고리 배너',
  width: 320,
  height: 50,
  referrerPolicy: 'unsafe-url',
};

const coupangRectangleAdvertisement: CoupangAdvertisementConfig = {
  kind: 'fixed',
  href: 'https://link.coupang.com/a/fRDrk6SlDo',
  imageUrl:
    'https://ads-partners.coupang.com/banners/1012833?trackingCode=AF7680558&subId=&traceId=V0-301-879dd1202e5c73b2-I1012833&w=300&h=250',
  imageAlt: '쿠팡 카테고리 배너',
  width: 300,
  height: 250,
  referrerPolicy: 'unsafe-url',
};

const createCoupangDynamicAdvertisement = (
  widgetIdentifier: string,
  title: string,
): CoupangDynamicAdvertisementConfig => ({
  kind: 'dynamic',
  sourceUrl: `https://ads-partners.coupang.com/widgets.html?id=${widgetIdentifier}&template=carousel&trackingCode=AF7680558&subId=&width=300&height=250&tsource=`,
  title,
  width: 300,
  height: 250,
  referrerPolicy: 'unsafe-url',
});

const coupangFeedAdvertisements = [
  createCoupangDynamicAdvertisement('1013216', '쿠팡 식품 베스트 상품'),
  createCoupangDynamicAdvertisement('1013228', '쿠팡 뷰티 베스트 상품'),
] as const;

const coupangArticleAdvertisements = [
  createCoupangDynamicAdvertisement('1013218', '쿠팡 주방용품 베스트 상품'),
  createCoupangDynamicAdvertisement('1013219', '쿠팡 생활용품 베스트 상품'),
] as const;

const coupangSidebarAdvertisements = [
  createCoupangDynamicAdvertisement('1013229', '쿠팡 헬스/건강식품 베스트 상품'),
] as const;

export const ADVERTISEMENT_MEDIATION_CONFIG: AdvertisementMediationConfig = {
  enabled: isProductionBuild && import.meta.env.PUBLIC_AD_MEDIATION_ENABLED === 'true',
  previewProvider: isProductionBuild ? null : 'gpt-sample',
  adsense: {
    clientId: isProductionBuild ? normalizeAdSenseClientId(adSenseClientId) : null,
    units: {
      feed: isProductionBuild ? feedAdSenseUnit : null,
      search: isProductionBuild ? feedAdSenseUnit : null,
      article: isProductionBuild ? articleAdSenseUnit : null,
      postTop: isProductionBuild ? { slotId: '5190868026', format: 'auto' } : null,
      sidebar: isProductionBuild ? { slotId: '3048186343', format: 'auto' } : null,
    },
  },
  coupang: {
    feed: isProductionBuild ? coupangFeedAdvertisements : [],
    search: isProductionBuild ? [coupangRectangleAdvertisement] : [],
    article: isProductionBuild ? coupangArticleAdvertisements : [],
    postTop: isProductionBuild ? [coupangPostTopAdvertisement] : [],
    sidebar: isProductionBuild ? coupangSidebarAdvertisements : [],
  },
};

/** 지면과 논리 순번에 대응하는 쿠팡 fallback 설정을 반환한다. */
export const getCoupangAdvertisementConfig = (
  placement: AdvertisementPlacement,
  fallbackIndex: number,
): CoupangAdvertisementConfig | null => {
  const advertisements = ADVERTISEMENT_MEDIATION_CONFIG.coupang[placement];
  if (advertisements.length === 0) return null;
  return advertisements[fallbackIndex % advertisements.length] ?? advertisements[0] ?? null;
};

export const isAdSenseConfigured =
  isProductionBuild && ADVERTISEMENT_MEDIATION_CONFIG.adsense.clientId !== null;
