'use client';

import { useEffect, useState } from 'react';
import { NavLinks } from '@/components/nav-links';
import { NotificationsBell } from '@/components/notifications-bell';
import { Icon } from '@/components/icon';
import type { NavCategory } from '@/lib/types';

const STORAGE_KEY = 'sidebar-collapsed';

export function Sidebar({
  categories,
  userId,
  displayName,
  roleLabel,
  initial,
}: {
  categories: NavCategory[];
  userId: string;
  displayName: string;
  roleLabel: string;
  initial: string;
}) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored === '1') setCollapsed(true);
  }, []);

  const toggle = () => {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      return next;
    });
  };

  return (
    <aside
      className={`hidden sm:flex sm:flex-col shrink-0 sticky top-0 h-screen transition-[width] duration-300 ease-in-out ${collapsed ? 'w-[76px]' : 'w-60'}`}
      style={{ background: 'var(--card-c)', borderRight: '1px solid var(--line)' }}
    >
      <div className="relative px-5 h-20 flex items-center justify-center shrink-0">
        <div className="relative h-10 w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Gustum Control"
            className="h-10 w-auto absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-opacity duration-300 ease-in-out"
            style={{ opacity: collapsed ? 0 : 1, pointerEvents: collapsed ? 'none' : 'auto' }}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/flavicon.png"
            alt="Gustum Control"
            className="h-8 w-8 object-contain absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-opacity duration-300 ease-in-out"
            style={{ opacity: collapsed ? 1 : 0, pointerEvents: collapsed ? 'auto' : 'none' }}
          />
        </div>

        <button
          type="button"
          onClick={toggle}
          title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
          className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center cursor-pointer transition-transform duration-300 ease-in-out hover:scale-110"
          style={{ background: 'var(--card-c)', border: '1px solid var(--line)' }}
        >
          <span
            className="flex items-center justify-center transition-transform duration-300 ease-in-out"
            style={{ transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)' }}
          >
            <Icon name="chevron-left" style="solid" size={9} color="var(--text-3)" />
          </span>
        </button>
      </div>

      <nav className="flex-1 px-3 flex flex-col gap-4 overflow-y-auto overflow-x-hidden">
        {categories.map((cat) => (
          <div key={cat.category} className="flex flex-col gap-1">
            {!collapsed && (
              <p
                className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-3)' }}
              >
                {cat.category}
              </p>
            )}
            <NavLinks items={cat.items} variant="sidebar" collapsed={collapsed} />
          </div>
        ))}
      </nav>

      <NotificationsBell userId={userId} collapsed={collapsed} />

      <div className="p-3 shrink-0" style={{ borderTop: '1px solid var(--line)' }}>
        <div
          className={`flex items-center py-2 transition-all duration-300 ease-in-out ${collapsed ? 'gap-0 px-[8px]' : 'gap-2.5 px-3'}`}
        >
          <span
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
            style={{ background: 'var(--accent-dim)', color: 'var(--accent-c)' }}
          >
            {initial || '?'}
          </span>
          <div
            className="leading-tight min-w-0 overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out"
            style={{ maxWidth: collapsed ? 0 : 160, opacity: collapsed ? 0 : 1 }}
          >
            <p className="text-sm font-medium truncate" style={{ color: 'var(--light)' }}>
              {displayName}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-3)' }}>
              {roleLabel}
            </p>
          </div>
        </div>
        <form action="/api/auth/signout" method="POST" className="mt-1">
          <button
            type="submit"
            title={collapsed ? 'Salir' : undefined}
            className="w-full h-9 px-3 text-sm rounded-md transition-colors cursor-pointer flex items-center justify-center"
            style={{ border: '1px solid var(--line-2)', color: 'var(--text-2)' }}
          >
            {collapsed ? (
              <Icon name="right-from-bracket" style="solid" size={14} color="var(--text-2)" />
            ) : (
              'Salir'
            )}
          </button>
        </form>
      </div>
    </aside>
  );
}
