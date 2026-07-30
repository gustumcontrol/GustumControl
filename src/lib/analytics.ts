import type { ReservationHistory } from '@/lib/types';

type ActiveReservationWithRoom = {
  check_in: string;
  nights: number;
  total: number | null;
  price_per_night: number;
  payment_method: string | null;
  country: string | null;
  created_by: string | null;
  rooms: { number: string; floor: string; type: string } | null;
};

type MaintenanceIssueInput = {
  status: string;
  opened_at: string;
  opened_by: string | null;
  closed_at: string | null;
  closed_by: string | null;
};

type CleaningLogInput = {
  status: string;
  changed_by: string | null;
};

type ProfileInput = {
  id: string;
  full_name: string;
  role: string;
};

export type StaffPerformanceRow = {
  id: string;
  name: string;
  role: string;
  reservationsCreated: number;
  revenueGenerated: number;
  cleaningsCompleted: number;
  issuesResolved: number;
  avgResolutionHours: number | null;
};

type Stay = {
  roomNumber: string;
  roomType: string;
  checkIn: string;
  nights: number;
  total: number;
  pricePerNight: number;
  paymentMethod: string | null;
  country: string | null;
};

export type MonthPoint = { month: string; label: string; value: number };

export type AnalyticsSummary = {
  totalRevenue: number;
  monthRevenue: number;
  occupancyRate: number;
  occupiedRooms: number;
  totalRooms: number;
  adr: number;
  avgStayNights: number;
  staffRoomsCount: number;
  staffOpportunityCost: number;
  revenueByMonth: MonthPoint[];
  occupancyByMonth: MonthPoint[];
  paymentMethods: { name: string; value: number; revenue: number }[];
  revenueByRoomType: { name: string; value: number }[];
  topRooms: { name: string; value: number }[];
  topCountries: { name: string; value: number }[];
  maintenanceTotal: number;
  maintenanceOpen: number;
  maintenanceAvgResolutionHours: number | null;
  staffPerformance: StaffPerformanceRow[];
};

const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin',
  recepcion: 'Recepción',
  limpieza: 'Limpieza',
  mantenimiento: 'Mantenimiento',
};

const MONTH_LABELS = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

function monthKey(dateStr: string) {
  return dateStr.slice(0, 7); // YYYY-MM
}

function lastNMonths(n: number): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    out.push({ key, label: `${MONTH_LABELS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}` });
  }
  return out;
}

function daysInMonth(key: string) {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

export function buildAnalytics({
  history,
  activeReservations,
  totalRooms,
  occupiedRooms,
  maintenanceIssues,
  activeStaffRoomsCount,
  profiles,
  cleaningLog,
}: {
  history: ReservationHistory[];
  activeReservations: ActiveReservationWithRoom[];
  totalRooms: number;
  occupiedRooms: number;
  maintenanceIssues: MaintenanceIssueInput[];
  activeStaffRoomsCount: number;
  profiles: ProfileInput[];
  cleaningLog: CleaningLogInput[];
}): AnalyticsSummary {
  const stays: Stay[] = [
    ...history.map((h) => ({
      roomNumber: h.room_number,
      roomType: h.room_type,
      checkIn: h.check_in,
      nights: h.nights,
      total: Number(h.total) || 0,
      pricePerNight: Number(h.price_per_night) || 0,
      paymentMethod: h.payment_method,
      country: h.country,
    })),
    ...activeReservations
      .filter((r) => r.rooms)
      .map((r) => ({
        roomNumber: r.rooms!.number,
        roomType: r.rooms!.type,
        checkIn: r.check_in,
        nights: r.nights,
        total: Number(r.total) || 0,
        pricePerNight: Number(r.price_per_night) || 0,
        paymentMethod: r.payment_method,
        country: r.country,
      })),
  ];

  const totalRevenue = stays.reduce((sum, s) => sum + s.total, 0);
  const totalNights = stays.reduce((sum, s) => sum + s.nights, 0);
  const adr = totalNights > 0 ? totalRevenue / totalNights : 0;
  const avgStayNights = stays.length > 0 ? totalNights / stays.length : 0;

  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthRevenue = stays
    .filter((s) => monthKey(s.checkIn) === currentMonthKey)
    .reduce((sum, s) => sum + s.total, 0);

  const months = lastNMonths(12);

  const revenueByMonthMap = new Map<string, number>();
  const nightsByMonthMap = new Map<string, number>();
  for (const s of stays) {
    const key = monthKey(s.checkIn);
    revenueByMonthMap.set(key, (revenueByMonthMap.get(key) ?? 0) + s.total);
    nightsByMonthMap.set(key, (nightsByMonthMap.get(key) ?? 0) + s.nights);
  }

  const revenueByMonth: MonthPoint[] = months.map((m) => ({
    month: m.key,
    label: m.label,
    value: Math.round((revenueByMonthMap.get(m.key) ?? 0) * 100) / 100,
  }));

  const occupancyByMonth: MonthPoint[] = months.map((m) => {
    const available = totalRooms * daysInMonth(m.key);
    const occupied = nightsByMonthMap.get(m.key) ?? 0;
    const rate = available > 0 ? (occupied / available) * 100 : 0;
    return { month: m.key, label: m.label, value: Math.round(rate * 10) / 10 };
  });

  const paymentMap = new Map<string, { value: number; revenue: number }>();
  for (const s of stays) {
    const key = s.paymentMethod || 'No especificado';
    const entry = paymentMap.get(key) ?? { value: 0, revenue: 0 };
    entry.value += 1;
    entry.revenue += s.total;
    paymentMap.set(key, entry);
  }
  const paymentMethods = [...paymentMap.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.revenue - a.revenue);

  const roomTypeMap = new Map<string, number>();
  for (const s of stays) {
    roomTypeMap.set(s.roomType, (roomTypeMap.get(s.roomType) ?? 0) + s.total);
  }
  const revenueByRoomType = [...roomTypeMap.entries()]
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => b.value - a.value);

  const roomMap = new Map<string, number>();
  for (const s of stays) {
    roomMap.set(s.roomNumber, (roomMap.get(s.roomNumber) ?? 0) + s.total);
  }
  const topRooms = [...roomMap.entries()]
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const countryMap = new Map<string, number>();
  for (const s of stays) {
    const key = s.country || 'No especificado';
    countryMap.set(key, (countryMap.get(key) ?? 0) + 1);
  }
  const topCountries = [...countryMap.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const maintenanceTotal = maintenanceIssues.length;
  const maintenanceOpen = maintenanceIssues.filter((m) => m.status !== 'REALIZADO').length;
  const resolved = maintenanceIssues.filter((m) => m.status === 'REALIZADO' && m.closed_at);
  const maintenanceAvgResolutionHours =
    resolved.length > 0
      ? resolved.reduce((sum, m) => {
          const opened = new Date(m.opened_at).getTime();
          const closed = new Date(m.closed_at!).getTime();
          return sum + (closed - opened) / (1000 * 60 * 60);
        }, 0) / resolved.length
      : null;

  const staffOpportunityCost = activeStaffRoomsCount * adr * 30;

  const reservationsByUser = new Map<string, { count: number; revenue: number }>();
  for (const r of activeReservations) {
    if (!r.created_by) continue;
    const entry = reservationsByUser.get(r.created_by) ?? { count: 0, revenue: 0 };
    entry.count += 1;
    entry.revenue += Number(r.total) || 0;
    reservationsByUser.set(r.created_by, entry);
  }

  const cleaningsByUser = new Map<string, number>();
  for (const c of cleaningLog) {
    if (!c.changed_by || c.status !== 'LIMPIADO') continue;
    cleaningsByUser.set(c.changed_by, (cleaningsByUser.get(c.changed_by) ?? 0) + 1);
  }

  const issuesResolvedByUser = new Map<string, { count: number; totalHours: number }>();
  for (const m of maintenanceIssues) {
    if (!m.closed_by || m.status !== 'REALIZADO' || !m.closed_at) continue;
    const entry = issuesResolvedByUser.get(m.closed_by) ?? { count: 0, totalHours: 0 };
    entry.count += 1;
    entry.totalHours += (new Date(m.closed_at).getTime() - new Date(m.opened_at).getTime()) / (1000 * 60 * 60);
    issuesResolvedByUser.set(m.closed_by, entry);
  }

  const staffPerformance: StaffPerformanceRow[] = profiles
    .map((p) => {
      const res = reservationsByUser.get(p.id);
      const issues = issuesResolvedByUser.get(p.id);
      return {
        id: p.id,
        name: p.full_name,
        role: ROLE_LABEL[p.role] ?? p.role,
        reservationsCreated: res?.count ?? 0,
        revenueGenerated: Math.round((res?.revenue ?? 0) * 100) / 100,
        cleaningsCompleted: cleaningsByUser.get(p.id) ?? 0,
        issuesResolved: issues?.count ?? 0,
        avgResolutionHours: issues ? Math.round((issues.totalHours / issues.count) * 10) / 10 : null,
      };
    })
    .filter(
      (row) =>
        row.reservationsCreated > 0 || row.cleaningsCompleted > 0 || row.issuesResolved > 0
    )
    .sort((a, b) => {
      const activityA = a.reservationsCreated + a.cleaningsCompleted + a.issuesResolved;
      const activityB = b.reservationsCreated + b.cleaningsCompleted + b.issuesResolved;
      return activityB - activityA;
    });

  return {
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    monthRevenue: Math.round(monthRevenue * 100) / 100,
    occupancyRate: totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 1000) / 10 : 0,
    occupiedRooms,
    totalRooms,
    adr: Math.round(adr * 100) / 100,
    avgStayNights: Math.round(avgStayNights * 10) / 10,
    staffRoomsCount: activeStaffRoomsCount,
    staffOpportunityCost: Math.round(staffOpportunityCost * 100) / 100,
    revenueByMonth,
    occupancyByMonth,
    paymentMethods,
    revenueByRoomType,
    topRooms,
    topCountries,
    maintenanceTotal,
    maintenanceOpen,
    maintenanceAvgResolutionHours:
      maintenanceAvgResolutionHours !== null
        ? Math.round(maintenanceAvgResolutionHours * 10) / 10
        : null,
    staffPerformance,
  };
}
