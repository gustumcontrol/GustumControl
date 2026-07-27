'use client';

import { useTransition } from 'react';
import { updateMaintenanceStatus } from '@/lib/actions/maintenance';
import { useRealtimeRefresh } from '@/lib/hooks/use-realtime-refresh';
import type { MaintenanceStatus } from '@/lib/types';

export type MaintenanceTask = {
  id: string;
  guest_name: string;
  maintenance_status: string;
  room: { number: string; floor: string } | null;
};

const NEXT_STATUS: Record<string, MaintenanceStatus> = {
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

export function MaintenanceTaskList({ tasks }: { tasks: MaintenanceTask[] }) {
  useRealtimeRefresh(['reservations']);
  const [isPending, startTransition] = useTransition();

  if (tasks.length === 0) {
    return (
      <p className="text-sm text-center" style={{ color: 'var(--text-3)' }}>
        No hay habitaciones con mantenimiento pendiente.
      </p>
    );
  }

  const handleAdvance = (id: string, current: string) => {
    const next = NEXT_STATUS[current];
    if (!next) return;
    startTransition(() => {
      void updateMaintenanceStatus(id, next);
    });
  };

  return (
    <div className="flex flex-col gap-3">
      {tasks.map((task) => (
        <div
          key={task.id}
          className="rounded-xl p-4 flex items-center justify-between gap-4"
          style={{ background: 'var(--card-c)', border: '1px solid var(--line)' }}
        >
          <div>
            <p className="text-lg font-semibold" style={{ color: 'var(--light)' }}>
              Hab. {task.room?.number ?? '—'}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-3)' }}>
              {task.guest_name} · {task.maintenance_status}
            </p>
          </div>
          <button
            type="button"
            disabled={isPending}
            onClick={() => handleAdvance(task.id, task.maintenance_status)}
            className="px-4 py-3 rounded-lg text-sm font-medium cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              background: BUTTON_COLOR[task.maintenance_status] ?? 'var(--accent-c)',
              color: 'var(--accent-ink)',
            }}
          >
            {NEXT_LABEL[task.maintenance_status] ?? 'Actualizar'}
          </button>
        </div>
      ))}
    </div>
  );
}
