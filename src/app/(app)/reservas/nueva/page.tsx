import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ReservationForm } from '@/components/reservation-form';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icon';

export default async function NuevaReservaPage({
  searchParams,
}: {
  searchParams: Promise<{ room?: string }>;
}) {
  const { room } = await searchParams;
  const supabase = await createSupabaseServerClient();

  const [{ data: freeRooms }, { data: roomTypes }, { data: boardPlans }] = await Promise.all([
    supabase
      .from('room_status')
      .select('*')
      .in('computed_status', ['LIBRE', 'RESERVADA'])
      .order('number'),
    supabase.from('room_types').select('*'),
    supabase.from('board_plans').select('*').order('price_per_person'),
  ]);

  return (
    <div className="relative">
      <Button
        variant="outline"
        render={<Link href="/reservas" />}
        nativeButton={false}
        className="absolute left-0 top-0 w-fit"
        style={{ color: '#323E51', background: '#E2E5EC', border: 'none' }}
      >
        <Icon name="arrow-left" style="solid" size={12} color="#323E51" />
        Volver
      </Button>

      <div className="max-w-lg mx-auto">
        <div
          className="rounded-2xl p-8"
          style={{ background: '#FFFFFF', border: '1px solid var(--line)' }}
        >
          <h1 className="text-2xl font-semibold mb-6" style={{ color: 'var(--light)' }}>
            Nueva reserva
          </h1>
          <ReservationForm
            rooms={freeRooms ?? []}
            roomTypes={roomTypes ?? []}
            boardPlans={boardPlans ?? []}
            defaultRoomId={room}
          />
        </div>
      </div>
    </div>
  );
}
