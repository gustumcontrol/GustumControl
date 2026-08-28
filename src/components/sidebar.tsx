'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { NavLinks } from '@/components/nav-links';
import { Icon } from '@/components/icon';
import { HotelSwitcher } from '@/components/hotel-switcher';
import { useMobileSidebar } from '@/components/mobile-sidebar-context';
import type { NavCategory } from '@/lib/types';

const STORAGE_KEY = 'sidebar-collapsed';

function SidebarNav({ categories, collapsed }: { categories: NavCategory[]; collapsed?: boolean }) {
  return (
    <nav className="flex-1 px-3 pb-3 flex flex-col gap-4 overflow-y-auto overflow-x-hidden">
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
  );
}

export function Sidebar({
  categories,
  hotelId,
  hotelName,
  hotels,
  isAdmin,
}: {
  categories: NavCategory[];
  hotelId?: string;
  hotelName?: string;
  hotels?: { id: string; name: string }[];
  isAdmin?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const { open: mobileOpen, setOpen: setMobileOpen } = useMobileSidebar();
  const pathname = usePathname();

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored === '1') setCollapsed(true);
  }, []);

  // Cierra el drawer móvil cada vez que cambia de página.
  useEffect(() => {
    setMobileOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const toggle = () => {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      return next;
    });
  };

  return (
    <>
      {/* Drawer móvil: se despliega de izquierda a derecha con fondo opacado,
          reusando el mismo diseño/navegación del sidebar de escritorio. */}
      <div
        className={`sm:hidden fixed inset-0 z-40 transition-opacity duration-300 ease-in-out ${
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        style={{ background: 'rgba(0,0,0,0.5)' }}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />
      <aside
        className={`sm:hidden fixed inset-y-0 left-0 z-50 w-64 flex flex-col transition-transform duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ background: 'var(--card-c)', borderRight: '1px solid var(--line)' }}
      >
        <div className="px-5 h-20 flex items-center justify-between gap-2 shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Gustum Control" className="h-8 w-auto" />
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            title="Cerrar menú"
            className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer shrink-0"
            style={{ background: 'var(--raised)' }}
          >
            <Icon name="xmark" style="duotone" size={13} color="var(--text-3)" />
          </button>
        </div>

        {isAdmin && hotelName && (
          <div className="px-3 pb-3 shrink-0">
            <HotelSwitcher
              hotelId={hotelId ?? ''}
              hotelName={hotelName}
              hotels={hotels ?? []}
              variant="sidebar"
            />
          </div>
        )}

        <SidebarNav categories={categories} />
      </aside>

      <aside
        className={`hidden sm:flex sm:flex-col shrink-0 sticky top-0 z-30 h-screen transition-[width] duration-300 ease-in-out ${collapsed ? 'w-[76px]' : 'w-60'}`}
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
            className="absolute -right-3 top-1/2 -translate-y-1/2 z-30 w-6 h-6 rounded-full flex items-center justify-center cursor-pointer transition-transform duration-300 ease-in-out hover:scale-110"
            style={{ background: 'var(--card-c)', border: '1px solid var(--line)' }}
          >
            <span
              className="flex items-center justify-center transition-transform duration-300 ease-in-out"
              style={{ transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)' }}
            >
              <Icon name="chevron-left" style="duotone" size={9} color="var(--text-3)" />
            </span>
          </button>
        </div>

        <SidebarNav categories={categories} collapsed={collapsed} />
      </aside>
    </>
  );
}
