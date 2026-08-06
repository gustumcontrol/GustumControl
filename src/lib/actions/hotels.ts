'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ACTIVE_HOTEL_COOKIE, getHotelContext } from '@/lib/hotel-context';

async function assertAdmin() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('No autenticado');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    throw new Error('Solo un admin puede hacer esto');
  }
}

export async function createHotel(name: string) {
  try {
    await assertAdmin();
  } catch (e) {
    return { error: (e as Error).message };
  }

  const trimmed = name.trim();
  if (!trimmed) {
    return { error: 'Falta el nombre del hotel.' };
  }

  const slug = trimmed
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('hotels').insert({ name: trimmed, slug: slug || null });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/hoteles');
  return { success: true };
}

export async function selectHotel(formData: FormData) {
  const hotelId = formData.get('hotelId');
  if (typeof hotelId !== 'string' || !hotelId) {
    redirect('/hoteles');
  }

  // getHotelContext() ya hace user+perfil en una sola función — antes esta
  // acción repetía esa misma consulta y además verificaba con otro viaje a
  // Supabase que el hotel existiera. Esa verificación no aporta seguridad
  // real (un admin ya puede leer/operar cualquier hotel vía RLS, así que
  // "inventar" un id solo produce listas vacías, no una fuga de datos), así
  // que se saca para no sumar otro round-trip en cada cambio de hotel.
  const { role, hotelId: currentHotelId } = await getHotelContext();

  if (!role) {
    redirect('/login');
  }

  if (role === 'admin') {
    // No httpOnly a propósito: el sidebar cambia de hotel desde el cliente
    // (document.cookie) para que sea instantáneo, sin pasar por un server
    // action. Si esta se pusiera httpOnly, el navegador ignora en silencio
    // cualquier intento de sobrescribirla desde JS — hay que mantenerlas
    // consistentes entre los dos lugares que la setean.
    const cookieStore = await cookies();
    cookieStore.set(ACTIVE_HOTEL_COOKIE, hotelId, {
      httpOnly: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
  } else if (currentHotelId !== hotelId) {
    // Un no-admin solo puede "elegir" su propio hotel (la UI ya no le
    // ofrece otros, esto es defensa en profundidad ante un form manipulado).
    redirect('/hoteles');
  }

  redirect('/dashboard');
}
