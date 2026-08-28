import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AnalyticsDashboard } from '@/components/analytics-dashboard';
import { buildAnalytics } from '@/lib/analytics';
import { getHotelContext } from '@/lib/hotel-context';

export default async function AnaliticasPage() {
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

  const [
    { data: history },
    { data: activeReservations },
    { data: roomStatuses },
    { data: maintenanceIssues },
    { data: staffAssignments },
    { data: profiles },
    { data: cleaningLog },
  ] = await Promise.all([
    supabase
      .from('reservation_history')
      .select('*')
      .eq('hotel_id', hotelId)
      .order('check_in', { ascending: false }),
    supabase
      .from('reservations')
      .select(
        'id, check_in, nights, total, price_per_night, payment_method, country, created_by, rooms(number, floor, type)'
      )
      .eq('hotel_id', hotelId),
    supabase.from('room_status').select('room_id, computed_status').eq('hotel_id', hotelId),
    supabase
      .from('maintenance_issues')
      .select('id, status, opened_at, opened_by, closed_at, closed_by')
      .eq('hotel_id', hotelId),
    supabase
      .from('room_staff_assignments')
      .select('id, released_at')
      .eq('hotel_id', hotelId)
      .is('released_at', null),
    supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('hotel_id', hotelId)
      .eq('status', 'active'),
    supabase.from('cleaning_log').select('status, changed_by').eq('hotel_id', hotelId),
  ]);

  const totalRooms = roomStatuses?.length ?? 0;
  const occupiedRooms = roomStatuses?.filter((r) => r.computed_status === 'OCUPADA').length ?? 0;

  const summary = buildAnalytics({
    history: history ?? [],
    activeReservations: activeReservations ?? [],
    totalRooms,
    occupiedRooms,
    maintenanceIssues: maintenanceIssues ?? [],
    activeStaffRoomsCount: staffAssignments?.length ?? 0,
    profiles: profiles ?? [],
    cleaningLog: cleaningLog ?? [],
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-semibold mb-0.5" style={{ color: 'var(--light)' }}>
          Analíticas
        </h1>
        <p className="text-xs sm:text-sm" style={{ color: 'var(--text-3)' }}>
          Rendimiento del hotel: ingresos, ocupación y operación.
        </p>
      </div>
      <AnalyticsDashboard summary={summary} />
    </div>
  );
}
