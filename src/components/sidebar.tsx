'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { NavLinks } from '@/components/nav-links';
import { NotificationsBell } from '@/components/notifications-bell';
import { Icon } from '@/components/icon';
import type { NavCategory } from '@/lib/types';

const STORAGE_KEY = 'sidebar-collapsed';
// Debe coincidir con ACTIVE_HOTEL_COOKIE en src/lib/hotel-context.ts — no se
// puede importar esa constante acá porque ese módulo usa next/headers
// (server-only) y esto es un client component.
const ACTIVE_HOTEL_COOKIE = 'active_hotel_id';

function setActiveHotelCookie(id: string) {
  document.cookie = `${ACTIVE_HOTEL_COOKIE}=${id}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
}

export function Sidebar({
  categories,
  userId,
  hotelId,
  hotelName,
  hotels,
  displayName,
  roleLabel,
  initial,
  isAdmin,
}: {
  categories: NavCategory[];
  userId: string;
  hotelId: string;
  hotelName?: string;
  hotels?: { id: string; name: string }[];
  displayName: string;
  roleLabel: string;
  initial: string;
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [hotelMenuOpen, setHotelMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const hotelMenuRef = useRef<HTMLDivElement>(null);

  // Cookie de solo preferencia de UI (no un límite de seguridad: un admin ya
  // puede ver/operar cualquier hotel vía RLS), así que se setea directo acá
  // y se navega con el router — sin pasar por un server action, igual de
  // rápido que un <Link> normal del sidebar. push() a la misma ruta en la
  // que ya estás dispara una request extra en Next (verificado en vivo);
  // si ya estás en /dashboard alcanza con refresh().
  const handleSelectHotel = (id: string) => {
    setActiveHotelCookie(id);
    setHotelMenuOpen(false);
    if (pathname === '/dashboard') {
      router.refresh();
    } else {
      router.push('/dashboard');
    }
  };

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored === '1') setCollapsed(true);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  useEffect(() => {
    if (!hotelMenuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (hotelMenuRef.current && !hotelMenuRef.current.contains(e.target as Node)) {
        setHotelMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [hotelMenuOpen]);

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
            <Icon name="chevron-left" style="duotone" size={9} color="var(--text-3)" />
          </span>
        </button>
      </div>

      {isAdmin && hotelName && (
        <div className="px-3 pb-4">
          <div ref={hotelMenuRef} className="relative">
            {hotelMenuOpen && (
              <div
                className="absolute top-full left-0 right-0 mt-2 rounded-lg shadow-2xl z-20 p-1.5 animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-150"
                style={{ background: 'var(--card-c)', border: '1px solid var(--line)' }}
              >
                {(hotels ?? []).map((h) => {
                  const active = h.id === hotelId;
                  return (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => handleSelectHotel(h.id)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ease-in-out cursor-pointer hover:bg-[var(--raised)]"
                      style={{
                        color: active ? 'var(--accent-c)' : 'var(--light)',
                        background: active ? 'var(--accent-dim)' : 'transparent',
                      }}
                    >
                      <Icon
                        name="hotel"
                        style="duotone"
                        size={16}
                        color={active ? 'var(--accent-c)' : 'var(--text-3)'}
                        secondaryOpacity={0.55}
                        className="shrink-0"
                      />
                      <span className="truncate">{h.name}</span>
                      {active && (
                        <Icon
                          name="check"
                          style="duotone"
                          size={12}
                          color="var(--accent-c)"
                          className="ml-auto shrink-0"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            <button
              type="button"
              onClick={() => setHotelMenuOpen((v) => !v)}
              title={collapsed ? hotelName : undefined}
              className={`w-full flex items-center py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ease-in-out cursor-pointer ${collapsed ? 'gap-0 px-[13px]' : 'gap-3 px-3'}`}
              style={{ background: 'var(--accent-dim)' }}
            >
              <Icon
                name="hotel"
                style="duotone"
                size={18}
                color="var(--accent-c)"
                secondaryOpacity={0.55}
                className="shrink-0"
              />
              {!collapsed && (
                <>
                  <span className="truncate" style={{ color: 'var(--accent-c)' }}>
                    {hotelName}
                  </span>
                  <Icon
                    name="chevron-down"
                    style="duotone"
                    size={11}
                    color="var(--accent-c)"
                    className={`ml-auto shrink-0 transition-transform duration-150 ${hotelMenuOpen ? 'rotate-180' : ''}`}
                  />
                </>
              )}
            </button>
          </div>
        </div>
      )}

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

      <NotificationsBell userId={userId} hotelId={hotelId} collapsed={collapsed} />

      <div className="p-3 shrink-0">
        <div ref={menuRef} className="relative">
          {menuOpen && (
            <div
              className="absolute bottom-full left-0 right-0 mb-2 rounded-lg shadow-2xl z-20 p-1.5 animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-150"
              style={{ background: 'var(--card-c)', border: '1px solid var(--line)' }}
            >
              {isAdmin && (
                <>
                  <Link
                    href="/hoteles"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ease-in-out hover:bg-[var(--raised)]"
                    style={{ color: 'var(--light)' }}
                  >
                    <Icon
                      name="arrow-right-arrow-left"
                      style="duotone"
                      size={18}
                      color="var(--text-3)"
                      secondaryOpacity={0.55}
                      className="shrink-0"
                    />
                    Cambiar de hotel
                  </Link>
                  <div className="h-px my-1" style={{ background: 'var(--line)' }} />
                </>
              )}

              <form action="/api/auth/signout" method="POST">
                <button
                  type="submit"
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ease-in-out cursor-pointer hover:bg-[var(--raised)]"
                  style={{ color: '#dc2626' }}
                >
                  <Icon
                    name="right-from-bracket"
                    style="duotone"
                    size={18}
                    color="#dc2626"
                    secondaryOpacity={0.55}
                    className="shrink-0"
                  />
                  Salir
                </button>
              </form>
            </div>
          )}

          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className={`w-full flex items-center py-2 rounded-lg transition-all duration-300 ease-in-out cursor-pointer ${collapsed ? 'gap-0 px-[8px] justify-center' : 'gap-2.5 px-3'}`}
            style={{ background: 'var(--raised)' }}
          >
            <span
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
              style={{ background: '#FFEDE6', color: 'var(--accent-c)' }}
            >
              {initial || '?'}
            </span>
            <div
              className="leading-tight min-w-0 overflow-hidden whitespace-nowrap text-left transition-all duration-300 ease-in-out"
              style={{ maxWidth: collapsed ? 0 : 160, opacity: collapsed ? 0 : 1 }}
            >
              <p className="text-sm font-medium truncate" style={{ color: 'var(--light)' }}>
                {displayName}
              </p>
              <p className="text-xs" style={{ color: '#818DA0' }}>
                {roleLabel}
              </p>
            </div>
            {!collapsed && (
              <Icon
                name="chevron-up"
                style="duotone"
                size={11}
                color="#818DA0"
                className={`ml-auto shrink-0 transition-transform duration-150 ${menuOpen ? 'rotate-180' : ''}`}
              />
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}
