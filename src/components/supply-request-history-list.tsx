'use client';

import { useMemo, useState } from 'react';
import writeXlsxFile from 'write-excel-file/browser';
import type { SheetData } from 'write-excel-file/browser';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icon';
import { useRealtimeRefresh } from '@/lib/hooks/use-realtime-refresh';
import { Pagination } from '@/components/pagination';
import { CustomSelect } from '@/components/custom-select';
import { DatePicker } from '@/components/date-picker';
import { todayISOInHotelTimezone } from '@/lib/date';
import type { SupplyCategory } from '@/lib/types';

export type SupplyRequestHistoryRow = {
  id: string;
  item: string;
  quantity: number;
  notes: string | null;
  requested_at: string;
  purchased_at: string | null;
  requested_by_name: string | null;
  purchased_by_name: string | null;
  room: { number: string } | null;
};

const EMPTY_LABEL: Record<SupplyCategory, string> = {
  LIMPIEZA: 'No hay pedidos de limpieza comprados que coincidan.',
  MANTENIMIENTO: 'No hay pedidos de mantenimiento comprados que coincidan.',
};

const FILE_SLUG: Record<SupplyCategory, string> = {
  LIMPIEZA: 'historial-pedidos-limpieza',
  MANTENIMIENTO: 'historial-pedidos-mantenimiento',
};

const EXPORT_COLUMNS = [
  { header: 'Habitación', width: 12 },
  { header: 'Artículo', width: 24 },
  { header: 'Cantidad', width: 10 },
  { header: 'Notas', width: 28 },
  { header: 'Pedido por', width: 18 },
  { header: 'Pedido el', width: 20 },
  { header: 'Comprado por', width: 18 },
  { header: 'Comprado el', width: 20 },
];

async function exportHistoryToXlsx(entries: SupplyRequestHistoryRow[], category: SupplyCategory) {
  const headerRow: SheetData[number] = EXPORT_COLUMNS.map((c) => ({
    value: c.header,
    fontWeight: 'bold',
    textColor: '#FF6B2B',
    backgroundColor: '#FFEDE6',
    align: 'left',
  }));

  const dataRows: SheetData = entries.map((e) => [
    { value: e.room?.number ?? '—' },
    { value: e.item },
    { value: e.quantity, type: Number },
    { value: e.notes ?? '—' },
    { value: e.requested_by_name ?? '—' },
    { value: new Date(e.requested_at), type: Date, format: 'dd/mm/yyyy hh:mm' },
    { value: e.purchased_by_name ?? '—' },
    e.purchased_at
      ? { value: new Date(e.purchased_at), type: Date, format: 'dd/mm/yyyy hh:mm' }
      : { value: '—' },
  ]);

  await writeXlsxFile([headerRow, ...dataRows], {
    columns: EXPORT_COLUMNS.map((c) => ({ width: c.width })),
  }).toFile(`${FILE_SLUG[category]}-${todayISOInHotelTimezone()}.xlsx`);
}

export function SupplyRequestHistoryList({
  category,
  entries,
}: {
  category: SupplyCategory;
  entries: SupplyRequestHistoryRow[];
}) {
  useRealtimeRefresh(['supply_requests']);
  const [query, setQuery] = useState('');
  const [staffFilter, setStaffFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);

  const staffOptions = useMemo(() => {
    const names = new Set<string>();
    for (const e of entries) {
      if (e.purchased_by_name) names.add(e.purchased_by_name);
    }
    return [...names].sort((a, b) => a.localeCompare(b)).map((name) => ({ value: name, label: name }));
  }, [entries]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (staffFilter && e.purchased_by_name !== staffFilter) return false;
      const purchasedDate = (e.purchased_at ?? e.requested_at).slice(0, 10);
      if (dateFrom && purchasedDate < dateFrom) return false;
      if (dateTo && purchasedDate > dateTo) return false;
      if (!q) return true;
      return (
        (e.room?.number ?? '').toLowerCase().includes(q) ||
        e.item.toLowerCase().includes(q) ||
        (e.requested_by_name ?? '').toLowerCase().includes(q) ||
        (e.purchased_by_name ?? '').toLowerCase().includes(q)
      );
    });
  }, [entries, query, staffFilter, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0" style={{ maxWidth: '24rem', width: '100%' }}>
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none inline-flex items-center">
              <Icon name="magnifying-glass" style="duotone" size={14} color="var(--text-3)" />
            </span>
            <Input
              placeholder="Buscar por habitación, artículo o quién lo hizo..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              style={{
                background: '#FFFFFF',
                border: '1px solid var(--line)',
                paddingLeft: '2.25rem',
              }}
            />
          </div>
          <Button
            type="button"
            onClick={() => {
              setIsExporting(true);
              exportHistoryToXlsx(filtered, category).finally(() => setIsExporting(false));
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
          <div className="w-52">
            <CustomSelect
              value={staffFilter}
              onChange={(v) => {
                setStaffFilter(v);
                setPage(1);
              }}
              placeholder="Todo el personal"
              searchable
              searchPlaceholder="Buscar personal..."
              triggerBackground="#FFFFFF"
              triggerBorderColor="var(--line)"
              options={[{ value: '', label: 'Todo el personal' }, ...staffOptions]}
            />
          </div>

          <div
            className="flex items-center gap-2 rounded-lg px-3 py-2 flex-wrap"
            style={{ background: 'var(--raised)' }}
          >
            <div className="w-32 sm:w-40">
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
            <div className="w-32 sm:w-40">
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

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <Icon name="cart-shopping" style="duotone" size={32} color="var(--text-3)" />
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>
            {EMPTY_LABEL[category]}
          </p>
        </div>
      ) : (
        <div
          className="rounded-lg overflow-hidden overflow-x-auto"
          style={{ border: '1px solid var(--line)', background: 'var(--card-c)' }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)' }}>
                {[
                  'Habitación',
                  'Artículo',
                  'Cantidad',
                  'Pedido por',
                  'Pedido el',
                  'Comprado por',
                  'Comprado el',
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left font-medium px-4 py-3"
                    style={{ color: 'var(--text-2)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map((e) => (
                <tr key={e.id} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td className="px-4 py-3 font-medium" style={{ color: 'var(--light)' }}>
                    {e.room?.number ?? '—'}
                  </td>
                  <td className="px-4 py-3 truncate max-w-xs" style={{ color: 'var(--text-2)' }}>
                    {e.item}
                    {e.notes ? ` · ${e.notes}` : ''}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-2)' }}>
                    {e.quantity}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-2)' }}>
                    {e.requested_by_name ?? '—'}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-2)' }}>
                    {new Date(e.requested_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-2)' }}>
                    {e.purchased_by_name ?? '—'}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-2)' }}>
                    {e.purchased_at ? new Date(e.purchased_at).toLocaleString() : '—'}
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
