import { trackEvent } from './gtag';

type AdvertisementProvider = 'adsense' | 'coupang';

type TrackedSlotState = {
  element: HTMLElement;
  isIntersecting: boolean;
  viewTimer: number | null;
};

let pageType = 'list';
let sharedObserver: IntersectionObserver | null = null;
const trackedSlots = new WeakMap<HTMLElement, TrackedSlotState>();
const impressedProviders = new WeakMap<HTMLElement, Set<AdvertisementProvider>>();
const viewedProviders = new WeakMap<HTMLElement, Set<AdvertisementProvider>>();

const getProvider = (element: HTMLElement): AdvertisementProvider | null => {
  const provider = element.dataset.adActiveProvider;
  return provider === 'adsense' || provider === 'coupang' ? provider : null;
};

const trackImpressionAndView = (state: TrackedSlotState): void => {
  if (!state.isIntersecting) return;
  const provider = getProvider(state.element);
  if (!provider) return;

  const impressedForElement =
    impressedProviders.get(state.element) ?? new Set<AdvertisementProvider>();
  if (!impressedForElement.has(provider)) {
    impressedForElement.add(provider);
    impressedProviders.set(state.element, impressedForElement);
    trackEvent('ad_impression', {
      ad_slot: state.element.dataset.adSlot ?? 'unknown',
      ad_format: state.element.dataset.adFormat ?? 'unknown',
      ad_position: state.element.dataset.adPosition ?? 'unknown',
      ad_provider: provider,
      page_type: pageType,
    });
  }

  const viewedForElement = viewedProviders.get(state.element) ?? new Set<AdvertisementProvider>();
  if (viewedForElement.has(provider) || state.viewTimer !== null) return;
  state.viewTimer = window.setTimeout(() => {
    if (!state.isIntersecting || getProvider(state.element) !== provider) {
      state.viewTimer = null;
      return;
    }
    viewedForElement.add(provider);
    viewedProviders.set(state.element, viewedForElement);
    state.viewTimer = null;
    trackEvent('ad_view', {
      ad_slot: state.element.dataset.adSlot ?? 'unknown',
      ad_format: state.element.dataset.adFormat ?? 'unknown',
      ad_position: state.element.dataset.adPosition ?? 'unknown',
      ad_provider: provider,
      page_type: pageType,
      view_duration_ms: 1000,
    });
  }, 1000);
};

const clearViewTimer = (state: TrackedSlotState): void => {
  if (state.viewTimer === null) return;
  window.clearTimeout(state.viewTimer);
  state.viewTimer = null;
};

const getObserver = (): IntersectionObserver => {
  if (sharedObserver) return sharedObserver;
  sharedObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const element = entry.target as HTMLElement;
        const state = trackedSlots.get(element);
        if (!state) continue;
        state.isIntersecting = entry.isIntersecting;
        if (entry.isIntersecting) trackImpressionAndView(state);
        else clearViewTimer(state);
      }
    },
    { threshold: 0.5 },
  );
  return sharedObserver;
};

/** 광고 슬롯을 노출·조회 추적에 등록한다. */
export function observeNewAdSlot(element: HTMLElement): void {
  if (trackedSlots.has(element) || !element.dataset.adSlot) return;
  const state: TrackedSlotState = { element, isIntersecting: false, viewTimer: null };
  trackedSlots.set(element, state);
  getObserver().observe(element);

  element.addEventListener('ad-provider-change', () => {
    clearViewTimer(state);
    trackImpressionAndView(state);
  });
  element.addEventListener('click', (event) => {
    const providerElement = (event.target as HTMLElement).closest<HTMLElement>(
      '[data-ad-provider]',
    );
    const provider = providerElement?.dataset.adProvider;
    if (provider !== 'coupang') return;
    trackEvent('ad_click', {
      ad_slot: element.dataset.adSlot ?? 'unknown',
      ad_format: element.dataset.adFormat ?? 'unknown',
      ad_position: element.dataset.adPosition ?? 'unknown',
      ad_provider: provider,
      page_type: pageType,
    });
  });
}

/** 다시 렌더링할 영역 안의 광고 슬롯 observer와 타이머를 해제한다. */
export function unobserveAdSlotsWithin(container: HTMLElement): void {
  container.querySelectorAll<HTMLElement>('[data-ad-slot]').forEach((element) => {
    const state = trackedSlots.get(element);
    if (state) clearViewTimer(state);
    sharedObserver?.unobserve(element);
    trackedSlots.delete(element);
  });
}

/** 현재 문서와 동적으로 추가되는 광고 슬롯 추적을 시작한다. */
export function initAdTracker(currentPageType: string): void {
  pageType = currentPageType;
  document.querySelectorAll<HTMLElement>('[data-ad-slot]').forEach(observeNewAdSlot);
  document.addEventListener('ad-slot-created', (event) => {
    const element = (event as CustomEvent<HTMLElement>).detail;
    if (element) observeNewAdSlot(element);
  });
}
