'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { Role, UserStatus } from '@/lib/types';

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

  return user;
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
  try {
    await assertAdmin();
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
      .update({ role: input.role, department: input.department || null })
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
  try {
    await assertAdmin();
  } catch (e) {
    return { error: (e as Error).message };
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

  if (caller.id === userId && status !== 'active') {
    return { error: 'No puedes desactivar tu propia cuenta.' };
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

  if (caller.id === userId) {
    return { error: 'No puedes borrar tu propia cuenta.' };
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
