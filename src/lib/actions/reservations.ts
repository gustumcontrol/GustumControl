'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type CreateReservationInput = {
  roomId: string;
  guestName: string;
  guestsCount: number;
  checkIn: string;
  nights: number;
  pricePerNight: number;
  paymentMethod?: string;
  phone?: string;
  country?: string;
  notes?: string;
};

export async function createReservation(input: CreateReservationInput) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'No autenticado' };
  }

  const { error } = await supabase.from('reservations').insert({
    room_id: input.roomId,
    guest_name: input.guestName,
    guests_count: input.guestsCount,
    check_in: input.checkIn,
    nights: input.nights,
    price_per_night: input.pricePerNight,
    payment_method: input.paymentMethod,
    phone: input.phone,
    country: input.country,
    notes: input.notes,
    created_by: user.id,
  });

  if (error) {
    if (error.code === '23P01') {
      return {
        error:
          'Esas fechas se solapan con otra reserva ya existente para esta habitación.',
      };
    }
    return { error: error.message };
  }

  revalidatePath('/dashboard');
  revalidatePath('/reservas');
  return { success: true };
}

export async function closeReservation(reservationId: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('close_reservation', {
    p_reservation_id: reservationId,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/dashboard');
  revalidatePath('/reservas');
  return { success: true };
}
