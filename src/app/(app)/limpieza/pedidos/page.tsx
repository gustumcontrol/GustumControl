import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { SupplyRequestList, type SupplyRequestRow } from '@/components/supply-request-list';
import { BackButton } from '@/components/back-button';
import { getHotelContext } from '@/lib/hotel-context';
import { sortByRoomNumber } from '@/lib/sort-rooms';

export default async function LimpiezaPedidosPage() {
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
      .eq('category', 'LIMPIEZA')
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
      <BackButton href="/limpieza" className="mb-3 sm:mb-0 sm:absolute sm:left-0 sm:top-0" />
      <div className="lg:max-w-4xl lg:mx-auto">
        <SupplyRequestList
          category="LIMPIEZA"
          requests={supplyRequests}
          rooms={sortByRoomNumber(rooms ?? [])}
          hotelSlug={hotel?.slug}
        />
      </div>
    </div>
  );
}
