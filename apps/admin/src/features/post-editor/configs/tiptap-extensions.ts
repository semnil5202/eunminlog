import BulletList from '@tiptap/extension-bullet-list';
import Heading, { type Level } from '@tiptap/extension-heading';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import StarterKit from '@tiptap/starter-kit';
import { textblockTypeInputRule } from '@tiptap/core';

import { CustomImageCarousel } from './image-carousel';
import { CustomResizableImage } from './image';

const HEADING_STYLES: Record<Level, string> = {
  1: '',
  2: 'font-size: 22px; line-height: 30px; font-weight: 600; color: #111827; margin: 1rem 0 0.5rem 0;',
  3: 'font-size: 20px; line-height: 28px; font-weight: 600; color: #111827; margin: 0.875rem 0 0.5rem 0;',
  4: 'font-size: 18px; line-height: 26px; font-weight: 600; color: #111827; margin: 0.75rem 0 0.5rem 0;',
  5: 'font-size: 16px; line-height: 24px; font-weight: 600; color: #111827; margin: 0.625rem 0 0.5rem 0;',
  6: 'font-size: 14px; line-height: 20px; font-weight: 600; color: #111827; margin: 0.5rem 0 0.5rem 0;',
};

const CustomStarterKit = StarterKit.configure({
  listItem: {
    HTMLAttributes: {
      style: 'margin: 0; padding: 0; list-style-type: revert; margin-left: 22px;',
    },
  },
  blockquote: {
    HTMLAttributes: {
      style: 'padding-left: 17px; border-left: 3px solid #ddd; color: #555;',
    },
  },
  bold: {
    HTMLAttributes: {
      style: 'font-family: inherit;',
    },
  },
  italic: {
    HTMLAttributes: {
      style: 'font-family: inherit;',
    },
  },
  strike: {
    HTMLAttributes: {
      style: 'font-family: inherit;',
    },
  },
  orderedList: {
    HTMLAttributes: {
      style: 'list-style-position: outside;',
    },
  },
  horizontalRule: {
    HTMLAttributes: {
      style: 'margin: 16px 0;',
    },
  },
  dropcursor: {
    width: 2,
  },
  bulletList: false,
  heading: false,
  codeBlock: false,
  code: false,
});

const CustomBulletList = BulletList.configure({
  HTMLAttributes: {
    style: 'list-style-position: outside; list-style-type: revert;',
  },
});

const CustomHeading = Heading.extend({
  addInputRules() {
    const levels: Level[] = [2, 3, 4, 5, 6];

    return levels.map((level) =>
      textblockTypeInputRule({
        find: new RegExp(`^(#{${level}})\\s$`),
        type: this.type,
        getAttributes: { level },
      }),
    );
  },

  renderHTML({ node, HTMLAttributes }) {
    const level = node.attrs.level as Level;
    const style = HEADING_STYLES[level] || '';

    return [`h${level}`, { ...HTMLAttributes, style }, 0];
  },
}).configure({
  levels: [2, 3, 4, 5, 6],
});

const CustomLink = Link.configure({
  openOnClick: false,
  HTMLAttributes: {
    style:
      'color: #5e83fe; text-decoration: underline; text-underline-offset: 2px; cursor: pointer;',
  },
  validate: (url) => /^https?:\/\//.test(url),
});

const CustomUnderline = Underline.configure({
  HTMLAttributes: {
    class: 'underline',
  },
});

const CustomTextAlign = TextAlign.configure({
  types: ['heading', 'paragraph'],
});

export const tiptapExtensions = [
  CustomStarterKit,
  CustomBulletList,
  CustomHeading,
  CustomLink,
  CustomUnderline,
  CustomTextAlign,
  CustomResizableImage,
  CustomImageCarousel,
];
