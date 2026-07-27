import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { DEFAULT_ROUTE_BY_ROLE } from '@/lib/roles';
import type { Role } from '@/lib/types';

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  redirect(DEFAULT_ROUTE_BY_ROLE[(profile?.role as Role) ?? 'recepcion'] ?? '/dashboard');
}
