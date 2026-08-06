import type { Role } from '@/lib/types';

export const DEFAULT_ROUTE_BY_ROLE: Record<Role, string> = {
  admin: '/hoteles',
  recepcion: '/dashboard',
  limpieza: '/limpieza',
  mantenimiento: '/mantenimiento',
};
