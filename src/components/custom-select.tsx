'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/icon';

export type SelectOption = {
  value: string;
  label: string;
  hint?: string;
};

type PanelRect =
  | { placement: 'bottom'; top: number; left: number; width: number }
  | { placement: 'top'; bottom: number; left: number; width: number };

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
  triggerBackground,
  triggerColor,
  triggerBorderColor,
  placement,
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
  triggerBackground?: string;
  triggerColor?: string;
  triggerBorderColor?: string;
  /** Si no se pasa, se detecta solo según el espacio disponible. */
  placement?: 'bottom' | 'top';
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [panelRect, setPanelRect] = useState<PanelRect | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value);

  const updatePanelRect = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    let openUp = placement === 'top';
    if (placement === undefined) {
      // Altura estimada del panel, para decidir hacia dónde abrir según el
      // espacio real disponible, así no queda mal en páginas donde el
      // trigger está cerca de un borde.
      const estimatedHeight = Math.min(options.length, 6) * 36 + (searchable ? 56 : 0) + 16;
      const spaceBelow = window.innerHeight - r.bottom;
      const spaceAbove = r.top;
      openUp = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;
    }
    const next: PanelRect = openUp
      ? { placement: 'top', bottom: window.innerHeight - r.top + 4, left: r.left, width: r.width }
      : { placement: 'bottom', top: r.bottom + 4, left: r.left, width: r.width };

    // Evita setState si no cambió nada: si no, cada render dispara otro
    // render (el layout effect corre en cada uno mientras está abierto) y
    // queda un loop infinito.
    setPanelRect((prev) => (prev && JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
  }, [options.length, placement, searchable]);

  // Recalcula en cada render mientras está abierto (no solo al abrir): si
  // el panel queda abierto y algo re-renderiza la página (por ejemplo un
  // refresh de datos en tiempo real que cambia el alto de una tabla), el
  // trigger se puede correr de lugar sin que haya scroll ni resize — sin
  // esto, el panel se quedaba "pegado" a la posición vieja y se veía
  // separado del botón.
  useLayoutEffect(() => {
    if (open) updatePanelRect();
  });

  useEffect(() => {
    if (!open) return;
    window.addEventListener('scroll', updatePanelRect, true);
    window.addEventListener('resize', updatePanelRect);
    return () => {
      window.removeEventListener('scroll', updatePanelRect, true);
      window.removeEventListener('resize', updatePanelRect);
    };
  }, [open, updatePanelRect]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      const insideTrigger = containerRef.current?.contains(target);
      const insidePanel = panelRef.current?.contains(target);
      if (!insideTrigger && !insidePanel) {
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

  const triggerPadding = size === 'sm' ? '6px 12px' : '10px 16px';
  const triggerText = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <div className="relative" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center gap-2 rounded-lg border outline-none cursor-pointer transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 ${triggerText}`}
        style={{
          padding: triggerPadding,
          borderColor: invalid
            ? '#dc2626'
            : (triggerBorderColor ?? (triggerBackground ? 'transparent' : 'var(--input)')),
          background: triggerBackground ?? 'transparent',
        }}
      >
        {selected ? (
          <span
            className="flex-1 text-left truncate font-medium"
            style={{ color: triggerColor ?? 'var(--light)' }}
          >
            {selected.label}
          </span>
        ) : (
          <span className="flex-1 text-left" style={{ color: 'var(--text-3)' }}>
            {placeholder}
          </span>
        )}
        <Icon
          name="chevron-down"
          style="solid"
          size={size === 'sm' ? 9 : 11}
          color={triggerColor ?? 'var(--text-3)'}
        />
      </button>

      {open &&
        panelRect &&
        createPortal(
          <div
            ref={panelRef}
            className="fixed rounded-lg shadow-lg z-[100] flex flex-col overflow-hidden"
            style={{
              ...(panelRect.placement === 'top'
                ? { bottom: panelRect.bottom }
                : { top: panelRect.top }),
              left: panelRect.left,
              width: panelRect.width,
              background: 'var(--card-c)',
              border: '1px solid var(--line)',
            }}
          >
            {searchable && (
              <div className="p-2" style={{ borderBottom: '1px solid var(--line)' }}>
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring"
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
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left cursor-pointer transition-colors"
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
          </div>,
          document.body
        )}
    </div>
  );
}
