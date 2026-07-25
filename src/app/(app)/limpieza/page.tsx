import Link from 'next/link';
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
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--light)' }}>
          Limpieza
        </h1>
        <Link
          href="/limpieza/historial"
          className="text-sm font-medium cursor-pointer"
          style={{ color: 'var(--accent-c)' }}
        >
          Ver historial
        </Link>
      </div>
      <CleaningTaskList tasks={tasks} />
    </div>
  );
}
