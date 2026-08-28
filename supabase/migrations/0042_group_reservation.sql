-- ── create_group_reservation: N habitaciones, un solo huésped, atómico ──
-- Reemplaza a create_dual_reservation (fija en 2) por una versión que
-- acepta cualquier cantidad de habitaciones (2 o más) para cuando llega
-- un grupo (varias parejas, una familia grande, etc.) y una sola persona
-- reserva todo a la vez. Todas las filas se insertan dentro de la misma
-- función (una sola transacción implícita): si alguna habitación ya no
-- está libre, no se crea ninguna reserva del grupo.
drop function if exists create_dual_reservation(
  uuid, uuid, text, integer, date, integer, numeric, numeric,
  text, text, text, text, text, text, text, text
);

create or replace function create_group_reservation(
  p_rooms jsonb, -- [{"room_id": "...", "price_per_night": 123}, ...]
  p_guest_name text,
  p_guests_count integer,
  p_check_in date,
  p_nights integer,
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
  room_item jsonb;
  v_room_id uuid;
  v_price numeric;
  v_hotel_id uuid;
  group_hotel_id uuid;
  room_number_v text;
  v_id uuid;
  room_numbers text[] := array[]::text[];
  room_count integer;
begin
  if coalesce(current_user_role(), '') not in ('recepcion', 'admin') then
    raise exception 'No autorizado';
  end if;

  room_count := jsonb_array_length(p_rooms);
  if room_count < 2 then
    raise exception 'Selecciona al menos dos habitaciones';
  end if;

  if (
    select count(distinct value ->> 'room_id') from jsonb_array_elements(p_rooms)
  ) <> room_count then
    raise exception 'Selecciona habitaciones distintas';
  end if;

  if p_source not in ('DIRECTO', 'BOOKING') then
    raise exception 'Origen inválido: %', p_source;
  end if;

  -- primera pasada: valida todas las habitaciones antes de crear nada
  for room_item in select * from jsonb_array_elements(p_rooms)
  loop
    v_room_id := (room_item ->> 'room_id')::uuid;
    select hotel_id, number into v_hotel_id, room_number_v from rooms where id = v_room_id;
    if v_hotel_id is null then
      raise exception 'Habitación inválida';
    end if;
    if group_hotel_id is null then
      group_hotel_id := v_hotel_id;
    elsif v_hotel_id <> group_hotel_id then
      raise exception 'Todas las habitaciones deben ser del mismo hotel';
    end if;
    room_numbers := array_append(room_numbers, room_number_v);
  end loop;

  if current_user_role() <> 'admin' and group_hotel_id <> current_user_hotel_id() then
    raise exception 'No autorizado';
  end if;

  -- segunda pasada: crea las reservas
  for room_item in select * from jsonb_array_elements(p_rooms)
  loop
    v_room_id := (room_item ->> 'room_id')::uuid;
    v_price := (room_item ->> 'price_per_night')::numeric;

    insert into reservations (
      room_id, guest_name, guests_count, check_in, nights, price_per_night,
      board_plan, payment_method, phone, country, municipio, provincia, notes,
      source, created_by
    ) values (
      v_room_id, p_guest_name, p_guests_count, p_check_in, p_nights, v_price,
      p_board_plan, p_payment_method, p_phone, p_country, p_municipio, p_provincia, p_notes,
      p_source, auth.uid()
    ) returning id into v_id;

    insert into activity_log (actor_id, action, entity_type, entity_id, description, metadata, hotel_id)
    values (
      auth.uid(), 'reservation_created', 'reservation', v_id,
      'Creó una reserva grupal para ' || p_guest_name || ' en las habitaciones ' ||
        array_to_string(room_numbers, ', '),
      jsonb_build_object('room_numbers', room_numbers, 'guest_name', p_guest_name),
      group_hotel_id
    );
  end loop;
end;
$$;
