'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/icon';

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseISODate(value: string): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Selecciona una fecha',
  invalid = false,
  id,
  minDate,
  align = 'left',
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  invalid?: boolean;
  id?: string;
  minDate?: string;
  align?: 'left' | 'right';
}) {
  const selectedDate = parseISODate(value);
  const minDateObj = parseISODate(minDate ?? '');
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => selectedDate ?? new Date());
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

  const toggleOpen = () => {
    setOpen((o) => {
      const next = !o;
      if (next) setViewDate(selectedDate ?? new Date());
      return next;
    });
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

  const goPrevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const goNextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const isDisabledDay = (d: Date) => !!minDateObj && d < minDateObj;

  const handleSelectDay = (d: Date) => {
    if (isDisabledDay(d)) return;
    onChange(toISODate(d));
    setOpen(false);
  };

  const displayLabel = selectedDate
    ? selectedDate.toLocaleDateString('es', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : placeholder;

  return (
    <div className="relative" ref={containerRef}>
      <button
        id={id}
        type="button"
        onClick={toggleOpen}
        className="flex w-full items-center gap-2 rounded-lg border bg-transparent [padding:8px_16px] text-sm outline-none cursor-pointer transition-colors focus-visible:ring-3 focus-visible:ring-ring/50"
        style={{ borderColor: invalid ? '#dc2626' : 'var(--input)' }}
      >
        <Icon name="calendar" style="regular" size={13} color="var(--text-3)" />
        <span
          className="flex-1 text-left"
          style={{ color: selectedDate ? 'var(--light)' : 'var(--text-3)' }}
        >
          {displayLabel}
        </span>
      </button>

      {open && (
        <div
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} top-full mt-1 rounded-xl shadow-lg z-30 p-3 w-72`}
          style={{ background: 'var(--card-c)', border: '1px solid var(--line)' }}
        >
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={goPrevMonth}
              className="w-7 h-7 rounded-md flex items-center justify-center cursor-pointer transition-colors hover:bg-[var(--raised)]"
            >
              <Icon name="chevron-left" style="solid" size={11} color="var(--text-2)" />
            </button>
            <span className="text-sm font-medium" style={{ color: 'var(--light)' }}>
              {MONTHS[month]} {year}
            </span>
            <button
              type="button"
              onClick={goNextMonth}
              className="w-7 h-7 rounded-md flex items-center justify-center cursor-pointer transition-colors hover:bg-[var(--raised)]"
            >
              <Icon name="chevron-right" style="solid" size={11} color="var(--text-2)" />
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

          <div className="grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              if (!d) return <span key={i} />;
              const isSelected = selectedDate && isSameDay(d, selectedDate);
              const isToday = isSameDay(d, today);
              const disabled = isDisabledDay(d);
              return (
                <button
                  key={i}
                  type="button"
                  disabled={disabled}
                  onClick={() => handleSelectDay(d)}
                  className="w-9 h-9 rounded-md text-sm transition-colors disabled:cursor-not-allowed"
                  style={{
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    background: isSelected ? 'var(--accent-c)' : 'transparent',
                    color: disabled
                      ? 'var(--text-3)'
                      : isSelected
                        ? 'var(--accent-ink)'
                        : 'var(--light)',
                    opacity: disabled ? 0.4 : 1,
                    fontWeight: isToday && !isSelected ? 700 : 400,
                    border: isToday && !isSelected ? '1px solid var(--accent-c)' : '1px solid transparent',
                  }}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
