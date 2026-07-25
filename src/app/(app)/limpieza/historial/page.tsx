import { createSupabaseServerClient } from '@/lib/supabase/server';
import { CleaningLogList, type CleaningLogRow } from '@/components/cleaning-log-list';

export default async function LimpiezaHistorialPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('cleaning_log')
    .select('id, reservation_id, room_number, status, changed_at, profiles(full_name)')
    .order('changed_at', { ascending: false })
    .limit(500);

  const entries: CleaningLogRow[] = (data ?? []).map((e) => ({
    ...e,
    changed_by_name: Array.isArray(e.profiles)
      ? (e.profiles[0]?.full_name ?? null)
      : (e.profiles?.full_name ?? null),
  }));

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1" style={{ color: 'var(--light)' }}>
        Historial de limpieza
      </h1>
      <p className="text-sm mb-6" style={{ color: 'var(--text-3)' }}>
        Quién cambió el estado de limpieza de cada habitación, y cuándo.
      </p>
      <CleaningLogList entries={entries} />
    </div>
  );
}
