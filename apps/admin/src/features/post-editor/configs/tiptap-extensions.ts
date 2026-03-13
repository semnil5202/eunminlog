import BulletList from '@tiptap/extension-bullet-list';
import Heading, { type Level } from '@tiptap/extension-heading';
import Link from '@tiptap/extension-link';
import { Table } from '@tiptap/extension-table';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableRow } from '@tiptap/extension-table-row';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import StarterKit from '@tiptap/starter-kit';
import { textblockTypeInputRule } from '@tiptap/core';

import Color from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';

import { CustomImageCarousel } from './image-carousel';
import { CustomResizableImage } from './image';
import { CustomLinkBookmark } from './link-bookmark';

const HEADING_STYLES: Record<Level, string> = {
  1: '',
  2: 'font-size: 24px; line-height: 32px; font-weight: 600; color: #111827; margin: 1.125rem 0 0.5rem 0;',
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
  undoRedo: {
    newGroupDelay: 100,
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

const MARKDOWN_TO_HEADING: { hashes: number; level: Level }[] = [
  { hashes: 1, level: 2 },
  { hashes: 2, level: 3 },
  { hashes: 3, level: 4 },
  { hashes: 4, level: 5 },
];

const CustomHeading = Heading.extend({
  addInputRules() {
    return MARKDOWN_TO_HEADING.map(({ hashes, level }) =>
      textblockTypeInputRule({
        find: new RegExp(`^(#{${hashes}})\\s$`),
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
  levels: [2, 3, 4, 5],
});

const CustomLink = Link.configure({
  openOnClick: false,
  HTMLAttributes: {
    style:
      'color: #5e83fe; text-decoration: underline; text-underline-offset: 2px; cursor: pointer;',
  },
  validate: (url) => /^https?:\/\//.test(url),
});

const CustomUnderline = Underline.configure({});

const CustomTextAlign = TextAlign.configure({
  types: ['heading', 'paragraph'],
});

const CustomTable = Table.configure({
  resizable: true,
  HTMLAttributes: {
    style: 'border-collapse: collapse; width: 100%; margin: 12px 0;',
  },
});

const CustomTableRow = TableRow.configure({
  HTMLAttributes: {},
});

const backgroundAttr = {
  background: {
    default: null,
    parseHTML: (el: HTMLElement) => el.style.backgroundColor || null,
    renderHTML: (attrs: Record<string, string | null>) => {
      if (!attrs.background) return {};
      return { style: `background-color: ${attrs.background}` };
    },
  },
};

const CustomTableHeader = TableHeader.extend({
  addAttributes() {
    return { ...this.parent?.(), ...backgroundAttr };
  },
}).configure({
  HTMLAttributes: {
    style:
      'border: 1px solid #d1d5db; padding: 8px 12px; background-color: #f3f4f6; font-weight: 600; text-align: left;',
  },
});

const CustomTableCell = TableCell.extend({
  addAttributes() {
    return { ...this.parent?.(), ...backgroundAttr };
  },
}).configure({
  HTMLAttributes: {
    style: 'border: 1px solid #d1d5db; padding: 8px 12px;',
  },
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
  CustomLinkBookmark,
  CustomTable,
  CustomTableRow,
  CustomTableHeader,
  CustomTableCell,
  TextStyle,
  Color,
];
