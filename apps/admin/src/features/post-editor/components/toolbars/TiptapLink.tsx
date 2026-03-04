'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { createPortal } from 'react-dom';

import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { LinkIcon } from '../icons';

import type { EditorProps } from './types';

export function TiptapLink({ editor }: EditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setPosition({
      top: rect.bottom + 8,
      left: rect.left,
    });
  }, []);

  const handleOpen = () => {
    const existingUrl = editor.getAttributes('link').href || '';
    setUrl(existingUrl);
    setIsOpen(true);
    updatePosition();
  };

  const handleSubmit = () => {
    if (url.trim()) {
      editor.chain().focus().setLink({ href: url.trim() }).run();
    } else {
      editor.chain().focus().unsetLink().run();
    }
    setIsOpen(false);
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleScroll = () => updatePosition();
    const handleResize = () => updatePosition();

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen, updatePosition]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleOpen}
        className={cn(
          'flex h-8 w-8 cursor-pointer items-center justify-center rounded text-foreground hover:bg-accent',
          editor.isActive('link') && 'bg-accent',
        )}
      >
        <LinkIcon />
      </button>
      {isOpen &&
        createPortal(
          <div
            ref={modalRef}
            className="fixed z-50 flex w-[320px] items-center gap-2 rounded-2xl border bg-background p-3 shadow-lg"
            style={{ top: position.top, left: position.left }}
          >
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSubmit();
                }
                if (e.key === 'Escape') {
                  setIsOpen(false);
                }
              }}
              placeholder="https://"
              className="flex-1"
              autoFocus
            />
            <button
              type="button"
              onClick={handleSubmit}
              className="shrink-0 cursor-pointer rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-primary-700"
            >
              완료
            </button>
          </div>,
          document.body,
        )}
    </>
  );
}
