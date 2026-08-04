export const COUPANG_LARGE_SCREEN_MEDIA_QUERY = '(min-width: 1280px)';

export type CoupangDynamicAdvertisementVariant = {
  sourceUrl: string;
  width: number;
  height: number;
};

/** 현재 화면에 사용할 쿠팡 다이나믹 광고 크기 변형을 반환한다. */
export const selectCoupangDynamicAdvertisementVariant = (
  defaultVariant: CoupangDynamicAdvertisementVariant,
  largeScreenVariant: CoupangDynamicAdvertisementVariant | undefined,
  isLargeScreen: boolean,
): CoupangDynamicAdvertisementVariant =>
  isLargeScreen && largeScreenVariant ? largeScreenVariant : defaultVariant;
