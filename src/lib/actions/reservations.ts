'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { todayISOInHotelTimezone } from '@/lib/date';
import type { ReservationSource } from '@/lib/types';

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
  notes: 'notas',
  room_number: 'habitación',
  source: 'origen',
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
  source?: ReservationSource;
};

export async function createReservation(input: CreateReservationInput) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'No autenticado' };
  }

  const todayISO = todayISOInHotelTimezone();
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
      source: input.source || 'DIRECTO',
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
  roomId?: string;
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
  source?: ReservationSource;
};

export async function updateReservation(reservationId: string, input: UpdateReservationInput) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: before } = await supabase
    .from('reservations')
    .select(
      'room_id, guest_name, guests_count, check_in, nights, price_per_night, board_plan, payment_method, phone, country, municipio, provincia, notes, source, rooms(number)'
    )
    .eq('id', reservationId)
    .single();

  const roomChanged = !!input.roomId && before && input.roomId !== before.room_id;
  let newRoomNumber: string | null = null;
  if (roomChanged) {
    const { data: newRoom } = await supabase
      .from('rooms')
      .select('number')
      .eq('id', input.roomId!)
      .single();
    newRoomNumber = newRoom?.number ?? null;
  }

  const { error } = await supabase
    .from('reservations')
    .update({
      ...(input.roomId ? { room_id: input.roomId } : {}),
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
      notes: input.notes?.trim() || null,
      ...(input.source ? { source: input.source } : {}),
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
      roomChanged ? describeChange('room_number', room?.number, newRoomNumber) : null,
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
      describeChange('notes', before.notes, input.notes),
      input.source ? describeChange('source', before.source, input.source) : null,
    ].filter((c): c is string => c !== null);

    if (changes.length > 0) {
      await supabase.from('activity_log').insert({
        actor_id: user.id,
        action: 'reservation_updated',
        entity_type: 'reservation',
        entity_id: reservationId,
        description: `Editó la reserva de ${before.guest_name} en la habitación ${room?.number ?? '?'}: ${changes.join('; ')}`,
        metadata: { room_number: newRoomNumber ?? room?.number ?? null, changes },
      });
    }
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

export type CreateGroupReservationInput = {
  rooms: { roomId: string; pricePerNight: number }[];
  guestName: string;
  guestsCount: number;
  checkIn: string;
  nights: number;
  boardPlan?: string;
  paymentMethod?: string;
  phone?: string;
  country?: string;
  municipio?: string;
  provincia?: string;
  notes?: string;
  source?: ReservationSource;
};

export async function createGroupReservation(input: CreateGroupReservationInput) {
  const supabase = await createSupabaseServerClient();

  const todayISO = todayISOInHotelTimezone();
  if (input.checkIn < todayISO) {
    return { error: 'La fecha de entrada no puede ser anterior a hoy.' };
  }
  if (input.rooms.length < 2) {
    return { error: 'Selecciona al menos dos habitaciones.' };
  }

  const { error } = await supabase.rpc('create_group_reservation', {
    p_rooms: input.rooms.map((r) => ({ room_id: r.roomId, price_per_night: r.pricePerNight })),
    p_guest_name: input.guestName,
    p_guests_count: input.guestsCount,
    p_check_in: input.checkIn,
    p_nights: input.nights,
    p_board_plan: input.boardPlan || null,
    p_payment_method: input.paymentMethod || null,
    p_phone: input.phone || null,
    p_country: input.country || null,
    p_municipio: input.municipio || null,
    p_provincia: input.provincia || null,
    p_notes: input.notes || null,
    p_source: input.source || 'DIRECTO',
  });

  if (error) {
    if (error.code === '23P01') {
      return {
        error: 'Alguna de esas fechas se solapa con otra reserva ya existente para esa habitación.',
      };
    }
    return { error: error.message };
  }

  revalidatePath('/dashboard');
  revalidatePath('/reservas');
  revalidatePath('/booking');
  return { success: true };
}
