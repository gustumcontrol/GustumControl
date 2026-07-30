'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function assignRoomToStaff(roomId: string, staffName: string, notes?: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('assign_room_to_staff', {
    p_room_id: roomId,
    p_staff_name: staffName,
    p_notes: notes || null,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/dashboard');
  return { success: true };
}

export async function releaseStaffRoom(assignmentId: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('release_staff_room', {
    p_assignment_id: assignmentId,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/dashboard');
  return { success: true };
}
