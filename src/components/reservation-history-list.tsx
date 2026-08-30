'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
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

// El export a Excel siempre trae todas las columnas, sin importar qué haya
// elegido ocultar el usuario en la tabla — eso es solo una preferencia de
// vista, no filtra los datos exportados.
const EXPORT_COLUMNS = [
  { header: 'Huésped', width: 22 },
  { header: 'Habitación', width: 12 },
  { header: 'Tipo', width: 10 },
  { header: 'Teléfono', width: 14 },
  { header: 'Municipio', width: 16 },
  { header: 'Provincia', width: 16 },
  { header: 'Entrada', width: 12 },
  { header: 'Salida', width: 12 },
  { header: 'Noches', width: 8 },
  { header: 'Régimen', width: 18 },
  { header: 'Método de pago', width: 15 },
  { header: 'Total', width: 10 },
  { header: 'Ticket', width: 14 },
  { header: 'Reservada', width: 12 },
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
    { value: e.phone ?? '' },
    { value: e.municipio ?? '' },
    { value: e.provincia ?? '' },
    { value: new Date(e.check_in), type: Date, format: 'dd/mm/yyyy' },
    { value: new Date(e.check_out), type: Date, format: 'dd/mm/yyyy' },
    { value: e.nights, type: Number, align: 'left' },
    { value: e.board_plan ?? 'Desayuno incluido' },
    { value: e.payment_method ?? '' },
    { value: e.total, type: Number, format: '$#,##0.00', align: 'left' },
    { value: e.ticket ?? '' },
    e.created_at
      ? { value: new Date(e.created_at), type: Date, format: 'dd/mm/yyyy' }
      : { value: '—' },
    { value: new Date(e.archived_at), type: Date, format: 'dd/mm/yyyy' },
  ]);

  await writeXlsxFile([headerRow, ...dataRows], {
    columns: EXPORT_COLUMNS.map((c) => ({ width: c.width })),
  }).toFile(`historial-reservas-${todayISOInHotelTimezone()}.xlsx`);
}

type ColumnKey =
  | 'guest'
  | 'room'
  | 'type'
  | 'phone'
  | 'municipio'
  | 'provincia'
  | 'checkIn'
  | 'checkOut'
  | 'nights'
  | 'boardPlan'
  | 'paymentMethod'
  | 'total'
  | 'ticket'
  | 'createdAt'
  | 'archivedAt';

// Define qué columnas existen y en qué orden se dibujan — tanto el
// encabezado como cada fila se arman recorriendo esta misma lista filtrada
// por `visibleColumns`, así siempre quedan sincronizados.
const COLUMN_DEFS: { key: ColumnKey; label: string }[] = [
  { key: 'guest', label: 'Huésped' },
  { key: 'room', label: 'Habitación' },
  { key: 'type', label: 'Tipo' },
  { key: 'phone', label: 'Teléfono' },
  { key: 'municipio', label: 'Municipio' },
  { key: 'provincia', label: 'Provincia' },
  { key: 'checkIn', label: 'Entrada' },
  { key: 'checkOut', label: 'Salida' },
  { key: 'nights', label: 'Noches' },
  { key: 'boardPlan', label: 'Régimen' },
  { key: 'paymentMethod', label: 'Método de pago' },
  { key: 'total', label: 'Total' },
  { key: 'ticket', label: 'Ticket' },
  { key: 'createdAt', label: 'Reservada' },
  { key: 'archivedAt', label: 'Cerrada' },
];

// Reservada y Cerrada arrancan destildadas — el resto, visible por default.
const DEFAULT_HIDDEN_COLUMNS = new Set<ColumnKey>(['createdAt', 'archivedAt']);
const DEFAULT_COLUMN_VISIBILITY = Object.fromEntries(
  COLUMN_DEFS.map((c) => [c.key, !DEFAULT_HIDDEN_COLUMNS.has(c.key)])
) as Record<ColumnKey, boolean>;

const COLUMN_STORAGE_KEY = 'reservation-history-visible-columns';

function ColumnPicker({
  visible,
  onToggle,
}: {
  visible: Record<ColumnKey, boolean>;
  onToggle: (key: ColumnKey) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className="relative flex shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Columnas visibles"
        aria-label="Columnas visibles"
        className="rounded-lg flex items-center justify-center cursor-pointer"
        style={{ background: '#FFFFFF', border: '1px solid var(--line)', padding: '10px 16px' }}
      >
        <Icon name="table-columns" style="duotone" size={14} color="var(--text-3)" />
      </button>

      {open && (
        <div
          className="absolute top-full right-0 mt-1 w-56 max-h-80 overflow-y-auto rounded-lg shadow-2xl z-20 p-1.5 animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-150"
          style={{ background: 'var(--card-c)', border: '1px solid var(--line)' }}
        >
          <p
            className="px-3 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: 'var(--text-3)' }}
          >
            Columnas visibles
          </p>
          {COLUMN_DEFS.map((col) => (
            <label
              key={col.key}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors hover:bg-[var(--raised)]"
              style={{ color: 'var(--text-2)' }}
            >
              <input
                type="checkbox"
                checked={visible[col.key]}
                onChange={() => onToggle(col.key)}
                className="cursor-pointer"
              />
              {col.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
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

function renderHistoryCell(key: ColumnKey, e: ReservationHistory) {
  switch (key) {
    case 'guest':
      return e.guest_name;
    case 'room':
      return e.room_number;
    case 'type':
      return e.room_type;
    case 'phone':
      return e.phone ?? '—';
    case 'municipio':
      return e.municipio ?? '—';
    case 'provincia':
      return e.provincia ?? '—';
    case 'checkIn':
      return e.check_in;
    case 'checkOut':
      return e.check_out;
    case 'nights':
      return e.nights;
    case 'boardPlan':
      return e.board_plan ?? 'Desayuno incluido';
    case 'paymentMethod':
      return e.payment_method ?? '—';
    case 'total':
      return `$${e.total}`;
    case 'ticket':
      return <TicketCell key={`${e.id}:${e.ticket ?? ''}`} id={e.id} ticket={e.ticket} />;
    case 'createdAt':
      return e.created_at ? new Date(e.created_at).toLocaleDateString() : '—';
    case 'archivedAt':
      return new Date(e.archived_at).toLocaleDateString();
    default:
      return null;
  }
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
  const [visibleColumns, setVisibleColumns] = useState<Record<ColumnKey, boolean>>(
    DEFAULT_COLUMN_VISIBILITY
  );

  useEffect(() => {
    const stored = localStorage.getItem(COLUMN_STORAGE_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVisibleColumns({ ...DEFAULT_COLUMN_VISIBILITY, ...parsed });
    } catch {
      // Preferencia guardada corrupta — se ignora y se queda con el default.
    }
  }, []);

  const toggleColumn = (key: ColumnKey) => {
    setVisibleColumns((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const columns = COLUMN_DEFS.filter((c) => visibleColumns[c.key]);

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

          <ColumnPicker visible={visibleColumns} onToggle={toggleColumn} />
        </div>

        <div className="flex flex-wrap items-stretch sm:items-center gap-3 w-full sm:w-auto sm:ml-auto">
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

          <div className="hidden sm:block">
            <div
              className="relative flex items-center gap-2 rounded-lg py-2"
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
                  className="absolute top-full right-0 mt-1 text-xs font-medium cursor-pointer whitespace-nowrap"
                  style={{ color: 'var(--accent-c)' }}
                >
                  Quitar rango
                </button>
              )}
            </div>
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
          <table className="w-full text-sm" style={{ minWidth: '78rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)' }}>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className="text-left font-medium px-4 py-3 whitespace-nowrap"
                    style={{ color: 'var(--text-2)' }}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map((e) => (
                <tr key={e.id} style={{ borderBottom: '1px solid var(--line)' }}>
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={
                        col.key === 'ticket'
                          ? 'px-2 py-2'
                          : col.key === 'guest'
                            ? 'px-4 py-3 font-medium'
                            : ['checkIn', 'checkOut', 'createdAt', 'archivedAt'].includes(col.key)
                              ? 'px-4 py-3 whitespace-nowrap'
                              : 'px-4 py-3'
                      }
                      style={{
                        color:
                          col.key === 'guest'
                            ? 'var(--light)'
                            : col.key === 'archivedAt' || col.key === 'createdAt'
                              ? 'var(--text-3)'
                              : 'var(--text-2)',
                      }}
                    >
                      {renderHistoryCell(col.key, e)}
                    </td>
                  ))}
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
