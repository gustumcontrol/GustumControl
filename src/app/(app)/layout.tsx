import { Suspense, cache } from 'react';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/sidebar';
import { AppHeader } from '@/components/app-header';
import { MobileSidebarProvider } from '@/components/mobile-sidebar-context';
import { getHotelContext } from '@/lib/hotel-context';
import { AVAILABLE_ROOM_STATUSES } from '@/lib/room-status';
import type { Role, NavCategory } from '@/lib/types';

const OPERACION: NavCategory = {
  category: 'Operación',
  items: [
    { href: '/dashboard', label: 'Habitaciones', icon: 'bed' },
    { href: '/reservas', label: 'Reservas', icon: 'clipboard-list' },
    { href: '/historial', label: 'Historial de reservas', icon: 'clock-rotate-left' },
    { href: '/booking', label: 'Booking', icon: 'globe' },
  ],
};

const LIMPIEZA: NavCategory = {
  category: 'Limpieza',
  items: [
    { href: '/limpieza', label: 'Limpieza', icon: 'broom' },
    { href: '/limpieza/historial', label: 'Historial', icon: 'clock-rotate-left' },
  ],
};

const MANTENIMIENTO: NavCategory = {
  category: 'Mantenimiento',
  items: [
    { href: '/mantenimiento', label: 'Mantenimiento', icon: 'screwdriver-wrench' },
    { href: '/mantenimiento/historial', label: 'Historial', icon: 'clock-rotate-left' },
  ],
};

const ADMINISTRACION: NavCategory = {
  category: 'Administración',
  items: [
    { href: '/analiticas', label: 'Analíticas', icon: 'chart-line' },
    { href: '/actividades', label: 'Actividades', icon: 'list-check' },
    { href: '/usuarios', label: 'Usuarios', icon: 'users' },
  ],
};

const NAV_BY_ROLE: Record<Role, NavCategory[]> = {
  admin: [OPERACION, LIMPIEZA, MANTENIMIENTO, ADMINISTRACION],
  recepcion: [OPERACION],
  limpieza: [LIMPIEZA],
  mantenimiento: [MANTENIMIENTO],
};

const ROLE_LABEL: Record<Role, string> = {
  admin: 'Admin',
  recepcion: 'Recepción',
  limpieza: 'Limpieza',
  mantenimiento: 'Mantenimiento',
};

// El nombre del hotel activo, la lista de hoteles y las cuentas del sidebar
// son lo más lento de esta página (varias consultas a Supabase) y no hacen
// falta para pintar la estructura. Viven en esta función cacheada por
// request (React `cache`) para que Sidebar y AppHeader puedan pedirla cada
// uno desde su propio Suspense sin duplicar la consulta — cada uno pinta
// "pelado" de inmediato y se llena un momento después, sin bloquear
// `<main>` (que queda totalmente afuera de ambos Suspense), en vez de
// bloquear toda la navegación. Esto es lo que hace que cambiar de hotel (o
// cualquier redirect que reejecute el layout) se sienta instantáneo.
const getHotelExtras = cache(async (hotelId: string, isAdmin: boolean) => {
  const supabase = await createSupabaseServerClient();

  const [
    { data: hotelRow },
    { data: hotelsList },
    reservasCount,
    bookingCount,
    limpiezaCount,
    mantenimientoCount,
    availableRoomsCount,
  ] = await Promise.all([
    supabase.from('hotels').select('name').eq('id', hotelId).single(),
    isAdmin
      ? supabase.from('hotels').select('id, name').order('created_at')
      : Promise.resolve({ data: null }),
    supabase
      .from('reservations')
      .select('id', { count: 'exact', head: true })
      .eq('hotel_id', hotelId)
      .eq('status', 'ACTIVA'),
    supabase
      .from('reservations')
      .select('id', { count: 'exact', head: true })
      .eq('hotel_id', hotelId)
      .eq('status', 'ACTIVA')
      .eq('source', 'BOOKING'),
    supabase
      .from('reservations')
      .select('id', { count: 'exact', head: true })
      .eq('hotel_id', hotelId)
      .in('cleaning_status', ['PENDIENTE', 'EN PROCESO']),
    supabase
      .from('maintenance_issues')
      .select('id', { count: 'exact', head: true })
      .eq('hotel_id', hotelId)
      .neq('status', 'REALIZADO'),
    supabase
      .from('room_status')
      .select('room_id', { count: 'exact', head: true })
      .eq('hotel_id', hotelId)
      .in('computed_status', AVAILABLE_ROOM_STATUSES),
  ]);

  return {
    hotelName: hotelRow?.name ?? '',
    hotels: hotelsList ?? [],
    availableRooms: availableRoomsCount.count ?? 0,
    counts: {
      '/reservas': reservasCount.count ?? 0,
      '/booking': bookingCount.count ?? 0,
      '/limpieza': limpiezaCount.count ?? 0,
      '/mantenimiento': mantenimientoCount.count ?? 0,
    } as Record<string, number>,
  };
});

async function SidebarData({
  role,
  hotelId,
  isAdmin,
}: {
  role: Role;
  hotelId: string;
  isAdmin: boolean;
}) {
  const { counts, hotelName, hotels } = await getHotelExtras(hotelId, isAdmin);

  const navCategories = (NAV_BY_ROLE[role] ?? []).map((cat) => ({
    ...cat,
    items: cat.items.map((item) => ({
      ...item,
      count: counts[item.href],
    })),
  }));

  return (
    <Sidebar
      categories={navCategories}
      hotelId={hotelId}
      hotelName={hotelName}
      hotels={hotels}
      isAdmin={isAdmin}
    />
  );
}

async function AppHeaderData({
  userId,
  hotelId,
  isAdmin,
  displayName,
  roleLabel,
  initial,
}: {
  userId: string;
  hotelId: string;
  isAdmin: boolean;
  displayName: string;
  roleLabel: string;
  initial: string;
}) {
  const { hotelName, hotels, availableRooms } = await getHotelExtras(hotelId, isAdmin);

  return (
    <AppHeader
      userId={userId}
      hotelId={hotelId}
      hotelName={hotelName}
      hotels={hotels}
      availableRooms={availableRooms}
      displayName={displayName}
      roleLabel={roleLabel}
      initial={initial}
      isAdmin={isAdmin}
    />
  );
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, fullName, status, role: userRole, hotelId, isAdmin } = await getHotelContext();

  if (!userId) {
    redirect('/login');
  }

  if (status && status !== 'active') {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ background: 'var(--bg)' }}
      >
        <div
          className="w-full max-w-sm rounded-lg p-8 text-center"
          style={{ background: 'var(--card-c)', border: '1px solid var(--line)' }}
        >
          <h1 className="text-lg font-semibold mb-2" style={{ color: 'var(--light)' }}>
            Cuenta desactivada
          </h1>
          <p className="text-sm mb-6" style={{ color: 'var(--text-3)' }}>
            Tu acceso fue desactivado. Contacta a un administrador si crees que es un error.
          </p>
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="w-full text-sm px-3 py-2 rounded-lg transition-colors cursor-pointer"
              style={{ border: '1px solid var(--line-2)', color: 'var(--text-2)' }}
            >
              Salir
            </button>
          </form>
        </div>
      </div>
    );
  }

  const role = userRole ?? 'recepcion';

  if (isAdmin && !hotelId) {
    redirect('/hoteles');
  }

  // Categorías base sin contador — es lo que se ve mientras SidebarData
  // todavía está cargando las cuentas reales.
  const categoriesBase = NAV_BY_ROLE[role] ?? [];
  const displayName = fullName ?? '';
  const initial = displayName.trim().charAt(0).toUpperCase();

  return (
    <MobileSidebarProvider>
      <div className="min-h-screen flex" style={{ background: 'var(--bg)' }}>
        <Suspense fallback={<Sidebar categories={categoriesBase} />}>
          <SidebarData role={role} hotelId={hotelId!} isAdmin={role === 'admin'} />
        </Suspense>

        <div className="flex-1 min-w-0 flex flex-col">
          <Suspense
            fallback={
              <AppHeader
                userId={userId!}
                hotelId={hotelId!}
                displayName={displayName}
                roleLabel={ROLE_LABEL[role]}
                initial={initial}
                isAdmin={role === 'admin'}
              />
            }
          >
            <AppHeaderData
              userId={userId!}
              hotelId={hotelId!}
              isAdmin={role === 'admin'}
              displayName={displayName}
              roleLabel={ROLE_LABEL[role]}
              initial={initial}
            />
          </Suspense>

          <main className="flex-1 max-w-[96rem] w-full mx-auto px-4 sm:px-6 pt-8 pb-8 sm:pt-5">{children}</main>
        </div>
      </div>
    </MobileSidebarProvider>
  );
}
