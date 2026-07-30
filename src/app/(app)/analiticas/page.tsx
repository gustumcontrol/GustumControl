import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AnalyticsDashboard } from '@/components/analytics-dashboard';
import { buildAnalytics } from '@/lib/analytics';

export default async function AnaliticasPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  if (!user) {
    redirect('/login');
  }

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (callerProfile?.role !== 'admin') {
    redirect('/dashboard');
  }

  const [
    { data: history },
    { data: activeReservations },
    { data: roomStatuses },
    { data: maintenanceIssues },
    { data: staffAssignments },
    { data: profiles },
    { data: cleaningLog },
  ] = await Promise.all([
    supabase.from('reservation_history').select('*').order('check_in', { ascending: false }),
    supabase
      .from('reservations')
      .select(
        'id, check_in, nights, total, price_per_night, payment_method, country, created_by, rooms(number, floor, type)'
      ),
    supabase.from('room_status').select('room_id, computed_status'),
    supabase
      .from('maintenance_issues')
      .select('id, status, opened_at, opened_by, closed_at, closed_by'),
    supabase.from('room_staff_assignments').select('id, released_at').is('released_at', null),
    supabase.from('profiles').select('id, full_name, role').eq('status', 'active'),
    supabase.from('cleaning_log').select('status, changed_by'),
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
        <h1 className="text-2xl font-semibold mb-1" style={{ color: 'var(--light)' }}>
          Analíticas
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-3)' }}>
          Rendimiento del hotel: ingresos, ocupación y operación.
        </p>
      </div>
      <AnalyticsDashboard summary={summary} />
    </div>
  );
}
