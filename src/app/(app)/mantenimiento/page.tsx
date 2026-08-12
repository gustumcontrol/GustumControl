import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { MaintenanceTaskList, type MaintenanceIssueRow } from '@/components/maintenance-task-list';
import { AddMaintenanceIssueDialog } from '@/components/add-maintenance-issue-dialog';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icon';
import { getHotelContext } from '@/lib/hotel-context';
import { sortByRoomNumber } from '@/lib/sort-rooms';

export default async function MantenimientoPage() {
  const { hotelId, isAdmin } = await getHotelContext();

  if (isAdmin && !hotelId) {
    redirect('/hoteles');
  }

  const supabase = await createSupabaseServerClient();
  const [{ data: issues }, { data: rooms }, { data: hotel }] = await Promise.all([
    supabase
      .from('maintenance_issues')
      .select(
        'id, room_id, description, photo_urls, status, priority, opened_at, rooms(number, floor), opened_by_profile:profiles!maintenance_issues_opened_by_fkey(full_name)'
      )
      .eq('hotel_id', hotelId!)
      .neq('status', 'REALIZADO')
      .order('opened_at', { ascending: false }),
    supabase
      .from('rooms')
      .select('id, number, floor, type')
      .eq('hotel_id', hotelId!)
      .eq('active', true),
    supabase.from('hotels').select('slug').eq('id', hotelId!).single(),
  ]);

  const tasks: MaintenanceIssueRow[] = (issues ?? []).map((i) => ({
    ...i,
    room: Array.isArray(i.rooms) ? (i.rooms[0] ?? null) : i.rooms,
    opened_by_name: Array.isArray(i.opened_by_profile)
      ? (i.opened_by_profile[0]?.full_name ?? null)
      : (i.opened_by_profile?.full_name ?? null),
  }));

  const roomsAlreadyInMaintenance = new Set(tasks.map((t) => t.room_id));
  const availableRooms = sortByRoomNumber(
    (rooms ?? []).filter((r) => !roomsAlreadyInMaintenance.has(r.id))
  );

  return (
    <div className="lg:max-w-4xl lg:mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold mb-1" style={{ color: 'var(--light)' }}>
            Mantenimiento pendiente
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>
            Incidencias abiertas que hay que resolver.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button render={<Link href="/mantenimiento/pedidos" />} nativeButton={false}>
            <Icon name="cart-shopping" style="solid" size={12} color="#FFFFFF" />
            Pedidos
          </Button>
          <AddMaintenanceIssueDialog rooms={availableRooms} />
        </div>
      </div>
      <MaintenanceTaskList tasks={tasks} hotelSlug={hotel?.slug} />
    </div>
  );
}
