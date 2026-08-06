'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getHotelContext } from '@/lib/hotel-context';
import type { Role, UserStatus } from '@/lib/types';

async function assertAdmin() {
  const { role, hotelId } = await getHotelContext();

  if (!role) {
    throw new Error('No autenticado');
  }
  if (role !== 'admin') {
    throw new Error('Solo un admin puede hacer esto');
  }
  if (!hotelId) {
    throw new Error('Elige un hotel primero.');
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // getHotelContext() ya confirmó que hay sesión de admin; user no debería
  // ser null acá, pero TypeScript no lo sabe.
  return { user: user!, hotelId };
}

// updateUserProfile/updateUserStatus/deleteUser usan supabaseAdmin (service
// role, bypasea RLS) para poder editar cuentas de auth.users además del
// perfil, así que tienen que validar a mano que el usuario objetivo sea del
// hotel que el admin tiene activo — si no, un admin viendo un hotel podría
// tocar cuentas de otro hotel sin que RLS lo detenga.
async function getTargetUserHotelId(userId: string) {
  const { data } = await supabaseAdmin.from('profiles').select('hotel_id').eq('id', userId).single();
  return data?.hotel_id ?? null;
}

export type CreateUserInput = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: Role;
  department?: string;
};

export async function adminCreateUser(input: CreateUserInput) {
  let caller;
  try {
    caller = await assertAdmin();
  } catch (e) {
    return { error: (e as Error).message };
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      full_name: `${input.firstName.trim()} ${input.lastName.trim()}`,
      role: input.role,
      department: input.department || null,
      hotel_id: caller.hotelId,
    },
  });

  if (error) {
    return { error: error.message };
  }

  // El trigger crea el perfil con el rol/departamento de los metadatos,
  // pero por si acaso llega antes de que el trigger corra, lo confirmamos.
  if (data.user) {
    await supabaseAdmin
      .from('profiles')
      .update({ role: input.role, department: input.department || null, hotel_id: caller.hotelId })
      .eq('id', data.user.id);
  }

  revalidatePath('/usuarios');
  return { success: true };
}

export type UpdateUserInput = {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  department?: string;
};

export async function updateUserProfile(input: UpdateUserInput) {
  let caller;
  try {
    caller = await assertAdmin();
  } catch (e) {
    return { error: (e as Error).message };
  }

  const targetHotel = await getTargetUserHotelId(input.userId);
  if (targetHotel !== caller.hotelId) {
    return { error: 'No autorizado.' };
  }

  const fullName = `${input.firstName.trim()} ${input.lastName.trim()}`;

  const { error: emailError } = await supabaseAdmin.auth.admin.updateUserById(input.userId, {
    email: input.email,
    email_confirm: true,
  });
  if (emailError) {
    return { error: emailError.message };
  }

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({
      full_name: fullName,
      email: input.email,
      role: input.role,
      department: input.department || null,
    })
    .eq('id', input.userId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/usuarios');
  return { success: true };
}

export async function updateUserStatus(userId: string, status: UserStatus) {
  let caller;
  try {
    caller = await assertAdmin();
  } catch (e) {
    return { error: (e as Error).message };
  }

  if (caller.user.id === userId && status !== 'active') {
    return { error: 'No puedes desactivar tu propia cuenta.' };
  }

  const targetHotel = await getTargetUserHotelId(userId);
  if (targetHotel !== caller.hotelId) {
    return { error: 'No autorizado.' };
  }

  const { error } = await supabaseAdmin.from('profiles').update({ status }).eq('id', userId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/usuarios');
  return { success: true };
}

export async function deleteUser(userId: string) {
  let caller;
  try {
    caller = await assertAdmin();
  } catch (e) {
    return { error: (e as Error).message };
  }

  if (caller.user.id === userId) {
    return { error: 'No puedes borrar tu propia cuenta.' };
  }

  const targetHotel = await getTargetUserHotelId(userId);
  if (targetHotel !== caller.hotelId) {
    return { error: 'No autorizado.' };
  }

  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

  if (error) {
    if (error.message.includes('foreign key') || error.code === 'unexpected_failure') {
      return {
        error:
          'No se puede borrar: este usuario tiene reservas creadas. Desactívalo en vez de borrarlo.',
      };
    }
    return { error: error.message };
  }

  revalidatePath('/usuarios');
  return { success: true };
}
