import { createSupabaseServerClient } from '@/lib/supabase/server';
import { MaintenanceTaskList, type MaintenanceIssueRow } from '@/components/maintenance-task-list';
import { AddMaintenanceIssueDialog } from '@/components/add-maintenance-issue-dialog';

export default async function MantenimientoPage() {
  const supabase = await createSupabaseServerClient();
  const [{ data: issues }, { data: rooms }] = await Promise.all([
    supabase
      .from('maintenance_issues')
      .select(
        'id, room_id, description, photo_urls, status, opened_at, rooms(number, floor), opened_by_profile:profiles!maintenance_issues_opened_by_fkey(full_name)'
      )
      .neq('status', 'REALIZADO')
      .order('opened_at', { ascending: true }),
    supabase.from('rooms').select('id, number, floor, type').eq('active', true).order('number'),
  ]);

  const tasks: MaintenanceIssueRow[] = (issues ?? []).map((i) => ({
    ...i,
    room: Array.isArray(i.rooms) ? (i.rooms[0] ?? null) : i.rooms,
    opened_by_name: Array.isArray(i.opened_by_profile)
      ? (i.opened_by_profile[0]?.full_name ?? null)
      : (i.opened_by_profile?.full_name ?? null),
  }));

  const roomsAlreadyInMaintenance = new Set(tasks.map((t) => t.room_id));
  const availableRooms = (rooms ?? []).filter((r) => !roomsAlreadyInMaintenance.has(r.id));

  return (
    <div className="lg:max-w-5xl lg:mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--light)' }}>
          Mantenimiento pendiente
        </h1>
        <AddMaintenanceIssueDialog rooms={availableRooms} />
      </div>
      <MaintenanceTaskList tasks={tasks} />
    </div>
  );
}
