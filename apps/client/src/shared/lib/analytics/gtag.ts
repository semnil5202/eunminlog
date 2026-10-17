type GtagEvent =
  | 'select_content'
  | 'search'
  | 'copy_link_click'
  | 'ad_impression'
  | 'ad_view'
  | 'cookie_consent';

type GtagParams = Record<string, string | number | boolean>;

export function trackEvent(event: GtagEvent, params: GtagParams): void {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', event, params);
  }
}
