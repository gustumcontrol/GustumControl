import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { UsersTable } from '@/components/users-table';
import { AddUserDialog } from '@/components/add-user-dialog';
import { getHotelContext } from '@/lib/hotel-context';

export default async function UsuariosPage() {
  const { role, hotelId, userId } = await getHotelContext();

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
  const { data: users } = await supabase
    .from('profiles')
    .select('*')
    .eq('hotel_id', hotelId)
    .order('full_name');

  return (
    <div>
      <div className="flex items-stretch sm:items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold mb-0.5" style={{ color: 'var(--light)' }}>
            Usuarios
          </h1>
          <p className="text-xs sm:text-sm" style={{ color: 'var(--text-3)' }}>
            Equipo, roles y permisos.
          </p>
        </div>
        <AddUserDialog />
      </div>
      <UsersTable users={users ?? []} currentUserId={userId!} />
    </div>
  );
}
