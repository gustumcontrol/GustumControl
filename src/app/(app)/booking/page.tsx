import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ReservationList, type ReservationRow } from '@/components/reservation-list';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icon';
import { getHotelContext } from '@/lib/hotel-context';
import { sortByRoomNumber } from '@/lib/sort-rooms';

export default async function BookingPage() {
  const { hotelId, isAdmin } = await getHotelContext();

  if (isAdmin && !hotelId) {
    redirect('/hoteles');
  }

  const supabase = await createSupabaseServerClient();
  const [{ data }, { data: roomTypes }, { data: boardPlans }, { data: freeRooms }] =
    await Promise.all([
      supabase
        .from('reservations')
        .select(
          'id, room_id, guest_name, guests_count, check_in, check_out, nights, total, price_per_night, phone, country, municipio, provincia, board_plan, payment_method, notes, source, cleaning_status, maintenance_status, rooms(number, floor, type)'
        )
        .eq('hotel_id', hotelId!)
        .eq('status', 'ACTIVA')
        .eq('source', 'BOOKING')
        .order('created_at', { ascending: false }),
      supabase.from('room_types').select('*'),
      supabase.from('board_plans').select('*').order('price_per_person'),
      supabase
        .from('room_status')
        .select('*')
        .eq('hotel_id', hotelId!)
        .in('computed_status', ['LIBRE', 'RESERVADA']),
    ]);

  const reservations: ReservationRow[] = (data ?? []).map((r) => ({
    ...r,
    room: (Array.isArray(r.rooms) ? r.rooms[0] : r.rooms) ?? null,
  }));

  return (
    <div>
      <div className="flex items-stretch sm:items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold mb-0.5" style={{ color: 'var(--light)' }}>
            Reservas de Booking
          </h1>
          <p className="text-xs sm:text-sm" style={{ color: 'var(--text-3)' }}>
            Huéspedes que vinieron por Booking.com.
          </p>
        </div>
        <Link href="/booking/nueva" className="flex">
          <Button aria-label="Nueva reserva">
            <Icon name="plus" style="solid" size={12} color="#FFFFFF" />
            <span className="hidden sm:inline">Nueva reserva</span>
          </Button>
        </Link>
      </div>
      <ReservationList
        reservations={reservations}
        roomTypes={roomTypes ?? []}
        boardPlans={boardPlans ?? []}
        rooms={sortByRoomNumber(freeRooms ?? [])}
      />
    </div>
  );
}
