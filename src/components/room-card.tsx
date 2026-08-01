'use client';

import { useState } from 'react';
import { Icon } from '@/components/icon';
import { StatusBadge, STATUS_STYLES, CARD_BG } from '@/components/status-badge';
import type { RoomStatus, ComputedRoomStatus } from '@/lib/types';

export function RoomCard({ room }: { room: RoomStatus }) {
  const [hovered, setHovered] = useState(false);
  const status = room.computed_status as ComputedRoomStatus;
  const accent = CARD_BG[status] ?? STATUS_STYLES[status].bg;
  const cardBg = CARD_BG[status] ?? 'var(--card-c)';

  if (status === 'EMPLEADO') {
    const fg = 'var(--text-2)';
    return (
      <div
        className="rounded-lg p-4 flex flex-col gap-2 border-2"
        style={{
          background: 'var(--raised)',
          borderColor: accent,
          borderStyle: 'dashed',
        }}
      >
        <div className="flex items-start justify-between opacity-50">
          <div>
            <p className="text-lg font-semibold" style={{ color: 'var(--light)' }}>
              {room.number}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-3)' }}>
              {room.type}
            </p>
          </div>
        </div>

        <div className="mt-1 h-10 flex flex-col items-center justify-center gap-1">
          <Icon name="lock" style="duotone" size={18} color={fg} />
          {room.staff_name && (
            <p className="text-xs font-medium truncate max-w-full" style={{ color: fg }}>
              {room.staff_name}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="rounded-lg p-4 flex flex-col gap-2 border-2 transition-[border-color]"
      style={{
        background: cardBg,
        borderColor: hovered ? accent : 'transparent',
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-lg font-semibold" style={{ color: 'var(--light)' }}>
            {room.number}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-2)' }}>
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
                <p className="text-xs mt-0.5" style={{ color: 'rgba(26,26,26,0.58)' }}>
                  Llega: {room.check_in}
                </p>
              )
            ) : (
              room.check_out && (
                <p className="text-xs mt-0.5" style={{ color: 'rgba(26,26,26,0.58)' }}>
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
