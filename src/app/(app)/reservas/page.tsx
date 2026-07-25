import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ReservationList, type ReservationRow } from '@/components/reservation-list';
import { Button } from '@/components/ui/button';

export default async function ReservasPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('reservations')
    .select(
      'id, guest_name, guests_count, check_in, check_out, total, cleaning_status, maintenance_status, rooms(number, floor)'
    )
    .eq('status', 'ACTIVA')
    .order('created_at', { ascending: false });

  const reservations: ReservationRow[] = (data ?? []).map((r) => ({
    ...r,
    room: Array.isArray(r.rooms) ? r.rooms[0] ?? null : r.rooms,
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--light)' }}>
          Reservas activas
        </h1>
        <Link href="/reservas/nueva">
          <Button>Nueva reserva</Button>
        </Link>
      </div>
      <ReservationList reservations={reservations} />
    </div>
  );
}
