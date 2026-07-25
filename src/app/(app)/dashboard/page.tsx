import { createSupabaseServerClient } from '@/lib/supabase/server';
import { RoomGrid } from '@/components/room-grid';

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data: rooms } = await supabase.from('room_status').select('*').order('number');

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6" style={{ color: 'var(--light)' }}>
        Habitaciones
      </h1>
      <RoomGrid initialRooms={rooms ?? []} />
    </div>
  );
}
