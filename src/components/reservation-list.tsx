'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Icon } from '@/components/icon';
import { CloseReservationButton } from '@/components/close-reservation-button';
import { EditReservationDialog } from '@/components/edit-reservation-dialog';
import { AddNoteDialog } from '@/components/add-note-dialog';
import { useRealtimeRefresh } from '@/lib/hooks/use-realtime-refresh';
import { COUNTRIES } from '@/lib/countries';

type RoomTypePrice = { name: string; price_per_night: number };
type BoardPlanPrice = { name: string; price_per_person: number };

export type ReservationRow = {
  id: string;
  guest_name: string;
  guests_count: number;
  check_in: string;
  check_out: string | null;
  nights: number;
  total: number | null;
  price_per_night: number | null;
  phone: string | null;
  country: string | null;
  municipio: string | null;
  provincia: string | null;
  board_plan: string | null;
  payment_method: string | null;
  notes: string | null;
  cleaning_status: string;
  maintenance_status: string;
  room: { number: string; floor: string; type: string } | null;
};

const WEEKDAYS_ABBR = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MONTHS_ABBR = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
];

function parseISODate(value: string | null): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function formatDateLabel(value: string | null): string {
  const d = parseISODate(value);
  if (!d) return '—';
  return `${WEEKDAYS_ABBR[d.getDay()]} ${d.getDate()} ${MONTHS_ABBR[d.getMonth()]}`;
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function reservationStatus(checkIn: string, checkOut: string | null) {
  const today = todayISO();
  if (checkIn === today) return { label: 'Llega hoy', tone: 'accent' as const };
  if (checkOut === today) return { label: 'Sale hoy', tone: 'muted' as const };
  if (checkIn > today) return { label: 'Próxima', tone: 'muted' as const };
  return { label: 'En casa', tone: 'neutral' as const };
}

function StatusPill({ status }: { status: ReturnType<typeof reservationStatus> }) {
  const style =
    status.tone === 'accent'
      ? { background: 'var(--accent-dim)', color: 'var(--accent-c)' }
      : { background: 'var(--raised)', color: 'var(--text-2)' };
  return (
    <span className="text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap" style={style}>
      {status.label}
    </span>
  );
}

function countryName(code: string | null) {
  if (!code) return null;
  return COUNTRIES.find((c) => c.code === code)?.name ?? code;
}

function Stat({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon name={icon} style="regular" size={11} color="var(--text-3)" className="shrink-0" />
        <span className="text-sm font-medium" style={{ color: 'var(--text-3)' }}>
          {label}
        </span>
      </div>
      <p className="text-sm font-medium break-words" style={{ color: 'var(--light)' }}>
        {value}
      </p>
    </div>
  );
}

function ReservationCard({
  r,
  roomTypes,
  boardPlans,
}: {
  r: ReservationRow;
  roomTypes: RoomTypePrice[];
  boardPlans: BoardPlanPrice[];
}) {
  const [expanded, setExpanded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(0);

  useEffect(() => {
    if (expanded && contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    } else {
      setContentHeight(0);
    }
  }, [expanded, r]);

  const location = [r.municipio, r.provincia, countryName(r.country)].filter(Boolean).join(', ');
  const status = reservationStatus(r.check_in, r.check_out);
  const roomLine = [
    `Hab. ${r.room?.number ?? '—'}`,
    r.room?.type,
    r.room?.floor ? `piso ${r.room.floor}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div
      className="rounded-lg overflow-hidden transition-colors"
      style={{
        background: 'var(--card-c)',
        border: `1px solid ${expanded ? 'var(--accent-c)' : 'var(--line)'}`,
      }}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded((e) => !e)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') setExpanded((v) => !v);
        }}
        className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 cursor-pointer select-none"
      >
        <div className="flex items-center justify-between gap-3 sm:w-44 sm:shrink-0">
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate" style={{ color: 'var(--light)' }}>
              {r.guest_name}
            </p>
            <p className="text-xs truncate" style={{ color: 'var(--text-3)' }}>
              {roomLine}
            </p>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((v) => !v);
            }}
            className="sm:hidden w-8 h-8 rounded-lg flex items-center justify-center shrink-0 cursor-pointer transition-colors hover:bg-[var(--raised)]"
            style={{ border: '1px solid var(--line)' }}
            aria-label={expanded ? 'Contraer' : 'Expandir'}
          >
            <span
              className="inline-flex transition-transform duration-300 ease-in-out"
              style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
            >
              <Icon name="chevron-down" style="solid" size={11} color="var(--text-2)" />
            </span>
          </button>
        </div>

        <div className="flex flex-col gap-3 sm:flex-1 sm:grid sm:grid-cols-4 sm:items-center sm:gap-4 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <div>
              <p
                className="text-[10px] font-medium uppercase tracking-wide leading-none mb-1"
                style={{ color: 'var(--text-3)' }}
              >
                Entrada
              </p>
              <p className="text-sm font-medium whitespace-nowrap" style={{ color: 'var(--light)' }}>
                {formatDateLabel(r.check_in)}
              </p>
            </div>
            <Icon name="arrow-right" style="solid" size={10} color="var(--text-3)" className="mt-3" />
            <div>
              <p
                className="text-[10px] font-medium uppercase tracking-wide leading-none mb-1"
                style={{ color: 'var(--text-3)' }}
              >
                Salida
              </p>
              <p className="text-sm font-medium whitespace-nowrap" style={{ color: 'var(--light)' }}>
                {formatDateLabel(r.check_out)}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 sm:contents">
            <div className="sm:text-center">
              <p
                className="text-[10px] font-medium uppercase tracking-wide leading-none mb-1 sm:hidden"
                style={{ color: 'var(--text-3)' }}
              >
                Noches
              </p>
              <p className="text-sm font-semibold" style={{ color: 'var(--light)' }}>
                {r.nights}
              </p>
            </div>

            <div className="sm:text-center">
              <p
                className="text-[10px] font-medium uppercase tracking-wide leading-none mb-1 sm:hidden"
                style={{ color: 'var(--text-3)' }}
              >
                Total
              </p>
              <p className="text-sm font-semibold" style={{ color: 'var(--light)' }}>
                {r.total != null ? `$${r.total}` : '—'}
              </p>
            </div>

            <div className="flex sm:justify-end">
              <StatusPill status={status} />
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
          className="hidden sm:flex w-8 h-8 rounded-lg items-center justify-center shrink-0 cursor-pointer transition-colors hover:bg-[var(--raised)]"
          style={{ border: '1px solid var(--line)' }}
          aria-label={expanded ? 'Contraer' : 'Expandir'}
        >
          <span
            className="inline-flex transition-transform duration-300 ease-in-out"
            style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
          >
            <Icon name="chevron-down" style="solid" size={11} color="var(--text-2)" />
          </span>
        </button>
      </div>

      <div
        className="overflow-hidden transition-[height] duration-300 ease-in-out"
        style={{ height: `${contentHeight}px` }}
      >
          <div
            ref={contentRef}
            className="px-4 pb-4 pt-4 flex flex-col gap-4"
            style={{ borderTop: '1px solid var(--line)' }}
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-3">
              <Stat icon="users" label="Huéspedes" value={String(r.guests_count)} />
              <Stat icon="phone" label="Teléfono" value={r.phone || '—'} />
              <Stat icon="location-dot" label="Ubicación" value={location || '—'} />
              <Stat icon="utensils" label="Régimen" value={r.board_plan || 'Desayuno incluido'} />
              <Stat icon="credit-card" label="Método de pago" value={r.payment_method || '—'} />
            </div>

            {r.notes && (
              <div className="rounded-lg p-3" style={{ border: '1px solid var(--line)' }}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Icon name="note-sticky" style="regular" size={12} color="var(--accent-c)" />
                  <span
                    className="text-[10px] font-medium uppercase tracking-wide"
                    style={{ color: 'var(--text-3)' }}
                  >
                    Nota de recepción
                  </span>
                </div>
                <p className="text-sm" style={{ color: 'var(--text-2)' }}>
                  {r.notes}
                </p>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <CloseReservationButton reservationId={r.id} guestName={r.guest_name} variant="default" />
              <EditReservationDialog reservation={r} roomTypes={roomTypes} boardPlans={boardPlans} />
              <AddNoteDialog reservationId={r.id} guestName={r.guest_name} notes={r.notes} />
            </div>
          </div>
      </div>
    </div>
  );
}

export function ReservationList({
  reservations,
  roomTypes,
  boardPlans,
}: {
  reservations: ReservationRow[];
  roomTypes: RoomTypePrice[];
  boardPlans: BoardPlanPrice[];
}) {
  useRealtimeRefresh(['reservations']);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return reservations;
    return reservations.filter(
      (r) =>
        r.guest_name.toLowerCase().includes(q) ||
        r.room?.number.toLowerCase().includes(q)
    );
  }, [reservations, query]);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative max-w-sm">
        <Icon
          name="magnifying-glass"
          style="regular"
          size={14}
          color="var(--text-3)"
          className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
        />
        <Input
          placeholder="Buscar por huésped o habitación..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ background: '#FFFFFF', border: '1px solid var(--line)', paddingLeft: '2.25rem' }}
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-center" style={{ color: 'var(--text-3)' }}>
          No hay reservas activas que coincidan.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="hidden sm:flex items-center gap-4 px-4">
            <div className="w-44 shrink-0">
              <span
                className="text-sm font-medium"
                style={{ color: 'var(--text-3)' }}
              >
                Huésped
              </span>
            </div>
            <div className="flex-1 grid grid-cols-4 items-center gap-4 min-w-0">
              <span
                className="text-sm font-medium"
                style={{ color: 'var(--text-3)' }}
              >
                Estancia
              </span>
              <span
                className="text-sm font-medium text-center"
                style={{ color: 'var(--text-3)' }}
              >
                Noches
              </span>
              <span
                className="text-sm font-medium text-center"
                style={{ color: 'var(--text-3)' }}
              >
                Total
              </span>
              <span
                className="text-sm font-medium text-right"
                style={{ color: 'var(--text-3)' }}
              >
                Estado
              </span>
            </div>
            <div className="w-8 shrink-0" />
          </div>

          {filtered.map((r) => (
            <ReservationCard key={r.id} r={r} roomTypes={roomTypes} boardPlans={boardPlans} />
          ))}
        </div>
      )}
    </div>
  );
}
