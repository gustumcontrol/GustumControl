'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Icon } from '@/components/icon';

// Debe coincidir con ACTIVE_HOTEL_COOKIE en src/lib/hotel-context.ts — no se
// puede importar esa constante acá porque ese módulo usa next/headers
// (server-only) y esto es un client component.
const ACTIVE_HOTEL_COOKIE = 'active_hotel_id';

function setActiveHotelCookie(id: string) {
  document.cookie = `${ACTIVE_HOTEL_COOKIE}=${id}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
}

export function HotelSwitcher({
  hotelId,
  hotelName,
  hotels,
  variant = 'header',
}: {
  hotelId: string;
  hotelName: string;
  hotels: { id: string; name: string }[];
  /** 'header': píldora con acento (uso original, en el header de escritorio).
   *  'sidebar': igual look que los demás botones del menú (uso en el drawer móvil). */
  variant?: 'header' | 'sidebar';
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Cookie de solo preferencia de UI (no un límite de seguridad: un admin ya
  // puede ver/operar cualquier hotel vía RLS), así que se setea directo acá
  // y se navega con el router. Si ya estás en /dashboard, push() a la misma
  // ruta no alcanza por sí solo (Next no vuelve a pedir los datos); si venís
  // de otra página, push() puede servir la versión de /dashboard que ya
  // tenía cacheada del hotel anterior. refresh() fuerza que los datos
  // salgan frescos en los dos casos.
  const handleSelect = (id: string) => {
    setActiveHotelCookie(id);
    setOpen(false);
    if (pathname !== '/dashboard') {
      router.push('/dashboard');
    }
    router.refresh();
  };

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  if (!hotelName) return null;

  return (
    <div ref={ref} className="relative">
      {variant === 'sidebar' ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center gap-3 py-2.5 px-3 rounded-lg text-sm font-medium cursor-pointer transition-all duration-300 ease-in-out"
          style={{ color: 'var(--accent-c)', background: 'var(--accent-dim)' }}
        >
          <Icon name="hotel" style="duotone" size={18} color="var(--accent-c)" secondaryOpacity={0.55} className="shrink-0" />
          <span className="truncate flex-1 text-left">{hotelName}</span>
          <Icon
            name="chevron-down"
            style="duotone"
            size={10}
            color="var(--accent-c)"
            className={`shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center h-11 gap-2 px-3 rounded-lg text-sm font-medium cursor-pointer"
          style={{ background: 'var(--accent-dim)', color: 'var(--accent-c)' }}
        >
          <Icon name="hotel" style="duotone" size={14} color="var(--accent-c)" secondaryOpacity={0.55} />
          <span className="truncate max-w-[10rem] hidden sm:inline">{hotelName}</span>
          <Icon
            name="chevron-down"
            style="duotone"
            size={10}
            color="var(--accent-c)"
            className={`shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          />
        </button>
      )}

      {open && (
        <div
          className="absolute top-full left-0 mt-2 w-56 rounded-lg shadow-2xl z-20 p-1.5 animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-150"
          style={{ background: 'var(--card-c)', border: '1px solid var(--line)' }}
        >
          {hotels.map((h) => {
            const active = h.id === hotelId;
            return (
              <button
                key={h.id}
                type="button"
                onClick={() => handleSelect(h.id)}
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
    </div>
  );
}
