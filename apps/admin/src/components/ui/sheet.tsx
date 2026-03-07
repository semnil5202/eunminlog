'use client';

import { createContext, useCallback, useContext, useRef, type ComponentProps } from 'react';
import { XIcon } from 'lucide-react';
import { Dialog as SheetPrimitive } from 'radix-ui';

import { cn } from '@/lib/utils';

const SheetSwipeContext = createContext<((open: boolean) => void) | undefined>(undefined);

function Sheet({ onOpenChange, ...props }: ComponentProps<typeof SheetPrimitive.Root>) {
  return (
    <SheetSwipeContext value={onOpenChange}>
      <SheetPrimitive.Root data-slot="sheet" onOpenChange={onOpenChange} {...props} />
    </SheetSwipeContext>
  );
}

function SheetTrigger({ ...props }: ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose({ ...props }: ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetPortal({ ...props }: ComponentProps<typeof SheetPrimitive.Portal>) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />;
}

function SheetOverlay({ className, ...props }: ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn(
        'fixed inset-0 z-50 bg-black/50 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0',
        className,
      )}
      {...props}
    />
  );
}

const SWIPE_THRESHOLD_RATIO = 0.3;

function useSheetSwipe(
  side: 'top' | 'right' | 'bottom' | 'left',
  onClose: (() => void) | undefined,
) {
  const contentRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const isDragging = useRef(false);

  const isHorizontal = side === 'left' || side === 'right';

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!isHorizontal) return;
      startX.current = e.touches[0].clientX;
      isDragging.current = false;
    },
    [isHorizontal],
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isHorizontal || !contentRef.current) return;

      const deltaX = e.touches[0].clientX - startX.current;
      const isValidDirection = side === 'right' ? deltaX > 0 : deltaX < 0;

      if (!isValidDirection) {
        if (isDragging.current) {
          contentRef.current.style.transform = '';
          contentRef.current.style.transition = '';
          if (overlayRef.current) overlayRef.current.style.opacity = '';
          isDragging.current = false;
        }
        return;
      }

      isDragging.current = true;
      const absDelta = Math.abs(deltaX);

      contentRef.current.style.transition = 'none';
      contentRef.current.style.transform = `translateX(${deltaX}px)`;

      if (overlayRef.current) {
        const width = contentRef.current.offsetWidth;
        const progress = Math.min(absDelta / width, 1);
        overlayRef.current.style.opacity = String(1 - progress);
      }
    },
    [isHorizontal, side],
  );

  const onTouchEnd = useCallback(() => {
    if (!isHorizontal || !isDragging.current || !contentRef.current) return;

    const el = contentRef.current;
    const width = el.offsetWidth;
    const currentTransform = el.style.transform;
    const match = currentTransform.match(/translateX\((.+?)px\)/);
    const absDelta = match ? Math.abs(parseFloat(match[1])) : 0;

    if (absDelta > width * SWIPE_THRESHOLD_RATIO) {
      el.style.transition = 'transform 200ms ease-out';
      el.style.transform = `translateX(${side === 'right' ? '100%' : '-100%'})`;
      if (overlayRef.current) {
        overlayRef.current.style.transition = 'opacity 200ms ease-out';
        overlayRef.current.style.opacity = '0';
      }
      setTimeout(() => {
        el.style.animation = 'none';
        if (overlayRef.current) overlayRef.current.style.animation = 'none';
        onClose?.();
        requestAnimationFrame(() => {
          el.style.transform = '';
          el.style.transition = '';
          el.style.animation = '';
          if (overlayRef.current) {
            overlayRef.current.style.opacity = '';
            overlayRef.current.style.transition = '';
            overlayRef.current.style.animation = '';
          }
        });
      }, 200);
    } else {
      el.style.transition = 'transform 200ms ease-out';
      el.style.transform = '';
      if (overlayRef.current) {
        overlayRef.current.style.transition = 'opacity 200ms ease-out';
        overlayRef.current.style.opacity = '';
      }
      setTimeout(() => {
        el.style.transition = '';
        if (overlayRef.current) overlayRef.current.style.transition = '';
      }, 200);
    }

    isDragging.current = false;
  }, [isHorizontal, side, onClose]);

  return { contentRef, overlayRef, onTouchStart, onTouchMove, onTouchEnd };
}

function SheetContent({
  className,
  children,
  side = 'right',
  showCloseButton = true,
  ...props
}: ComponentProps<typeof SheetPrimitive.Content> & {
  side?: 'top' | 'right' | 'bottom' | 'left';
  showCloseButton?: boolean;
}) {
  const onOpenChange = useContext(SheetSwipeContext);

  const handleClose = useCallback(() => {
    onOpenChange?.(false);
  }, [onOpenChange]);

  const { contentRef, overlayRef, onTouchStart, onTouchMove, onTouchEnd } = useSheetSwipe(
    side,
    handleClose,
  );

  return (
    <SheetPortal>
      <SheetOverlay ref={overlayRef} />
      <SheetPrimitive.Content
        ref={contentRef}
        data-slot="sheet-content"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className={cn(
          'fixed z-50 flex flex-col gap-4 bg-background shadow-lg transition ease-in-out data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:animate-in data-[state=open]:duration-500',
          side === 'right' &&
            'inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm',
          side === 'left' &&
            'inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm',
          side === 'top' &&
            'inset-x-0 top-0 h-auto border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top',
          side === 'bottom' &&
            'inset-x-0 bottom-0 h-auto border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <SheetPrimitive.Close className="absolute top-4 right-4 rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none data-[state=open]:bg-secondary">
            <XIcon className="size-4" />
            <span className="sr-only">Close</span>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Content>
    </SheetPortal>
  );
}

function SheetHeader({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="sheet-header"
      className={cn('flex flex-col gap-1.5 p-4', className)}
      {...props}
    />
  );
}

function SheetFooter({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn('mt-auto flex flex-col gap-2 p-4', className)}
      {...props}
    />
  );
}

function SheetTitle({ className, ...props }: ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn('font-semibold text-foreground', className)}
      {...props}
    />
  );
}

function SheetDescription({
  className,
  ...props
}: ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
