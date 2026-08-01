'use client';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Icon } from '@/components/icon';
import type { AnalyticsSummary } from '@/lib/analytics';

const PALETTE = ['#FF6B2B', '#2563eb', '#16a34a', '#9333ea', '#0d9488', '#d97706', '#dc2626'];

function money(n: number) {
  return `$${n.toLocaleString('es-ES', { maximumFractionDigits: 0 })}`;
}

function num(v: unknown) {
  return typeof v === 'number' ? v : Number(v) || 0;
}

function KpiCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: string;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div
      className="rounded-lg p-5 flex flex-col gap-1"
      style={{ background: 'var(--card-c)', border: '1px solid var(--line)' }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium" style={{ color: 'var(--text-3)' }}>
          {label}
        </span>
        <Icon name={icon} style="duotone" size={14} color="var(--accent-c)" />
      </div>
      <span className="text-2xl font-semibold" style={{ color: 'var(--light)' }}>
        {value}
      </span>
      {sub && (
        <span className="text-xs" style={{ color: 'var(--text-3)' }}>
          {sub}
        </span>
      )}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-lg p-5"
      style={{ background: 'var(--card-c)', border: '1px solid var(--line)' }}
    >
      <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--light)' }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

const tooltipStyle = {
  background: 'var(--card-c)',
  border: '1px solid var(--line)',
  borderRadius: 8,
  fontSize: 12,
  color: 'var(--light)',
};

export function AnalyticsDashboard({ summary }: { summary: AnalyticsSummary }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard
          icon="sack-dollar"
          label="Ingresos totales"
          value={money(summary.totalRevenue)}
        />
        <KpiCard
          icon="calendar-days"
          label="Ingresos este mes"
          value={money(summary.monthRevenue)}
        />
        <KpiCard
          icon="bed"
          label="Ocupación actual"
          value={`${summary.occupancyRate}%`}
          sub={`${summary.occupiedRooms} de ${summary.totalRooms} habitaciones`}
        />
        <KpiCard
          icon="tag"
          label="Tarifa promedio (ADR)"
          value={money(summary.adr)}
          sub="por noche"
        />
        <KpiCard
          icon="moon"
          label="Estadía promedio"
          value={`${summary.avgStayNights}`}
          sub="noches por reserva"
        />
        <KpiCard
          icon="user-lock"
          label="Habitaciones en uso por personal"
          value={`${summary.staffRoomsCount}`}
          sub={
            summary.staffRoomsCount > 0
              ? `~${money(summary.staffOpportunityCost)}/mes en oportunidad`
              : 'ninguna ahora mismo'
          }
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <ChartCard title="Ingresos por mes (últimos 12 meses)">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={summary.revenueByMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-3)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-3)' }} width={50} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v) => [money(num(v)), 'Ingresos']}
              />
              <Bar dataKey="value" fill="#FF6B2B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Ocupación por mes (%)">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={summary.occupancyByMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-3)' }} />
              <YAxis
                tick={{ fontSize: 11, fill: 'var(--text-3)' }}
                width={40}
                domain={[0, 100]}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v) => [`${num(v)}%`, 'Ocupación']}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#2563eb"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Ingresos por tipo de habitación">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={summary.revenueByRoomType} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
              <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-3)' }} />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 12, fill: 'var(--text-2)' }}
                width={70}
              />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => [money(num(v)), 'Ingresos']} />
              <Bar dataKey="value" fill="#16a34a" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Habitaciones más rentables">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={summary.topRooms} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
              <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-3)' }} />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 12, fill: 'var(--text-2)' }}
                width={60}
              />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => [money(num(v)), 'Ingresos']} />
              <Bar dataKey="value" fill="#9333ea" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Métodos de pago">
          {summary.paymentMethods.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-3)' }}>
              Sin datos todavía.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={summary.paymentMethods}
                  dataKey="revenue"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={85}
                  paddingAngle={2}
                >
                  {summary.paymentMethods.map((entry, i) => (
                    <Cell key={entry.name} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => money(num(v))} />
                <Legend
                  wrapperStyle={{ fontSize: 12, color: 'var(--text-2)' }}
                  formatter={(v) => v}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Origen de los huéspedes">
          {summary.topCountries.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-3)' }}>
              Sin datos todavía.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={summary.topCountries}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-3)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-3)' }} width={30} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [num(v), 'Reservas']} />
                <Bar dataKey="value" fill="#0d9488" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <ChartCard title="Mantenimiento">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-xs" style={{ color: 'var(--text-3)' }}>
              Incidencias totales
            </p>
            <p className="text-xl font-semibold" style={{ color: 'var(--light)' }}>
              {summary.maintenanceTotal}
            </p>
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--text-3)' }}>
              Abiertas ahora
            </p>
            <p className="text-xl font-semibold" style={{ color: 'var(--light)' }}>
              {summary.maintenanceOpen}
            </p>
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--text-3)' }}>
              Tiempo promedio de resolución
            </p>
            <p className="text-xl font-semibold" style={{ color: 'var(--light)' }}>
              {summary.maintenanceAvgResolutionHours !== null
                ? `${summary.maintenanceAvgResolutionHours} h`
                : '—'}
            </p>
          </div>
        </div>
      </ChartCard>

      <ChartCard title="Rendimiento por empleado">
        {summary.staffPerformance.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>
            Todavía no hay actividad registrada por empleado.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--line)' }}>
                  <th className="text-left py-2 pr-4 font-medium" style={{ color: 'var(--text-3)' }}>
                    Empleado
                  </th>
                  <th className="text-left py-2 pr-4 font-medium" style={{ color: 'var(--text-3)' }}>
                    Rol
                  </th>
                  <th className="text-right py-2 pr-4 font-medium" style={{ color: 'var(--text-3)' }}>
                    Reservas creadas
                  </th>
                  <th className="text-right py-2 pr-4 font-medium" style={{ color: 'var(--text-3)' }}>
                    Ingresos generados
                  </th>
                  <th className="text-right py-2 pr-4 font-medium" style={{ color: 'var(--text-3)' }}>
                    Limpiezas completadas
                  </th>
                  <th className="text-right py-2 pr-4 font-medium" style={{ color: 'var(--text-3)' }}>
                    Incidencias resueltas
                  </th>
                  <th className="text-right py-2 font-medium" style={{ color: 'var(--text-3)' }}>
                    Tiempo prom. resolución
                  </th>
                </tr>
              </thead>
              <tbody>
                {summary.staffPerformance.map((row) => (
                  <tr key={row.id} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td className="py-2 pr-4" style={{ color: 'var(--light)' }}>
                      {row.name}
                    </td>
                    <td className="py-2 pr-4" style={{ color: 'var(--text-2)' }}>
                      {row.role}
                    </td>
                    <td className="py-2 pr-4 text-right" style={{ color: 'var(--text-2)' }}>
                      {row.reservationsCreated || '—'}
                    </td>
                    <td className="py-2 pr-4 text-right" style={{ color: 'var(--text-2)' }}>
                      {row.revenueGenerated > 0 ? money(row.revenueGenerated) : '—'}
                    </td>
                    <td className="py-2 pr-4 text-right" style={{ color: 'var(--text-2)' }}>
                      {row.cleaningsCompleted || '—'}
                    </td>
                    <td className="py-2 pr-4 text-right" style={{ color: 'var(--text-2)' }}>
                      {row.issuesResolved || '—'}
                    </td>
                    <td className="py-2 text-right" style={{ color: 'var(--text-2)' }}>
                      {row.avgResolutionHours !== null ? `${row.avgResolutionHours} h` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs mt-3" style={{ color: 'var(--text-3)' }}>
          Las reservas creadas e ingresos generados reflejan solo las reservas activas o recién
          cerradas (aún no archivadas).
        </p>
      </ChartCard>
    </div>
  );
}
