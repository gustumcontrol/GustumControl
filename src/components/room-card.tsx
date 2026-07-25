import { StatusBadge, STATUS_STYLES } from '@/components/status-badge';
import type { RoomStatus, ComputedRoomStatus } from '@/lib/types';

export function RoomCard({ room }: { room: RoomStatus }) {
  const status = room.computed_status as ComputedRoomStatus;
  const accent = STATUS_STYLES[status].bg;

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-2 border-2 transition-shadow hover:shadow-md"
      style={{
        background: 'var(--card-c)',
        borderColor: accent,
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-lg font-semibold" style={{ color: 'var(--light)' }}>
            {room.number}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>
            {room.type}
          </p>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="mt-1 text-sm h-10" style={{ color: 'var(--text-2)' }}>
        {room.guest_name && (
          <>
            <p className="truncate">{room.guest_name}</p>
            {status === 'RESERVADA' ? (
              room.check_in && (
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                  Llega: {room.check_in}
                </p>
              )
            ) : (
              room.check_out && (
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                  Sale: {room.check_out}
                </p>
              )
            )}
          </>
        )}
      </div>
    </div>
  );
}
