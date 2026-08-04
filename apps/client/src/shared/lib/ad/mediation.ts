import {
  ADVERTISEMENT_MEDIATION_CONFIG,
  getCoupangAdvertisementConfig,
  type AdSenseUnitConfig,
  type AdvertisementPlacement,
  type AdvertisementSlotKey,
  type CoupangAdvertisementConfig,
} from '@/shared/constants/ad';
import {
  COUPANG_LARGE_SCREEN_MEDIA_QUERY,
  selectCoupangDynamicAdvertisementVariant,
} from './coupang-variant';
import {
  createGooglePublisherTagSampleElement,
  displayGooglePublisherTagSample,
  destroyGooglePublisherTagSample,
  prepareGooglePublisherTagSample,
} from './gpt-sample';

type AdSenseQueue = Array<Record<string, never>>;
type AdSenseWindow = Window & { adsbygoogle?: AdSenseQueue };
type RegisteredAdSenseSlot = {
  clientId: string;
  unit: AdSenseUnitConfig;
  coupangElement: HTMLElement | null;
};

const registeredSlots = new WeakSet<HTMLElement>();
const requestedSlots = new WeakSet<HTMLElement>();
const statusObservers = new WeakMap<HTMLElement, MutationObserver>();
const registeredAdSenseSlots = new WeakMap<HTMLElement, RegisteredAdSenseSlot>();
const adSenseRequestAcceptanceObservers = new WeakMap<HTMLElement, MutationObserver>();
const adSenseRequestQueue: HTMLElement[] = [];
let activeAdSenseRequestContainer: HTMLElement | null = null;
let lazySlotObserver: IntersectionObserver | null = null;
let mediationInitialized = false;

const LARGE_SCREEN_MEDIA_QUERY = '(min-width: 1024px)';

const announceProviderChange = (
  container: HTMLElement,
  provider: 'adsense' | 'coupang' | 'none',
): void => {
  container.dataset.adActiveProvider = provider;
  if (provider === 'none') {
    container.removeAttribute('role');
    container.removeAttribute('aria-label');
  } else {
    container.setAttribute('role', 'complementary');
    container.setAttribute('aria-label', container.dataset.advertisementLabel ?? 'Advertisement');
  }
  container.dispatchEvent(new CustomEvent('ad-provider-change', { bubbles: true }));
};

const showReservedSpace = (
  container: HTMLElement,
  adsenseElement: HTMLElement | null,
  coupangElement: HTMLElement | null,
): void => {
  if (adsenseElement) {
    adsenseElement.style.display = 'block';
    adsenseElement.style.visibility = 'visible';
    adsenseElement.style.opacity = '0';
    adsenseElement.style.pointerEvents = 'none';
  }
  if (coupangElement) coupangElement.hidden = true;
  announceProviderChange(container, 'none');
};

const showAdsense = (
  container: HTMLElement,
  adsenseElement: HTMLElement,
  coupangElement: HTMLElement | null,
): void => {
  adsenseElement.style.display = 'block';
  adsenseElement.style.visibility = 'visible';
  adsenseElement.style.opacity = '1';
  adsenseElement.style.pointerEvents = 'auto';
  if (coupangElement) coupangElement.hidden = true;
  announceProviderChange(container, 'adsense');
};

const showCoupang = (
  container: HTMLElement,
  adsenseElement: HTMLElement | null,
  coupangElement: HTMLElement,
): void => {
  if (adsenseElement) {
    adsenseElement.style.display = 'none';
    adsenseElement.style.visibility = 'hidden';
  }
  const coupangImage = coupangElement.querySelector<HTMLImageElement>(
    'img[data-advertisement-source]',
  );
  const advertisementSource = coupangImage?.dataset.advertisementSource;
  if (coupangImage && advertisementSource && !coupangImage.hasAttribute('src')) {
    coupangImage.src = advertisementSource;
  }
  const coupangFrame = coupangElement.querySelector<HTMLIFrameElement>(
    'iframe[data-advertisement-source]',
  );
  const frameSource = coupangFrame
    ? selectCoupangDynamicAdvertisementVariant(
        {
          sourceUrl: coupangFrame.dataset.advertisementSource ?? '',
          width: Number.parseInt(coupangFrame.dataset.advertisementWidth ?? '0', 10),
          height: Number.parseInt(coupangFrame.dataset.advertisementHeight ?? '0', 10),
        },
        coupangFrame.dataset.largeScreenAdvertisementSource
          ? {
              sourceUrl: coupangFrame.dataset.largeScreenAdvertisementSource,
              width: Number.parseInt(coupangFrame.dataset.largeScreenAdvertisementWidth ?? '0', 10),
              height: Number.parseInt(
                coupangFrame.dataset.largeScreenAdvertisementHeight ?? '0',
                10,
              ),
            }
          : undefined,
        window.matchMedia(COUPANG_LARGE_SCREEN_MEDIA_QUERY).matches,
      )
    : null;
  if (coupangFrame && frameSource && !coupangFrame.hasAttribute('src')) {
    coupangFrame.addEventListener(
      'error',
      () => showReservedSpace(container, adsenseElement, coupangElement),
      { once: true },
    );
    coupangFrame.width = String(frameSource.width);
    coupangFrame.height = String(frameSource.height);
    coupangFrame.src = frameSource.sourceUrl;
  }
  coupangElement.hidden = false;
  announceProviderChange(container, 'coupang');
};

const createCoupangElement = (
  coupangConfig: CoupangAdvertisementConfig,
  advertisementLabel: string,
): HTMLElement => {
  if (coupangConfig.kind === 'dynamic') {
    const wrapper = document.createElement('div');
    wrapper.className = 'absolute inset-0 flex items-center justify-center';
    wrapper.dataset.adProvider = 'coupang';
    wrapper.dataset.adCreativeType = 'dynamic';
    wrapper.hidden = true;

    const label = document.createElement('span');
    label.className =
      'pointer-events-none absolute left-1 top-1 z-10 bg-white/90 px-1.5 py-0.5 text-caption1 text-gray-600';
    label.textContent = advertisementLabel;

    const frame = document.createElement('iframe');
    frame.dataset.advertisementSource = coupangConfig.defaultVariant.sourceUrl;
    frame.dataset.advertisementWidth = String(coupangConfig.defaultVariant.width);
    frame.dataset.advertisementHeight = String(coupangConfig.defaultVariant.height);
    if (coupangConfig.largeScreenVariant) {
      frame.dataset.largeScreenAdvertisementSource = coupangConfig.largeScreenVariant.sourceUrl;
      frame.dataset.largeScreenAdvertisementWidth = String(coupangConfig.largeScreenVariant.width);
      frame.dataset.largeScreenAdvertisementHeight = String(
        coupangConfig.largeScreenVariant.height,
      );
    }
    frame.title = coupangConfig.title;
    frame.width = String(coupangConfig.defaultVariant.width);
    frame.height = String(coupangConfig.defaultVariant.height);
    frame.loading = 'lazy';
    frame.referrerPolicy = coupangConfig.referrerPolicy;
    frame.scrolling = 'no';
    frame.setAttribute('frameborder', '0');
    frame.setAttribute('browsingtopics', '');
    frame.className = 'max-h-full max-w-full border-0';

    wrapper.append(label, frame);
    return wrapper;
  }

  const anchor = document.createElement('a');
  anchor.href = coupangConfig.href;
  anchor.target = '_blank';
  anchor.rel = 'sponsored noopener';
  anchor.referrerPolicy = coupangConfig.referrerPolicy;
  anchor.className = 'absolute inset-0 flex items-center justify-center';
  anchor.dataset.adProvider = 'coupang';
  anchor.hidden = true;

  const label = document.createElement('span');
  label.className = 'absolute left-1 top-1 bg-white/90 px-1.5 py-0.5 text-caption1 text-gray-600';
  label.textContent = advertisementLabel;

  const image = document.createElement('img');
  image.dataset.advertisementSource = coupangConfig.imageUrl;
  image.alt = coupangConfig.imageAlt;
  image.width = coupangConfig.width;
  image.height = coupangConfig.height;
  image.loading = 'lazy';
  image.decoding = 'async';
  image.className = 'max-h-full max-w-full object-contain';

  anchor.append(label, image);
  return anchor;
};

const applyFixedAdSenseSize = (container: HTMLElement, adsenseElement: HTMLElement): void => {
  if (adsenseElement.dataset.advertisementFixedSize !== 'true') return;

  const containerWidth = container.clientWidth;
  const containerHeight = container.clientHeight;
  if (containerWidth === 0 || containerHeight === 0) return;

  adsenseElement.style.width = `${containerWidth}px`;
  adsenseElement.style.height = `${containerHeight}px`;
};

const createAdSenseElement = (
  container: HTMLElement,
  clientId: string,
  unit: AdSenseUnitConfig,
): HTMLElement => {
  const adsenseElement = document.createElement('ins');
  adsenseElement.className = 'adsbygoogle block w-full';
  adsenseElement.style.display = 'block';
  adsenseElement.style.visibility = 'visible';
  adsenseElement.dataset.adClient = clientId;
  adsenseElement.dataset.adSlot = unit.slotId;
  adsenseElement.dataset.adProvider = 'adsense';

  if (unit.format === 'fixed') {
    adsenseElement.dataset.advertisementFixedSize = 'true';
    applyFixedAdSenseSize(container, adsenseElement);
  } else {
    adsenseElement.dataset.adFormat = unit.format;
  }
  if (unit.layoutKey) adsenseElement.dataset.adLayoutKey = unit.layoutKey;
  if (unit.layout) {
    adsenseElement.dataset.adLayout = unit.layout;
    adsenseElement.dataset.fullWidthResponsive = 'true';
    adsenseElement.style.textAlign = 'center';
  }
  return adsenseElement;
};

const disconnectAdSenseStatusObserver = (container: HTMLElement): void => {
  statusObservers.get(container)?.disconnect();
  statusObservers.delete(container);
};

const disconnectAdSenseRequestAcceptanceObserver = (container: HTMLElement): void => {
  adSenseRequestAcceptanceObservers.get(container)?.disconnect();
  adSenseRequestAcceptanceObservers.delete(container);
};

const observeAdSenseStatus = (
  container: HTMLElement,
  adsenseElement: HTMLElement,
  coupangElement: HTMLElement | null,
): void => {
  const statusObserver = new MutationObserver(() => {
    const status = adsenseElement.dataset.adStatus;
    if (status === 'filled') {
      showAdsense(container, adsenseElement, coupangElement);
      disconnectAdSenseStatusObserver(container);
      return;
    }
    if (status === 'unfill-optimized') {
      showAdsense(container, adsenseElement, coupangElement);
      disconnectAdSenseStatusObserver(container);
      return;
    }
    if (status === 'unfilled') {
      if (coupangElement) {
        showCoupang(container, adsenseElement, coupangElement);
      } else {
        showReservedSpace(container, adsenseElement, null);
      }
      disconnectAdSenseStatusObserver(container);
      return;
    }
    showReservedSpace(container, adsenseElement, coupangElement);
  });

  statusObserver.observe(adsenseElement, {
    attributes: true,
    attributeFilter: ['data-ad-status'],
  });
  statusObservers.set(container, statusObserver);
};

const processNextAdSenseRequest = (): void => {
  if (activeAdSenseRequestContainer) return;

  const container = adSenseRequestQueue.shift();
  if (!container) return;
  if (!registeredSlots.has(container) || !container.isConnected) {
    requestedSlots.delete(container);
    processNextAdSenseRequest();
    return;
  }

  const registeredAdSenseSlot = registeredAdSenseSlots.get(container);
  if (!registeredAdSenseSlot) {
    requestedSlots.delete(container);
    processNextAdSenseRequest();
    return;
  }

  const { clientId, unit, coupangElement } = registeredAdSenseSlot;
  const adsenseElement = createAdSenseElement(container, clientId, unit);
  container.appendChild(adsenseElement);
  observeAdSenseStatus(container, adsenseElement, coupangElement);
  activeAdSenseRequestContainer = container;

  const requestAcceptanceObserver = new MutationObserver(() => {
    if (!adsenseElement.dataset.adsbygoogleStatus) return;
    disconnectAdSenseRequestAcceptanceObserver(container);
    activeAdSenseRequestContainer = null;
    processNextAdSenseRequest();
  });
  requestAcceptanceObserver.observe(adsenseElement, {
    attributes: true,
    attributeFilter: ['data-adsbygoogle-status'],
  });
  adSenseRequestAcceptanceObservers.set(container, requestAcceptanceObserver);

  try {
    const adsenseWindow = window as AdSenseWindow;
    (adsenseWindow.adsbygoogle = adsenseWindow.adsbygoogle || []).push({});
  } catch {
    disconnectAdSenseRequestAcceptanceObserver(container);
    showReservedSpace(container, adsenseElement, coupangElement);
    activeAdSenseRequestContainer = null;
    processNextAdSenseRequest();
  }
};

const enqueueAdSenseRequest = (container: HTMLElement): void => {
  if (requestedSlots.has(container)) return;
  requestedSlots.add(container);
  adSenseRequestQueue.push(container);
  processNextAdSenseRequest();
};

const getLazyAdvertisementObserver = (): IntersectionObserver => {
  if (lazySlotObserver) return lazySlotObserver;

  lazySlotObserver = new IntersectionObserver(
    (entries, observer) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const container = entry.target as HTMLElement;
        const googlePublisherTagSampleElement = container.querySelector<HTMLElement>(
          '[data-google-publisher-tag-sample]',
        );
        const placement = container.dataset.adPlacement as AdvertisementPlacement | undefined;
        const coupangElement = container.querySelector<HTMLElement>("[data-ad-provider='coupang']");
        if (googlePublisherTagSampleElement && placement) {
          void displayGooglePublisherTagSample(container, googlePublisherTagSampleElement);
        } else if (registeredAdSenseSlots.has(container)) {
          enqueueAdSenseRequest(container);
        } else if (coupangElement) {
          showCoupang(container, null, coupangElement);
        }
        observer.unobserve(container);
      }
    },
    { rootMargin: '300px 0px' },
  );

  return lazySlotObserver;
};

/** 광고 슬롯을 중앙 설정에 따라 초기화한다. */
export const registerAdSlot = (container: HTMLElement): void => {
  if (registeredSlots.has(container)) return;

  const slotKey = container.dataset.adSlotKey as AdvertisementSlotKey | undefined;
  if (!slotKey) return;
  const slotConfig = ADVERTISEMENT_MEDIATION_CONFIG.slots[slotKey];
  if (!slotConfig?.enabled) return;
  registeredSlots.add(container);

  const { placement } = slotConfig;

  if (ADVERTISEMENT_MEDIATION_CONFIG.previewProvider === 'gpt-sample') {
    const googlePublisherTagSampleElement = createGooglePublisherTagSampleElement(placement);
    container.appendChild(googlePublisherTagSampleElement);
    void prepareGooglePublisherTagSample(
      container,
      googlePublisherTagSampleElement,
      placement,
    ).catch(() => undefined);
    if (container.dataset.adLoadStrategy === 'immediate') {
      void displayGooglePublisherTagSample(container, googlePublisherTagSampleElement);
    } else {
      getLazyAdvertisementObserver().observe(container);
    }
    return;
  }

  const parsedFallbackIndex = Number.parseInt(container.dataset.adFallbackIndex ?? '0', 10);
  const fallbackIndex = Number.isNaN(parsedFallbackIndex) ? 0 : parsedFallbackIndex;
  const coupangConfig = getCoupangAdvertisementConfig(placement, fallbackIndex);
  const coupangElement = coupangConfig
    ? createCoupangElement(coupangConfig, container.dataset.advertisementLabel ?? 'Advertisement')
    : null;

  const clientId = ADVERTISEMENT_MEDIATION_CONFIG.adsense.clientId;
  const adsenseUnitKey =
    slotConfig.largeScreenAdSenseUnitKey && window.matchMedia(LARGE_SCREEN_MEDIA_QUERY).matches
      ? slotConfig.largeScreenAdSenseUnitKey
      : slotConfig.adsenseUnitKey;
  const adsenseUnit = ADVERTISEMENT_MEDIATION_CONFIG.adsense.units[adsenseUnitKey];
  if (!ADVERTISEMENT_MEDIATION_CONFIG.enabled) {
    if (coupangElement) {
      container.appendChild(coupangElement);
      if (container.dataset.adLoadStrategy === 'immediate') {
        showCoupang(container, null, coupangElement);
      } else {
        getLazyAdvertisementObserver().observe(container);
      }
    }
    return;
  }
  if (!clientId || !adsenseUnit) return;

  if (coupangElement) container.appendChild(coupangElement);
  registeredAdSenseSlots.set(container, {
    clientId,
    unit: adsenseUnit,
    coupangElement,
  });

  if (container.dataset.adLoadStrategy === 'immediate') {
    enqueueAdSenseRequest(container);
  } else {
    getLazyAdvertisementObserver().observe(container);
  }
};

const cleanupAdvertisementSlot = (container: HTMLElement): void => {
  lazySlotObserver?.unobserve(container);
  disconnectAdSenseStatusObserver(container);
  disconnectAdSenseRequestAcceptanceObserver(container);
  destroyGooglePublisherTagSample(container);
  registeredAdSenseSlots.delete(container);
  registeredSlots.delete(container);
  requestedSlots.delete(container);
};

const cleanupRemovedAdvertisementSlots = (removedNode: Node): void => {
  if (!(removedNode instanceof Element)) return;
  if (removedNode.matches('[data-ad-placement]')) {
    cleanupAdvertisementSlot(removedNode as HTMLElement);
  }
  removedNode
    .querySelectorAll<HTMLElement>('[data-ad-placement]')
    .forEach(cleanupAdvertisementSlot);
};

/** 문서의 기존 슬롯과 이후 추가되는 슬롯을 공통 중재 로직에 등록한다. */
export const initAdMediation = (): void => {
  if (mediationInitialized) return;
  mediationInitialized = true;
  document.querySelectorAll<HTMLElement>('[data-ad-placement]').forEach(registerAdSlot);
  document.addEventListener('ad-slot-created', (event) => {
    const container = (event as CustomEvent<HTMLElement>).detail;
    if (container) registerAdSlot(container);
  });
  const removalObserver = new MutationObserver((mutationRecords) => {
    for (const mutationRecord of mutationRecords) {
      mutationRecord.removedNodes.forEach(cleanupRemovedAdvertisementSlots);
    }
  });
  removalObserver.observe(document.body, { childList: true, subtree: true });
};

/** 동적 피드와 검색 결과에 공통 광고 예약 영역을 생성한다. */
export const createAdvertisementSlotElement = (options: {
  className: string;
  slotId: string;
  format: 'display' | 'in_feed';
  position: string;
  slotKey: AdvertisementSlotKey;
  advertisementLabel: string;
  loadStrategy?: 'immediate' | 'lazy';
  fallbackIndex?: number;
}): HTMLDivElement | null => {
  const slotConfig = ADVERTISEMENT_MEDIATION_CONFIG.slots[options.slotKey];
  if (!slotConfig.enabled) return null;

  const container = document.createElement('div');
  container.className = `relative ${options.className}`;
  container.dataset.advertisementLabel = options.advertisementLabel;
  container.dataset.adSlot = options.slotId;
  container.dataset.adSlotKey = options.slotKey;
  container.dataset.adFormat = options.format;
  container.dataset.adPosition = options.position;
  container.dataset.adPlacement = slotConfig.placement;
  container.dataset.adLoadStrategy = options.loadStrategy ?? 'lazy';
  container.dataset.adFallbackIndex = String(options.fallbackIndex ?? 0);
  container.dataset.adActiveProvider = 'none';
  registerAdSlot(container);
  document.dispatchEvent(new CustomEvent('ad-slot-created', { detail: container }));
  return container;
};
