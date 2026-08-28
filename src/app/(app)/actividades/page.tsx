import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getAllActivity } from '@/lib/actions/activity';
import { ActivityLogList } from '@/components/activity-log-list';
import { getHotelContext } from '@/lib/hotel-context';

export default async function ActividadesPage() {
  const { role, hotelId } = await getHotelContext();

  if (!role) {
    redirect('/login');
  }
  if (role !== 'admin') {
    redirect('/dashboard');
  }
  if (!hotelId) {
    redirect('/hoteles');
  }

  const supabase = await createSupabaseServerClient();
  const [entries, { data: profiles }] = await Promise.all([
    getAllActivity(hotelId),
    supabase.from('profiles').select('id, full_name').eq('hotel_id', hotelId).order('full_name'),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-semibold mb-0.5" style={{ color: 'var(--light)' }}>
          Actividades
        </h1>
        <p className="text-xs sm:text-sm" style={{ color: 'var(--text-3)' }}>
          Todo lo que hizo el equipo, día por día.
        </p>
      </div>
      <ActivityLogList entries={entries} users={profiles ?? []} />
    </div>
  );
}
