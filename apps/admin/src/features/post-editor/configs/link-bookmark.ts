import { Node, mergeAttributes } from '@tiptap/core';

declare module '@tiptap/core' {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Commands<ReturnType> {
    linkBookmark: {
      setLinkBookmark: (attrs: {
        url: string;
        title: string;
        description: string;
        image: string;
        favicon: string;
      }) => ReturnType;
    };
  }
}

export const CustomLinkBookmark = Node.create({
  name: 'linkBookmark',

  group: 'block',

  atom: true,

  draggable: true,

  addAttributes() {
    return {
      url: { default: '' },
      title: { default: '' },
      description: { default: '' },
      image: { default: '' },
      favicon: { default: '' },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'aside[data-type="link-bookmark"]',
        getAttrs: (element: HTMLElement) => ({
          url: element.getAttribute('data-url') ?? '',
          title: element.getAttribute('data-title') ?? '',
          description: element.getAttribute('data-description') ?? '',
          image: element.getAttribute('data-image') ?? '',
          favicon: element.getAttribute('data-favicon') ?? '',
        }),
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const { url, title, description, image, favicon } = node.attrs as Record<string, string>;
    const domain = (() => {
      try {
        return new URL(url).hostname;
      } catch {
        return url;
      }
    })();

    const isInternal = (() => {
      try {
        return new URL(url).hostname.endsWith('eunminlog.site');
      } catch {
        return false;
      }
    })();

    const imageSection = image
      ? [
          'figure',
          { style: 'flex: 0 0 200px; max-height: 160px; overflow: hidden; margin: 0;' },
          [
            'img',
            {
              src: image,
              alt: title || domain,
              style: 'width: 100%; height: 100%; object-fit: cover;',
            },
          ],
        ]
      : null;

    const textSection = [
      'figcaption',
      { style: 'flex: 1; padding: 12px 16px; min-width: 0;' },
      [
        'strong',
        {
          style:
            'display: block; font-size: 15px; color: #111827; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;',
        },
        title || domain,
      ],
      [
        'p',
        {
          style:
            'font-size: 13px; color: #6b7280; margin: 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;',
        },
        description,
      ],
      [
        'cite',
        {
          style:
            'display: flex; align-items: center; gap: 6px; margin-top: 8px; font-style: normal;',
        },
        [
          'img',
          {
            src: favicon,
            alt: `${title || domain} 프로필 이미지`,
            style: 'width: 16px; height: 16px;',
          },
        ],
        ['span', { style: 'font-size: 12px; color: #9ca3af;' }, domain],
      ],
    ];

    const linkChildren: unknown[] = [textSection];
    if (imageSection) linkChildren.unshift(imageSection);

    const linkAttrs: Record<string, string> = {
      href: url,
      style:
        'display: flex; border: 1px solid #e5e7eb; overflow: hidden; text-decoration: none; color: inherit; cursor: pointer;',
      ...(isInternal ? {} : { target: '_blank', rel: 'noopener noreferrer' }),
    };

    return [
      'aside',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'link-bookmark',
        'data-url': url,
        'data-title': title,
        'data-description': description,
        'data-image': image,
        'data-favicon': favicon,
      }),
      ['a', linkAttrs, ...linkChildren],
    ];
  },

  addCommands() {
    return {
      setLinkBookmark:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({ type: this.name, attrs });
        },
    };
  },

  addNodeView() {
    return ({ node }) => {
      const { url, title, description, image, favicon } = node.attrs as Record<string, string>;
      const domain = (() => {
        try {
          return new URL(url).hostname;
        } catch {
          return url;
        }
      })();

      const $container = document.createElement('aside');
      $container.setAttribute('data-type', 'link-bookmark');
      $container.style.cssText =
        'margin: 16px 0; border: 1px solid #e5e7eb; overflow: hidden; cursor: default;';

      const $inner = document.createElement('div');
      $inner.style.cssText = 'display: flex;';

      if (image) {
        const $figure = document.createElement('figure');
        $figure.style.cssText = 'flex: 0 0 200px; max-height: 160px; overflow: hidden; margin: 0;';
        const $img = document.createElement('img');
        $img.src = image;
        $img.alt = title || domain;
        $img.style.cssText = 'width: 100%; height: 100%; object-fit: cover;';
        $figure.appendChild($img);
        $inner.appendChild($figure);
      }

      const $caption = document.createElement('figcaption');
      $caption.style.cssText = 'flex: 1; padding: 12px 16px; min-width: 0;';

      const $title = document.createElement('strong');
      $title.style.cssText =
        'display: block; font-size: 15px; color: #111827; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';
      $title.textContent = title || domain;

      const $desc = document.createElement('p');
      $desc.style.cssText =
        'font-size: 13px; color: #6b7280; margin: 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;';
      $desc.textContent = description;

      const $cite = document.createElement('cite');
      $cite.style.cssText =
        'display: flex; align-items: center; gap: 6px; margin-top: 8px; font-style: normal;';

      if (favicon) {
        const $favicon = document.createElement('img');
        $favicon.src = favicon;
        $favicon.alt = `${title || domain} 프로필 이미지`;
        $favicon.style.cssText = 'width: 16px; height: 16px;';
        $cite.appendChild($favicon);
      }

      const $domain = document.createElement('span');
      $domain.style.cssText = 'font-size: 12px; color: #9ca3af;';
      $domain.textContent = domain;
      $cite.appendChild($domain);

      $caption.appendChild($title);
      $caption.appendChild($desc);
      $caption.appendChild($cite);
      $inner.appendChild($caption);
      $container.appendChild($inner);

      let isSelected = false;

      const showSelection = () => {
        isSelected = true;
        $container.style.outline = '2px dashed #4a90d9';
      };

      const hideSelection = () => {
        isSelected = false;
        $container.style.outline = 'none';
      };

      $container.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!isSelected) showSelection();
      });

      const handleOutsideClick = (e: MouseEvent) => {
        if (!$container.contains(e.target as globalThis.Node)) {
          hideSelection();
        }
      };
      document.addEventListener('click', handleOutsideClick);

      return {
        dom: $container,
        destroy() {
          document.removeEventListener('click', handleOutsideClick);
        },
      };
    };
  },
});
