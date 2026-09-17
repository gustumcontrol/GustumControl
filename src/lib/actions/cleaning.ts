'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { CleaningStatus } from '@/lib/types';

export async function updateCleaningStatus(reservationId: string, status: CleaningStatus) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('update_cleaning_status', {
    p_reservation_id: reservationId,
    p_status: status,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/limpieza');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function markRoomForCleaning(roomId: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('mark_room_for_cleaning', { p_room_id: roomId });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/limpieza');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function updateRoomCleaningStatus(roomId: string, status: CleaningStatus) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('update_room_cleaning_status', {
    p_room_id: roomId,
    p_status: status,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/limpieza');
  revalidatePath('/dashboard');
  return { success: true };
}
