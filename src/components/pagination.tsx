'use client';

import { CustomSelect } from '@/components/custom-select';
import { Icon } from '@/components/icon';

const PAGE_SIZE_OPTIONS = [
  { value: '20', label: '20 por página' },
  { value: '50', label: '50 por página' },
  { value: '100', label: '100 por página' },
];

function getPageWindow(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages = new Set<number>([1, total, current - 1, current, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);

  const result: (number | '…')[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) result.push('…');
    result.push(p);
    prev = p;
  }
  return result;
}

export function Pagination({
  page,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  if (totalItems === 0) return null;

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize + 1;
  const pageEnd = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm" style={{ color: 'var(--text-3)' }}>
        {pageStart}–{pageEnd} de {totalItems}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <div className="w-40">
          <CustomSelect
            value={String(pageSize)}
            onChange={(v) => onPageSizeChange(Number(v))}
            size="sm"
            placement="top"
            triggerBackground="#FFFFFF"
            triggerBorderColor="var(--line)"
            options={PAGE_SIZE_OPTIONS}
          />
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer transition-colors disabled:cursor-not-allowed disabled:opacity-40"
            style={{ color: 'var(--text-2)' }}
          >
            <Icon name="arrow-left" style="solid" size={11} color="var(--text-3)" />
            Prev
          </button>

          {getPageWindow(currentPage, totalPages).map((p, i) =>
            p === '…' ? (
              <span key={`ellipsis-${i}`} className="px-2 text-sm" style={{ color: 'var(--text-3)' }}>
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                className="min-w-8 h-8 px-2 rounded-lg text-sm font-medium cursor-pointer transition-colors"
                style={{
                  background: p === currentPage ? 'var(--accent-c)' : 'var(--raised)',
                  color: p === currentPage ? 'var(--accent-ink)' : 'var(--text-2)',
                }}
              >
                {p}
              </button>
            )
          )}

          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer transition-colors disabled:cursor-not-allowed disabled:opacity-40"
            style={{ color: 'var(--text-2)' }}
          >
            Next
            <Icon name="arrow-right" style="solid" size={11} color="var(--text-3)" />
          </button>
        </div>
      </div>
    </div>
  );
}
