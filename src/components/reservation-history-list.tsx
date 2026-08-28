'use client';

import { useMemo, useState, useTransition } from 'react';
import writeXlsxFile from 'write-excel-file/browser';
import type { SheetData } from 'write-excel-file/browser';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icon';
import { DatePicker } from '@/components/date-picker';
import { DateRangeSheet } from '@/components/date-range-sheet';
import { Pagination } from '@/components/pagination';
import { useRealtimeRefresh } from '@/lib/hooks/use-realtime-refresh';
import { updateReservationHistoryTicket } from '@/lib/actions/reservations';
import { todayISOInHotelTimezone } from '@/lib/date';
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
  }).toFile(`historial-reservas-${todayISOInHotelTimezone()}.xlsx`);
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
      className="w-24 rounded-lg bg-transparent text-sm outline-none px-2 py-1.5 border transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
      style={{ color: 'var(--text-2)', borderColor: 'var(--input)' }}
    />
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-lg p-4"
      style={{ background: 'var(--card-c)', border: '1px solid var(--line)' }}
    >
      <p className="text-xs mb-1" style={{ color: 'var(--text-3)' }}>
        {label}
      </p>
      <p className="text-2xl font-semibold" style={{ color: 'var(--light)' }}>
        {value}
      </p>
    </div>
  );
}

export function ReservationHistoryList({ entries }: { entries: ReservationHistory[] }) {
  useRealtimeRefresh(['reservation_history']);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'Doble' | 'Triple'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);

  const totalNights = entries.reduce((sum, e) => sum + e.nights, 0);
  const totalIncome = entries.reduce((sum, e) => sum + Number(e.total), 0);

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

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-stretch sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold mb-0.5" style={{ color: 'var(--light)' }}>
            Historial de reservas
          </h1>
          <p className="text-xs sm:text-sm" style={{ color: 'var(--text-3)' }}>
            Reservas ya cerradas.
          </p>
        </div>
        <Button
          type="button"
          className="sm:hidden"
          onClick={() => {
            setIsExporting(true);
            exportEntriesToXlsx(filtered).finally(() => setIsExporting(false));
          }}
          disabled={filtered.length === 0 || isExporting}
          title={isExporting ? 'Exportando...' : 'Exportar a Excel'}
          aria-label="Exportar a Excel"
          style={{ background: 'rgba(29,111,66,0.12)', color: '#1D6F42' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logoexcel.png" alt="Exportar a Excel" className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard label="Reservas finalizadas" value={entries.length.toString()} />
        <StatCard label="Noches alojadas" value={totalNights.toString()} />
        <StatCard label="Ingresos totales" value={`$${totalIncome.toFixed(2)}`} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-stretch gap-3 w-full sm:w-auto">
          <div className="relative shrink-0 w-full sm:max-w-sm">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none inline-flex items-center">
              <Icon name="magnifying-glass" style="duotone" size={14} color="var(--text-3)" />
            </span>
            <Input
              placeholder="Buscar por huésped o habitación..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              className="text-sm"
              style={{
                background: '#FFFFFF',
                border: '1px solid var(--line)',
                paddingLeft: '2.25rem',
              }}
            />
          </div>
          <Button
            type="button"
            className="hidden sm:inline-flex"
            onClick={() => {
              setIsExporting(true);
              exportEntriesToXlsx(filtered).finally(() => setIsExporting(false));
            }}
            disabled={filtered.length === 0 || isExporting}
            title={isExporting ? 'Exportando...' : 'Exportar a Excel'}
            style={{ background: 'rgba(29,111,66,0.12)', color: '#1D6F42' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logoexcel.png" alt="Exportar a Excel" className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex flex-wrap items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <div
            className="flex items-center gap-1 rounded-lg p-1 max-w-full overflow-x-auto"
            style={{ background: 'var(--card-c)', border: '1px solid var(--line)' }}
          >
            {TYPE_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => {
                  setTypeFilter(f.value);
                  setPage(1);
                }}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
                style={{
                  color: typeFilter === f.value ? 'var(--accent-c)' : 'var(--text-2)',
                  background: typeFilter === f.value ? 'var(--accent-dim)' : 'transparent',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          <DateRangeSheet
            dateFrom={dateFrom}
            dateTo={dateTo}
            onApply={(from, to) => {
              setDateFrom(from);
              setDateTo(to);
              setPage(1);
            }}
          />

          <div
            className="hidden sm:flex items-center gap-2 rounded-lg px-3 py-2 flex-wrap"
            style={{ background: 'var(--raised)' }}
          >
            <div className="w-32">
              <DatePicker
                value={dateFrom}
                onChange={(v) => {
                  setDateFrom(v);
                  if (dateTo && v > dateTo) setDateTo('');
                  setPage(1);
                }}
                placeholder="Desde"
                triggerBackground="var(--card-c)"
                triggerBorderColor="var(--line)"
              />
            </div>
            <span className="text-sm" style={{ color: 'var(--text-3)' }}>
              —
            </span>
            <div className="w-32">
              <DatePicker
                value={dateTo}
                onChange={(v) => {
                  setDateTo(v);
                  setPage(1);
                }}
                placeholder="Hasta"
                minDate={dateFrom}
                align="right"
                triggerBackground="var(--card-c)"
                triggerBorderColor="var(--line)"
              />
            </div>
            {(dateFrom || dateTo) && (
              <button
                type="button"
                onClick={() => {
                  setDateFrom('');
                  setDateTo('');
                  setPage(1);
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
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <Icon name="clock-rotate-left" style="duotone" size={32} color="var(--text-3)" />
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>
            No hay reservas en el historial que coincidan.
          </p>
        </div>
      ) : (
        <div
          className="rounded-lg overflow-x-auto"
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
                      style={{ color: 'var(--text-2)' }}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {paginated.map((e) => (
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
                  <td className="px-4 py-3 whitespace-nowrap" style={{ color: 'var(--text-2)' }}>
                    {e.check_in}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap" style={{ color: 'var(--text-2)' }}>
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
                  <td className="px-4 py-3 whitespace-nowrap" style={{ color: 'var(--text-3)' }}>
                    {new Date(e.archived_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        page={page}
        pageSize={pageSize}
        totalItems={filtered.length}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />
    </div>
  );
}
