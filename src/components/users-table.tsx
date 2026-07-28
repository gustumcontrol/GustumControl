'use client';

import { useMemo, useState, useTransition } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CustomSelect } from '@/components/custom-select';
import { RoleBadge, STATUS_STYLES } from '@/components/user-badges';
import { EditUserDialog } from '@/components/edit-user-dialog';
import { DeleteUserButton } from '@/components/delete-user-button';
import { updateUserStatus } from '@/lib/actions/users';
import { useRealtimeRefresh } from '@/lib/hooks/use-realtime-refresh';
import type { Profile, UserStatus } from '@/lib/types';

const FILTERS: { value: 'all' | UserStatus; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Activos' },
  { value: 'inactive', label: 'Inactivos' },
  { value: 'suspended', label: 'Suspendidos' },
];

function relativeTime(iso: string | null) {
  if (!iso) return 'Nunca';
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'Ahora mismo';
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `Hace ${days} d`;
  return new Date(iso).toLocaleDateString();
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
}

function StatusSelect({ user, disabled }: { user: Profile; disabled: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  const handleChange = (status: UserStatus) => {
    setError('');
    startTransition(async () => {
      const result = await updateUserStatus(user.id, status);
      if (result?.error) setError(result.error);
    });
  };

  const s = STATUS_STYLES[user.status as UserStatus] ?? STATUS_STYLES.active;

  return (
    <div className="w-32">
      <CustomSelect
        value={user.status}
        onChange={(v) => handleChange(v as UserStatus)}
        disabled={disabled || isPending}
        size="sm"
        triggerBackground={s.bg}
        triggerColor={s.fg}
        options={[
          { value: 'active', label: 'Activo' },
          { value: 'inactive', label: 'Inactivo' },
          { value: 'suspended', label: 'Suspendido' },
        ]}
      />
      {error && <p className="text-xs text-red-600 mt-1 max-w-40">{error}</p>}
    </div>
  );
}

export function UsersTable({
  users,
  currentUserId,
}: {
  users: Profile[];
  currentUserId: string;
}) {
  useRealtimeRefresh(['profiles']);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | UserStatus>('all');
  const [editingUser, setEditingUser] = useState<Profile | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (filter !== 'all' && u.status !== filter) return false;
      if (!q) return true;
      return (
        u.full_name.toLowerCase().includes(q) ||
        (u.email ?? '').toLowerCase().includes(q) ||
        (u.department ?? '').toLowerCase().includes(q)
      );
    });
  }, [users, query, filter]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input
          placeholder="Buscar por nombre, email o departamento..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="shrink-0"
          style={{ width: '28rem', background: '#FFFFFF', border: '1px solid var(--line)' }}
        />
        <div
          className="flex items-center gap-1 rounded-lg p-1"
          style={{ background: 'var(--card-c)', border: '1px solid var(--line)' }}
        >
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer"
              style={{
                color: filter === f.value ? 'var(--accent-c)' : 'var(--text-2)',
                background: filter === f.value ? 'var(--accent-dim)' : 'transparent',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-center" style={{ color: 'var(--text-3)' }}>
          No hay usuarios que coincidan.
        </p>
      ) : (
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: '1px solid var(--line)', background: 'var(--card-c)' }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)' }}>
                {['Usuario', 'Rol', 'Departamento', 'Estado', 'Última actividad', ''].map(
                  (h) => (
                    <th
                      key={h}
                      className="text-left font-medium px-4 py-3"
                      style={{ color: 'var(--text-2)' }}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const isSelf = u.id === currentUserId;
                return (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                          style={{ background: 'var(--accent-dim)', color: 'var(--accent-c)' }}
                        >
                          {initials(u.full_name) || '?'}
                        </span>
                        <div className="min-w-0">
                          <p
                            className="font-medium truncate"
                            style={{ color: 'var(--light)' }}
                          >
                            {u.full_name} {isSelf && '(tú)'}
                          </p>
                          <p className="text-xs truncate" style={{ color: 'var(--text-3)' }}>
                            {u.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <RoleBadge role={u.role} />
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-2)' }}>
                      {u.department || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusSelect user={u} disabled={isSelf} />
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-3)' }}>
                      {relativeTime(u.last_active)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setEditingUser(u)}>
                          Editar
                        </Button>
                        {!isSelf && <DeleteUserButton userId={u.id} name={u.full_name} />}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editingUser && (
        <EditUserDialog
          user={editingUser}
          open={!!editingUser}
          onOpenChange={(open) => !open && setEditingUser(null)}
        />
      )}
    </div>
  );
}
