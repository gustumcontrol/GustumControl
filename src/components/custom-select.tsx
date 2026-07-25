'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@/components/icon';

export type SelectOption = {
  value: string;
  label: string;
  hint?: string;
};

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Selecciona...',
  searchable = false,
  searchPlaceholder = 'Buscar...',
  disabled = false,
  size = 'default',
  invalid = false,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  disabled?: boolean;
  size?: 'default' | 'sm';
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (open && searchable) searchRef.current?.focus();
  }, [open, searchable]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || (o.hint ?? '').toLowerCase().includes(q)
    );
  }, [options, query]);

  const handleSelect = (v: string) => {
    onChange(v);
    setOpen(false);
    setQuery('');
  };

  const triggerPadding = size === 'sm' ? '6px 12px' : '8px 16px';
  const triggerText = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center gap-2 rounded-lg border bg-transparent outline-none cursor-pointer transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 ${triggerText}`}
        style={{
          padding: triggerPadding,
          borderColor: invalid ? '#dc2626' : 'var(--input)',
        }}
      >
        {selected ? (
          <span className="flex-1 text-left truncate" style={{ color: 'var(--light)' }}>
            {selected.label}
          </span>
        ) : (
          <span className="flex-1 text-left" style={{ color: 'var(--text-3)' }}>
            {placeholder}
          </span>
        )}
        <Icon name="chevron-down" style="solid" size={size === 'sm' ? 9 : 11} color="var(--text-3)" />
      </button>

      {open && (
        <div
          className="absolute left-0 right-0 top-full mt-1 rounded-xl shadow-lg z-30 flex flex-col overflow-hidden"
          style={{ background: 'var(--card-c)', border: '1px solid var(--line)', minWidth: '100%' }}
        >
          {searchable && (
            <div className="p-2" style={{ borderBottom: '1px solid var(--line)' }}>
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full rounded-md border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring"
              />
            </div>
          )}
          <div className="max-h-64 overflow-y-auto p-1.5">
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-sm text-center" style={{ color: 'var(--text-3)' }}>
                Sin resultados.
              </p>
            ) : (
              filtered.map((o) => {
                const isSelected = o.value === value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => handleSelect(o.value)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-left cursor-pointer transition-colors"
                    style={{
                      background: isSelected ? 'var(--accent-dim)' : 'transparent',
                      color: isSelected ? 'var(--accent-c)' : 'var(--text-2)',
                    }}
                  >
                    <span className="flex-1 min-w-0">
                      <span className="block truncate">{o.label}</span>
                      {o.hint && (
                        <span className="block truncate text-xs" style={{ color: 'var(--text-3)' }}>
                          {o.hint}
                        </span>
                      )}
                    </span>
                    {isSelected && <Icon name="check" style="solid" size={12} color="var(--accent-c)" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
