'use client';

import { useMemo, useState, useTransition } from 'react';
import writeXlsxFile from 'write-excel-file/browser';
import type { SheetData } from 'write-excel-file/browser';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/date-picker';
import { useRealtimeRefresh } from '@/lib/hooks/use-realtime-refresh';
import { updateReservationHistoryTicket } from '@/lib/actions/reservations';
import type { ReservationHistory } from '@/lib/types';

const TYPE_FILTERS: { value: 'all' | 'Doble' | 'Triple'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'Doble', label: 'Doble' },
  { value: 'Triple', label: 'Triple' },
];

const EXPORT_COLUMNS = [
  { header: 'Huésped', width: 22 },
  { header: 'Habitación', width: 12 },
  { header: 'Tipo', width: 10 },
  { header: 'Municipio', width: 16 },
  { header: 'Provincia', width: 16 },
  { header: 'Entrada', width: 12 },
  { header: 'Salida', width: 12 },
  { header: 'Noches', width: 8 },
  { header: 'Régimen', width: 18 },
  { header: 'Método de pago', width: 15 },
  { header: 'Total', width: 10 },
  { header: 'Ticket', width: 14 },
  { header: 'Cerrada', width: 12 },
];

async function exportEntriesToXlsx(entries: ReservationHistory[]) {
  const headerRow: SheetData[number] = EXPORT_COLUMNS.map((c) => ({
    value: c.header,
    fontWeight: 'bold',
    textColor: '#FF6B2B',
    backgroundColor: '#FFEDE6',
    align: 'left',
  }));

  const dataRows: SheetData = entries.map((e) => [
    { value: e.guest_name },
    { value: e.room_number },
    { value: e.room_type },
    { value: e.municipio ?? '' },
    { value: e.provincia ?? '' },
    { value: new Date(e.check_in), type: Date, format: 'dd/mm/yyyy' },
    { value: new Date(e.check_out), type: Date, format: 'dd/mm/yyyy' },
    { value: e.nights, type: Number, align: 'left' },
    { value: e.board_plan ?? 'Desayuno incluido' },
    { value: e.payment_method ?? '' },
    { value: e.total, type: Number, format: '$#,##0.00', align: 'left' },
    { value: e.ticket ?? '' },
    { value: new Date(e.archived_at), type: Date, format: 'dd/mm/yyyy' },
  ]);

  await writeXlsxFile([headerRow, ...dataRows], {
    columns: EXPORT_COLUMNS.map((c) => ({ width: c.width })),
  }).toFile(`historial-reservas-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function TicketCell({ id, ticket }: { id: string; ticket: string | null }) {
  const [value, setValue] = useState(ticket ?? '');
  const [isPending, startTransition] = useTransition();

  const save = () => {
    if (value === (ticket ?? '')) return;
    startTransition(() => {
      void updateReservationHistoryTicket(id, value);
    });
  };

  return (
    <input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={save}
      disabled={isPending}
      placeholder="Ticket..."
      className="w-20 rounded-md bg-transparent text-sm outline-none px-2 py-1.5 border transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
      style={{ color: 'var(--text-2)', borderColor: 'var(--input)' }}
    />
  );
}

export function ReservationHistoryList({ entries }: { entries: ReservationHistory[] }) {
  useRealtimeRefresh(['reservation_history']);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'Doble' | 'Triple'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (typeFilter !== 'all' && e.room_type !== typeFilter) return false;
      const archivedDate = e.archived_at.slice(0, 10);
      if (dateFrom && archivedDate < dateFrom) return false;
      if (dateTo && archivedDate > dateTo) return false;
      if (!q) return true;
      return (
        e.guest_name.toLowerCase().includes(q) || e.room_number.toLowerCase().includes(q)
      );
    });
  }, [entries, query, typeFilter, dateFrom, dateTo]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Input
            placeholder="Buscar por huésped o habitación..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="shrink-0"
            style={{ width: '24rem' }}
          />
          <Button
            type="button"
            onClick={() => {
              setIsExporting(true);
              exportEntriesToXlsx(filtered).finally(() => setIsExporting(false));
            }}
            disabled={filtered.length === 0 || isExporting}
            style={{ background: 'rgba(29,111,66,0.12)', color: '#1D6F42' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logoexcel.png" alt="" className="w-4 h-4" />
            {isExporting ? 'Exportando...' : 'Exportar a Excel'}
          </Button>
        </div>

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

          <div
            className="flex items-center gap-2 rounded-lg px-3 py-2"
            style={{ background: 'var(--raised)' }}
          >
            <div className="w-40">
              <DatePicker
                value={dateFrom}
                onChange={(v) => {
                  setDateFrom(v);
                  if (dateTo && v > dateTo) setDateTo('');
                }}
                placeholder="Desde"
              />
            </div>
            <span className="text-sm" style={{ color: 'var(--text-3)' }}>
              —
            </span>
            <div className="w-40">
              <DatePicker
                value={dateTo}
                onChange={setDateTo}
                placeholder="Hasta"
                minDate={dateFrom}
                align="right"
              />
            </div>
            {(dateFrom || dateTo) && (
              <button
                type="button"
                onClick={() => {
                  setDateFrom('');
                  setDateTo('');
                }}
                className="text-xs font-medium cursor-pointer shrink-0"
                style={{ color: 'var(--accent-c)' }}
              >
                Quitar rango
              </button>
            )}
          </div>
        </div>
      </div>

      <p className="text-sm" style={{ color: 'var(--text-3)' }}>
        {filtered.length} resultado{filtered.length === 1 ? '' : 's'}
        {dateFrom || dateTo
          ? ` cerrada${filtered.length === 1 ? '' : 's'} ${dateFrom ? `desde ${dateFrom}` : ''}${dateFrom && dateTo ? ' ' : ''}${dateTo ? `hasta ${dateTo}` : ''}`
          : ''}
      </p>

      {filtered.length === 0 ? (
        <p className="text-sm text-center" style={{ color: 'var(--text-3)' }}>
          No hay reservas en el historial que coincidan.
        </p>
      ) : (
        <div
          className="rounded-xl overflow-x-auto"
          style={{ border: '1px solid var(--line)', background: 'var(--card-c)' }}
        >
          <table className="w-full text-sm" style={{ minWidth: '72rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)' }}>
                {[
                  'Huésped',
                  'Habitación',
                  'Tipo',
                  'Municipio',
                  'Provincia',
                  'Entrada',
                  'Salida',
                  'Noches',
                  'Régimen',
                  'Método de pago',
                  'Total',
                  'Ticket',
                  'Cerrada',
                ].map(
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
                    {e.municipio ?? '—'}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-2)' }}>
                    {e.provincia ?? '—'}
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
                    {e.board_plan ?? 'Desayuno incluido'}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-2)' }}>
                    {e.payment_method ?? '—'}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-2)' }}>
                    ${e.total}
                  </td>
                  <td className="px-2 py-2">
                    <TicketCell key={`${e.id}:${e.ticket ?? ''}`} id={e.id} ticket={e.ticket} />
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
