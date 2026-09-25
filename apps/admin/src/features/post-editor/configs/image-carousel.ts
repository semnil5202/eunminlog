import { Node, mergeAttributes } from '@tiptap/core';
import { closeHistory } from '@tiptap/pm/history';
import { createCarouselNodeView } from '../lib/carousel-node-view';
import type { CarouselImage } from '../types/carousel';

declare module '@tiptap/core' {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Commands<ReturnType> {
    imageCarousel: {
      setImageCarousel: (attrs: { images: CarouselImage[]; style?: string }) => ReturnType;
      addImagesToCarousel: (pos: number, images: CarouselImage[]) => ReturnType;
      addImageToCarousel: (
        pos: number,
        src: string,
        naturalWidth?: number,
        naturalHeight?: number,
      ) => ReturnType;
      removeImageFromCarousel: (pos: number, imageIndex: number) => ReturnType;
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
        parseHTML: (element: HTMLElement) =>
          Array.from(element.querySelectorAll('img')).map((img) => ({
            src: img.getAttribute('src') ?? '',
            width: img.getAttribute('data-width') ?? '90%',
            height: img.getAttribute('data-height') ?? 'auto',
            naturalWidth: img.getAttribute('width') ? Number(img.getAttribute('width')) : undefined,
            naturalHeight: img.getAttribute('height')
              ? Number(img.getAttribute('height'))
              : undefined,
          })),
        renderHTML: () => ({}),
      },
      style: {
        default: 'width: 100%;',
        parseHTML: (element: HTMLElement) => element.getAttribute('style') ?? 'width: 100%;',
        renderHTML: (attributes: Record<string, string>) => ({ style: attributes.style }),
      },
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-type="image-carousel"]' }];
  },
  renderHTML({ node, HTMLAttributes }) {
    const images = (node.attrs.images as CarouselImage[]).map((img) => {
      const attrs: Record<string, string> = {
        src: img.src,
        'data-width': img.width,
        'data-height': img.height,
      };
      if (img.naturalWidth) attrs.width = String(img.naturalWidth);
      if (img.naturalHeight) attrs.height = String(img.naturalHeight);
      return ['img', attrs];
    });
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'image-carousel' }), ...images];
  },
  addCommands() {
    return {
      setImageCarousel:
        (attrs) =>
        ({ commands, tr }) => {
          if (attrs.images.length < 2) return false;
          closeHistory(tr);
          return commands.insertContent({ type: this.name, attrs });
        },
      addImagesToCarousel:
        (pos, images) =>
        ({ tr, dispatch }) => {
          const node = tr.doc.nodeAt(pos);
          if (!node || node.type.name !== this.name || images.length === 0) return false;
          if (dispatch)
            closeHistory(tr).setNodeMarkup(pos, null, {
              ...node.attrs,
              images: [...node.attrs.images, ...images],
            });
          return true;
        },
      addImageToCarousel:
        (pos, src, naturalWidth, naturalHeight) =>
        ({ commands }) =>
          commands.addImagesToCarousel(pos, [
            { src, width: '90%', height: 'auto', naturalWidth, naturalHeight },
          ]),
      removeImageFromCarousel:
        (pos, imageIndex) =>
        ({ tr, dispatch }) => {
          const node = tr.doc.nodeAt(pos);
          if (!node || node.type.name !== this.name) return false;
          const images = [...node.attrs.images] as CarouselImage[];
          if (!Number.isInteger(imageIndex) || imageIndex < 0 || imageIndex >= images.length)
            return false;
          images.splice(imageIndex, 1);
          if (dispatch) {
            closeHistory(tr);
            if (images.length === 0) tr.delete(pos, pos + node.nodeSize);
            else tr.setNodeMarkup(pos, null, { ...node.attrs, images });
          }
          return true;
        },
    };
  },
  addNodeView() {
    return createCarouselNodeView;
  },
});
