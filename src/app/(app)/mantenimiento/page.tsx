import { createSupabaseServerClient } from '@/lib/supabase/server';
import { MaintenanceTaskList, type MaintenanceTask } from '@/components/maintenance-task-list';

export default async function MantenimientoPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('reservations')
    .select('id, guest_name, maintenance_status, rooms(number, floor)')
    .eq('status', 'ACTIVA')
    .in('maintenance_status', ['PENDIENTE', 'EN PROCESO'])
    .order('check_in');

  const tasks: MaintenanceTask[] = (data ?? []).map((r) => ({
    ...r,
    room: Array.isArray(r.rooms) ? r.rooms[0] ?? null : r.rooms,
  }));

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6" style={{ color: 'var(--light)' }}>
        Mantenimiento
      </h1>
      <MaintenanceTaskList tasks={tasks} />
    </div>
  );
}
