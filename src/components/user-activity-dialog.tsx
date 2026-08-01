'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Icon } from '@/components/icon';
import { DatePicker } from '@/components/date-picker';
import { Input } from '@/components/ui/input';
import { getUserActivity } from '@/lib/actions/activity';
import { ACTION_META, dayKey, formatDayHeader, formatTime } from '@/lib/activity-meta';
import type { ActivityLogEntry, Profile } from '@/lib/types';

export function UserActivityDialog({
  user,
  open,
  onOpenChange,
}: {
  user: Profile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [entries, setEntries] = useState<ActivityLogEntry[]>([]);
  const [isPending, startTransition] = useTransition();
  const [hasLoaded, setHasLoaded] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!open || hasLoaded) return;
    startTransition(async () => {
      const data = await getUserActivity(user.id);
      setEntries(data);
      setHasLoaded(true);
    });
  }, [open, hasLoaded, user.id]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      const day = dayKey(e.created_at);
      if (dateFrom && day < dateFrom) return false;
      if (dateTo && day > dateTo) return false;
      if (q && !e.description.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [entries, dateFrom, dateTo, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, ActivityLogEntry[]>();
    for (const e of filtered) {
      const key = dayKey(e.created_at);
      const list = map.get(key) ?? [];
      list.push(e);
      map.set(key, list);
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [filtered]);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) {
          setDateFrom('');
          setDateTo('');
          setQuery('');
        }
      }}
    >
      <DialogContent className="sm:max-w-2xl h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>Actividad de {user.full_name}</DialogTitle>
          <DialogDescription>
            Todo lo que hizo en el sistema, con fecha y hora.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 mb-2 shrink-0">
          <div className="relative">
            <Icon
              name="magnifying-glass"
              style="regular"
              size={14}
              color="var(--text-3)"
              className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            />
            <Input
              placeholder="Buscar en la actividad..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ paddingLeft: '2.25rem' }}
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
                onChange={setDateTo}
                placeholder="Hasta"
                minDate={dateFrom}
                align="right"
                triggerBackground="var(--card-c)"
                triggerBorderColor="var(--line)"
              />
            </div>
            {(dateFrom || dateTo || query) && (
              <button
                type="button"
                onClick={() => {
                  setDateFrom('');
                  setDateTo('');
                  setQuery('');
                }}
                className="text-xs font-medium cursor-pointer"
                style={{ color: 'var(--accent-c)' }}
              >
                Limpiar filtros
              </button>
            )}
            <span className="text-xs ml-auto" style={{ color: 'var(--text-3)' }}>
              {filtered.length} evento{filtered.length === 1 ? '' : 's'}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          {isPending && !hasLoaded ? (
            <p className="text-sm text-center py-8" style={{ color: 'var(--text-3)' }}>
              Cargando actividad...
            </p>
          ) : grouped.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: 'var(--text-3)' }}>
              No hay actividad que coincida con los filtros.
            </p>
          ) : (
            <div className="flex flex-col gap-6">
              {grouped.map(([day, dayEntries]) => (
                <div key={day}>
                  <p
                    className="text-xs font-semibold uppercase tracking-wide mb-2"
                    style={{ color: 'var(--text-3)' }}
                  >
                    {formatDayHeader(day)}
                  </p>
                  <div className="flex flex-col gap-3">
                    {dayEntries.map((e) => {
                      const meta = ACTION_META[e.action];
                      return (
                        <div key={e.id} className="flex items-start gap-3">
                          <span
                            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                            style={{ background: `${meta?.color ?? '#666'}1f` }}
                          >
                            <Icon
                              name={meta?.icon ?? 'circle'}
                              style="solid"
                              size={12}
                              color={meta?.color ?? 'var(--text-3)'}
                            />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm" style={{ color: 'var(--light)' }}>
                              {e.description}
                            </p>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                              {formatTime(e.created_at)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
