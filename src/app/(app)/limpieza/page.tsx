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
      .from('reservations')
      .select('id, guest_name, cleaning_status, rooms(number, floor)')
      .eq('hotel_id', hotelId!)
      .in('cleaning_status', ['PENDIENTE', 'EN PROCESO'])
      .order('created_at', { ascending: false }),
    supabase.from('hotels').select('slug').eq('id', hotelId!).single(),
  ]);

  const tasks: CleaningTask[] = (data ?? []).map((r) => ({
    ...r,
    room: Array.isArray(r.rooms) ? r.rooms[0] ?? null : r.rooms,
  }));

  return (
    <div className="lg:max-w-4xl lg:mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold mb-1" style={{ color: 'var(--light)' }}>
            Limpieza pendiente
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>
            Habitaciones que hay que limpiar ahora mismo.
          </p>
        </div>
        <Button render={<Link href="/limpieza/pedidos" />} nativeButton={false}>
          <Icon name="cart-shopping" style="solid" size={12} color="#FFFFFF" />
          Pedidos
        </Button>
      </div>
      <CleaningTaskList tasks={tasks} hotelSlug={hotel?.slug} />
    </div>
  );
}
