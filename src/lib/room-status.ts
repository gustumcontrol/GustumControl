// Tablas que alimentan la vista room_status (Realtime no emite eventos de vistas).
export const ROOM_STATUS_SOURCE_TABLES = [
  'reservations',
  'maintenance_issues',
  'room_staff_assignments',
  'rooms',
] as const;

// RESERVADA = libre hoy con una reserva a futuro: todavía se puede vender hasta esa entrada.
export const AVAILABLE_ROOM_STATUSES = ['LIBRE', 'RESERVADA'] as const;
