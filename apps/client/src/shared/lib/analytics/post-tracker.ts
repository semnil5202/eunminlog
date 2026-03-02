import { trackEvent } from './gtag';

export function initPostClickTracker(containerId: string): void {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.addEventListener('click', (e) => {
    const article = (e.target as HTMLElement).closest<HTMLElement>('[data-post-slug]');
    if (!article) return;

    trackEvent('select_content', {
      content_type: 'post',
      content_slug: article.dataset.postSlug!,
      content_category: article.dataset.postCategory!,
      content_sub_category: article.dataset.postSubCategory!,
      is_sponsored: article.dataset.postSponsored === 'true',
    });
  });
}
