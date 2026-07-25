import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ReservationHistoryList } from '@/components/reservation-history-list';

export default async function HistorialPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('reservation_history')
    .select('*')
    .order('archived_at', { ascending: false });

  const entries = data ?? [];
  const totalNights = entries.reduce((sum, e) => sum + e.nights, 0);
  const totalIncome = entries.reduce((sum, e) => sum + Number(e.total), 0);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1" style={{ color: 'var(--light)' }}>
        Historial de reservas
      </h1>
      <p className="text-sm mb-6" style={{ color: 'var(--text-3)' }}>
        Reservas ya cerradas y archivadas.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <StatCard label="Reservas finalizadas" value={entries.length.toString()} />
        <StatCard label="Noches alojadas" value={totalNights.toString()} />
        <StatCard label="Ingresos totales" value={`$${totalIncome.toFixed(2)}`} />
      </div>

      <ReservationHistoryList entries={entries} />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-xl p-4"
      style={{ background: 'var(--card-c)', border: '1px solid var(--line)' }}
    >
      <p className="text-xs mb-1" style={{ color: 'var(--text-3)' }}>
        {label}
      </p>
      <p className="text-2xl font-semibold" style={{ color: 'var(--light)' }}>
        {value}
      </p>
    </div>
  );
}
