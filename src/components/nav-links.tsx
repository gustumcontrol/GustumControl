'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/icon';

export function NavLinks({
  items,
  variant = 'top',
  collapsed = false,
}: {
  items: { href: string; label: string; icon?: string }[];
  variant?: 'top' | 'mobile' | 'sidebar';
  collapsed?: boolean;
}) {
  const pathname = usePathname();

  return (
    <>
      {items.map((item) => {
        const active =
          pathname === item.href ||
          (item.href !== '/' && pathname.startsWith(`${item.href}/`));

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
                  style={active ? 'solid' : 'regular'}
                  size={18}
                  color={active ? 'var(--accent-c)' : 'var(--text-3)'}
                  className="shrink-0"
                />
              )}
              <span
                className="overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out"
                style={{ maxWidth: collapsed ? 0 : 160, opacity: collapsed ? 0 : 1 }}
              >
                {item.label}
              </span>
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
                ? 'px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors'
                : 'px-3 py-2 rounded-md text-sm font-medium transition-colors'
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
