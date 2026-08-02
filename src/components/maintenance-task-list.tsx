'use client';

import { useState, useTransition } from 'react';
import { Icon } from '@/components/icon';
import { MaintenanceIssueDialog } from '@/components/maintenance-issue-dialog';
import { updateMaintenanceIssueStatus } from '@/lib/actions/maintenance';
import { useRealtimeRefresh } from '@/lib/hooks/use-realtime-refresh';
import type { MaintenanceStatus } from '@/lib/types';

export type MaintenanceIssueRow = {
  id: string;
  room_id: string;
  description: string;
  photo_urls: string[];
  status: string;
  opened_at: string;
  opened_by_name: string | null;
  room: { number: string; floor: string } | null;
};

const NEXT_STATUS: Record<string, Exclude<MaintenanceStatus, 'NO'>> = {
  PENDIENTE: 'EN PROCESO',
  'EN PROCESO': 'REALIZADO',
};

const STATUS_META: Record<string, { bg: string; fg: string; cta: string; icon?: string }> = {
  PENDIENTE: { bg: 'rgb(250 204 21 / 20%)', fg: '#a16207', cta: 'Empezar', icon: 'play' },
  'EN PROCESO': {
    bg: 'rgb(139 247 179 / 18%)',
    fg: '#16a34a',
    cta: 'Marcar realizado',
    icon: 'check',
  },
};

const FLOOR_ORDINALS: Record<string, string> = {
  '1': 'Primera planta',
  '2': 'Segunda planta',
  '3': 'Tercera planta',
  '4': 'Cuarta planta',
  '5': 'Quinta planta',
  '6': 'Sexta planta',
  '7': 'Séptima planta',
  '8': 'Octava planta',
  '9': 'Novena planta',
  '10': 'Décima planta',
};

function floorLabel(floor: string | undefined) {
  if (!floor) return '—';
  return FLOOR_ORDINALS[floor] ?? `Planta ${floor}`;
}

function relativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'ahora mismo';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `hace ${days} d`;
}

function IssueRow({
  task,
  isPending,
  onAdvance,
  onOpenDetail,
}: {
  task: MaintenanceIssueRow;
  isPending: boolean;
  onAdvance: () => void;
  onOpenDetail: () => void;
}) {
  const meta = STATUS_META[task.status] ?? STATUS_META.PENDIENTE;
  const visiblePhotos = task.photo_urls.slice(0, 2);
  const extraPhotos = task.photo_urls.length - visiblePhotos.length;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpenDetail}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpenDetail();
        }
      }}
      className="w-full text-left rounded-xl p-4 flex items-center gap-4 cursor-pointer transition-shadow hover:shadow-md"
      style={{ background: 'var(--card-c)', border: '1px solid var(--line)' }}
    >
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <div className="shrink-0 w-28">
          <p className="text-sm leading-5 font-semibold truncate" style={{ color: 'var(--light)' }}>
            Hab. {task.room?.number ?? '—'}
          </p>
          <p className="text-xs truncate" style={{ color: 'var(--text-3)' }}>
            {floorLabel(task.room?.floor)}
          </p>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-5 font-medium truncate" style={{ color: 'var(--light)' }}>
            {task.description}
          </p>
          <p className="text-xs truncate" style={{ color: 'var(--text-3)' }}>
            {relativeTime(task.opened_at)} · {task.opened_by_name ?? 'Sin asignar'}
          </p>
        </div>
      </div>

      {task.photo_urls.length > 0 && (
        <div className="flex items-center gap-1 shrink-0">
          {visiblePhotos.map((url, i) => (
            <div
              key={url}
              className="w-10 h-10 rounded-lg overflow-hidden"
              style={{ border: '1px solid var(--line)' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Foto ${i + 1} de la incidencia`}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
          {extraPhotos > 0 && (
            <span
              className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-semibold shrink-0"
              style={{ background: 'var(--raised)', color: 'var(--text-2)' }}
            >
              +{extraPhotos}
            </span>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onAdvance();
        }}
        disabled={isPending}
        className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold cursor-pointer transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
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

export function MaintenanceTaskList({ tasks }: { tasks: MaintenanceIssueRow[] }) {
  useRealtimeRefresh(['maintenance_issues']);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [detailTask, setDetailTask] = useState<MaintenanceIssueRow | null>(null);
  const [, startTransition] = useTransition();

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center">
        <Icon name="circle-check" style="duotone" size={32} color="var(--accent-c)" />
        <p className="text-sm" style={{ color: 'var(--text-3)' }}>
          No hay incidencias de mantenimiento pendientes.
        </p>
      </div>
    );
  }

  const handleAdvance = (id: string, current: string) => {
    const next = NEXT_STATUS[current];
    if (!next) return;
    setPendingId(id);
    startTransition(async () => {
      await updateMaintenanceIssueStatus(id, next);
      setPendingId(null);
    });
  };

  return (
    <div className="flex flex-col gap-3">
      {tasks.map((task) => (
        <IssueRow
          key={task.id}
          task={task}
          isPending={pendingId === task.id}
          onAdvance={() => handleAdvance(task.id, task.status)}
          onOpenDetail={() => setDetailTask(task)}
        />
      ))}

      {detailTask && (
        <MaintenanceIssueDialog
          issue={detailTask}
          open={!!detailTask}
          onOpenChange={(open) => !open && setDetailTask(null)}
        />
      )}
    </div>
  );
}
