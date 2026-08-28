import Link from 'next/link';
import { Icon } from '@/components/icon';

export function BackButton({ href, className = '' }: { href: string; className?: string }) {
  return (
    <Link href={href} className={className}>
      <span
        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium cursor-pointer shrink-0"
        style={{ color: '#323E51', background: '#E2E5EC' }}
      >
        <Icon name="arrow-left" style="duotone" size={12} color="#323E51" />
        Volver
      </span>
    </Link>
  );
}
