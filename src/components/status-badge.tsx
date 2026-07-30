import type { ComputedRoomStatus } from '@/lib/types';

export const STATUS_STYLES: Record<ComputedRoomStatus, { bg: string; fg: string; label: string }> = {
  LIBRE: { bg: 'rgba(34,197,94,0.12)', fg: '#16a34a', label: 'Libre' },
  OCUPADA: { bg: 'rgba(239,68,68,0.12)', fg: '#dc2626', label: 'Ocupada' },
  'PENDIENTE LIMPIEZA': { bg: 'rgb(255 159 10 / 16%)', fg: '#d97706', label: 'Pendiente limpieza' },
  MANTENIMIENTO: { bg: 'rgba(234,179,8,0.16)', fg: '#a16207', label: 'Mantenimiento' },
  EMPLEADO: { bg: 'rgba(20,184,166,0.14)', fg: '#0d9488', label: 'Empleado' },
  RESERVADA: { bg: 'rgba(168,85,247,0.14)', fg: '#9333ea', label: 'Reservada' },
};

// Fondo de la tarjeta de habitación por estado (independiente del color del badge).
const CARD_BG_LIBRE = 'rgb(139 247 179 / 18%)';
const CARD_BG_OCUPADA = 'rgb(239 68 68 / 30%)';
const CARD_BG_PENDIENTE = 'rgb(255 159 10 / 30%)';
const CARD_BG_MANTENIMIENTO = 'rgb(250 204 21 / 20%)';

export const CARD_BG: Partial<Record<ComputedRoomStatus, string>> = {
  LIBRE: CARD_BG_LIBRE,
  OCUPADA: CARD_BG_OCUPADA,
  MANTENIMIENTO: CARD_BG_MANTENIMIENTO,
  'PENDIENTE LIMPIEZA': CARD_BG_PENDIENTE,
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
