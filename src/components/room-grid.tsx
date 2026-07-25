'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { RoomCard } from '@/components/room-card';
import { RoomDetailDialog } from '@/components/room-detail-dialog';
import type { RoomStatus } from '@/lib/types';

export function RoomGrid({ initialRooms }: { initialRooms: RoomStatus[] }) {
  const [rooms, setRooms] = useState<RoomStatus[]>(initialRooms);

  useEffect(() => {
    const refresh = async () => {
      const { data } = await supabase.from('room_status').select('*').order('number');
      if (data) setRooms(data);
    };

    const channel = supabase
      .channel('reservations-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservations' },
        refresh
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const byFloor = rooms.reduce<Record<string, RoomStatus[]>>((acc, room) => {
    const floor = room.floor ?? 'Sin piso';
    (acc[floor] ??= []).push(room);
    return acc;
  }, {});

  if (rooms.length === 0) {
    return (
      <p className="text-sm text-center" style={{ color: 'var(--text-3)' }}>
        No hay habitaciones registradas todavía.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {Object.entries(byFloor).map(([floor, floorRooms]) => (
        <div key={floor}>
          <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-2)' }}>
            Piso {floor}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {floorRooms.map((room) => (
              <RoomDetailDialog key={room.room_id} room={room}>
                <RoomCard room={room} />
              </RoomDetailDialog>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
