import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  SupplyRequestHistoryList,
  type SupplyRequestHistoryRow,
} from '@/components/supply-request-history-list';
import { BackButton } from '@/components/back-button';
import { getHotelContext } from '@/lib/hotel-context';

export default async function LimpiezaPedidosHistorialPage() {
  const { hotelId, isAdmin } = await getHotelContext();

  if (isAdmin && !hotelId) {
    redirect('/hoteles');
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('supply_requests')
    .select(
      'id, item, quantity, notes, requested_at, purchased_at, rooms(number), requested_by_profile:profiles!supply_requests_requested_by_fkey(full_name), purchased_by_profile:profiles!supply_requests_purchased_by_fkey(full_name)'
    )
    .eq('hotel_id', hotelId!)
    .eq('category', 'LIMPIEZA')
    .eq('status', 'COMPRADO')
    .order('purchased_at', { ascending: false })
    .limit(500);

  const entries: SupplyRequestHistoryRow[] = (data ?? []).map((e) => ({
    ...e,
    room: Array.isArray(e.rooms) ? (e.rooms[0] ?? null) : e.rooms,
    requested_by_name: Array.isArray(e.requested_by_profile)
      ? (e.requested_by_profile[0]?.full_name ?? null)
      : (e.requested_by_profile?.full_name ?? null),
    purchased_by_name: Array.isArray(e.purchased_by_profile)
      ? (e.purchased_by_profile[0]?.full_name ?? null)
      : (e.purchased_by_profile?.full_name ?? null),
  }));

  return (
    <div className="relative">
      <BackButton href="/limpieza/pedidos" className="mb-3 sm:mb-0 sm:absolute sm:left-0 sm:top-0" />
      <div className="lg:max-w-5xl lg:mx-auto">
        <SupplyRequestHistoryList category="LIMPIEZA" entries={entries} />
      </div>
    </div>
  );
}
