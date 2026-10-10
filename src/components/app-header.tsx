'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/icon';
import { NotificationsBell } from '@/components/notifications-bell';
import { HotelSwitcher } from '@/components/hotel-switcher';
import { AvailableRoomsCount } from '@/components/available-rooms-count';
import { useMobileSidebar } from '@/components/mobile-sidebar-context';

export function AppHeader({
  userId,
  hotelId,
  hotelName,
  hotels,
  availableRooms,
  displayName,
  roleLabel,
  initial,
  isAdmin,
}: {
  userId: string;
  hotelId: string;
  hotelName?: string;
  hotels?: { id: string; name: string }[];
  availableRooms?: number;
  displayName: string;
  roleLabel: string;
  initial: string;
  isAdmin?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { setOpen: setMobileSidebarOpen } = useMobileSidebar();

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

  return (
    <header
      className="sticky top-0 z-20 flex items-center px-4 sm:px-6 h-16 shrink-0"
      style={{ background: 'var(--card-c)', borderBottom: '1px solid var(--line)' }}
    >
      <div className="flex-1 flex items-stretch gap-4 min-w-0">
        <div className="flex-1 flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(true)}
            title="Abrir menú"
            className="sm:hidden w-10 h-10 -ml-1.5 rounded-lg flex items-center justify-center cursor-pointer shrink-0"
            style={{ background: 'var(--raised)' }}
          >
            <Icon name="bars" style="duotone" size={15} color="var(--text-2)" />
          </button>

          {isAdmin && hotelName && (
            <div className="hidden sm:block">
              <HotelSwitcher hotelId={hotelId} hotelName={hotelName} hotels={hotels ?? []} />
            </div>
          )}
        </div>

        {availableRooms !== undefined && (
          <AvailableRoomsCount hotelId={hotelId} initialCount={availableRooms} />
        )}

        <div className="flex-1 flex items-stretch justify-end gap-2">
          <NotificationsBell userId={userId} hotelId={hotelId} variant="header" />

          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2.5 py-1.5 pl-1.5 pr-2.5 rounded-lg cursor-pointer transition-colors bg-[var(--raised)]"
            >
              <span
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                style={{ background: '#FFEDE6', color: 'var(--accent-c)' }}
              >
                {initial || '?'}
              </span>
              <span className="leading-tight hidden sm:block text-left">
                <span className="block text-sm font-medium" style={{ color: 'var(--light)' }}>
                  {displayName}
                </span>
                <span className="block text-xs" style={{ color: '#818DA0' }}>
                  {roleLabel}
                </span>
              </span>
              <Icon
                name="chevron-down"
                style="duotone"
                size={11}
                color="#818DA0"
                className={`hidden sm:block shrink-0 transition-transform duration-150 ${menuOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {menuOpen && (
              <div
                className="absolute top-full right-0 mt-2 w-56 rounded-lg shadow-2xl z-20 p-1.5 animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-150"
                style={{ background: 'var(--card-c)', border: '1px solid var(--line)' }}
              >
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
          </div>
        </div>
      </div>
    </header>
  );
}
