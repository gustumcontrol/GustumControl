'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Input numérico que abre un dropdown normal con opciones rápidas (1..max),
 * pero sigue siendo un input editable de verdad — se puede escribir
 * cualquier número, incluso fuera del rango del dropdown.
 */
export function NumberSelect({
  value,
  onChange,
  max = 10,
  invalid = false,
  id,
}: {
  value: number;
  onChange: (value: number) => void;
  max?: number;
  invalid?: boolean;
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const options = Array.from({ length: max }, (_, i) => i + 1);

  return (
    <div className="relative" ref={containerRef}>
      <input
        id={id}
        type="number"
        min={1}
        value={value || ''}
        onFocus={() => setOpen(true)}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-invalid={invalid}
        className="w-full rounded-lg border bg-transparent [padding:10px_16px] text-sm outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20"
        style={{ borderColor: invalid ? '#dc2626' : 'var(--input)' }}
      />

      {open && (
        <div
          className="absolute left-0 right-0 top-full mt-1 rounded-lg shadow-lg z-30 max-h-56 overflow-y-auto p-1.5"
          style={{ background: 'var(--card-c)', border: '1px solid var(--line)' }}
        >
          {options.map((n) => {
            const isSelected = n === value;
            return (
              <button
                key={n}
                type="button"
                onClick={() => {
                  onChange(n);
                  setOpen(false);
                }}
                className="w-full flex items-center px-3 py-2 rounded-lg text-sm text-left cursor-pointer transition-colors"
                style={{
                  background: isSelected ? 'var(--accent-dim)' : 'transparent',
                  color: isSelected ? 'var(--accent-c)' : 'var(--text-2)',
                }}
              >
                {n}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
