export type ContentSection = {
  index: number;
  tagName: string;
  html: string;
  label: string;
};

const IMAGE_TAGS = new Set(['IMG']);
const NON_TRANSLATABLE_TAGS = new Set(['HR']);

const TAG_LABELS: Record<string, string> = {
  H1: 'h1', H2: 'h2', H3: 'h3', H4: 'h4', H5: 'h5',
  P: 'p', UL: 'ul', OL: 'ol', TABLE: 'table',
  BLOCKQUOTE: 'blockquote', HR: 'hr', IMG: 'img',
};

function getLabel(node: Element): string {
  const tag = node.tagName;
  if (tag === 'DIV' && node.getAttribute('data-type') === 'image-carousel') return 'img';
  if ((tag === 'DIV' || tag === 'ASIDE') && node.getAttribute('data-type') === 'link-bookmark') return 'bookmark';
  return TAG_LABELS[tag] ?? tag.toLowerCase();
}

export function splitHtmlIntoSections(html: string): ContentSection[] {
  if (typeof window === 'undefined') return [];

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const sections: ContentSection[] = [];

  const children = doc.body.childNodes;
  for (let i = 0; i < children.length; i++) {
    const node = children[i];

    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (!text) continue;
      const wrapper = doc.createElement('p');
      wrapper.textContent = text;
      sections.push({
        index: sections.length,
        tagName: 'p',
        html: wrapper.outerHTML,
        label: 'p',
      });
      continue;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;
      sections.push({
        index: sections.length,
        tagName: el.tagName.toLowerCase(),
        html: el.outerHTML,
        label: getLabel(el),
      });
    }
  }

  return sections;
}

export function reassembleSections(sections: ContentSection[]): string {
  return sections.map((s) => s.html).join('');
}

function stripImages(html: string): string {
  return html.replace(/<img[^>]*>/gi, '');
}

export function isTranslatableSection(section: ContentSection): boolean {
  const tag = section.tagName.toUpperCase();
  if (NON_TRANSLATABLE_TAGS.has(tag) || IMAGE_TAGS.has(tag)) return false;
  if (tag === 'DIV' || tag === 'ASIDE') {
    const parser = new DOMParser();
    const doc = parser.parseFromString(section.html, 'text/html');
    const el = doc.body.firstElementChild;
    const dataType = el?.getAttribute('data-type');
    if (dataType === 'image-carousel' || dataType === 'link-bookmark') return false;
  }
  const text = stripImages(section.html).replace(/<[^>]*>/g, '').trim();
  if (!text) return false;
  return true;
}

/**
 * 원본과 기준값(스냅샷) 섹션을 비교해 변경된 섹션 인덱스 Set을 반환한다.
 * 섹션 수가 다르면 모든 섹션을 dirty로 처리한다.
 */
export function computeDirtySections(
  currentSections: ContentSection[],
  referenceSections: ContentSection[],
): Set<number> {
  if (currentSections.length !== referenceSections.length) {
    return new Set(currentSections.map((_, i) => i));
  }

  const dirty = new Set<number>();
  for (let i = 0; i < currentSections.length; i++) {
    const currentText = stripImages(currentSections[i].html);
    const referenceText = stripImages(referenceSections[i].html);
    if (currentText !== referenceText) {
      dirty.add(i);
    }
  }
  return dirty;
}
