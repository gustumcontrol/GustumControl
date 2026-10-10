'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/icon';
import { STATUS_STYLES } from '@/components/status-badge';
import { supabase } from '@/lib/supabase/client';
import { AVAILABLE_ROOM_STATUSES, ROOM_STATUS_SOURCE_TABLES } from '@/lib/room-status';

export function AvailableRoomsCount({
  hotelId,
  initialCount,
}: {
  hotelId: string;
  initialCount: number;
}) {
  const [count, setCount] = useState(initialCount);
  const [prevInitialCount, setPrevInitialCount] = useState(initialCount);
  if (initialCount !== prevInitialCount) {
    setPrevInitialCount(initialCount);
    setCount(initialCount);
  }

  useEffect(() => {
    const refresh = async () => {
      const { count: next } = await supabase
        .from('room_status')
        .select('room_id', { count: 'exact', head: true })
        .eq('hotel_id', hotelId)
        .in('computed_status', AVAILABLE_ROOM_STATUSES);
      if (next != null) setCount(next);
    };

    const channel = supabase.channel(`available-rooms-${hotelId}`);
    for (const table of ROOM_STATUS_SOURCE_TABLES) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, refresh);
    }
    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [hotelId]);

  const style = STATUS_STYLES.LIBRE;

  return (
    <div
      title="Habitaciones disponibles"
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg shrink-0"
      style={{ background: style.bg, color: style.fg }}
    >
      <Icon name="bed" style="duotone" size={14} color={style.fg} />
      <span className="text-sm font-semibold tabular-nums">{count}</span>
      <span className="hidden sm:inline text-sm font-medium">
        {count === 1 ? 'disponible' : 'disponibles'}
      </span>
    </div>
  );
}
