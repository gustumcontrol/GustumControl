import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { UsersTable } from '@/components/users-table';
import { AddUserDialog } from '@/components/add-user-dialog';

export default async function UsuariosPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  if (!user) {
    redirect('/login');
  }

  const [{ data: callerProfile }, { data: users }] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user.id).single(),
    supabase.from('profiles').select('*').order('full_name'),
  ]);

  if (callerProfile?.role !== 'admin') {
    redirect('/dashboard');
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold mb-1" style={{ color: 'var(--light)' }}>
            Usuarios
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>
            Gestiona el equipo, sus roles y permisos.
          </p>
        </div>
        <AddUserDialog />
      </div>
      <UsersTable users={users ?? []} currentUserId={user.id} />
    </div>
  );
}
