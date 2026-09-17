import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { CleaningTaskList, type CleaningTask } from '@/components/cleaning-task-list';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icon';
import { getHotelContext } from '@/lib/hotel-context';

export default async function LimpiezaPage() {
  const { hotelId, isAdmin } = await getHotelContext();

  if (isAdmin && !hotelId) {
    redirect('/hoteles');
  }

  const supabase = await createSupabaseServerClient();
  const [{ data }, { data: hotel }] = await Promise.all([
    supabase
      .from('room_status')
      .select('room_id, reservation_id, guest_name, cleaning_status, number, floor')
      .eq('hotel_id', hotelId!)
      .eq('computed_status', 'PENDIENTE LIMPIEZA')
      .order('number'),
    supabase.from('hotels').select('slug').eq('id', hotelId!).single(),
  ]);

  const tasks: CleaningTask[] = (data ?? []).map((r) => ({
    room_id: r.room_id!,
    reservation_id: r.reservation_id,
    guest_name: r.guest_name,
    cleaning_status: r.cleaning_status!,
    room: { number: r.number!, floor: r.floor! },
  }));

  return (
    <div className="lg:max-w-4xl lg:mx-auto">
      <div className="flex items-stretch sm:items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold mb-0.5" style={{ color: 'var(--light)' }}>
            Limpieza pendiente
          </h1>
          <p className="text-xs sm:text-sm" style={{ color: 'var(--text-3)' }}>
            Habitaciones por limpiar ahora.
          </p>
        </div>
        <Button render={<Link href="/limpieza/pedidos" />} nativeButton={false} className="shrink-0">
          <Icon name="cart-shopping" style="solid" size={12} color="#FFFFFF" />
          <span className="hidden sm:inline">Pedidos</span>
        </Button>
      </div>
      <CleaningTaskList tasks={tasks} hotelSlug={hotel?.slug} />
    </div>
  );
}
