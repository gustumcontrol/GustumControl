'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@/components/icon';
import { MUNICIPIOS_BY_PROVINCE } from '@/lib/municipios';

/**
 * Dropdown de municipio con opciones según país + provincia, pero editable
 * a mano: si el municipio no está en la lista (o no hay datos para esa
 * provincia), se puede escribir libremente y ese texto se usa igual.
 */
export function MunicipioInput({
  value,
  onChange,
  country,
  provincia,
  invalid = false,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  country: string;
  provincia: string;
  invalid?: boolean;
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const allOptions = useMemo(
    () => MUNICIPIOS_BY_PROVINCE[country]?.[provincia] ?? [],
    [country, provincia]
  );

  const options = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return allOptions.slice(0, 50);
    return allOptions.filter((name) => name.toLowerCase().includes(q)).slice(0, 50);
  }, [allOptions, value]);

  return (
    <div className="relative" ref={containerRef}>
      <div
        className="flex w-full items-center gap-2 rounded-lg border bg-transparent [padding:10px_16px] transition-colors focus-within:ring-3 focus-within:ring-ring/50"
        style={{ borderColor: invalid ? '#dc2626' : 'var(--input)' }}
      >
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={value}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          aria-invalid={invalid}
          className="flex-1 min-w-0 bg-transparent text-sm outline-none"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => {
            inputRef.current?.focus();
            setOpen((o) => !o);
          }}
          className="cursor-pointer"
        >
          <Icon name="chevron-down" style="solid" size={11} color="var(--text-3)" />
        </button>
      </div>

      {open && (
        <div
          className="absolute left-0 right-0 top-full mt-1 rounded-lg shadow-lg z-30 max-h-56 overflow-y-auto p-1.5"
          style={{ background: 'var(--card-c)', border: '1px solid var(--line)' }}
        >
          {options.length === 0 ? (
            <p className="px-3 py-4 text-sm text-center" style={{ color: 'var(--text-3)' }}>
              {provincia
                ? 'No hay municipios sugeridos para esta provincia. Escribe el municipio a mano.'
                : 'Selecciona primero la provincia, o escribe el municipio a mano.'}
            </p>
          ) : (
            options.map((name) => {
              const isSelected = name === value;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => {
                    onChange(name);
                    setOpen(false);
                  }}
                  className="w-full flex items-center px-3 py-2 rounded-lg text-sm text-left cursor-pointer transition-colors"
                  style={{
                    background: isSelected ? 'var(--accent-dim)' : 'transparent',
                    color: isSelected ? 'var(--accent-c)' : 'var(--text-2)',
                  }}
                >
                  {name}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
