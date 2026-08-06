import { cache } from 'react';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Role } from '@/lib/types';

export const ACTIVE_HOTEL_COOKIE = 'active_hotel_id';

/**
 * A los roles operativos (recepcion/limpieza/mantenimiento) su hotel les
 * viene fijo de profiles.hotel_id. Los admin pueden pertenecer a/gestionar
 * varios hoteles (RLS ya no los restringe por hotel), así que su hotel
 * "activo" en un momento dado viene de una cookie que se setea al elegir
 * uno en /hoteles.
 *
 * cache() de React memoriza el resultado por request: el layout y la
 * página siempre llaman a esta función por separado (no hay forma de
 * pasarse datos entre server components sin esto), y sin cache() cada
 * llamada repetía su propio auth.getUser() + consulta a profiles — dos
 * viajes a Supabase de más en cada navegación.
 */
export const getHotelContext = cache(async function getHotelContext(): Promise<{
  userId: string | null;
  fullName: string | null;
  status: string | null;
  role: Role | null;
  isAdmin: boolean;
  hotelId: string | null;
}> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { userId: null, fullName: null, status: null, role: null, isAdmin: false, hotelId: null };
  }

  // Una sola consulta a profiles: layout/páginas ya no necesitan pedirlo
  // aparte, evita duplicar el viaje de ida y vuelta a Supabase.
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, status, hotel_id')
    .eq('id', user.id)
    .single();

  const role = (profile?.role as Role) ?? null;
  const base = {
    userId: user.id,
    fullName: profile?.full_name ?? user.email ?? null,
    status: profile?.status ?? null,
  };

  if (role !== 'admin') {
    return { ...base, role, isAdmin: false, hotelId: profile?.hotel_id ?? null };
  }

  const cookieStore = await cookies();
  const activeHotelId = cookieStore.get(ACTIVE_HOTEL_COOKIE)?.value ?? null;
  return { ...base, role, isAdmin: true, hotelId: activeHotelId };
});
