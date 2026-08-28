'use client';

import { useState } from 'react';
import { Icon } from '@/components/icon';
import { todayISOInHotelTimezone } from '@/lib/date';

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function parseISODate(value: string): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDays(iso: string, days: number): string {
  const d = parseISODate(iso) ?? new Date();
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

function firstOfMonthISO(iso: string): string {
  const [y, m] = iso.split('-').map(Number);
  return `${y}-${String(m).padStart(2, '0')}-01`;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatShort(iso: string): string {
  const d = parseISODate(iso);
  if (!d) return 'Elegir';
  return d.toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });
}

const PRESETS: { label: string; range: () => [string, string] }[] = [
  {
    label: 'Últimos 7 días',
    range: () => {
      const today = todayISOInHotelTimezone();
      return [addDays(today, -6), today];
    },
  },
  {
    label: 'Últimos 30 días',
    range: () => {
      const today = todayISOInHotelTimezone();
      return [addDays(today, -29), today];
    },
  },
  {
    label: 'Este mes',
    range: () => {
      const today = todayISOInHotelTimezone();
      return [firstOfMonthISO(today), today];
    },
  },
  {
    label: 'Últimos 90 días',
    range: () => {
      const today = todayISOInHotelTimezone();
      return [addDays(today, -89), today];
    },
  },
];

export function DateRangeSheet({
  dateFrom,
  dateTo,
  onApply,
}: {
  dateFrom: string;
  dateTo: string;
  onApply: (from: string, to: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState(dateFrom);
  const [draftTo, setDraftTo] = useState(dateTo);
  const [viewDate, setViewDate] = useState(() => parseISODate(dateTo || dateFrom) ?? new Date());

  const openSheet = () => {
    setDraftFrom(dateFrom);
    setDraftTo(dateTo);
    setViewDate(parseISODate(dateTo || dateFrom) ?? new Date());
    setOpen(true);
  };

  const closeSheet = () => setOpen(false);

  const handlePreset = (range: () => [string, string]) => {
    const [from, to] = range();
    setDraftFrom(from);
    setDraftTo(to);
    setViewDate(parseISODate(to) ?? new Date());
  };

  const handleDayClick = (d: Date) => {
    const iso = toISODate(d);
    if (!draftFrom || (draftFrom && draftTo)) {
      // Empieza un rango nuevo.
      setDraftFrom(iso);
      setDraftTo('');
      return;
    }
    // Ya hay un "desde" esperando el "hasta".
    if (iso < draftFrom) {
      setDraftFrom(iso);
      setDraftTo('');
    } else {
      setDraftTo(iso);
    }
  };

  const handleClear = () => {
    setDraftFrom('');
    setDraftTo('');
  };

  const handleApply = () => {
    onApply(draftFrom, draftTo);
    setOpen(false);
  };

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = (firstOfMonth.getDay() + 6) % 7; // lunes = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array.from({ length: startOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];
  const today = new Date();
  const draftFromDate = parseISODate(draftFrom);
  const draftToDate = parseISODate(draftTo);

  return (
    <>
      <button
        type="button"
        onClick={openSheet}
        title="Rango de fechas"
        aria-label="Rango de fechas"
        className="sm:hidden ml-auto rounded-lg flex items-center justify-center cursor-pointer shrink-0"
        style={{
          background: '#FFFFFF',
          border: '1px solid var(--line)',
          padding: '10px 16px',
        }}
      >
        <Icon
          name="calendar"
          style="duotone"
          size={14}
          color={dateFrom || dateTo ? 'var(--accent-c)' : 'var(--text-3)'}
        />
      </button>

      {/* Backdrop + hoja inferior — siempre montados, la animación es solo
          de clases (mismo patrón que el drawer del sidebar en mobile). */}
      <div
        className={`sm:hidden fixed inset-0 z-40 transition-opacity duration-300 ease-in-out ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        style={{ background: 'rgba(0,0,0,0.5)' }}
        onClick={closeSheet}
        aria-hidden="true"
      />
      <div
        className={`sm:hidden fixed inset-x-0 bottom-0 z-50 rounded-t-2xl max-h-[88vh] overflow-y-auto transition-transform duration-300 ease-in-out ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ background: 'var(--card-c)' }}
      >
        <div className="pt-2.5 pb-1 flex justify-center">
          <span className="w-10 h-1 rounded-full" style={{ background: 'var(--line)' }} />
        </div>

        <div className="px-4 pb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold" style={{ color: 'var(--light)' }}>
              Rango de fechas
            </h3>
            <button
              type="button"
              onClick={closeSheet}
              aria-label="Cerrar"
              className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer"
              style={{ background: 'var(--raised)' }}
            >
              <Icon name="xmark" style="duotone" size={13} color="var(--text-3)" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => handlePreset(p.range)}
                className="px-3 py-2 rounded-lg text-sm font-medium text-left cursor-pointer transition-colors"
                style={{ border: '1px solid var(--line)', color: 'var(--text-2)' }}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-lg p-3" style={{ border: '1px solid var(--line)' }}>
              <p
                className="text-[10px] font-medium uppercase tracking-wide mb-1"
                style={{ color: 'var(--text-3)' }}
              >
                Desde
              </p>
              <p className="text-sm font-medium" style={{ color: draftFrom ? 'var(--light)' : 'var(--text-3)' }}>
                {draftFrom ? formatShort(draftFrom) : 'Elegir'}
              </p>
            </div>
            <div className="rounded-lg p-3" style={{ border: '1px solid var(--line)' }}>
              <p
                className="text-[10px] font-medium uppercase tracking-wide mb-1"
                style={{ color: 'var(--text-3)' }}
              >
                Hasta
              </p>
              <p className="text-sm font-medium" style={{ color: draftTo ? 'var(--light)' : 'var(--text-3)' }}>
                {draftTo ? formatShort(draftTo) : 'Elegir'}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => setViewDate(new Date(year, month - 1, 1))}
              className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors hover:bg-[var(--raised)]"
            >
              <Icon name="chevron-left" style="duotone" size={12} color="var(--text-2)" />
            </button>
            <span className="text-sm font-semibold" style={{ color: 'var(--light)' }}>
              {MONTHS[month]} {year}
            </span>
            <button
              type="button"
              onClick={() => setViewDate(new Date(year, month + 1, 1))}
              className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors hover:bg-[var(--raised)]"
            >
              <Icon name="chevron-right" style="duotone" size={12} color="var(--text-2)" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS.map((w) => (
              <span
                key={w}
                className="text-center text-[11px] font-medium py-1"
                style={{ color: 'var(--text-3)' }}
              >
                {w}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 mb-4">
            {cells.map((d, i) => {
              if (!d) return <span key={i} />;
              const isStart = draftFromDate && isSameDay(d, draftFromDate);
              const isEnd = draftToDate && isSameDay(d, draftToDate);
              const inRange =
                draftFromDate && draftToDate && d > draftFromDate && d < draftToDate;
              const isToday = isSameDay(d, today);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleDayClick(d)}
                  className="w-9 h-9 rounded-lg text-sm transition-colors cursor-pointer"
                  style={{
                    background: isStart || isEnd ? 'var(--accent-c)' : inRange ? 'var(--accent-dim)' : 'transparent',
                    color: isStart || isEnd ? 'var(--accent-ink)' : 'var(--light)',
                    fontWeight: isToday && !isStart && !isEnd ? 700 : 400,
                    border: isToday && !isStart && !isEnd ? '1px solid var(--accent-c)' : '1px solid transparent',
                  }}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClear}
              className="px-4 py-3 rounded-lg text-sm font-semibold cursor-pointer shrink-0"
              style={{ border: '1px solid var(--line)', color: 'var(--text-2)' }}
            >
              Limpiar
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="flex-1 py-3 rounded-lg text-sm font-semibold cursor-pointer"
              style={{ background: 'var(--accent-c)', color: 'var(--accent-ink)' }}
            >
              Aplicar
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
