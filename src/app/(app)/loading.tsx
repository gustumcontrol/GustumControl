import { Icon } from '@/components/icon';

export default function Loading() {
  return (
    <div className="flex items-center justify-center py-24">
      <Icon name="spinner" style="solid" size={22} color="var(--accent-c)" spin />
    </div>
  );
}
