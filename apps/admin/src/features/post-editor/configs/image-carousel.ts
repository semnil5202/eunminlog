import { Node, mergeAttributes } from '@tiptap/core';

type ImageItem = { src: string };

declare module '@tiptap/core' {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Commands<ReturnType> {
    imageCarousel: {
      setImageCarousel: (attrs: {
        images: ImageItem[];
        style?: string;
      }) => ReturnType;
      addImageToCarousel: (pos: number, src: string) => ReturnType;
      removeImageFromCarousel: (
        pos: number,
        imageIndex: number,
      ) => ReturnType;
    };
  }
}

export const CustomImageCarousel = Node.create({
  name: 'imageCarousel',

  group: 'block',

  atom: true,

  draggable: true,

  addAttributes() {
    return {
      images: {
        default: [],
        parseHTML: (element: HTMLElement) => {
          const imgs = element.querySelectorAll('img');
          return Array.from(imgs).map((img) => ({
            src: img.getAttribute('src') ?? '',
          }));
        },
        renderHTML: () => ({}),
      },
      style: {
        default: 'width: 100%;',
        parseHTML: (element: HTMLElement) =>
          element.getAttribute('style') ?? 'width: 100%;',
        renderHTML: (attributes: Record<string, string>) => ({
          style: attributes.style,
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="image-carousel"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const images = (node.attrs.images as ImageItem[]).map((img) => [
      'img',
      { src: img.src },
    ]);
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-type': 'image-carousel' }),
      ...images,
    ];
  },

  addCommands() {
    return {
      setImageCarousel:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({ type: this.name, attrs });
        },

      addImageToCarousel:
        (pos, src) =>
        ({ tr, dispatch }) => {
          const node = tr.doc.nodeAt(pos);
          if (!node || node.type.name !== 'imageCarousel') return false;

          const currentImages = [
            ...(node.attrs.images as ImageItem[]),
            { src },
          ];

          if (dispatch) {
            tr.setNodeMarkup(pos, null, {
              ...node.attrs,
              images: currentImages,
            });
          }
          return true;
        },

      removeImageFromCarousel:
        (pos, imageIndex) =>
        ({ tr, dispatch, editor }) => {
          const node = tr.doc.nodeAt(pos);
          if (!node || node.type.name !== 'imageCarousel') return false;

          const currentImages = [...(node.attrs.images as ImageItem[])];
          if (imageIndex < 0 || imageIndex >= currentImages.length)
            return false;

          currentImages.splice(imageIndex, 1);

          if (dispatch) {
            if (currentImages.length <= 1) {
              const remainingSrc = currentImages[0]?.src;
              tr.delete(pos, pos + node.nodeSize);
              if (remainingSrc) {
                const imageNode = editor.schema.nodes.image.create({
                  src: remainingSrc,
                  style: 'width: 100%; height: auto;',
                });
                const paragraph =
                  editor.schema.nodes.paragraph.create(null, imageNode);
                tr.insert(pos, paragraph);
              }
            } else {
              tr.setNodeMarkup(pos, null, {
                ...node.attrs,
                images: currentImages,
              });
            }
          }
          return true;
        },
    };
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      const {
        options: { editable },
      } = editor;
      const images = node.attrs.images as ImageItem[];

      const $container = document.createElement('div');
      $container.className = 'image-carousel-container';
      $container.style.cssText = `${node.attrs.style ?? 'width: 100%;'}; position: relative;`;

      const $viewport = document.createElement('div');
      $viewport.className = 'image-carousel-viewport';
      $container.appendChild($viewport);

      images.forEach((img) => {
        const $slide = document.createElement('div');
        $slide.className = 'image-carousel-slide';
        const $img = document.createElement('img');
        $img.src = img.src;
        $img.style.cssText = 'width: 100%; height: auto; display: block;';
        $slide.appendChild($img);
        $viewport.appendChild($slide);
      });

      // Navigation arrows (< >)
      if (images.length > 1) {
        let currentIndex = 0;

        const scrollTo = (index: number) => {
          const slide = $viewport.children[index] as HTMLElement | undefined;
          if (slide) {
            $viewport.scrollTo({
              left: slide.offsetLeft,
              behavior: 'smooth',
            });
            currentIndex = index;
          }
        };

        const createArrow = (direction: 'prev' | 'next') => {
          const $arrow = document.createElement('button');
          $arrow.className = `image-carousel-arrow image-carousel-arrow-${direction}`;

          const $svg = document.createElementNS(
            'http://www.w3.org/2000/svg',
            'svg',
          );
          $svg.setAttribute('width', '20');
          $svg.setAttribute('height', '20');
          $svg.setAttribute('viewBox', '0 0 24 24');
          $svg.setAttribute('fill', 'none');
          $svg.setAttribute('stroke', 'currentColor');
          $svg.setAttribute('stroke-width', '2');
          $svg.setAttribute('stroke-linecap', 'round');
          $svg.setAttribute('stroke-linejoin', 'round');

          const $path = document.createElementNS(
            'http://www.w3.org/2000/svg',
            'path',
          );
          $path.setAttribute(
            'd',
            direction === 'prev' ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6',
          );
          $svg.appendChild($path);
          $arrow.appendChild($svg);

          $arrow.addEventListener('click', (e) => {
            e.stopPropagation();
            const target =
              direction === 'prev'
                ? Math.max(0, currentIndex - 1)
                : Math.min(images.length - 1, currentIndex + 1);
            scrollTo(target);
          });
          return $arrow;
        };

        $container.appendChild(createArrow('prev'));
        $container.appendChild(createArrow('next'));

        $viewport.addEventListener('scrollend', () => {
          const slideWidth =
            ($viewport.children[0] as HTMLElement)?.offsetWidth ?? 1;
          currentIndex = Math.round($viewport.scrollLeft / slideWidth);
        });
      }

      if (!editable) return { dom: $container };

      // Selection + delete buttons
      let isSelected = false;
      const deleteButtons: HTMLElement[] = [];

      images.forEach((_, i) => {
        const $deleteBtn = document.createElement('button');
        $deleteBtn.className = 'image-carousel-delete';
        $deleteBtn.textContent = '\u00D7';
        $deleteBtn.style.display = 'none';
        $deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (typeof getPos === 'function') {
            const pos = getPos();
            if (pos !== undefined) {
              editor.commands.removeImageFromCarousel(pos, i);
            }
          }
        });
        $viewport.children[i]?.appendChild($deleteBtn);
        deleteButtons.push($deleteBtn);
      });

      const showSelection = () => {
        isSelected = true;
        $container.style.outline = '1px dashed #4a90d9';
        deleteButtons.forEach((btn) => {
          btn.style.display = 'flex';
        });
      };

      const hideSelection = () => {
        isSelected = false;
        $container.style.outline = 'none';
        deleteButtons.forEach((btn) => {
          btn.style.display = 'none';
        });
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
