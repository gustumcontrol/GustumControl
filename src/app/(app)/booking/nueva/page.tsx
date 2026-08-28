import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ReservationForm } from '@/components/reservation-form';
import { BackButton } from '@/components/back-button';
import { getHotelContext } from '@/lib/hotel-context';
import { sortByRoomNumber } from '@/lib/sort-rooms';

export default async function NuevaReservaBookingPage({
  searchParams,
}: {
  searchParams: Promise<{ room?: string }>;
}) {
  const { room } = await searchParams;
  const { hotelId, isAdmin } = await getHotelContext();

  if (isAdmin && !hotelId) {
    redirect('/hoteles');
  }

  const supabase = await createSupabaseServerClient();

  const [{ data: freeRooms }, { data: roomTypes }, { data: boardPlans }] = await Promise.all([
    supabase
      .from('room_status')
      .select('*')
      .eq('hotel_id', hotelId!)
      .in('computed_status', ['LIBRE', 'RESERVADA']),
    supabase.from('room_types').select('*'),
    supabase.from('board_plans').select('*').order('price_per_person'),
  ]);

  return (
    <div className="relative">
      <BackButton href="/booking" className="mb-3 sm:mb-0 sm:absolute sm:left-0 sm:top-0" />
      <div className="max-w-lg mx-auto">
        <h1 className="text-xl sm:text-2xl font-semibold mb-0.5" style={{ color: 'var(--light)' }}>
          Nueva reserva de Booking
        </h1>
        <p className="text-xs sm:text-sm mb-6" style={{ color: 'var(--text-3)' }}>
          Check-in de un huésped de Booking.com.
        </p>
        <div
          className="rounded-lg p-8"
          style={{ background: '#FFFFFF', border: '1px solid var(--line)' }}
        >
          <ReservationForm
            rooms={sortByRoomNumber(freeRooms ?? [])}
            roomTypes={roomTypes ?? []}
            boardPlans={boardPlans ?? []}
            defaultRoomId={room}
            defaultSource="BOOKING"
            redirectTo="/booking"
          />
        </div>
      </div>
    </div>
  );
}
