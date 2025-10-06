'use client';

import type { Locale } from '@brainsait/rejection-tracker';
import { useEffect, useMemo, useState, useRef, KeyboardEvent } from 'react';

import { cn } from '@/lib/utils';

import { Modal } from './Modal';
import { Input } from './ui/Input';

type CommandItem = {
  id: string;
  title: string;
  icon?: string;
  group?: string;
  description?: string;
  action: () => void;
};

interface CommandPaletteProps {
  locale: Locale;
  isOpen: boolean;
  onClose: () => void;
  commands: CommandItem[];
}

export function CommandPalette({ locale, isOpen, onClose, commands }: Readonly<CommandPaletteProps>) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveIndex(0);
    }
  }, [isOpen]);

  const filtered = useMemo(() => {
    if (!query) {
      return commands;
    }

    const lowered = query.toLowerCase();
    return commands.filter((command) =>
      command.title.toLowerCase().includes(lowered) || command.group?.toLowerCase().includes(lowered)
    );
  }, [commands, query]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!filtered.length) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % filtered.length);
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => (current - 1 + filtered.length) % filtered.length);
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const selected = filtered[activeIndex];
      if (selected) {
        onClose();
        selected.action();
      }
    }
  };

  const noResultsLabel = locale === 'ar' ? 'لا توجد أوامر مطابقة' : 'No matching commands';
  const placeholder = locale === 'ar' ? 'ابحث عن إجراء أو قسم' : 'Search actions or sections';
  const title = locale === 'ar' ? 'لوحة الأوامر' : 'Command palette';

  return (
    <Modal
      locale={locale === 'ar' ? 'ar' : 'en'}
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      className="max-w-xl"
    >
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div
        ref={listRef}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="space-y-4"
      >
        <Input
          value={query}
          data-autofocus
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
        />
        <div className="max-h-80 overflow-y-auto rounded-xl border border-white/10">
          {filtered.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-gray-400">{noResultsLabel}</p>
          )}
          {filtered.map((command, index) => (
            <button
              type="button"
              key={command.id}
              onClick={() => {
                onClose();
                command.action();
              }}
              className={cn(
                'w-full text-left px-4 py-3 border-b border-white/5 bg-black/40 text-sm text-gray-100 hover:bg-white/10 transition flex items-start gap-3',
                index === filtered.length - 1 ? 'border-b-0' : undefined,
                index === activeIndex ? 'bg-white/10 text-white' : undefined
              )}
            >
              {command.icon && <span aria-hidden="true">{command.icon}</span>}
              <span className="flex-1">
                <span className="block font-semibold">{command.title}</span>
                {command.description && (
                  <span className="block text-xs text-gray-400">{command.description}</span>
                )}
                {command.group && (
                  <span className="mt-1 inline-block rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-gray-400">
                    {command.group}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
