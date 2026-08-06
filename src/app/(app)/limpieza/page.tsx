import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { CleaningTaskList, type CleaningTask } from '@/components/cleaning-task-list';
import { getHotelContext } from '@/lib/hotel-context';

export default async function LimpiezaPage() {
  const { hotelId, isAdmin } = await getHotelContext();

  if (isAdmin && !hotelId) {
    redirect('/hoteles');
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('reservations')
    .select('id, guest_name, cleaning_status, rooms(number, floor)')
    .eq('hotel_id', hotelId!)
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
