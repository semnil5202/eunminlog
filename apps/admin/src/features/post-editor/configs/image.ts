import Image from '@tiptap/extension-image';
import { createImageAltInput } from '../lib/image-alt-input';

export const CustomResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('width'),
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes.width) return {};
          return { width: String(attributes.width) };
        },
      },
      height: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('height'),
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes.height) return {};
          return { height: String(attributes.height) };
        },
      },
      style: {
        default: 'width: 100%; height: auto;',
        parseHTML: (element: HTMLElement) => {
          return element.getAttribute('style') ?? 'width: 100%; height: auto;';
        },
        renderHTML: (attributes: Record<string, string>) => {
          const style = attributes.style || '';
          const hasHeight = /height\s*:/i.test(style);
          return { style: hasHeight ? style : `${style}; height: auto;` };
        },
      },
    };
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      const {
        view,
        options: { editable },
      } = editor;
      const { style } = node.attrs;

      const $container = document.createElement('div');
      const $root = document.createElement('div');
      $root.className = 'image-node-view';
      $container.className = 'image-node-view-frame';
      const $img = document.createElement('img');

      Object.entries(node.attrs).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        $img.setAttribute(key, value as string);
      });

      $img.setAttribute('style', 'width: 100%; height: auto; display: block;');
      $root.setAttribute(
        'style',
        `${style}; display: inline-block; position: relative; cursor: pointer;`,
      );
      $container.style.cssText = 'width: 100%; position: relative;';
      $container.appendChild($img);
      $root.append($container);

      if (!editable) return { dom: $root };
      const altField = createImageAltInput(editor, node.attrs.src);
      $root.append(altField);

      const dotPositions = [
        { top: '-14px', left: '-14px', cursor: 'nw-resize' },
        { top: '-14px', right: '-14px', cursor: 'ne-resize' },
        { bottom: '-14px', left: '-14px', cursor: 'sw-resize' },
        { bottom: '-14px', right: '-14px', cursor: 'se-resize' },
      ];

      const dots: HTMLElement[] = [];

      dotPositions.forEach((pos) => {
        const dot = document.createElement('div');
        dot.className = 'image-resize-handle';
        dot.setAttribute(
          'style',
          [
            'display: none',
            `cursor: ${pos.cursor}`,
            pos.top !== undefined ? `top: ${pos.top}` : '',
            pos.bottom !== undefined ? `bottom: ${pos.bottom}` : '',
            pos.left !== undefined ? `left: ${pos.left}` : '',
            pos.right !== undefined ? `right: ${pos.right}` : '',
          ]
            .filter(Boolean)
            .join('; '),
        );
        $container.appendChild(dot);
        dots.push(dot);
      });

      let isSelected = false;
      const mosaic = document.createElement('button');
      mosaic.type = 'button';
      mosaic.textContent = '모자이크';
      mosaic.className = 'image-mosaic-button image-carousel-action';
      mosaic.contentEditable = 'false';
      mosaic.hidden = true;
      mosaic.addEventListener('click', (event) => {
        event.stopPropagation();
        const pos = getPos();
        if (pos !== undefined)
          editor.view.dom.dispatchEvent(
            new CustomEvent('image:mosaic', { detail: { pos, image: $img } }),
          );
      });
      $container.append(mosaic);

      const showHandles = () => {
        isSelected = true;
        mosaic.hidden = false;
        altField.hidden = false;
        $container.classList.add('image-resize-frame');
        dots.forEach((dot) => {
          dot.style.display = 'block';
        });
      };

      const hideHandles = () => {
        isSelected = false;
        mosaic.hidden = true;
        altField.hidden = true;
        $container.classList.remove('image-resize-frame');
        dots.forEach((dot) => {
          dot.style.display = 'none';
        });
      };

      $container.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!isSelected) showHandles();
      });

      const handleOutsideClick = (e: MouseEvent) => {
        if (!$root.contains(e.target as Node)) {
          hideHandles();
        }
      };

      document.addEventListener('click', handleOutsideClick);

      const updateNodeAttrs = () => {
        if (typeof getPos === 'function') {
          const pos = getPos();
          if (pos === undefined) return;
          let cleanStyle = $root.style.cssText
            .replace(/\b(border|cursor|display|position|box-sizing)\s*:[^;]+;/g, '')
            .trim();
          if (!/height\s*:/i.test(cleanStyle)) {
            cleanStyle = cleanStyle.replace(/;?\s*$/, '; height: auto;');
          }
          const newAttrs = { ...node.attrs, style: cleanStyle };
          view.dispatch(view.state.tr.setNodeMarkup(pos, null, newAttrs));
        }
      };

      dots.forEach((dot, index) => {
        let startX = 0;
        let startWidth = 0;
        const isLeft = index === 0 || index === 2;

        const onPointerMove = (e: PointerEvent) => {
          const editorWidth = document.querySelector('.ProseMirror')?.clientWidth ?? 400;
          const deltaX = isLeft ? startX - e.clientX : e.clientX - startX;
          const newWidth = Math.min(Math.max(startWidth + deltaX, 50), editorWidth);
          const percent = ((newWidth / editorWidth) * 100).toFixed(1);
          $root.style.width = `${percent}%`;
          $img.style.width = '100%';
        };

        const onPointerUp = () => {
          document.removeEventListener('pointermove', onPointerMove);
          document.removeEventListener('pointerup', onPointerUp);
          updateNodeAttrs();
        };

        dot.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          e.stopPropagation();
          startX = e.clientX;
          startWidth = $root.offsetWidth;
          document.addEventListener('pointermove', onPointerMove);
          document.addEventListener('pointerup', onPointerUp);
        });

        dot.style.touchAction = 'none';
      });

      return {
        dom: $root,
        ignoreMutation: () => true,
        stopEvent: (event) =>
          event.target instanceof HTMLElement &&
          !!event.target.closest('[data-mosaic-editor], .image-mosaic-button, .image-alt-field'),
        destroy() {
          document.removeEventListener('click', handleOutsideClick);
        },
      };
    };
  },
}).configure({
  inline: true,
});
