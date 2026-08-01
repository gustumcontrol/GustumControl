import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getAllActivity } from '@/lib/actions/activity';
import { ActivityLogList } from '@/components/activity-log-list';

export default async function ActividadesPage() {
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

  const [entries, { data: profiles }] = await Promise.all([
    getAllActivity(),
    supabase.from('profiles').select('id, full_name').order('full_name'),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-1" style={{ color: 'var(--light)' }}>
          Actividades
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-3)' }}>
          Todo lo que hizo el equipo en el sistema, día por día.
        </p>
      </div>
      <ActivityLogList entries={entries} users={profiles ?? []} />
    </div>
  );
}
