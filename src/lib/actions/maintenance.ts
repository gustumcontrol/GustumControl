'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { MaintenanceStatus } from '@/lib/types';

export async function updateMaintenanceStatus(
  reservationId: string,
  status: MaintenanceStatus
) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('update_maintenance_status', {
    p_reservation_id: reservationId,
    p_status: status,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/mantenimiento');
  revalidatePath('/dashboard');
  return { success: true };
}
