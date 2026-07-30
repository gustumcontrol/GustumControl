'use client';

import { useMemo, useState } from 'react';
import writeXlsxFile from 'write-excel-file/browser';
import type { SheetData } from 'write-excel-file/browser';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icon';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useRealtimeRefresh } from '@/lib/hooks/use-realtime-refresh';
import { Pagination } from '@/components/pagination';
import { CustomSelect } from '@/components/custom-select';
import { DatePicker } from '@/components/date-picker';

export type MaintenanceIssueHistoryRow = {
  id: string;
  description: string;
  photo_url: string | null;
  opened_at: string;
  closed_at: string | null;
  opened_by_name: string | null;
  closed_by_name: string | null;
  room: { number: string } | null;
};

function formatDuration(ms: number) {
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours} h ${rest} min` : `${hours} h`;
}

const EXPORT_COLUMNS = [
  { header: 'Habitación', width: 12 },
  { header: 'Descripción', width: 32 },
  { header: 'Reportada', width: 20 },
  { header: 'Reportada por', width: 18 },
  { header: 'Realizada', width: 20 },
  { header: 'Realizada por', width: 18 },
  { header: 'Duración', width: 14 },
];

async function exportIssuesToXlsx(issues: MaintenanceIssueHistoryRow[]) {
  const headerRow: SheetData[number] = EXPORT_COLUMNS.map((c) => ({
    value: c.header,
    fontWeight: 'bold',
    textColor: '#FF6B2B',
    backgroundColor: '#FFEDE6',
    align: 'left',
  }));

  const dataRows: SheetData = issues.map((i) => [
    { value: i.room?.number ?? '—' },
    { value: i.description },
    { value: new Date(i.opened_at), type: Date, format: 'dd/mm/yyyy hh:mm' },
    { value: i.opened_by_name ?? '—' },
    i.closed_at
      ? { value: new Date(i.closed_at), type: Date, format: 'dd/mm/yyyy hh:mm' }
      : { value: '—' },
    { value: i.closed_by_name ?? '—' },
    {
      value:
        i.closed_at != null
          ? formatDuration(new Date(i.closed_at).getTime() - new Date(i.opened_at).getTime())
          : '—',
    },
  ]);

  await writeXlsxFile([headerRow, ...dataRows], {
    columns: EXPORT_COLUMNS.map((c) => ({ width: c.width })),
  }).toFile(`historial-mantenimiento-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function IssueDetailDialog({
  issue,
  open,
  onOpenChange,
}: {
  issue: MaintenanceIssueHistoryRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Habitación {issue.room?.number ?? '—'}</DialogTitle>
          <DialogDescription>{issue.description}</DialogDescription>
        </DialogHeader>

        {issue.photo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={issue.photo_url}
            alt="Foto de la incidencia"
            className="rounded-lg max-h-80 w-full object-cover"
          />
        )}

        <div className="flex flex-col gap-1 text-sm" style={{ color: 'var(--text-2)' }}>
          <p>
            Reportada {issue.opened_by_name ? `por ${issue.opened_by_name} ` : ''}el{' '}
            {new Date(issue.opened_at).toLocaleString()}
          </p>
          {issue.closed_at && (
            <p>
              Realizada {issue.closed_by_name ? `por ${issue.closed_by_name} ` : ''}el{' '}
              {new Date(issue.closed_at).toLocaleString()}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function MaintenanceIssuesHistoryList({
  entries,
}: {
  entries: MaintenanceIssueHistoryRow[];
}) {
  useRealtimeRefresh(['maintenance_issues']);
  const [query, setQuery] = useState('');
  const [staffFilter, setStaffFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selected, setSelected] = useState<MaintenanceIssueHistoryRow | null>(null);
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);

  const staffOptions = useMemo(() => {
    const names = new Set<string>();
    for (const e of entries) {
      if (e.closed_by_name) names.add(e.closed_by_name);
    }
    return [...names].sort((a, b) => a.localeCompare(b)).map((name) => ({ value: name, label: name }));
  }, [entries]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (staffFilter && e.closed_by_name !== staffFilter) return false;
      const closedDate = (e.closed_at ?? e.opened_at).slice(0, 10);
      if (dateFrom && closedDate < dateFrom) return false;
      if (dateTo && closedDate > dateTo) return false;
      if (!q) return true;
      return (
        (e.room?.number ?? '').toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        (e.closed_by_name ?? '').toLowerCase().includes(q)
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
            <Icon
              name="magnifying-glass"
              style="regular"
              size={14}
              color="var(--text-3)"
              className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            />
            <Input
              placeholder="Buscar por habitación, descripción o quién lo hizo..."
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
              exportIssuesToXlsx(filtered).finally(() => setIsExporting(false));
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
        <p className="text-sm text-center" style={{ color: 'var(--text-3)' }}>
          No hay mantenimientos realizados que coincidan.
        </p>
      ) : (
        <div
          className="rounded-lg overflow-hidden"
          style={{ border: '1px solid var(--line)', background: 'var(--card-c)' }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)' }}>
                {['Habitación', 'Descripción', 'Reportada', 'Realizada', 'Realizada por'].map(
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
              {paginated.map((i) => (
                <tr
                  key={i.id}
                  onClick={() => setSelected(i)}
                  className="cursor-pointer transition-colors hover:bg-[var(--raised)]"
                  style={{ borderBottom: '1px solid var(--line)' }}
                >
                  <td className="px-4 py-3 font-medium" style={{ color: 'var(--light)' }}>
                    {i.room?.number ?? '—'}
                  </td>
                  <td className="px-4 py-3 truncate max-w-xs" style={{ color: 'var(--text-2)' }}>
                    {i.description}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-2)' }}>
                    {new Date(i.opened_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-2)' }}>
                    {i.closed_at ? new Date(i.closed_at).toLocaleString() : '—'}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-2)' }}>
                    {i.closed_by_name ?? '—'}
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

      {selected && (
        <IssueDetailDialog
          issue={selected}
          open={!!selected}
          onOpenChange={(open) => !open && setSelected(null)}
        />
      )}
    </div>
  );
}
