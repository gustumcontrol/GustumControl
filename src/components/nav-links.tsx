'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/icon';

export function NavLinks({
  items,
  variant = 'top',
  collapsed = false,
}: {
  items: { href: string; label: string; icon?: string; count?: number }[];
  variant?: 'top' | 'mobile' | 'sidebar';
  collapsed?: boolean;
}) {
  const pathname = usePathname();

  // Si dos ítems comparten prefijo (ej. /limpieza y /limpieza/historial),
  // solo debe marcarse activo el más específico de los dos, no ambos.
  const activeHref = items.reduce<string | null>((best, item) => {
    const matches =
      pathname === item.href || (item.href !== '/' && pathname.startsWith(`${item.href}/`));
    if (!matches) return best;
    if (!best || item.href.length > best.length) return item.href;
    return best;
  }, null);

  return (
    <>
      {items.map((item) => {
        const active = item.href === activeHref;

        if (variant === 'sidebar') {
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              title={collapsed ? item.label : undefined}
              className={`flex items-center py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ease-in-out ${collapsed ? 'gap-0 px-[13px]' : 'gap-3 px-3'}`}
              style={{
                color: active ? 'var(--accent-c)' : 'var(--text-2)',
                background: active ? 'var(--accent-dim)' : 'transparent',
              }}
            >
              {item.icon && (
                <Icon
                  name={item.icon}
                  style="duotone"
                  size={18}
                  color={active ? 'var(--accent-c)' : 'var(--text-3)'}
                  secondaryOpacity={0.55}
                  className="shrink-0"
                />
              )}
              <span
                className="overflow-hidden text-ellipsis whitespace-nowrap transition-all duration-300 ease-in-out"
                style={{ maxWidth: collapsed ? 0 : 160, opacity: collapsed ? 0 : 1 }}
              >
                {item.label}
              </span>
              {item.count !== undefined && (
                <span
                  className="ml-auto shrink-0 min-w-[1.25rem] h-5 px-1.5 rounded-full text-xs font-semibold flex items-center justify-center overflow-hidden transition-all duration-300 ease-in-out"
                  style={{
                    background: active ? 'var(--accent-c)' : 'var(--raised)',
                    color: active ? 'var(--accent-ink)' : 'var(--text-2)',
                    maxWidth: collapsed ? 0 : '2rem',
                    opacity: collapsed ? 0 : 1,
                    paddingLeft: collapsed ? 0 : undefined,
                    paddingRight: collapsed ? 0 : undefined,
                  }}
                >
                  {item.count}
                </span>
              )}
            </Link>
          );
        }

        const mobile = variant === 'mobile';
        return (
          <Link
            key={item.href}
            href={item.href}
            className={
              mobile
                ? 'px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors'
                : 'px-3 py-2 rounded-lg text-sm font-medium transition-colors'
            }
            style={{
              color: active ? 'var(--accent-c)' : 'var(--text-2)',
              background: active ? 'var(--accent-dim)' : mobile ? 'var(--raised)' : 'transparent',
            }}
          >
            {item.label}
          </Link>
        );
      })}
    </>
  );
}
