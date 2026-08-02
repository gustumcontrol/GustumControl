import { createSupabaseServerClient } from '@/lib/supabase/server';
import { CleaningTaskList, type CleaningTask } from '@/components/cleaning-task-list';

export default async function LimpiezaPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('reservations')
    .select('id, guest_name, cleaning_status, rooms(number, floor)')
    .in('cleaning_status', ['PENDIENTE', 'EN PROCESO'])
    .order('check_in');

  const tasks: CleaningTask[] = (data ?? []).map((r) => ({
    ...r,
    room: Array.isArray(r.rooms) ? r.rooms[0] ?? null : r.rooms,
  }));

  return (
    <div className="lg:max-w-4xl lg:mx-auto">
      <h1 className="text-2xl font-semibold mb-6" style={{ color: 'var(--light)' }}>
        Limpieza pendiente
      </h1>
      <CleaningTaskList tasks={tasks} />
    </div>
  );
}
