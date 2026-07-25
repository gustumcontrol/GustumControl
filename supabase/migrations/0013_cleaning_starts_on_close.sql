-- Antes: cleaning_status nacía en 'PENDIENTE' con la reserva recién creada
-- (huésped todavía adentro) — /limpieza mostraba "empezar a limpiar" sin que
-- el huésped se hubiera ido. Ahora nace en 'NO' (nada que limpiar todavía) y
-- pasa a 'PENDIENTE' recién cuando la reserva se cierra (checkout), sea
-- manual o automático.
alter table reservations drop constraint reservations_cleaning_status_check;
alter table reservations add constraint reservations_cleaning_status_check
  check (cleaning_status in ('NO', 'PENDIENTE', 'EN PROCESO', 'LIMPIADO'));
alter table reservations alter column cleaning_status set default 'NO';

-- close_reservation: ya no exige que esté limpio para cerrar (eso era al
-- revés) — al cerrar (checkout) es cuando la limpieza pasa a ser necesaria.
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
  if public.current_user_role() is not null
     and public.current_user_role() not in ('recepcion', 'admin') then
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
    payment_method, notes, country
  ) values (
    rec.id, room_number_v, room_floor_v, rec.guest_name, rec.guests_count,
    rec.check_in, rec.check_out, rec.nights, room_type_v, rec.price_per_night, rec.total,
    rec.payment_method, rec.notes, rec.country
  );

  update reservations
    set status = 'CERRADA',
        closed_at = now(),
        cleaning_status = case when cleaning_status = 'NO' then 'PENDIENTE' else cleaning_status end
    where id = p_reservation_id;
end;
$$;

-- Cierre automático: todos los días revisa reservas ACTIVA cuya fecha de
-- salida ya pasó, y las cierra (lo que dispara cleaning_status -> PENDIENTE
-- vía close_reservation, igual que un cierre manual).
create or replace function public.auto_close_finished_reservations()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
begin
  for rec in
    select id from reservations
    where status = 'ACTIVA' and check_out <= current_date
  loop
    perform public.close_reservation(rec.id);
  end loop;
end;
$$;

select cron.schedule(
  'auto-close-reservations',
  '0 11 * * *',
  $$select public.auto_close_finished_reservations();$$
);

-- La notificación a limpieza ahora se dispara cuando cleaning_status pasa a
-- PENDIENTE (o sea, al cerrar), no al crear la reserva.
drop trigger if exists on_reservation_created_notify_cleaning on reservations;
drop function if exists public.notify_new_cleaning_task();

create or replace function public.notify_room_needs_cleaning()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  room_number_v text;
begin
  if new.cleaning_status = 'PENDIENTE' and (old.cleaning_status is distinct from new.cleaning_status) then
    select number into room_number_v from rooms where id = new.room_id;
    insert into notifications (recipient_role, type, message, room_number, reservation_id)
    values (
      'limpieza',
      'new_cleaning_task',
      'Nueva limpieza pendiente: habitación ' || room_number_v,
      room_number_v,
      new.id
    );
  end if;
  return new;
end;
$$;

create trigger on_reservation_needs_cleaning
  after update on reservations
  for each row execute function public.notify_room_needs_cleaning();

-- room_status: la "última reserva sin limpiar" ya no requiere status='ACTIVA'
-- (una reserva recién cerrada sigue CERRADA pero puede seguir sucia).
drop view room_status;

create view room_status as
select
  r.id as room_id,
  r.number,
  r.floor,
  r.type,
  r.capacity,
  case
    when coalesce(current_res.maintenance_status, needs_cleaning_res.maintenance_status) is not null
         and coalesce(current_res.maintenance_status, needs_cleaning_res.maintenance_status) <> 'NO'
      then 'MANTENIMIENTO'
    when current_res.id is not null
      then 'OCUPADA'
    when needs_cleaning_res.id is not null
      then 'PENDIENTE LIMPIEZA'
    when future_res.id is not null
      then 'RESERVADA'
    else 'LIBRE'
  end as computed_status,
  coalesce(current_res.id, needs_cleaning_res.id, future_res.id) as reservation_id,
  coalesce(current_res.guest_name, needs_cleaning_res.guest_name, future_res.guest_name) as guest_name,
  coalesce(current_res.check_in, needs_cleaning_res.check_in, future_res.check_in) as check_in,
  coalesce(current_res.check_out, needs_cleaning_res.check_out, future_res.check_out) as check_out,
  coalesce(current_res.cleaning_status, needs_cleaning_res.cleaning_status) as cleaning_status,
  coalesce(current_res.maintenance_status, needs_cleaning_res.maintenance_status) as maintenance_status
from rooms r
left join lateral (
  select * from reservations res
  where res.room_id = r.id
    and res.status = 'ACTIVA'
    and res.check_in <= current_date
    and res.check_out >= current_date
  limit 1
) current_res on true
left join lateral (
  select * from reservations res
  where res.room_id = r.id
    and res.cleaning_status in ('PENDIENTE', 'EN PROCESO')
    and (res.status = 'CERRADA' or res.check_out < current_date)
  order by res.check_out desc
  limit 1
) needs_cleaning_res on true
left join lateral (
  select * from reservations res
  where res.room_id = r.id
    and res.status = 'ACTIVA'
    and res.check_in > current_date
  order by res.check_in asc
  limit 1
) future_res on true
where r.active = true;
