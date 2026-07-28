'use client';

import { useState, useTransition } from 'react';
import { updateMaintenanceIssueStatus } from '@/lib/actions/maintenance';
import { useRealtimeRefresh } from '@/lib/hooks/use-realtime-refresh';
import type { MaintenanceStatus } from '@/lib/types';

export type MaintenanceIssueRow = {
  id: string;
  room_id: string;
  description: string;
  photo_url: string | null;
  status: string;
  opened_at: string;
  opened_by_name: string | null;
  room: { number: string; floor: string } | null;
};

const NEXT_STATUS: Record<string, Exclude<MaintenanceStatus, 'NO'>> = {
  PENDIENTE: 'EN PROCESO',
  'EN PROCESO': 'REALIZADO',
};

const NEXT_LABEL: Record<string, string> = {
  PENDIENTE: 'Empezar mantenimiento',
  'EN PROCESO': 'Marcar realizado',
};

const BUTTON_COLOR: Record<string, string> = {
  PENDIENTE: '#eab308',
  'EN PROCESO': '#16a34a',
};

export function MaintenanceTaskList({ tasks }: { tasks: MaintenanceIssueRow[] }) {
  useRealtimeRefresh(['maintenance_issues']);
  const [isPending, startTransition] = useTransition();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (tasks.length === 0) {
    return (
      <p className="text-sm text-center" style={{ color: 'var(--text-3)' }}>
        No hay incidencias de mantenimiento pendientes.
      </p>
    );
  }

  const handleAdvance = (id: string, current: string) => {
    const next = NEXT_STATUS[current];
    if (!next) return;
    startTransition(() => {
      void updateMaintenanceIssueStatus(id, next);
    });
  };

  return (
    <div className="flex flex-col gap-3">
      {tasks.map((task) => {
        const expanded = expandedId === task.id;
        return (
          <div
            key={task.id}
            className="rounded-xl p-4 flex flex-col gap-3"
            style={{ background: 'var(--card-c)', border: '1px solid var(--line)' }}
          >
            <div className="flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setExpandedId(expanded ? null : task.id)}
                className="text-left flex-1 min-w-0 cursor-pointer"
              >
                <p className="text-lg font-semibold" style={{ color: 'var(--light)' }}>
                  Hab. {task.room?.number ?? '—'}
                </p>
                <p className="text-xs truncate" style={{ color: 'var(--text-3)' }}>
                  {task.description}
                </p>
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleAdvance(task.id, task.status)}
                className="shrink-0 px-4 py-3 rounded-lg text-sm font-medium cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                style={{
                  background: BUTTON_COLOR[task.status] ?? 'var(--accent-c)',
                  color: 'var(--accent-ink)',
                }}
              >
                {NEXT_LABEL[task.status] ?? 'Actualizar'}
              </button>
            </div>

            {expanded && (
              <div
                className="flex flex-col gap-2 pt-3 text-sm"
                style={{ borderTop: '1px solid var(--line)', color: 'var(--text-2)' }}
              >
                <p>{task.description}</p>
                {task.photo_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={task.photo_url}
                    alt="Foto de la incidencia"
                    className="rounded-lg max-w-xs max-h-64 object-cover"
                  />
                )}
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                  Reportado {task.opened_by_name ? `por ${task.opened_by_name} ` : ''}
                  el {new Date(task.opened_at).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
