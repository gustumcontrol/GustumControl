'use client';

import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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
};

function formatDuration(ms: number) {
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours} h ${rest} min` : `${hours} h`;
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
    });
  }

  return sessions.sort((a, b) => {
    const aTime = a.entries[a.entries.length - 1].changed_at;
    const bTime = b.entries[b.entries.length - 1].changed_at;
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
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<CleaningSession | null>(null);

  const sessions = useMemo(() => groupSessions(entries), [entries]);
  const completedCount = sessions.filter((s) => s.isComplete).length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter(
      (s) =>
        s.roomNumber.toLowerCase().includes(q) ||
        (s.finishedBy ?? '').toLowerCase().includes(q)
    );
  }, [sessions, query]);

  return (
    <div className="flex flex-col gap-4">
      <div
        className="rounded-xl p-4 w-fit"
        style={{ background: 'var(--card-c)', border: '1px solid var(--line)' }}
      >
        <p className="text-xs mb-1" style={{ color: 'var(--text-3)' }}>
          Habitaciones limpiadas
        </p>
        <p className="text-2xl font-semibold" style={{ color: 'var(--light)' }}>
          {completedCount}
        </p>
      </div>

      <Input
        placeholder="Buscar por habitación o quién lo hizo..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="max-w-sm"
      />

      {filtered.length === 0 ? (
        <p className="text-sm text-center" style={{ color: 'var(--text-3)' }}>
          No hay limpiezas que coincidan.
        </p>
      ) : (
        <div
          className="rounded-xl overflow-hidden"
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
                      style={{ color: 'var(--text-3)' }}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
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
