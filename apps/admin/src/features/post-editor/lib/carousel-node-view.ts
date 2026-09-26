import type { NodeViewRenderer } from '@tiptap/core';
import { closeHistory } from '@tiptap/pm/history';
import type { CarouselImage } from '../types/carousel';

/** 캐러셀 드래그 크기를 실제 표시 너비와 크롭 비율로 변환한다. */
export function getCarouselResize(width: number, height: number, viewportWidth: number) {
  const viewport = Math.max(1, viewportWidth);
  const widthPercent = Math.min(
    100,
    (Math.max(Math.min(80, viewport), width) / viewport) * 100,
  ).toFixed(1);
  const renderedWidth = (Number(widthPercent) / 100) * viewport;
  const renderedHeight = Math.max(60, height);
  return {
    width: `${widthPercent}%`,
    height: `ratio:${(renderedWidth / renderedHeight).toFixed(4)}`,
    pixels: renderedHeight,
  };
}

/** 개별 캐러셀의 스크롤과 편집 조작을 관리한다. */
export const createCarouselNodeView: NodeViewRenderer = ({ node: initialNode, editor, getPos }) => {
  let node = initialNode;
  let images = node.attrs.images as CarouselImage[];
  let currentIndex = 0;
  let activeIndex = -1;
  let destroyed = false;
  let frame = 0;
  let cleanRender = () => {};
  const container = document.createElement('div');
  container.className = 'image-carousel-container';
  container.contentEditable = 'false';
  container.setAttribute('role', 'group');
  container.setAttribute('aria-label', '이미지 캐러셀');
  const viewport = document.createElement('div');
  viewport.className = 'image-carousel-viewport';
  const button = (label: string, className = '') => {
    const element = document.createElement('button');
    element.type = 'button';
    element.className = className;
    element.textContent = label;
    element.setAttribute('aria-label', label);
    return element;
  };
  const render = (restoreFocus = false) => {
    const focusedLabel = restoreFocus ? document.activeElement?.getAttribute('aria-label') : null;
    cleanRender();
    cancelAnimationFrame(frame);
    const events = new AbortController();
    const { signal } = events;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    let cancelDrag = () => {};
    cleanRender = () => {
      events.abort();
      timers.forEach(clearTimeout);
      cancelDrag();
    };
    container.style.cssText = `${node.attrs.style ?? 'width: 100%;'}; position: relative;`;
    container.dataset.editable = String(editor.isEditable);
    container.replaceChildren(viewport);
    viewport.replaceChildren();
    const slides: HTMLElement[] = [];
    const resizeButtons: HTMLButtonElement[] = [];
    let syncNavigation = () => {};
    const maxScroll = () => Math.max(0, viewport.scrollWidth - viewport.clientWidth);
    const contentWidth = () => {
      const style = getComputedStyle(viewport);
      return (
        viewport.clientWidth -
        parseFloat(style.paddingLeft || '0') -
        parseFloat(style.paddingRight || '0')
      );
    };
    const slideOffset = (index: number) =>
      Math.min(
        maxScroll(),
        Math.max(0, (slides[index]?.offsetLeft ?? 0) - (slides[0]?.offsetLeft ?? 0)),
      );
    const syncActive = () =>
      slides.forEach((slide, index) => {
        slide.dataset.resizing = String(index === activeIndex);
        slide
          .querySelector('.image-carousel-image')
          ?.classList.toggle('image-resize-frame', index === activeIndex);
        slide.querySelectorAll<HTMLButtonElement>('.image-carousel-handle').forEach((handle) => {
          handle.hidden = index !== activeIndex;
        });
        resizeButtons[index]?.setAttribute('aria-pressed', String(index === activeIndex));
      });
    container.addEventListener(
      'keydown',
      (event) => {
        if (event.key === 'Escape') {
          activeIndex = -1;
          syncActive();
        }
      },
      { signal },
    );
    document.addEventListener(
      'pointerdown',
      (event) => {
        if (!container.contains(event.target as globalThis.Node)) {
          activeIndex = -1;
          syncActive();
        }
      },
      { signal },
    );
    const scrollTo = (index: number, behavior: ScrollBehavior = 'smooth') => {
      currentIndex = Math.max(0, Math.min(index, images.length - 1));
      const slide = slides[currentIndex];
      if (slide) viewport.scrollTo({ left: slideOffset(currentIndex), behavior });
      syncNavigation();
    };
    const saveSize = (index: number, width: string, height: string) => {
      const pos = getPos();
      if (destroyed || pos === undefined) return;
      const current = editor.state.doc.nodeAt(pos);
      if (!current || current.type !== node.type) return;
      currentIndex = index;
      editor.view.dispatch(
        closeHistory(editor.state.tr).setNodeMarkup(pos, null, {
          ...current.attrs,
          images: (current.attrs.images as CarouselImage[]).map((image, i) =>
            i === index ? { ...image, width, height } : image,
          ),
        }),
      );
      editor.view.dispatch(closeHistory(editor.state.tr));
    };
    images.forEach((image, index) => {
      const slide = document.createElement('div');
      slide.className = 'image-carousel-slide';
      slide.style.flex = `0 0 ${image.width}`;
      const wrapper = document.createElement('div');
      wrapper.className = 'image-carousel-image';
      const img = document.createElement('img');
      img.src = image.src;
      img.alt = `캐러셀 이미지 ${index + 1}`;
      img.draggable = false;
      if (image.naturalWidth) img.width = image.naturalWidth;
      if (image.naturalHeight) img.height = image.naturalHeight;
      const heightCss =
        image.height === 'auto'
          ? 'height: auto'
          : image.height.startsWith('ratio:')
            ? `aspect-ratio: ${image.height.slice(6)}; object-fit: cover; height: auto`
            : `height: ${image.height}; object-fit: cover`;
      img.style.cssText = `width: 100%; ${heightCss}; display: block;`;
      wrapper.append(img);
      slide.append(wrapper);
      viewport.append(slide);
      slides.push(slide);
      if (!editor.isEditable) return;
      const actions = document.createElement('div');
      actions.className = 'image-carousel-actions';
      const label = document.createElement('span');
      label.className = 'image-carousel-item-label';
      label.textContent = `${index + 1}번 이미지`;
      const resize = button('크기 조절', 'image-carousel-action');
      resize.setAttribute('aria-label', `${index + 1}번 이미지 크기 조절`);
      resizeButtons.push(resize);
      resize.addEventListener(
        'click',
        () => {
          activeIndex = activeIndex === index ? -1 : index;
          syncActive();
        },
        { signal },
      );
      const remove = button('삭제', 'image-carousel-action');
      remove.setAttribute('aria-label', `${index + 1}번 이미지 삭제`);
      remove.addEventListener(
        'click',
        () => {
          const pos = getPos();
          if (pos === undefined) return;
          currentIndex = Math.min(index, images.length - 2);
          activeIndex = currentIndex;
          editor.commands.removeImageFromCarousel(pos, index);
          editor.view.dispatch(closeHistory(editor.state.tr));
          if (!destroyed) resizeButtons[currentIndex]?.focus({ preventScroll: true });
          else editor.view.focus();
        },
        { signal },
      );
      const mosaic = button('모자이크', 'image-carousel-action');
      mosaic.setAttribute('aria-label', `${index + 1}번 이미지 모자이크`);
      mosaic.addEventListener(
        'click',
        () => {
          const pos = getPos();
          if (pos === undefined) return;
          activeIndex = index;
          syncActive();
          editor.view.dom.dispatchEvent(
            new CustomEvent('image:mosaic', { detail: { pos, index, image: img } }),
          );
        },
        { signal },
      );
      actions.append(label, resize, mosaic, remove);
      slide.append(actions);
      for (const corner of ['nw', 'ne', 'sw', 'se']) {
        const handle = button(
          `${index + 1}번 이미지 ${corner} 크기 조절`,
          `image-resize-handle image-carousel-handle image-carousel-handle-${corner}`,
        );
        handle.textContent = '';
        handle.hidden = true;
        handle.addEventListener(
          'keydown',
          (event) => {
            if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
            event.preventDefault();
            const size = getCarouselResize(
              img.clientWidth +
                (event.key === 'ArrowRight' ? 10 : event.key === 'ArrowLeft' ? -10 : 0),
              img.clientHeight +
                (event.key === 'ArrowDown' ? 10 : event.key === 'ArrowUp' ? -10 : 0),
              contentWidth(),
            );
            saveSize(index, size.width, size.height);
          },
          { signal },
        );
        handle.addEventListener(
          'pointerdown',
          (event) => {
            if (event.button !== 0) return;
            event.preventDefault();
            event.stopPropagation();
            cancelDrag();
            const drag = new AbortController();
            cancelDrag = () => drag.abort();
            const startWidth = img.clientWidth;
            const startHeight = img.clientHeight;
            const measure = (next: PointerEvent) =>
              getCarouselResize(
                startWidth + (next.clientX - event.clientX) * (corner.endsWith('w') ? -1 : 1),
                startHeight + (next.clientY - event.clientY) * (corner.startsWith('n') ? -1 : 1),
                contentWidth(),
              );
            document.addEventListener(
              'pointermove',
              (next) => {
                if (next.pointerId !== event.pointerId) return;
                next.preventDefault();
                const size = measure(next);
                slide.style.flex = `0 0 ${size.width}`;
                img.style.height = `${size.pixels}px`;
                img.style.aspectRatio = 'auto';
                img.style.objectFit = 'cover';
              },
              { signal: drag.signal, passive: false },
            );
            document.addEventListener(
              'pointerup',
              (next) => {
                if (next.pointerId !== event.pointerId) return;
                drag.abort();
                const size = measure(next);
                saveSize(index, size.width, size.height);
              },
              { signal: drag.signal },
            );
            document.addEventListener(
              'pointercancel',
              () => {
                drag.abort();
                render(true);
              },
              { signal: drag.signal },
            );
          },
          { signal },
        );
        wrapper.append(handle);
      }
      slide.addEventListener(
        'dblclick',
        () => {
          activeIndex = index;
          syncActive();
        },
        { signal },
      );
      let timer: ReturnType<typeof setTimeout> | undefined;
      let origin = { x: 0, y: 0 };
      const cancelPress = () => {
        if (timer) {
          clearTimeout(timer);
          timers.delete(timer);
          timer = undefined;
        }
      };
      slide.addEventListener(
        'pointerdown',
        (event) => {
          if (event.pointerType !== 'touch' || (event.target as HTMLElement).closest('button'))
            return;
          cancelPress();
          origin = { x: event.clientX, y: event.clientY };
          timer = setTimeout(() => {
            activeIndex = index;
            syncActive();
            cancelPress();
          }, 500);
          timers.add(timer);
        },
        { signal },
      );
      slide.addEventListener(
        'pointermove',
        (event) => {
          if (Math.abs(origin.x - event.clientX) > 10 || Math.abs(origin.y - event.clientY) > 10)
            cancelPress();
        },
        { signal },
      );
      slide.addEventListener('pointerup', cancelPress, { signal });
      slide.addEventListener('pointercancel', cancelPress, { signal });
      slide.addEventListener('pointerleave', cancelPress, { signal });
    });
    if (images.length > 1) {
      const previous = button('이전 이미지', 'image-carousel-arrow image-carousel-arrow-prev');
      previous.textContent = '‹';
      const next = button('다음 이미지', 'image-carousel-arrow image-carousel-arrow-next');
      next.textContent = '›';
      const syncArrows = () => {
        previous.disabled = viewport.scrollLeft <= 1;
        next.disabled = viewport.scrollLeft >= maxScroll() - 1;
      };
      syncNavigation = syncArrows;
      window.addEventListener('resize', syncArrows, { signal });
      previous.addEventListener(
        'click',
        () => {
          let preceding = 0;
          slides.forEach((_, index) => {
            if (slideOffset(index) < viewport.scrollLeft - 1) preceding = index;
          });
          scrollTo(Math.max(0, preceding));
          syncArrows();
        },
        { signal },
      );
      next.addEventListener(
        'click',
        () => {
          const following = slides.findIndex(
            (_, index) => slideOffset(index) > viewport.scrollLeft + 1,
          );
          scrollTo(following < 0 ? images.length - 1 : following);
          syncArrows();
        },
        { signal },
      );
      viewport.addEventListener(
        'scroll',
        () => {
          currentIndex = slides.reduce(
            (best, _slide, i) =>
              Math.abs(slideOffset(i) - viewport.scrollLeft) <
              Math.abs(slideOffset(best) - viewport.scrollLeft)
                ? i
                : best,
            0,
          );
          syncArrows();
        },
        { signal },
      );
      syncArrows();
      container.append(previous, next);
    }
    if (editor.isEditable) {
      const header = document.createElement('div');
      header.className = 'image-carousel-header';
      const title = document.createElement('span');
      title.className = 'image-carousel-title';
      title.textContent = `캐러셀 · ${images.length}장`;
      const add = button('이미지 추가', 'image-carousel-action image-carousel-add');
      add.addEventListener(
        'click',
        () => {
          const pos = getPos();
          if (pos !== undefined)
            editor.view.dom.dispatchEvent(
              new CustomEvent('carousel:add-images', { bubbles: true, detail: { pos } }),
            );
        },
        { signal },
      );
      header.append(title, add);
      container.prepend(header);
    }
    syncActive();
    frame = requestAnimationFrame(() => {
      if (destroyed) return;
      scrollTo(currentIndex, 'instant');
      if (restoreFocus) {
        const previousControl = Array.from(
          container.querySelectorAll<HTMLButtonElement>('button'),
        ).find((control) => control.getAttribute('aria-label') === focusedLabel && !control.hidden);
        (previousControl ?? resizeButtons[Math.max(0, activeIndex)])?.focus({
          preventScroll: true,
        });
      }
    });
  };
  render();
  return {
    dom: container,
    stopEvent: (event) =>
      event.target instanceof HTMLElement &&
      Boolean(event.target.closest('button, [data-mosaic-editor]')),
    ignoreMutation: () => true,
    update(nextNode) {
      if (nextNode.type !== node.type) return false;
      if (nextNode.eq(node)) return true;
      const focusInside = container.contains(document.activeElement);
      const currentSource = images[currentIndex]?.src;
      node = nextNode;
      images = node.attrs.images as CarouselImage[];
      const preservedIndex = images.findIndex((image) => image.src === currentSource);
      currentIndex =
        preservedIndex >= 0
          ? preservedIndex
          : Math.max(0, Math.min(currentIndex, images.length - 1));
      activeIndex = Math.min(activeIndex, images.length - 1);
      render(focusInside);
      return true;
    },
    destroy() {
      destroyed = true;
      cleanRender();
      cancelAnimationFrame(frame);
    },
  };
};
