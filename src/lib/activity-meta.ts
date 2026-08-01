export const ACTION_META: Record<string, { icon: string; color: string; label: string }> = {
  reservation_created: { icon: 'calendar-plus', color: '#9333ea', label: 'Reserva creada' },
  reservation_updated: { icon: 'pen', color: '#9333ea', label: 'Reserva editada' },
  reservation_closed: { icon: 'calendar-check', color: '#9333ea', label: 'Reserva cerrada' },
  reservation_note_updated: { icon: 'note-sticky', color: '#9333ea', label: 'Nota actualizada' },
  cleaning_started: { icon: 'broom', color: '#d97706', label: 'Limpieza iniciada' },
  cleaning_finished: { icon: 'circle-check', color: '#16a34a', label: 'Limpieza terminada' },
  cleaning_pending: { icon: 'broom', color: '#a16207', label: 'Limpieza pendiente' },
  maintenance_opened: { icon: 'screwdriver-wrench', color: '#2563eb', label: 'Incidencia reportada' },
  maintenance_started: { icon: 'wrench', color: '#2563eb', label: 'Incidencia en proceso' },
  maintenance_resolved: { icon: 'circle-check', color: '#16a34a', label: 'Incidencia resuelta' },
  maintenance_pending: { icon: 'screwdriver-wrench', color: '#a16207', label: 'Incidencia reabierta' },
  staff_room_assigned: { icon: 'user-lock', color: '#0d9488', label: 'Habitación asignada' },
  staff_room_released: { icon: 'lock-open', color: '#0d9488', label: 'Habitación liberada' },
};

const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

export function dayKey(iso: string) {
  return iso.slice(0, 10);
}

export function formatDayHeader(key: string) {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return `${WEEKDAYS[date.getDay()]} ${date.getDate()} de ${MONTHS[date.getMonth()]}, ${y}`;
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function lowerFirst(s: string) {
  if (!s) return s;
  return s.charAt(0).toLowerCase() + s.slice(1);
}
