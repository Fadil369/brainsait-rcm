'use client';

import { useCallback, useEffect, useId, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

/**
 * Reusable Modal Component with Glass Morphism
 */

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  locale?: 'ar' | 'en';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  description?: string;
  className?: string;
}

const FOCUSABLE_ELEMENTS = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  locale = 'en',
  size = 'md',
  description,
  className,
}: Readonly<ModalProps>) {
  const isRTL = locale === 'ar';
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previouslyFocusedElement = useRef<Element | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl'
  };

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!isOpen) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;

  const dialog = dialogRef.current;
      if (!dialog) return;

      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_ELEMENTS));
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement as HTMLElement | null;

      if (!event.shiftKey && current === last) {
        event.preventDefault();
        first.focus();
      }

      if (event.shiftKey && current === first) {
        event.preventDefault();
        last.focus();
      }
    },
    [isOpen, onClose]
  );

  useEffect(() => {
    if (!isOpen) return undefined;

    previouslyFocusedElement.current = document.activeElement;
    document.body.style.setProperty('overflow', 'hidden');
    window.addEventListener('keydown', handleKeyDown);

    const dialog = dialogRef.current;
    if (dialog) {
      if (typeof dialog.show === 'function' && !dialog.open) {
        dialog.show();
      }
      const autofocusTarget = dialog.querySelector<HTMLElement>('[data-autofocus]');
      const focusable = dialog.querySelector<HTMLElement>(FOCUSABLE_ELEMENTS);

      (autofocusTarget ?? focusable ?? dialog).focus({ preventScroll: true });
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.removeProperty('overflow');
      if (dialogRef.current?.open) {
        dialogRef.current?.close();
      }
      if (previouslyFocusedElement.current instanceof HTMLElement) {
        previouslyFocusedElement.current.focus({ preventScroll: true });
      }
      previouslyFocusedElement.current = null;
    };
  }, [handleKeyDown, isOpen]);

  useEffect(() => {
    return () => {
      document.body.style.removeProperty('overflow');
    };
  }, []);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir={isRTL ? 'rtl' : 'ltr'}>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.dialog
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={cn('relative w-full max-h-[90vh] overflow-hidden focus:outline-none', sizeClasses[size], className)}
            aria-labelledby={titleId}
            aria-describedby={description ? descriptionId : undefined}
            aria-modal="true"
            tabIndex={-1}
            open
            ref={dialogRef}
          >
            <div className="glass-morphism rounded-2xl shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-700">
                <h2 id={titleId} className="text-2xl font-bold text-white">
                  {title}
                </h2>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-white transition p-2 hover:bg-white/10 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                  aria-label={locale === 'ar' ? 'إغلاق النافذة' : 'Close dialog'}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                {description && (
                  <p id={descriptionId} className="mb-6 text-sm text-muted-foreground">
                    {description}
                  </p>
                )}
                {children}
              </div>
            </div>
          </motion.dialog>
        </div>
      )}
    </AnimatePresence>
  );
}
