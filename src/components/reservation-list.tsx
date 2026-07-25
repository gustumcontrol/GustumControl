'use client';

import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { CloseReservationButton } from '@/components/close-reservation-button';

export type ReservationRow = {
  id: string;
  guest_name: string;
  guests_count: number;
  check_in: string;
  check_out: string | null;
  total: number | null;
  cleaning_status: string;
  maintenance_status: string;
  room: { number: string; floor: string } | null;
};

export function ReservationList({ reservations }: { reservations: ReservationRow[] }) {
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
      <Input
        placeholder="Buscar por huésped o habitación..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="max-w-sm"
      />

      {filtered.length === 0 ? (
        <p className="text-sm text-center" style={{ color: 'var(--text-3)' }}>
          No hay reservas activas que coincidan.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((r) => (
            <div
              key={r.id}
              className="rounded-xl p-4 flex items-center justify-between gap-4"
              style={{ background: 'var(--card-c)', border: '1px solid var(--line)' }}
            >
              <div className="min-w-0">
                <p className="font-medium truncate" style={{ color: 'var(--light)' }}>
                  {r.guest_name}{' '}
                  <span className="font-normal text-sm" style={{ color: 'var(--text-3)' }}>
                    · Hab. {r.room?.number ?? '—'}
                  </span>
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                  {r.check_in} → {r.check_out} · {r.guests_count} huésped(es)
                  {r.total != null ? ` · $${r.total}` : ''}
                </p>
              </div>
              <CloseReservationButton reservationId={r.id} guestName={r.guest_name} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
