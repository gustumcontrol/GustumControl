'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/icon';

export function NavLinks({
  items,
  variant = 'top',
}: {
  items: { href: string; label: string; icon?: string }[];
  variant?: 'top' | 'mobile' | 'sidebar';
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
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
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
                />
              )}
              {item.label}
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
