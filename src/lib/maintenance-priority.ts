import type { MaintenancePriority } from '@/lib/types';
import type { SelectOption } from '@/components/custom-select';

export const PRIORITY_META: Record<MaintenancePriority, { bg: string; fg: string; label: string }> = {
  BAJA: { bg: 'rgba(34,197,94,0.12)', fg: '#16a34a', label: 'Baja' },
  MEDIA: { bg: 'rgb(255 159 10 / 16%)', fg: '#d97706', label: 'Media' },
  ALTA: { bg: 'rgba(234,88,12,0.22)', fg: '#c2410c', label: 'Alta' },
  URGENTE: { bg: 'rgba(225,29,72,0.22)', fg: '#be123c', label: 'Urgente' },
};

export const PRIORITY_OPTIONS: SelectOption[] = (
  ['BAJA', 'MEDIA', 'ALTA', 'URGENTE'] as MaintenancePriority[]
).map((p) => ({ value: p, label: PRIORITY_META[p].label }));
