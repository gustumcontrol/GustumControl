'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Icon } from '@/components/icon';
import type { Notification } from '@/lib/types';

function relativeTime(iso: string) {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'Ahora mismo';
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;
  return `Hace ${Math.floor(hours / 24)} d`;
}

const TYPE_ICON: Record<string, string> = {
  new_cleaning_task: 'broom',
  new_maintenance_task: 'screwdriver-wrench',
  cleaning_too_long: 'triangle-exclamation',
};

const TYPE_ROUTE: Record<string, string> = {
  new_cleaning_task: '/limpieza',
  new_maintenance_task: '/mantenimiento',
  cleaning_too_long: '/limpieza/historial',
};

export function NotificationsBell({
  userId,
  collapsed = false,
}: {
  userId: string;
  collapsed?: boolean;
}) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  const storageKey = `notifications-read:${userId}`;

  useEffect(() => {
    // localStorage no existe durante el render en servidor; hidratar el
    // valor real recién después de montar es el patrón seguro para esto.
    const stored = localStorage.getItem(storageKey);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReadIds(stored ? new Set(JSON.parse(stored)) : new Set());
  }, [storageKey]);

  useEffect(() => {
    // Se hace desde el cliente (no en el layout del servidor) para no
    // bloquear la navegación entre páginas con esta consulta en cada clic.
    let cancelled = false;
    supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (!cancelled && data) setNotifications(data);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev].slice(0, 50));
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'notifications' },
        (payload) => {
          const deletedId = (payload.old as { id?: string }).id;
          setNotifications((prev) => prev.filter((n) => n.id !== deletedId));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  const persistReadIds = (next: Set<string>) => {
    setReadIds(next);
    localStorage.setItem(storageKey, JSON.stringify([...next]));
  };

  const markRead = (id: string) => {
    if (readIds.has(id)) return;
    persistReadIds(new Set(readIds).add(id));
  };

  const markAllRead = () => {
    persistReadIds(new Set(notifications.map((n) => n.id)));
  };

  const handleNotificationClick = (n: Notification) => {
    markRead(n.id);
    setOpen(false);
    const route = TYPE_ROUTE[n.type];
    if (route) router.push(route);
  };

  return (
    <div className="relative pb-1 px-3" ref={containerRef}>
      <button
        type="button"
        title={collapsed ? 'Notificaciones' : undefined}
        onClick={() => setOpen((o) => !o)}
        className={`relative w-full flex items-center py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-all duration-300 ease-in-out ${collapsed ? 'gap-0 px-[13px]' : 'gap-3 px-3'}`}
        style={{ color: 'var(--text-2)', background: open ? 'var(--raised)' : 'transparent' }}
      >
        <span className="relative shrink-0">
          <Icon name="bell" style="duotone" size={16} color="var(--text-3)" />
          {collapsed && unreadCount > 0 && (
            <span
              className="absolute -top-1 -right-1 w-2 h-2 rounded-full"
              style={{ background: 'var(--accent-c)' }}
            />
          )}
        </span>
        <span
          className="overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out"
          style={{ maxWidth: collapsed ? 0 : 160, opacity: collapsed ? 0 : 1 }}
        >
          Notificaciones
        </span>
        {!collapsed && unreadCount > 0 && (
          <span
            className="ml-auto text-xs font-semibold rounded-full min-w-5 h-5 px-1 flex items-center justify-center"
            style={{ background: 'var(--accent-c)', color: 'var(--accent-ink)' }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className={`absolute bottom-full mb-2 w-80 max-h-[28rem] rounded-lg shadow-2xl z-50 flex flex-col overflow-hidden origin-bottom ${collapsed ? 'left-full ml-2' : 'left-3 right-3'}`}
          style={{ background: 'var(--card-c)', border: '1px solid var(--line)' }}
        >
          <div
            className="px-4 py-3 flex items-center justify-between shrink-0"
            style={{ background: '#FFFFFF' }}
          >
            <h3 className="text-sm font-semibold" style={{ color: 'var(--light)' }}>
              Notificaciones
            </h3>
            {unreadCount > 0 && (
              <span
                className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded"
                style={{ color: 'var(--accent-c)', background: 'var(--accent-dim)' }}
              >
                {unreadCount} nueva{unreadCount === 1 ? '' : 's'}
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-2" style={{ background: '#FFFFFF' }}>
            {notifications.length === 0 ? (
              <p className="text-sm p-4 text-center" style={{ color: 'var(--text-3)' }}>
                No hay notificaciones todavía.
              </p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {notifications.map((n) => {
                  const isUnread = !readIds.has(n.id);
                  const clickable = !!TYPE_ROUTE[n.type];
                  return (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => (clickable ? handleNotificationClick(n) : markRead(n.id))}
                      className="w-full text-left px-3 py-2.5 flex gap-3 rounded-lg cursor-pointer transition-colors"
                      style={{ background: isUnread ? 'var(--accent-dim)' : 'transparent' }}
                    >
                      <div
                        className="mt-0.5 shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ background: 'var(--raised)' }}
                      >
                        <Icon
                          name={TYPE_ICON[n.type] ?? 'bell'}
                          style="duotone"
                          size={13}
                          color={isUnread ? 'var(--accent-c)' : 'var(--text-3)'}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-[13px] leading-tight line-clamp-2"
                          style={{
                            color: isUnread ? 'var(--light)' : 'var(--text-2)',
                            fontWeight: isUnread ? 600 : 400,
                          }}
                        >
                          {n.message}
                        </p>
                        <p className="text-[11px] mt-1" style={{ color: 'var(--text-3)' }}>
                          {relativeTime(n.created_at)}
                        </p>
                      </div>
                      {isUnread && (
                        <span
                          className="w-2 h-2 rounded-full mt-2 shrink-0"
                          style={{ background: 'var(--accent-c)' }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {unreadCount > 0 && (
            <div
              className="px-4 py-2 flex justify-center shrink-0"
              style={{ background: '#FFFFFF' }}
            >
              <button
                type="button"
                onClick={markAllRead}
                className="text-[11px] font-bold uppercase tracking-widest py-1 cursor-pointer"
                style={{ color: 'var(--accent-c)' }}
              >
                Marcar todas como leídas
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
