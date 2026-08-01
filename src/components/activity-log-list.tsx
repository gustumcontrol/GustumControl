'use client';

import { useMemo, useState } from 'react';
import { Icon } from '@/components/icon';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/date-picker';
import { CustomSelect } from '@/components/custom-select';
import { useRealtimeRefresh } from '@/lib/hooks/use-realtime-refresh';
import { ACTION_META, dayKey, formatDayHeader, formatTime, lowerFirst } from '@/lib/activity-meta';
import type { ActivityWithActor } from '@/lib/actions/activity';

export function ActivityLogList({
  entries,
  users,
}: {
  entries: ActivityWithActor[];
  users: { id: string; full_name: string }[];
}) {
  useRealtimeRefresh(['activity_log']);
  const [userId, setUserId] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [query, setQuery] = useState('');

  const userOptions = useMemo(
    () => [
      { value: 'all', label: 'Todos los usuarios' },
      ...users.map((u) => ({ value: u.id, label: u.full_name })),
    ],
    [users]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (userId !== 'all' && e.actor_id !== userId) return false;
      const day = dayKey(e.created_at);
      if (dateFrom && day < dateFrom) return false;
      if (dateTo && day > dateTo) return false;
      if (
        q &&
        !e.description.toLowerCase().includes(q) &&
        !e.actor_name.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [entries, userId, dateFrom, dateTo, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, ActivityWithActor[]>();
    for (const e of filtered) {
      const key = dayKey(e.created_at);
      const list = map.get(key) ?? [];
      list.push(e);
      map.set(key, list);
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [filtered]);

  const hasFilters = userId !== 'all' || dateFrom || dateTo || query;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative shrink-0" style={{ maxWidth: '24rem', width: '100%' }}>
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none inline-flex items-center">
            <Icon name="magnifying-glass" style="duotone" size={14} color="var(--text-3)" />
          </span>
          <Input
            placeholder="Buscar en la actividad..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              background: '#FFFFFF',
              border: '1px solid var(--line)',
              paddingLeft: '2.25rem',
            }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="w-52">
            <CustomSelect
              value={userId}
              onChange={setUserId}
              options={userOptions}
              searchable
              searchPlaceholder="Buscar usuario..."
              triggerBackground="#FFFFFF"
              triggerBorderColor="var(--line)"
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
            {hasFilters && (
              <button
                type="button"
                onClick={() => {
                  setUserId('all');
                  setDateFrom('');
                  setDateTo('');
                  setQuery('');
                }}
                className="text-xs font-medium cursor-pointer"
                style={{ color: 'var(--accent-c)' }}
              >
                Limpiar
              </button>
            )}
          </div>
        </div>
      </div>

      <p className="text-xs" style={{ color: 'var(--text-3)' }}>
        {filtered.length} evento{filtered.length === 1 ? '' : 's'}
      </p>

      {grouped.length === 0 ? (
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
              <div
                className="flex flex-col gap-3 rounded-lg p-4"
                style={{ background: 'var(--card-c)', border: '1px solid var(--line)' }}
              >
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
                          style="duotone"
                          size={12}
                          color={meta?.color ?? 'var(--text-3)'}
                        />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm" style={{ color: 'var(--light)' }}>
                          <span className="font-medium">{e.actor_name}</span>{' '}
                          {lowerFirst(e.description)}
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
  );
}
