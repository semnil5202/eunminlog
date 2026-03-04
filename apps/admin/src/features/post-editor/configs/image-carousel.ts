import { Node, mergeAttributes } from '@tiptap/core';

type ImageItem = { src: string; width: string; height: string };

const DEFAULT_WIDTH = '90%';
const DEFAULT_HEIGHT = 'auto';

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
            width: img.getAttribute('data-width') ?? DEFAULT_WIDTH,
            height: img.getAttribute('data-height') ?? DEFAULT_HEIGHT,
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
      { src: img.src, 'data-width': img.width, 'data-height': img.height },
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
            { src, width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT },
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
              const remaining = currentImages[0];
              tr.delete(pos, pos + node.nodeSize);
              if (remaining) {
                const imageNode = editor.schema.nodes.image.create({
                  src: remaining.src,
                  style: `width: ${remaining.width}; height: ${remaining.height};${remaining.height !== 'auto' ? ' object-fit: cover;' : ''}`,
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
        view,
        options: { editable },
      } = editor;
      const images = node.attrs.images as ImageItem[];

      const $container = document.createElement('div');
      $container.className = 'image-carousel-container';
      $container.style.cssText = `${node.attrs.style ?? 'width: 100%;'}; position: relative;`;

      const $viewport = document.createElement('div');
      $viewport.className = 'image-carousel-viewport';
      $container.appendChild($viewport);

      const slides: HTMLElement[] = [];
      const imgElements: HTMLImageElement[] = [];
      const imgWrappers: HTMLElement[] = [];

      images.forEach((img) => {
        const $slide = document.createElement('div');
        $slide.className = 'image-carousel-slide';
        $slide.style.flex = `0 0 ${img.width}`;

        const $wrapper = document.createElement('div');
        $wrapper.style.position = 'relative';

        const $img = document.createElement('img');
        $img.src = img.src;
        const heightCss =
          img.height === 'auto'
            ? 'height: auto'
            : `height: ${img.height}; object-fit: cover`;
        $img.style.cssText = `width: 100%; ${heightCss}; display: block;`;

        $wrapper.appendChild($img);
        $slide.appendChild($wrapper);
        $viewport.appendChild($slide);
        slides.push($slide);
        imgElements.push($img);
        imgWrappers.push($wrapper);
      });

      // Navigation arrows (< >)
      if (images.length > 1) {
        let currentIndex = 0;

        const scrollTo = (index: number) => {
          const slide = slides[index];
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
          const scrollLeft = $viewport.scrollLeft;
          let closestIdx = 0;
          let closestDist = Infinity;
          slides.forEach((s, idx) => {
            const dist = Math.abs(s.offsetLeft - scrollLeft);
            if (dist < closestDist) {
              closestDist = dist;
              closestIdx = idx;
            }
          });
          currentIndex = closestIdx;
        });
      }

      if (!editable) return { dom: $container };

      const updateImages = (newImages: ImageItem[]) => {
        if (typeof getPos !== 'function') return;
        const pos = getPos();
        if (pos === undefined) return;
        view.dispatch(
          view.state.tr.setNodeMarkup(pos, null, {
            ...node.attrs,
            images: newImages,
          }),
        );
      };

      // State
      let isSelected = false;
      let activeSlideIndex = -1;
      const deleteButtons: HTMLElement[] = [];
      const cornerDotSets: HTMLElement[][] = [];

      // Build per-slide UI (delete button + 4-corner resize dots)
      images.forEach((_, i) => {
        const $slide = slides[i];
        const $wrapper = imgWrappers[i];
        if (!$slide || !$wrapper) return;

        // Delete button
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
        $wrapper.appendChild($deleteBtn);
        deleteButtons.push($deleteBtn);

        // 4-corner resize dots (hidden until double-click)
        const dotPositions = [
          { top: '-4px', left: '-4px', cursor: 'nw-resize' },
          { top: '-4px', right: '-4px', cursor: 'ne-resize' },
          { bottom: '-4px', left: '-4px', cursor: 'sw-resize' },
          { bottom: '-4px', right: '-4px', cursor: 'se-resize' },
        ];

        const dots: HTMLElement[] = [];
        dotPositions.forEach((pos) => {
          const dot = document.createElement('div');
          dot.setAttribute(
            'style',
            [
              'position: absolute',
              'width: 9px',
              'height: 9px',
              'background: #4a90d9',
              'border: 1px solid white',
              'border-radius: 50%',
              'display: none',
              'z-index: 3',
              `cursor: ${pos.cursor}`,
              pos.top !== undefined ? `top: ${pos.top}` : '',
              pos.bottom !== undefined ? `bottom: ${pos.bottom}` : '',
              pos.left !== undefined ? `left: ${pos.left}` : '',
              pos.right !== undefined ? `right: ${pos.right}` : '',
            ]
              .filter(Boolean)
              .join('; '),
          );
          $wrapper.appendChild(dot);
          dots.push(dot);

          // Resize drag logic
          const isLeft = pos.left !== undefined;
          const isTop = pos.top !== undefined;
          let startX = 0;
          let startY = 0;
          let startWidth = 0;
          let startHeight = 0;

          const onPointerMove = (cx: number, cy: number) => {
            const $curImg = imgElements[i];
            if (!$curImg) return;

            const viewportWidth = $viewport.clientWidth || 400;
            const deltaX = isLeft ? startX - cx : cx - startX;
            const newImgPx = Math.max(startWidth + deltaX, 80);
            const percent = Math.min(
              (newImgPx / viewportWidth) * 100,
              100,
            );
            $slide.style.flex = `0 0 ${percent.toFixed(1)}%`;

            const deltaY = isTop ? startY - cy : cy - startY;
            const newH = Math.max(startHeight + deltaY, 60);
            $curImg.style.height = `${newH}px`;
            $curImg.style.objectFit = 'cover';
          };

          const onPointerEnd = (cx: number, cy: number) => {
            const viewportWidth = $viewport.clientWidth || 400;
            const deltaX = isLeft ? startX - cx : cx - startX;
            const newImgPx = Math.max(startWidth + deltaX, 80);
            const widthPct = Math.min(
              (newImgPx / viewportWidth) * 100,
              100,
            ).toFixed(1);

            const deltaY = isTop ? startY - cy : cy - startY;
            const newH = Math.max(startHeight + deltaY, 60);

            const newImages = images.map((img, idx) =>
              idx === i
                ? { ...img, width: `${widthPct}%`, height: `${newH}px` }
                : img,
            );
            updateImages(newImages);
          };

          const initDrag = (cx: number, cy: number) => {
            startX = cx;
            startY = cy;
            const $curImg = imgElements[i];
            startWidth = $curImg?.offsetWidth ?? $slide.offsetWidth;
            startHeight = $curImg?.offsetHeight ?? 200;
          };

          // Mouse
          const onMouseMove = (e: MouseEvent) =>
            onPointerMove(e.clientX, e.clientY);
          const onMouseUp = (e: MouseEvent) => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            onPointerEnd(e.clientX, e.clientY);
          };

          dot.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            initDrag(e.clientX, e.clientY);
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
          });

          // Touch
          const onTouchMove = (e: TouchEvent) => {
            const t = e.touches[0];
            if (t) onPointerMove(t.clientX, t.clientY);
          };
          const onTouchEnd = (e: TouchEvent) => {
            document.removeEventListener('touchmove', onTouchMove);
            document.removeEventListener('touchend', onTouchEnd);
            const t = e.changedTouches[0];
            if (t) onPointerEnd(t.clientX, t.clientY);
          };

          dot.addEventListener(
            'touchstart',
            (e) => {
              e.preventDefault();
              e.stopPropagation();
              const t = e.touches[0];
              if (!t) return;
              initDrag(t.clientX, t.clientY);
              document.addEventListener('touchmove', onTouchMove, {
                passive: false,
              });
              document.addEventListener('touchend', onTouchEnd);
            },
            { passive: false },
          );
        });

        cornerDotSets.push(dots);

        // Double-click (desktop) → activate individual image
        $slide.addEventListener('dblclick', (e) => {
          e.stopPropagation();
          selectSlide(i);
        });

        // Long-press (mobile) → activate individual image
        let lpTimer: ReturnType<typeof setTimeout> | null = null;
        let lpStart = { x: 0, y: 0 };

        $slide.addEventListener(
          'touchstart',
          (e) => {
            const t = e.touches[0];
            if (!t) return;
            lpStart = { x: t.clientX, y: t.clientY };
            lpTimer = setTimeout(() => {
              selectSlide(i);
              lpTimer = null;
            }, 500);
          },
          { passive: true },
        );

        $slide.addEventListener(
          'touchmove',
          (e) => {
            if (!lpTimer) return;
            const t = e.touches[0];
            if (!t) return;
            if (
              Math.abs(t.clientX - lpStart.x) > 10 ||
              Math.abs(t.clientY - lpStart.y) > 10
            ) {
              clearTimeout(lpTimer);
              lpTimer = null;
            }
          },
          { passive: true },
        );

        $slide.addEventListener(
          'touchend',
          () => {
            if (lpTimer) {
              clearTimeout(lpTimer);
              lpTimer = null;
            }
          },
          { passive: true },
        );
      });

      const selectSlide = (index: number) => {
        deselectSlide();
        activeSlideIndex = index;
        const $w = imgWrappers[index];
        if ($w) {
          $w.style.outline = '2px solid #4a90d9';
          $w.style.outlineOffset = '-2px';
        }
        cornerDotSets[index]?.forEach((dot) => {
          dot.style.display = 'block';
        });
      };

      const deselectSlide = () => {
        if (activeSlideIndex >= 0) {
          const $w = imgWrappers[activeSlideIndex];
          if ($w) {
            $w.style.outline = 'none';
            $w.style.outlineOffset = '';
          }
          cornerDotSets[activeSlideIndex]?.forEach((dot) => {
            dot.style.display = 'none';
          });
          activeSlideIndex = -1;
        }
      };

      // Carousel-level selection (single click)
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
        deselectSlide();
      };

      $container.addEventListener('click', (e) => {
        e.stopPropagation();
        if (activeSlideIndex >= 0) {
          const clickedSlide = (e.target as HTMLElement).closest(
            '.image-carousel-slide',
          );
          if (clickedSlide !== slides[activeSlideIndex]) {
            deselectSlide();
          }
          return;
        }
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
