import type { Role, UserStatus } from '@/lib/types';

const ROLE_STYLES: Record<Role, { bg: string; fg: string; label: string }> = {
  admin: { bg: 'rgba(255,107,43,0.14)', fg: '#c2410c', label: 'Admin' },
  recepcion: { bg: 'rgba(59,130,246,0.14)', fg: '#2563eb', label: 'Recepción' },
  limpieza: { bg: 'rgba(234,179,8,0.16)', fg: '#a16207', label: 'Limpieza' },
  mantenimiento: { bg: 'rgba(34,197,94,0.12)', fg: '#16a34a', label: 'Mantenimiento' },
};

export function RoleBadge({ role }: { role: string }) {
  const s = ROLE_STYLES[role as Role] ?? { bg: 'var(--raised)', fg: 'var(--text-2)', label: role };
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
      style={{ background: s.bg, color: s.fg }}
    >
      {s.label}
    </span>
  );
}

const STATUS_STYLES: Record<UserStatus, { bg: string; fg: string; label: string }> = {
  active: { bg: 'rgba(34,197,94,0.12)', fg: '#16a34a', label: 'Activo' },
  inactive: { bg: 'rgba(148,163,184,0.18)', fg: '#64748b', label: 'Inactivo' },
  suspended: { bg: 'rgba(239,68,68,0.12)', fg: '#dc2626', label: 'Suspendido' },
};

export function UserStatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status as UserStatus] ?? STATUS_STYLES.active;
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
      style={{ background: s.bg, color: s.fg }}
    >
      {s.label}
    </span>
  );
}
