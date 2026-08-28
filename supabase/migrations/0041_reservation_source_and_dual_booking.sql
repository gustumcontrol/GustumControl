-- ── Origen de la reserva (Directo / Booking.com) ────────────────────────
alter table reservations
  add column source text not null default 'DIRECTO'
    check (source in ('DIRECTO', 'BOOKING'));

alter table reservation_history
  add column source text not null default 'DIRECTO'
    check (source in ('DIRECTO', 'BOOKING'));

-- ── close_reservation: arrastra el origen al historial ──────────────────
create or replace function close_reservation(p_reservation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  rec reservations%rowtype;
  room_number_v text;
  room_floor_v text;
  room_type_v text;
begin
  if auth.uid() is not null
     and coalesce(public.current_user_role(), '') not in ('recepcion', 'admin') then
    raise exception 'No autorizado';
  end if;

  select * into rec from reservations where id = p_reservation_id and status = 'ACTIVA';
  if not found then
    raise exception 'Reserva no encontrada o ya cerrada';
  end if;

  if auth.uid() is not null
     and public.current_user_role() <> 'admin'
     and rec.hotel_id <> public.current_user_hotel_id() then
    raise exception 'No autorizado';
  end if;

  select number, floor, type into room_number_v, room_floor_v, room_type_v
  from rooms where id = rec.room_id;

  insert into reservation_history (
    original_reservation_id, room_number, floor, guest_name, guests_count,
    check_in, check_out, nights, room_type, price_per_night, total,
    payment_method, notes, country, municipio, provincia, board_plan, source, hotel_id
  ) values (
    rec.id, room_number_v, room_floor_v, rec.guest_name, rec.guests_count,
    rec.check_in, rec.check_out, rec.nights, room_type_v, rec.price_per_night, rec.total,
    rec.payment_method, rec.notes, rec.country, rec.municipio, rec.provincia, rec.board_plan,
    rec.source, rec.hotel_id
  );

  update reservations
    set status = 'CERRADA',
        closed_at = now(),
        cleaning_status = case when cleaning_status = 'NO' then 'PENDIENTE' else cleaning_status end
    where id = p_reservation_id;

  insert into activity_log (actor_id, action, entity_type, entity_id, description, metadata, hotel_id)
  values (
    auth.uid(), 'reservation_closed', 'reservation', p_reservation_id,
    'Cerró la reserva de ' || rec.guest_name || ' en la habitación ' || coalesce(room_number_v, '?'),
    jsonb_build_object('room_number', room_number_v, 'guest_name', rec.guest_name),
    rec.hotel_id
  );
end;
$$;

-- ── create_dual_reservation: dos habitaciones, un solo huésped, atómico ─
-- Para cuando una sola persona reserva para dos parejas: crea las dos
-- reservas dentro de la misma función (una sola transacción implícita),
-- así si una habitación ya no está libre (choque de fechas), ninguna de
-- las dos se crea — nunca queda una reservada y la otra no.
create or replace function create_dual_reservation(
  p_room_id_1 uuid,
  p_room_id_2 uuid,
  p_guest_name text,
  p_guests_count integer,
  p_check_in date,
  p_nights integer,
  p_price_per_night_1 numeric,
  p_price_per_night_2 numeric,
  p_board_plan text default null,
  p_payment_method text default null,
  p_phone text default null,
  p_country text default null,
  p_municipio text default null,
  p_provincia text default null,
  p_notes text default null,
  p_source text default 'DIRECTO'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  hotel_id_1 uuid;
  hotel_id_2 uuid;
  room_number_1 text;
  room_number_2 text;
  v_id_1 uuid;
  v_id_2 uuid;
begin
  if coalesce(current_user_role(), '') not in ('recepcion', 'admin') then
    raise exception 'No autorizado';
  end if;

  if p_room_id_1 = p_room_id_2 then
    raise exception 'Selecciona dos habitaciones distintas';
  end if;

  if p_source not in ('DIRECTO', 'BOOKING') then
    raise exception 'Origen inválido: %', p_source;
  end if;

  select hotel_id, number into hotel_id_1, room_number_1 from rooms where id = p_room_id_1;
  select hotel_id, number into hotel_id_2, room_number_2 from rooms where id = p_room_id_2;

  if hotel_id_1 is null or hotel_id_2 is null then
    raise exception 'Habitación inválida';
  end if;
  if hotel_id_1 <> hotel_id_2 then
    raise exception 'Las dos habitaciones deben ser del mismo hotel';
  end if;
  if current_user_role() <> 'admin' and hotel_id_1 <> current_user_hotel_id() then
    raise exception 'No autorizado';
  end if;

  insert into reservations (
    room_id, guest_name, guests_count, check_in, nights, price_per_night,
    board_plan, payment_method, phone, country, municipio, provincia, notes,
    source, created_by
  ) values (
    p_room_id_1, p_guest_name, p_guests_count, p_check_in, p_nights, p_price_per_night_1,
    p_board_plan, p_payment_method, p_phone, p_country, p_municipio, p_provincia, p_notes,
    p_source, auth.uid()
  ) returning id into v_id_1;

  insert into reservations (
    room_id, guest_name, guests_count, check_in, nights, price_per_night,
    board_plan, payment_method, phone, country, municipio, provincia, notes,
    source, created_by
  ) values (
    p_room_id_2, p_guest_name, p_guests_count, p_check_in, p_nights, p_price_per_night_2,
    p_board_plan, p_payment_method, p_phone, p_country, p_municipio, p_provincia, p_notes,
    p_source, auth.uid()
  ) returning id into v_id_2;

  insert into activity_log (actor_id, action, entity_type, entity_id, description, metadata, hotel_id)
  values (
    auth.uid(), 'reservation_created', 'reservation', v_id_1,
    'Creó una reserva doble para ' || p_guest_name || ' en las habitaciones ' ||
      coalesce(room_number_1, '?') || ' y ' || coalesce(room_number_2, '?'),
    jsonb_build_object('room_number', room_number_1, 'paired_room_number', room_number_2, 'guest_name', p_guest_name),
    hotel_id_1
  );
  insert into activity_log (actor_id, action, entity_type, entity_id, description, metadata, hotel_id)
  values (
    auth.uid(), 'reservation_created', 'reservation', v_id_2,
    'Creó una reserva doble para ' || p_guest_name || ' en las habitaciones ' ||
      coalesce(room_number_2, '?') || ' y ' || coalesce(room_number_1, '?'),
    jsonb_build_object('room_number', room_number_2, 'paired_room_number', room_number_1, 'guest_name', p_guest_name),
    hotel_id_2
  );
end;
$$;
