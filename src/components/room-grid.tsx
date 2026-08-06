'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { RoomCard } from '@/components/room-card';
import { RoomDetailDialog } from '@/components/room-detail-dialog';
import { Icon } from '@/components/icon';
import { sortByRoomNumber } from '@/lib/sort-rooms';
import type { RoomStatus } from '@/lib/types';

const FLOOR_ORDINALS = [
  'Primera',
  'Segunda',
  'Tercera',
  'Cuarta',
  'Quinta',
  'Sexta',
  'Séptima',
  'Octava',
  'Novena',
  'Décima',
];

function floorLabel(floor: string) {
  const n = Number(floor);
  if (Number.isInteger(n) && n >= 1 && n <= FLOOR_ORDINALS.length) {
    return `${FLOOR_ORDINALS[n - 1]} planta`;
  }
  return `Planta ${floor}`;
}

export function RoomGrid({
  initialRooms,
  hotelId,
}: {
  initialRooms: RoomStatus[];
  hotelId: string;
}) {
  const [rooms, setRooms] = useState<RoomStatus[]>(initialRooms);

  useEffect(() => {
    const refresh = async () => {
      const { data } = await supabase
        .from('room_status')
        .select('*')
        .eq('hotel_id', hotelId);
      if (data) setRooms(sortByRoomNumber(data));
    };

    const channel = supabase.channel('room-grid-changes');
    for (const table of ['reservations', 'maintenance_issues', 'room_staff_assignments']) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, refresh);
    }
    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [hotelId]);

  const byFloor = rooms.reduce<Record<string, RoomStatus[]>>((acc, room) => {
    const floor = room.floor ?? 'Sin piso';
    (acc[floor] ??= []).push(room);
    return acc;
  }, {});

  if (rooms.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center">
        <Icon name="bed" style="duotone" size={32} color="var(--text-3)" />
        <p className="text-sm" style={{ color: 'var(--text-3)' }}>
          No hay habitaciones registradas todavía.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {Object.entries(byFloor).map(([floor, floorRooms]) => (
        <div key={floor}>
          <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-2)' }}>
            {floorLabel(floor)}
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
