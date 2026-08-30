-- El historial de reservas no guardaba el teléfono del huésped ni la fecha
-- en que se hizo la reserva (solo archived_at, el momento en que se cerró).
-- El teléfono se perdía para siempre al cerrar una reserva. Se agregan las
-- dos columnas y se actualiza close_reservation() para que las copie.
--
-- Backfill: para reservas ya cerradas cuya fila en `reservations` todavía
-- existe (no se borró al terminar la limpieza), se recupera el dato de ahí.
-- Para las que ya no tienen fila en `reservations`, el dato ya no existe en
-- ningún lado y queda en null — no hay forma de recuperarlo.

alter table reservation_history add column if not exists phone text;
alter table reservation_history add column if not exists created_at timestamptz;

update reservation_history rh
set
  phone = coalesce(rh.phone, r.phone),
  created_at = coalesce(rh.created_at, r.created_at)
from reservations r
where r.id = rh.original_reservation_id
  and (rh.phone is null or rh.created_at is null);

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
    payment_method, phone, notes, country, municipio, provincia, board_plan,
    source, hotel_id, created_at
  ) values (
    rec.id, room_number_v, room_floor_v, rec.guest_name, rec.guests_count,
    rec.check_in, rec.check_out, rec.nights, room_type_v, rec.price_per_night, rec.total,
    rec.payment_method, rec.phone, rec.notes, rec.country, rec.municipio, rec.provincia, rec.board_plan,
    rec.source, rec.hotel_id, rec.created_at
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
