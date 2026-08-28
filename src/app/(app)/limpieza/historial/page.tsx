import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { CleaningLogList, type CleaningLogRow } from '@/components/cleaning-log-list';
import { getHotelContext } from '@/lib/hotel-context';

export default async function LimpiezaHistorialPage() {
  const { hotelId, isAdmin } = await getHotelContext();

  if (isAdmin && !hotelId) {
    redirect('/hoteles');
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('cleaning_log')
    .select('id, reservation_id, room_number, status, changed_at, profiles(full_name)')
    .eq('hotel_id', hotelId!)
    .order('changed_at', { ascending: false })
    .limit(500);

  const entries: CleaningLogRow[] = (data ?? []).map((e) => ({
    ...e,
    changed_by_name: Array.isArray(e.profiles)
      ? (e.profiles[0]?.full_name ?? null)
      : (e.profiles?.full_name ?? null),
  }));

  return (
    <div>
      <CleaningLogList entries={entries} />
    </div>
  );
}
