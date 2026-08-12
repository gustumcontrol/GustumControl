import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { SupplyRequestList, type SupplyRequestRow } from '@/components/supply-request-list';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icon';
import { getHotelContext } from '@/lib/hotel-context';
import { sortByRoomNumber } from '@/lib/sort-rooms';

export default async function MantenimientoPedidosPage() {
  const { hotelId, isAdmin } = await getHotelContext();

  if (isAdmin && !hotelId) {
    redirect('/hoteles');
  }

  const supabase = await createSupabaseServerClient();
  const [{ data: rooms }, { data: hotel }, { data: supplies }] = await Promise.all([
    supabase
      .from('rooms')
      .select('id, number, floor, type')
      .eq('hotel_id', hotelId!)
      .eq('active', true),
    supabase.from('hotels').select('slug').eq('id', hotelId!).single(),
    supabase
      .from('supply_requests')
      .select(
        'id, item, quantity, notes, requested_at, rooms(number, floor), profiles!supply_requests_requested_by_fkey(full_name)'
      )
      .eq('hotel_id', hotelId!)
      .eq('category', 'MANTENIMIENTO')
      .eq('status', 'PENDIENTE')
      .order('requested_at', { ascending: false }),
  ]);

  const supplyRequests: SupplyRequestRow[] = (supplies ?? []).map((s) => {
    const profile = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
    return {
      ...s,
      room: Array.isArray(s.rooms) ? (s.rooms[0] ?? null) : s.rooms,
      requested_by_name: profile?.full_name ?? null,
    };
  });

  return (
    <div className="relative">
      <Button
        variant="outline"
        render={<Link href="/mantenimiento" />}
        nativeButton={false}
        className="absolute top-0 left-0 z-10 w-fit"
        style={{ color: '#323E51', background: '#E2E5EC', border: 'none' }}
      >
        <Icon name="arrow-left" style="duotone" size={12} color="#323E51" />
        Volver
      </Button>

      <div className="lg:max-w-4xl lg:mx-auto">
        <SupplyRequestList
          category="MANTENIMIENTO"
          requests={supplyRequests}
          rooms={sortByRoomNumber(rooms ?? [])}
          hotelSlug={hotel?.slug}
        />
      </div>
    </div>
  );
}
