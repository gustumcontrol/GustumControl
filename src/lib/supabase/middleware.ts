import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { DEFAULT_ROUTE_BY_ROLE } from '@/lib/roles';
import type { Role } from '@/lib/types';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: don't add logic between createServerClient and auth.getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const maintenancePath = '/sistema-en-mantenimiento';
  const isMaintenancePath = request.nextUrl.pathname === maintenancePath;

  if (!request.nextUrl.pathname.startsWith('/api')) {
    const { data: settings } = await supabase
      .from('app_settings')
      .select('maintenance_mode')
      .eq('id', 1)
      .single();

    if (settings?.maintenance_mode && !isMaintenancePath) {
      const url = request.nextUrl.clone();
      url.pathname = maintenancePath;
      return NextResponse.redirect(url);
    }

    if (!settings?.maintenance_mode && isMaintenancePath) {
      const url = request.nextUrl.clone();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        url.pathname = DEFAULT_ROUTE_BY_ROLE[(profile?.role as Role) ?? 'recepcion'] ?? '/dashboard';
      } else {
        url.pathname = '/login';
      }
      return NextResponse.redirect(url);
    }
  }

  const protectedRoutes = [
    '/dashboard',
    '/reservas',
    '/historial',
    '/limpieza',
    '/mantenimiento',
    '/usuarios',
  ];
  const isProtectedRoute = protectedRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  const authRoutes = ['/login', '/signup'];
  const isAuthRoute = authRoutes.some((route) => request.nextUrl.pathname === route);

  if (isAuthRoute && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const url = request.nextUrl.clone();
    url.pathname = DEFAULT_ROUTE_BY_ROLE[(profile?.role as Role) ?? 'recepcion'] ?? '/dashboard';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
