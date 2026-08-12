import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ReservationForm } from '@/components/reservation-form';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icon';
import { getHotelContext } from '@/lib/hotel-context';
import { sortByRoomNumber } from '@/lib/sort-rooms';

export default async function NuevaReservaPage({
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
      <Button
        variant="outline"
        render={<Link href="/reservas" />}
        nativeButton={false}
        className="absolute top-0 left-0 z-10 w-fit"
        style={{ color: '#323E51', background: '#E2E5EC', border: 'none' }}
      >
        <Icon name="arrow-left" style="duotone" size={12} color="#323E51" />
        Volver
      </Button>

      <div className="max-w-lg mx-auto">
        <div
          className="rounded-lg p-8"
          style={{ background: '#FFFFFF', border: '1px solid var(--line)' }}
        >
          <h1 className="text-2xl font-semibold mb-1" style={{ color: 'var(--light)' }}>
            Nueva reserva
          </h1>
          <p className="text-sm mb-6" style={{ color: 'var(--text-3)' }}>
            Registra el check-in de un huésped nuevo.
          </p>
          <ReservationForm
            rooms={sortByRoomNumber(freeRooms ?? [])}
            roomTypes={roomTypes ?? []}
            boardPlans={boardPlans ?? []}
            defaultRoomId={room}
          />
        </div>
      </div>
    </div>
  );
}
