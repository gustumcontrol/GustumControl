'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { SupplyCategory } from '@/lib/types';

const PATH_BY_CATEGORY: Record<SupplyCategory, string> = {
  LIMPIEZA: '/limpieza',
  MANTENIMIENTO: '/mantenimiento',
};

function revalidateSupplyPaths(category: SupplyCategory) {
  const base = PATH_BY_CATEGORY[category];
  revalidatePath(base);
  revalidatePath(`${base}/pedidos`);
}

export async function addSupplyRequest(
  roomId: string,
  category: SupplyCategory,
  item: string,
  quantity: number,
  notes?: string
) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('add_supply_request', {
    p_room_id: roomId,
    p_category: category,
    p_item: item,
    p_quantity: quantity,
    p_notes: notes || null,
  });

  if (error) {
    return { error: error.message };
  }

  revalidateSupplyPaths(category);
  return { success: true };
}

export async function editSupplyRequest(
  id: string,
  category: SupplyCategory,
  item: string,
  quantity: number,
  notes: string | null
) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('edit_supply_request', {
    p_id: id,
    p_item: item,
    p_quantity: quantity,
    p_notes: notes,
  });

  if (error) {
    return { error: error.message };
  }

  revalidateSupplyPaths(category);
  return { success: true };
}

export async function markSupplyRequestPurchased(id: string, category: SupplyCategory) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('mark_supply_request_purchased', { p_id: id });

  if (error) {
    return { error: error.message };
  }

  revalidateSupplyPaths(category);
  return { success: true };
}

export async function deleteSupplyRequest(id: string, category: SupplyCategory) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('delete_supply_request', { p_id: id });

  if (error) {
    return { error: error.message };
  }

  revalidateSupplyPaths(category);
  return { success: true };
}
