import type { ComputedRoomStatus } from '@/lib/types';

export const STATUS_STYLES: Record<ComputedRoomStatus, { bg: string; fg: string; label: string }> = {
  LIBRE: { bg: 'rgba(34,197,94,0.12)', fg: '#16a34a', label: 'Libre' },
  OCUPADA: { bg: 'rgba(239,68,68,0.12)', fg: '#dc2626', label: 'Ocupada' },
  'PENDIENTE LIMPIEZA': { bg: 'rgba(234,179,8,0.16)', fg: '#a16207', label: 'Pendiente limpieza' },
  MANTENIMIENTO: { bg: 'rgba(59,130,246,0.14)', fg: '#2563eb', label: 'Mantenimiento' },
  RESERVADA: { bg: 'rgba(168,85,247,0.14)', fg: '#9333ea', label: 'Reservada' },
};

const STYLES = STATUS_STYLES;

export function StatusBadge({ status }: { status: ComputedRoomStatus }) {
  const s = STYLES[status];
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
      style={{ background: s.bg, color: s.fg }}
    >
      {s.label}
    </span>
  );
}
