import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ReservationHistoryList } from '@/components/reservation-history-list';
import { getHotelContext } from '@/lib/hotel-context';

export default async function HistorialPage() {
  const { hotelId, isAdmin } = await getHotelContext();

  if (isAdmin && !hotelId) {
    redirect('/hoteles');
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('reservation_history')
    .select('*')
    .eq('hotel_id', hotelId!)
    .order('archived_at', { ascending: false });

  return (
    <div>
      <ReservationHistoryList entries={data ?? []} />
    </div>
  );
}
