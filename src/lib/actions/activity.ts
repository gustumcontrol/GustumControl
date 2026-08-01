'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { ActivityLogEntry } from '@/lib/types';

export async function getUserActivity(userId: string): Promise<ActivityLogEntry[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('activity_log')
    .select('*')
    .eq('actor_id', userId)
    .order('created_at', { ascending: false })
    .limit(2000);

  return data ?? [];
}

export type ActivityWithActor = ActivityLogEntry & { actor_name: string };

export async function getAllActivity(): Promise<ActivityWithActor[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('activity_log')
    .select('*, profiles(full_name)')
    .order('created_at', { ascending: false })
    .limit(5000);

  return (data ?? []).map(({ profiles, ...rest }) => {
    const profile = Array.isArray(profiles) ? profiles[0] : profiles;
    return { ...rest, actor_name: profile?.full_name ?? 'Sistema' };
  });
}
