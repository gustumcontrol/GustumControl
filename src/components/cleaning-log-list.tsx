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
import { todayISOInHotelTimezone } from '@/lib/date';

export type CleaningLogRow = {
  id: string;
  reservation_id: string;
  room_number: string;
  status: string;
  changed_at: string;
  changed_by_name: string | null;
};

type CleaningSession = {
  reservationId: string;
  roomNumber: string;
  entries: CleaningLogRow[];
  startedAt: string | null;
  finishedAt: string | null;
  finishedBy: string | null;
  durationMs: number | null;
  isComplete: boolean;
  lastActivityAt: string;
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
  { header: 'Iniciada', width: 20 },
  { header: 'Finalizada', width: 20 },
  { header: 'Duración', width: 14 },
  { header: 'Realizada por', width: 18 },
  { header: 'Estado', width: 14 },
];

async function exportSessionsToXlsx(sessions: CleaningSession[]) {
  const headerRow: SheetData[number] = EXPORT_COLUMNS.map((c) => ({
    value: c.header,
    fontWeight: 'bold',
    textColor: '#FF6B2B',
    backgroundColor: '#FFEDE6',
    align: 'left',
  }));

  const dataRows: SheetData = sessions.map((s) => [
    { value: s.roomNumber },
    s.startedAt
      ? { value: new Date(s.startedAt), type: Date, format: 'dd/mm/yyyy hh:mm' }
      : { value: '—' },
    s.finishedAt
      ? { value: new Date(s.finishedAt), type: Date, format: 'dd/mm/yyyy hh:mm' }
      : { value: '—' },
    { value: s.durationMs != null ? formatDuration(s.durationMs) : '—' },
    { value: s.finishedBy ?? '—' },
    { value: s.isComplete ? 'Completada' : 'En proceso' },
  ]);

  await writeXlsxFile([headerRow, ...dataRows], {
    columns: EXPORT_COLUMNS.map((c) => ({ width: c.width })),
  }).toFile(`historial-limpieza-${todayISOInHotelTimezone()}.xlsx`);
}

function groupSessions(entries: CleaningLogRow[]): CleaningSession[] {
  const byReservation = new Map<string, CleaningLogRow[]>();
  for (const e of entries) {
    (byReservation.get(e.reservation_id) ?? byReservation.set(e.reservation_id, []).get(e.reservation_id)!).push(e);
  }

  const sessions: CleaningSession[] = [];
  for (const [reservationId, group] of byReservation) {
    const sorted = [...group].sort(
      (a, b) => new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime()
    );
    const started = sorted.find((e) => e.status === 'EN PROCESO');
    const finished = [...sorted].reverse().find((e) => e.status === 'LIMPIADO');

    sessions.push({
      reservationId,
      roomNumber: sorted[0].room_number,
      entries: sorted,
      startedAt: started?.changed_at ?? null,
      finishedAt: finished?.changed_at ?? null,
      finishedBy: finished?.changed_by_name ?? null,
      durationMs:
        started && finished
          ? new Date(finished.changed_at).getTime() - new Date(started.changed_at).getTime()
          : null,
      isComplete: !!finished,
      lastActivityAt: sorted[sorted.length - 1].changed_at,
    });
  }

  return sessions.sort((a, b) => {
    const aTime = a.lastActivityAt;
    const bTime = b.lastActivityAt;
    return new Date(bTime).getTime() - new Date(aTime).getTime();
  });
}

const STEP_LABEL: Record<string, string> = {
  PENDIENTE: 'Marcada pendiente',
  'EN PROCESO': 'Se inició la limpieza',
  LIMPIADO: 'Se terminó la limpieza',
};

function SessionDetailDialog({
  session,
  open,
  onOpenChange,
}: {
  session: CleaningSession;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Habitación {session.roomNumber}</DialogTitle>
          <DialogDescription>
            {session.isComplete
              ? `Limpieza completa · duró ${formatDuration(session.durationMs!)}`
              : 'Limpieza en proceso, todavía no terminada.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col">
          {session.entries.map((e, i) => {
            const isLast = i === session.entries.length - 1;
            return (
              <div key={e.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 mt-1"
                    style={{ background: 'var(--accent-c)' }}
                  />
                  {!isLast && (
                    <span className="w-px flex-1" style={{ background: 'var(--line-2)' }} />
                  )}
                </div>
                <div className={isLast ? '' : 'pb-4'}>
                  <p className="text-sm font-medium" style={{ color: 'var(--light)' }}>
                    {STEP_LABEL[e.status] ?? e.status}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                    {new Date(e.changed_at).toLocaleString()}
                    {e.changed_by_name ? ` · ${e.changed_by_name}` : ''}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function CleaningLogList({ entries }: { entries: CleaningLogRow[] }) {
  useRealtimeRefresh(['cleaning_log']);
  const [query, setQuery] = useState('');
  const [staffFilter, setStaffFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selected, setSelected] = useState<CleaningSession | null>(null);
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);

  const sessions = useMemo(() => groupSessions(entries), [entries]);
  const completedCount = sessions.filter((s) => s.isComplete).length;

  const staffOptions = useMemo(() => {
    const names = new Set<string>();
    for (const e of entries) {
      if (e.changed_by_name) names.add(e.changed_by_name);
    }
    return [...names].sort((a, b) => a.localeCompare(b)).map((name) => ({ value: name, label: name }));
  }, [entries]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sessions.filter((s) => {
      if (staffFilter && s.finishedBy !== staffFilter) return false;
      const activityDate = s.lastActivityAt.slice(0, 10);
      if (dateFrom && activityDate < dateFrom) return false;
      if (dateTo && activityDate > dateTo) return false;
      if (!q) return true;
      return (
        s.roomNumber.toLowerCase().includes(q) ||
        (s.finishedBy ?? '').toLowerCase().includes(q)
      );
    });
  }, [sessions, query, staffFilter, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="flex flex-col gap-4">
      <div
        className="rounded-lg p-4 w-fit"
        style={{ background: 'var(--card-c)', border: '1px solid var(--line)' }}
      >
        <p className="text-xs mb-1" style={{ color: 'var(--text-3)' }}>
          Habitaciones limpiadas
        </p>
        <p className="text-2xl font-semibold" style={{ color: 'var(--light)' }}>
          {completedCount}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0" style={{ maxWidth: '24rem', width: '100%' }}>
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none inline-flex items-center">
              <Icon name="magnifying-glass" style="duotone" size={14} color="var(--text-3)" />
            </span>
            <Input
              placeholder="Buscar por habitación o quién lo hizo..."
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
              exportSessionsToXlsx(filtered).finally(() => setIsExporting(false));
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
          <Icon name="broom" style="duotone" size={32} color="var(--text-3)" />
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>
            No hay limpiezas que coincidan.
          </p>
        </div>
      ) : (
        <div
          className="rounded-lg overflow-hidden"
          style={{ border: '1px solid var(--line)', background: 'var(--card-c)' }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)' }}>
                {['Habitación', 'Iniciada', 'Finalizada', 'Duración', 'Realizada por', 'Estado'].map(
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
              {paginated.map((s) => (
                <tr
                  key={s.reservationId}
                  onClick={() => setSelected(s)}
                  className="cursor-pointer transition-colors hover:bg-[var(--raised)]"
                  style={{ borderBottom: '1px solid var(--line)' }}
                >
                  <td className="px-4 py-3 font-medium" style={{ color: 'var(--light)' }}>
                    {s.roomNumber}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-2)' }}>
                    {s.startedAt ? new Date(s.startedAt).toLocaleString() : '—'}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-2)' }}>
                    {s.finishedAt ? new Date(s.finishedAt).toLocaleString() : '—'}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-2)' }}>
                    {s.durationMs != null ? formatDuration(s.durationMs) : '—'}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-2)' }}>
                    {s.finishedBy ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="text-xs font-medium px-2.5 py-1 rounded-full"
                      style={
                        s.isComplete
                          ? { background: 'rgba(34,197,94,0.12)', color: '#16a34a' }
                          : { background: 'rgba(234,179,8,0.16)', color: '#a16207' }
                      }
                    >
                      {s.isComplete ? 'Completada' : 'En proceso'}
                    </span>
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
        <SessionDetailDialog
          session={selected}
          open={!!selected}
          onOpenChange={(open) => !open && setSelected(null)}
        />
      )}
    </div>
  );
}
