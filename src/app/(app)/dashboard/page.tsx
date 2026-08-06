import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { RoomGrid } from '@/components/room-grid';
import { getHotelContext } from '@/lib/hotel-context';
import { sortByRoomNumber } from '@/lib/sort-rooms';

export default async function DashboardPage() {
  const { hotelId, isAdmin } = await getHotelContext();

  if (isAdmin && !hotelId) {
    redirect('/hoteles');
  }

  const supabase = await createSupabaseServerClient();
  const { data: rooms } = await supabase
    .from('room_status')
    .select('*')
    .eq('hotel_id', hotelId!);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6" style={{ color: 'var(--light)' }}>
        Habitaciones
      </h1>
      <RoomGrid key={hotelId} initialRooms={sortByRoomNumber(rooms ?? [])} hotelId={hotelId!} />
    </div>
  );
}
