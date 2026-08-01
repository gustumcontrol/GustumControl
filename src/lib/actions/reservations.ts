'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const FIELD_LABELS: Record<string, string> = {
  guest_name: 'nombre',
  guests_count: 'cantidad de personas',
  check_in: 'fecha de entrada',
  nights: 'noches',
  price_per_night: 'precio por noche',
  board_plan: 'régimen',
  payment_method: 'método de pago',
  phone: 'teléfono',
  country: 'país',
  municipio: 'municipio',
  provincia: 'provincia',
};

function describeChange(field: string, oldValue: unknown, newValue: unknown): string | null {
  const oldNorm = oldValue === undefined || oldValue === '' ? null : oldValue;
  const newNorm = newValue === undefined || newValue === '' ? null : newValue;
  if (String(oldNorm ?? '') === String(newNorm ?? '')) return null;
  const label = FIELD_LABELS[field] ?? field;
  const oldText = oldNorm === null ? 'vacío' : String(oldNorm);
  const newText = newNorm === null ? 'vacío' : String(newNorm);
  return `${label}: "${oldText}" → "${newText}"`;
}

export type CreateReservationInput = {
  roomId: string;
  guestName: string;
  guestsCount: number;
  checkIn: string;
  nights: number;
  pricePerNight: number;
  boardPlan?: string;
  paymentMethod?: string;
  phone?: string;
  country?: string;
  municipio?: string;
  provincia?: string;
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

  const todayISO = new Date().toISOString().slice(0, 10);
  if (input.checkIn < todayISO) {
    return { error: 'La fecha de entrada no puede ser anterior a hoy.' };
  }

  const { data: inserted, error } = await supabase
    .from('reservations')
    .insert({
      room_id: input.roomId,
      guest_name: input.guestName,
      guests_count: input.guestsCount,
      check_in: input.checkIn,
      nights: input.nights,
      price_per_night: input.pricePerNight,
      board_plan: input.boardPlan || null,
      payment_method: input.paymentMethod,
      phone: input.phone,
      country: input.country,
      municipio: input.municipio,
      provincia: input.provincia,
      notes: input.notes,
      created_by: user.id,
    })
    .select('id, rooms(number)')
    .single();

  if (error) {
    if (error.code === '23P01') {
      return {
        error:
          'Esas fechas se solapan con otra reserva ya existente para esta habitación.',
      };
    }
    return { error: error.message };
  }

  const room = Array.isArray(inserted?.rooms) ? inserted.rooms[0] : inserted?.rooms;
  await supabase.from('activity_log').insert({
    actor_id: user.id,
    action: 'reservation_created',
    entity_type: 'reservation',
    entity_id: inserted?.id,
    description: `Creó una reserva para ${input.guestName} en la habitación ${room?.number ?? '?'} (${input.nights} noche${input.nights === 1 ? '' : 's'} desde ${input.checkIn})`,
    metadata: {
      room_number: room?.number ?? null,
      guest_name: input.guestName,
      check_in: input.checkIn,
      nights: input.nights,
      price_per_night: input.pricePerNight,
    },
  });

  revalidatePath('/dashboard');
  revalidatePath('/reservas');
  return { success: true };
}

export type UpdateReservationInput = {
  guestName: string;
  guestsCount: number;
  checkIn: string;
  nights: number;
  pricePerNight: number;
  boardPlan?: string;
  paymentMethod?: string;
  phone?: string;
  country?: string;
  municipio?: string;
  provincia?: string;
};

export async function updateReservation(reservationId: string, input: UpdateReservationInput) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: before } = await supabase
    .from('reservations')
    .select(
      'guest_name, guests_count, check_in, nights, price_per_night, board_plan, payment_method, phone, country, municipio, provincia, rooms(number)'
    )
    .eq('id', reservationId)
    .single();

  const { error } = await supabase
    .from('reservations')
    .update({
      guest_name: input.guestName,
      guests_count: input.guestsCount,
      check_in: input.checkIn,
      nights: input.nights,
      price_per_night: input.pricePerNight,
      board_plan: input.boardPlan || null,
      payment_method: input.paymentMethod,
      phone: input.phone,
      country: input.country,
      municipio: input.municipio,
      provincia: input.provincia,
    })
    .eq('id', reservationId);

  if (error) {
    if (error.code === '23P01') {
      return {
        error:
          'Esas fechas se solapan con otra reserva ya existente para esta habitación.',
      };
    }
    return { error: error.message };
  }

  if (user && before) {
    const room = Array.isArray(before.rooms) ? before.rooms[0] : before.rooms;
    const changes = [
      describeChange('guest_name', before.guest_name, input.guestName),
      describeChange('guests_count', before.guests_count, input.guestsCount),
      describeChange('check_in', before.check_in, input.checkIn),
      describeChange('nights', before.nights, input.nights),
      describeChange('price_per_night', before.price_per_night, input.pricePerNight),
      describeChange('board_plan', before.board_plan, input.boardPlan),
      describeChange('payment_method', before.payment_method, input.paymentMethod),
      describeChange('phone', before.phone, input.phone),
      describeChange('country', before.country, input.country),
      describeChange('municipio', before.municipio, input.municipio),
      describeChange('provincia', before.provincia, input.provincia),
    ].filter((c): c is string => c !== null);

    if (changes.length > 0) {
      await supabase.from('activity_log').insert({
        actor_id: user.id,
        action: 'reservation_updated',
        entity_type: 'reservation',
        entity_id: reservationId,
        description: `Editó la reserva de ${before.guest_name} en la habitación ${room?.number ?? '?'}: ${changes.join('; ')}`,
        metadata: { room_number: room?.number ?? null, changes },
      });
    }
  }

  revalidatePath('/dashboard');
  revalidatePath('/reservas');
  return { success: true };
}

export async function updateReservationNotes(reservationId: string, notes: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: before } = await supabase
    .from('reservations')
    .select('guest_name, rooms(number)')
    .eq('id', reservationId)
    .single();

  const { error } = await supabase
    .from('reservations')
    .update({ notes: notes.trim() || null })
    .eq('id', reservationId);

  if (error) {
    return { error: error.message };
  }

  if (user && before) {
    const room = Array.isArray(before.rooms) ? before.rooms[0] : before.rooms;
    await supabase.from('activity_log').insert({
      actor_id: user.id,
      action: 'reservation_note_updated',
      entity_type: 'reservation',
      entity_id: reservationId,
      description: `Actualizó las notas de la reserva de ${before.guest_name} en la habitación ${room?.number ?? '?'}`,
      metadata: { room_number: room?.number ?? null },
    });
  }

  revalidatePath('/dashboard');
  revalidatePath('/reservas');
  return { success: true };
}

export async function updateReservationHistoryTicket(historyId: string, ticket: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('reservation_history')
    .update({ ticket: ticket.trim() || null })
    .eq('id', historyId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/historial');
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
