-- close_reservation no validaba ningún permiso — cualquier usuario
-- autenticado (incluso limpieza/mantenimiento, incluso una cuenta
-- suspendida) podía cerrar cualquier reserva vía RPC, porque la función es
-- security definer y bypassa RLS. update_cleaning_status y
-- update_maintenance_status sí validaban rol pero no el estado de la
-- cuenta. Reescribo las tres para usar current_user_role(), que ya
-- devuelve NULL si la cuenta no está 'active'.

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

  select number, floor, type into room_number_v, room_floor_v, room_type_v
  from rooms where id = rec.room_id;

  insert into reservation_history (
    original_reservation_id, room_number, floor, guest_name, guests_count,
    check_in, check_out, nights, room_type, price_per_night, total,
    payment_method, notes
  ) values (
    rec.id, room_number_v, room_floor_v, rec.guest_name, rec.guests_count,
    rec.check_in, rec.check_out, rec.nights, room_type_v, rec.price_per_night, rec.total,
    rec.payment_method, rec.notes
  );

  update reservations
    set status = 'CERRADA', closed_at = now()
    where id = p_reservation_id;
end;
$$;

create or replace function update_cleaning_status(p_reservation_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_status not in ('PENDIENTE','EN PROCESO','LIMPIADO') then
    raise exception 'Estado de limpieza inválido: %', p_status;
  end if;

  if public.current_user_role() not in ('limpieza', 'admin') then
    raise exception 'No autorizado';
  end if;

  update reservations set cleaning_status = p_status where id = p_reservation_id;
end;
$$;

create or replace function update_maintenance_status(p_reservation_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_status not in ('NO','PENDIENTE','EN PROCESO','REALIZADO') then
    raise exception 'Estado de mantenimiento inválido: %', p_status;
  end if;

  if public.current_user_role() not in ('mantenimiento', 'admin') then
    raise exception 'No autorizado';
  end if;

  update reservations set maintenance_status = p_status where id = p_reservation_id;
end;
$$;
