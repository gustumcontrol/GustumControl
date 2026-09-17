'use client';

import { useState, useTransition } from 'react';
import { Icon } from '@/components/icon';
import { updateCleaningStatus, updateRoomCleaningStatus } from '@/lib/actions/cleaning';
import { useRealtimeRefresh } from '@/lib/hooks/use-realtime-refresh';
import { floorLabel } from '@/lib/floor-label';
import type { CleaningStatus } from '@/lib/types';

export type CleaningTask = {
  room_id: string;
  reservation_id: string | null;
  guest_name: string | null;
  cleaning_status: string;
  room: { number: string; floor: string } | null;
};

const NEXT_STATUS: Record<string, CleaningStatus> = {
  PENDIENTE: 'EN PROCESO',
  'EN PROCESO': 'LIMPIADO',
};

const STATUS_LABEL: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  'EN PROCESO': 'En proceso',
};

const STATUS_META: Record<string, { bg: string; fg: string; cta: string; icon?: string }> = {
  PENDIENTE: {
    bg: 'rgb(255 159 10 / 16%)',
    fg: '#d97706',
    cta: 'Empezar limpieza',
    icon: 'broom',
  },
  'EN PROCESO': {
    bg: 'rgb(139 247 179 / 18%)',
    fg: '#16a34a',
    cta: 'Confirmar limpieza',
    icon: 'check',
  },
};

function TaskRow({
  task,
  isPending,
  onAdvance,
  hotelSlug,
}: {
  task: CleaningTask;
  isPending: boolean;
  onAdvance: () => void;
  hotelSlug?: string | null;
}) {
  const meta = STATUS_META[task.cleaning_status] ?? STATUS_META.PENDIENTE;

  return (
    <div
      className="rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4"
      style={{ background: 'var(--card-c)', border: '1px solid var(--line)' }}
    >
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <div className="shrink-0 w-28">
          <p className="text-sm leading-5 font-semibold truncate" style={{ color: 'var(--light)' }}>
            Hab. {task.room?.number ?? '—'}
          </p>
          <p className="text-xs truncate" style={{ color: 'var(--text-3)' }}>
            {floorLabel(task.room?.floor, hotelSlug)}
          </p>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-5 font-medium truncate" style={{ color: 'var(--light)' }}>
            {task.guest_name ?? 'Limpieza de habitación'}
          </p>
          <p className="text-xs truncate" style={{ color: 'var(--text-3)' }}>
            {STATUS_LABEL[task.cleaning_status] ?? task.cleaning_status}
          </p>
        </div>
      </div>

      <button
        type="button"
        disabled={isPending}
        onClick={onAdvance}
        className="shrink-0 w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold cursor-pointer transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        style={{ background: meta.bg, color: meta.fg }}
      >
        {meta.icon && !isPending && (
          <Icon name={meta.icon} style="solid" size={12} color={meta.fg} />
        )}
        {isPending ? 'Actualizando...' : meta.cta}
      </button>
    </div>
  );
}

export function CleaningTaskList({
  tasks,
  hotelSlug,
}: {
  tasks: CleaningTask[];
  hotelSlug?: string | null;
}) {
  useRealtimeRefresh(['reservations', 'cleaning_log', 'rooms']);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center">
        <Icon name="circle-check" style="duotone" size={32} color="var(--accent-c)" />
        <p className="text-sm" style={{ color: 'var(--text-3)' }}>
          No hay habitaciones pendientes de limpieza.
        </p>
      </div>
    );
  }

  const handleAdvance = (task: CleaningTask) => {
    const next = NEXT_STATUS[task.cleaning_status];
    if (!next) return;
    setPendingId(task.room_id);
    startTransition(async () => {
      if (task.reservation_id) {
        await updateCleaningStatus(task.reservation_id, next);
      } else {
        await updateRoomCleaningStatus(task.room_id, next);
      }
      setPendingId(null);
    });
  };

  return (
    <div className="flex flex-col gap-3">
      {tasks.map((task) => (
        <TaskRow
          key={task.room_id}
          task={task}
          isPending={pendingId === task.room_id}
          onAdvance={() => handleAdvance(task)}
          hotelSlug={hotelSlug}
        />
      ))}
    </div>
  );
}
