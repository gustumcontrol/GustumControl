'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { MaintenanceStatus } from '@/lib/types';

export async function openMaintenanceIssue(
  roomId: string,
  description: string,
  photoUrls?: string[]
) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('open_maintenance_issue', {
    p_room_id: roomId,
    p_description: description,
    p_photo_urls: photoUrls ?? [],
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/mantenimiento');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function updateMaintenanceIssueStatus(
  issueId: string,
  status: Exclude<MaintenanceStatus, 'NO'>
) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('update_maintenance_issue_status', {
    p_issue_id: issueId,
    p_status: status,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/mantenimiento');
  revalidatePath('/mantenimiento/historial');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function editMaintenanceIssue(
  issueId: string,
  description?: string,
  newPhotoUrls?: string[]
) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('edit_maintenance_issue', {
    p_issue_id: issueId,
    p_description: description || null,
    p_new_photo_urls: newPhotoUrls ?? [],
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/mantenimiento');
  revalidatePath('/mantenimiento/historial');
  revalidatePath('/dashboard');
  return { success: true };
}
