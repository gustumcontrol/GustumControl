import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  MaintenanceIssuesHistoryList,
  type MaintenanceIssueHistoryRow,
} from '@/components/maintenance-issues-history-list';

export default async function MantenimientoHistorialPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('maintenance_issues')
    .select(
      'id, description, photo_urls, opened_at, closed_at, rooms(number), opened_by_profile:profiles!maintenance_issues_opened_by_fkey(full_name), closed_by_profile:profiles!maintenance_issues_closed_by_fkey(full_name)'
    )
    .eq('status', 'REALIZADO')
    .order('closed_at', { ascending: false })
    .limit(500);

  const entries: MaintenanceIssueHistoryRow[] = (data ?? []).map((e) => ({
    ...e,
    room: Array.isArray(e.rooms) ? (e.rooms[0] ?? null) : e.rooms,
    opened_by_name: Array.isArray(e.opened_by_profile)
      ? (e.opened_by_profile[0]?.full_name ?? null)
      : (e.opened_by_profile?.full_name ?? null),
    closed_by_name: Array.isArray(e.closed_by_profile)
      ? (e.closed_by_profile[0]?.full_name ?? null)
      : (e.closed_by_profile?.full_name ?? null),
  }));

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1" style={{ color: 'var(--light)' }}>
        Historial de mantenimiento
      </h1>
      <p className="text-sm mb-6" style={{ color: 'var(--text-3)' }}>
        Incidencias ya resueltas: quién las reportó, quién las resolvió, y cuándo.
      </p>
      <MaintenanceIssuesHistoryList entries={entries} />
    </div>
  );
}
