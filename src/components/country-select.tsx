'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@/components/icon';
import { COUNTRIES, POPULAR_COUNTRY_CODES, type Country } from '@/lib/countries';

function Flag({ code, size = 18 }: { code: string; size?: number }) {
  return (
    <span
      className="inline-block rounded-lg overflow-hidden shrink-0"
      style={{ width: size, height: size }}
    >
      <span
        className={`fi fi-${code.toLowerCase()}`}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
    </span>
  );
}

function CountryRow({
  country,
  selected,
  onSelect,
}: {
  country: Country;
  selected: boolean;
  onSelect: (c: Country) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(country)}
      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left cursor-pointer transition-colors"
      style={{
        background: selected ? 'var(--accent-dim)' : 'transparent',
        color: selected ? 'var(--accent-c)' : 'var(--text-2)',
      }}
    >
      <Flag code={country.code} />
      <span className="flex-1 truncate">{country.name}</span>
      {selected && <Icon name="check" style="solid" size={12} color="var(--accent-c)" />}
    </button>
  );
}

export function CountrySelect({
  value,
  onChange,
  invalid = false,
}: {
  value: string;
  onChange: (code: string) => void;
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = COUNTRIES.find((c) => c.code === value);

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
    if (open) searchRef.current?.focus();
  }, [open]);

  const { popular, rest } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q ? COUNTRIES.filter((c) => c.name.toLowerCase().includes(q)) : COUNTRIES;
    return {
      popular: !q ? filtered.filter((c) => POPULAR_COUNTRY_CODES.includes(c.code)) : [],
      rest: q ? filtered : filtered.filter((c) => !POPULAR_COUNTRY_CODES.includes(c.code)),
    };
  }, [query]);

  const handleSelect = (c: Country) => {
    onChange(c.code);
    setOpen(false);
    setQuery('');
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 rounded-lg border bg-transparent [padding:10px_16px] text-sm outline-none cursor-pointer focus-visible:ring-3 focus-visible:ring-ring/50"
        style={{ borderColor: invalid ? '#dc2626' : 'var(--input)' }}
      >
        {selected ? (
          <>
            <Flag code={selected.code} />
            <span className="flex-1 text-left truncate">{selected.name}</span>
          </>
        ) : (
          <span className="flex-1 text-left" style={{ color: 'var(--text-3)' }}>
            Selecciona un país
          </span>
        )}
        <Icon name="chevron-down" style="solid" size={11} color="var(--text-3)" />
      </button>

      {open && (
        <div
          className="absolute left-0 right-0 top-full mt-1 rounded-lg shadow-lg z-30 flex flex-col overflow-hidden"
          style={{ background: 'var(--card-c)', border: '1px solid var(--line)' }}
        >
          <div className="p-2" style={{ borderBottom: '1px solid var(--line)' }}>
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar país..."
              className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring"
            />
          </div>
          <div className="max-h-64 overflow-y-auto p-1.5">
            {popular.length > 0 && (
              <>
                <p
                  className="px-3 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--text-3)' }}
                >
                  Populares
                </p>
                {popular.map((c) => (
                  <CountryRow key={c.code} country={c} selected={c.code === value} onSelect={handleSelect} />
                ))}
              </>
            )}
            {rest.length > 0 && (
              <>
                {!query && (
                  <p
                    className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--text-3)' }}
                  >
                    Todos
                  </p>
                )}
                {rest.map((c) => (
                  <CountryRow key={c.code} country={c} selected={c.code === value} onSelect={handleSelect} />
                ))}
              </>
            )}
            {popular.length === 0 && rest.length === 0 && (
              <p className="px-3 py-4 text-sm text-center" style={{ color: 'var(--text-3)' }}>
                Sin resultados.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
