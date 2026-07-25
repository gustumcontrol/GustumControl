'use client';

import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/date-picker';
import type { ReservationHistory } from '@/lib/types';

const TYPE_FILTERS: { value: 'all' | 'Doble' | 'Triple'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'Doble', label: 'Doble' },
  { value: 'Triple', label: 'Triple' },
];

export function ReservationHistoryList({ entries }: { entries: ReservationHistory[] }) {
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'Doble' | 'Triple'>('all');
  const [dateFilter, setDateFilter] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (typeFilter !== 'all' && e.room_type !== typeFilter) return false;
      if (dateFilter && e.archived_at.slice(0, 10) !== dateFilter) return false;
      if (!q) return true;
      return (
        e.guest_name.toLowerCase().includes(q) || e.room_number.toLowerCase().includes(q)
      );
    });
  }, [entries, query, typeFilter, dateFilter]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input
          placeholder="Buscar por huésped o habitación..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="shrink-0"
          style={{ width: '24rem' }}
        />

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1">
            {TYPE_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setTypeFilter(f.value)}
                className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer"
                style={{
                  color: typeFilter === f.value ? 'var(--accent-c)' : 'var(--text-2)',
                  background: typeFilter === f.value ? 'var(--accent-dim)' : 'transparent',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 w-48">
            <DatePicker value={dateFilter} onChange={setDateFilter} placeholder="Filtrar por fecha" />
            {dateFilter && (
              <button
                type="button"
                onClick={() => setDateFilter('')}
                className="text-xs font-medium cursor-pointer"
                style={{ color: 'var(--accent-c)' }}
              >
                Quitar fecha
              </button>
            )}
          </div>
        </div>
      </div>

      <p className="text-sm" style={{ color: 'var(--text-3)' }}>
        {filtered.length} resultado{filtered.length === 1 ? '' : 's'}
        {dateFilter ? ` cerrada${filtered.length === 1 ? '' : 's'} el ${dateFilter}` : ''}
      </p>

      {filtered.length === 0 ? (
        <p className="text-sm text-center" style={{ color: 'var(--text-3)' }}>
          No hay reservas en el historial que coincidan.
        </p>
      ) : (
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: '1px solid var(--line)', background: 'var(--card-c)' }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)' }}>
                {['Huésped', 'Habitación', 'Tipo', 'Entrada', 'Salida', 'Noches', 'Total', 'Cerrada'].map(
                  (h) => (
                    <th
                      key={h}
                      className="text-left font-medium px-4 py-3"
                      style={{ color: 'var(--text-3)' }}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td className="px-4 py-3 font-medium" style={{ color: 'var(--light)' }}>
                    {e.guest_name}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-2)' }}>
                    {e.room_number}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-2)' }}>
                    {e.room_type}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-2)' }}>
                    {e.check_in}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-2)' }}>
                    {e.check_out}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-2)' }}>
                    {e.nights}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-2)' }}>
                    ${e.total}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-3)' }}>
                    {new Date(e.archived_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
