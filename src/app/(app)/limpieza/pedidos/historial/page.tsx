import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  SupplyRequestHistoryList,
  type SupplyRequestHistoryRow,
} from '@/components/supply-request-history-list';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icon';
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
      <Button
        variant="outline"
        render={<Link href="/limpieza/pedidos" />}
        nativeButton={false}
        className="absolute top-0 left-0 z-10 w-fit"
        style={{ color: '#323E51', background: '#E2E5EC', border: 'none' }}
      >
        <Icon name="arrow-left" style="duotone" size={12} color="#323E51" />
        Volver
      </Button>

      <div className="pt-16">
        <h1 className="text-2xl font-semibold mb-1" style={{ color: 'var(--light)' }}>
          Historial de pedidos de limpieza
        </h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text-3)' }}>
          Pedidos ya comprados: quién los pidió, quién los compró, y cuándo.
        </p>
        <SupplyRequestHistoryList category="LIMPIEZA" entries={entries} />
      </div>
    </div>
  );
}
