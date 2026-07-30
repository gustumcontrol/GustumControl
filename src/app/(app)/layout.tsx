import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NavLinks } from '@/components/nav-links';
import { Sidebar } from '@/components/sidebar';
import type { Role, NavCategory } from '@/lib/types';

const OPERACION: NavCategory = {
  category: 'Operación',
  items: [
    { href: '/dashboard', label: 'Habitaciones', icon: 'bed' },
    { href: '/reservas', label: 'Reservas', icon: 'clipboard-list' },
    { href: '/historial', label: 'Historial de reservas', icon: 'clock-rotate-left' },
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

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, status')
    .eq('id', user.id)
    .single();

  if (profile && profile.status !== 'active') {
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

  const role = (profile?.role as Role) ?? 'recepcion';
  const navCategories = NAV_BY_ROLE[role] ?? [];
  const navFlat = navCategories.flatMap((c) => c.items);
  const displayName = profile?.full_name ?? user.email ?? '';
  const initial = displayName.trim().charAt(0).toUpperCase();

  /* ── Versión anterior con header horizontal (comentada) ──────────────────
     Para volver a esta versión: borra el `return` de abajo y descomenta esto.

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <header
        className="sticky top-0 z-10"
        style={{ background: 'var(--card-c)', borderBottom: '1px solid var(--line)' }}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-6">
          <div className="flex items-center gap-8">
            <span
              className="flex items-center gap-2 font-semibold text-sm"
              style={{ color: 'var(--light)' }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: 'var(--accent-c)' }}
              />
              Hotel
            </span>
            <nav className="hidden sm:flex items-center gap-1">
              <NavLinks items={nav} />
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2.5">
              <span
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold"
                style={{ background: 'var(--accent-dim)', color: 'var(--accent-c)' }}
              >
                {initial || '?'}
              </span>
              <div className="leading-tight">
                <p className="text-sm font-medium" style={{ color: 'var(--light)' }}>
                  {displayName}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                  {ROLE_LABEL[role]}
                </p>
              </div>
            </div>
            <form action="/api/auth/signout" method="POST">
              <button
                type="submit"
                className="text-sm px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                style={{ border: '1px solid var(--line-2)', color: 'var(--text-2)' }}
              >
                Salir
              </button>
            </form>
          </div>
        </div>

        <nav className="sm:hidden flex items-center gap-1 px-4 pb-3 overflow-x-auto">
          <NavLinks items={nav} variant="mobile" />
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
  ── fin versión anterior ── */

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg)' }}>
      <Sidebar
        categories={navCategories}
        userId={user.id}
        displayName={displayName}
        roleLabel={ROLE_LABEL[role]}
        initial={initial}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <header
          className="sm:hidden sticky top-0 z-10"
          style={{ background: 'var(--card-c)', borderBottom: '1px solid var(--line)' }}
        >
          <div className="px-4 h-14 flex items-center justify-between gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Gustum Control" className="h-6 w-auto" />
            <form action="/api/auth/signout" method="POST">
              <button
                type="submit"
                className="text-sm px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                style={{ border: '1px solid var(--line-2)', color: 'var(--text-2)' }}
              >
                Salir
              </button>
            </form>
          </div>
          <nav className="flex items-center gap-1 px-4 pb-3 overflow-x-auto">
            <NavLinks items={navFlat} variant="mobile" />
          </nav>
        </header>

        <main className="flex-1 max-w-[96rem] w-full mx-auto px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
