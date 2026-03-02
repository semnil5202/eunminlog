import { trackEvent } from './gtag';

let sharedObserver: IntersectionObserver | null = null;
const impressed = new Set<string>();
const viewed = new Set<string>();
const viewTimers = new Map<string, number>();

export function initAdTracker(pageType: string): void {
  const adSlots = document.querySelectorAll<HTMLElement>('[data-ad-slot]');
  if (adSlots.length === 0) return;

  sharedObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const el = entry.target as HTMLElement;
        const slot = el.dataset.adSlot!;

        if (entry.isIntersecting) {
          if (!impressed.has(slot)) {
            impressed.add(slot);
            trackEvent('ad_impression', {
              ad_slot: slot,
              ad_format: el.dataset.adFormat!,
              ad_position: el.dataset.adPosition!,
              page_type: pageType,
            });
          }

          if (!viewed.has(slot)) {
            const timer = window.setTimeout(() => {
              viewed.add(slot);
              trackEvent('ad_view', {
                ad_slot: slot,
                ad_format: el.dataset.adFormat!,
                ad_position: el.dataset.adPosition!,
                page_type: pageType,
                view_duration_ms: 1000,
              });
            }, 1000);
            viewTimers.set(slot, timer);
          }
        } else {
          const timer = viewTimers.get(slot);
          if (timer) {
            window.clearTimeout(timer);
            viewTimers.delete(slot);
          }
        }
      }
    },
    { threshold: 0.5 },
  );

  adSlots.forEach((el) => {
    sharedObserver!.observe(el);
    el.addEventListener('click', () => {
      trackEvent('ad_click', {
        ad_slot: el.dataset.adSlot!,
        ad_format: el.dataset.adFormat!,
        ad_position: el.dataset.adPosition!,
        page_type: pageType,
      });
    });
  });
}

export function observeNewAdSlot(el: HTMLElement): void {
  if (sharedObserver && el.dataset.adSlot) {
    sharedObserver.observe(el);
    el.addEventListener('click', () => {
      trackEvent('ad_click', {
        ad_slot: el.dataset.adSlot!,
        ad_format: el.dataset.adFormat!,
        ad_position: el.dataset.adPosition!,
        page_type: 'list',
      });
    });
  }
}
