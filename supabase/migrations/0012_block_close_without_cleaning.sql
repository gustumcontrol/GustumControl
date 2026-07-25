-- No se puede cerrar una reserva si la habitación no quedó limpia primero
-- (cleaning_status debe ser LIMPIADO). Sin esto, recepción podía cerrar la
-- reserva mientras limpieza seguía PENDIENTE/EN PROCESO, y la tarea
-- desaparecía en silencio de /limpieza (que solo lista reservas ACTIVA).
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
  if public.current_user_role() not in ('recepcion', 'admin') then
    raise exception 'No autorizado';
  end if;

  select * into rec from reservations where id = p_reservation_id and status = 'ACTIVA';
  if not found then
    raise exception 'Reserva no encontrada o ya cerrada';
  end if;

  if rec.cleaning_status <> 'LIMPIADO' then
    raise exception 'No se puede cerrar: la habitación todavía no está limpia (estado: %)', rec.cleaning_status;
  end if;

  select number, floor, type into room_number_v, room_floor_v, room_type_v
  from rooms where id = rec.room_id;

  insert into reservation_history (
    original_reservation_id, room_number, floor, guest_name, guests_count,
    check_in, check_out, nights, room_type, price_per_night, total,
    payment_method, notes, country
  ) values (
    rec.id, room_number_v, room_floor_v, rec.guest_name, rec.guests_count,
    rec.check_in, rec.check_out, rec.nights, room_type_v, rec.price_per_night, rec.total,
    rec.payment_method, rec.notes, rec.country
  );

  update reservations
    set status = 'CERRADA', closed_at = now()
    where id = p_reservation_id;
end;
$$;
