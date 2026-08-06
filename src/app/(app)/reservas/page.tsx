import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ReservationList, type ReservationRow } from '@/components/reservation-list';
import { Button } from '@/components/ui/button';
import { getHotelContext } from '@/lib/hotel-context';

export default async function ReservasPage() {
  const { hotelId, isAdmin } = await getHotelContext();

  if (isAdmin && !hotelId) {
    redirect('/hoteles');
  }

  const supabase = await createSupabaseServerClient();
  const [{ data }, { data: roomTypes }, { data: boardPlans }] = await Promise.all([
    supabase
      .from('reservations')
      .select(
        'id, guest_name, guests_count, check_in, check_out, nights, total, price_per_night, phone, country, municipio, provincia, board_plan, payment_method, notes, cleaning_status, maintenance_status, rooms(number, floor, type)'
      )
      .eq('hotel_id', hotelId!)
      .eq('status', 'ACTIVA')
      .order('created_at', { ascending: false }),
    supabase.from('room_types').select('*'),
    supabase.from('board_plans').select('*').order('price_per_person'),
  ]);

  const reservations: ReservationRow[] = (data ?? []).map((r) => ({
    ...r,
    room: (Array.isArray(r.rooms) ? r.rooms[0] : r.rooms) ?? null,
  }));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--light)' }}>
          Reservas activas
        </h1>
        <Link href="/reservas/nueva">
          <Button>Nueva reserva</Button>
        </Link>
      </div>
      <ReservationList
        reservations={reservations}
        roomTypes={roomTypes ?? []}
        boardPlans={boardPlans ?? []}
      />
    </div>
  );
}
