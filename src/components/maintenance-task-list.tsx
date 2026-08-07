'use client';

import { useState, useTransition } from 'react';
import { Icon } from '@/components/icon';
import { MaintenanceIssueDialog } from '@/components/maintenance-issue-dialog';
import { CustomSelect } from '@/components/custom-select';
import { updateMaintenanceIssueStatus, updateMaintenanceIssuePriority } from '@/lib/actions/maintenance';
import { useRealtimeRefresh } from '@/lib/hooks/use-realtime-refresh';
import { PRIORITY_META, PRIORITY_OPTIONS } from '@/lib/maintenance-priority';
import { floorLabel } from '@/lib/floor-label';
import type { MaintenancePriority, MaintenanceStatus } from '@/lib/types';

export type MaintenanceIssueRow = {
  id: string;
  room_id: string;
  description: string;
  photo_urls: string[];
  status: string;
  priority: string;
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
  onChangePriority,
  onOpenDetail,
  hotelSlug,
}: {
  task: MaintenanceIssueRow;
  isPending: boolean;
  onAdvance: () => void;
  onChangePriority: (priority: MaintenancePriority) => void;
  onOpenDetail: () => void;
  hotelSlug?: string | null;
}) {
  const meta = STATUS_META[task.status] ?? STATUS_META.PENDIENTE;
  // Estado optimista: refleja la prioridad elegida al instante, sin esperar
  // a que la actualización llegue al servidor y vuelva por revalidación.
  // Se ajusta durante el render (no en un efecto) cuando cambia la prop,
  // siguiendo el patrón recomendado por React para este caso.
  const [prevPriority, setPrevPriority] = useState(task.priority);
  const [optimisticPriority, setOptimisticPriority] = useState(task.priority);
  if (task.priority !== prevPriority) {
    setPrevPriority(task.priority);
    setOptimisticPriority(task.priority);
  }
  const priorityMeta =
    PRIORITY_META[optimisticPriority as MaintenancePriority] ?? PRIORITY_META.MEDIA;
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
            {floorLabel(task.room?.floor, hotelSlug)}
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

      <div className="shrink-0 w-32" onClick={(e) => e.stopPropagation()}>
        <CustomSelect
          value={optimisticPriority}
          onChange={(v) => {
            setOptimisticPriority(v);
            onChangePriority(v as MaintenancePriority);
          }}
          options={PRIORITY_OPTIONS}
          triggerBackground={priorityMeta.bg}
          triggerColor={priorityMeta.fg}
        />
      </div>

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

export function MaintenanceTaskList({
  tasks,
  hotelSlug,
}: {
  tasks: MaintenanceIssueRow[];
  hotelSlug?: string | null;
}) {
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

  const handleChangePriority = (id: string, priority: MaintenancePriority) => {
    startTransition(async () => {
      await updateMaintenanceIssuePriority(id, priority);
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
          onChangePriority={(priority) => handleChangePriority(task.id, priority)}
          onOpenDetail={() => setDetailTask(task)}
          hotelSlug={hotelSlug}
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
