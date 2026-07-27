-- cleaning_log es un log de auditoría de solo-inserción: no debe depender
-- de que la reserva original siga viva. reservation_id se conserva como
-- referencia informativa (para agrupar en la UI) pero sin FK.
alter table cleaning_log drop constraint cleaning_log_reservation_id_fkey;

-- notifications ya se autolimpia a las 8 horas, pero por si alguna queda
-- viva cuando se borre la reserva, que se ponga en null en vez de romper.
alter table notifications drop constraint notifications_reservation_id_fkey;
alter table notifications
  add constraint notifications_reservation_id_fkey
  foreign key (reservation_id) references reservations(id) on delete set null;

-- Una vez que una reserva CERRADA queda LIMPIADO, ya no hace falta en
-- `reservations` (el snapshot ya vive en reservation_history desde que se
-- cerró). Se borra ahí mismo para que la tabla operativa no acumule para
-- siempre filas muertas.
create or replace function update_cleaning_status(p_reservation_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  room_number_v text;
  reservation_status_v text;
begin
  if p_status not in ('PENDIENTE','EN PROCESO','LIMPIADO') then
    raise exception 'Estado de limpieza inválido: %', p_status;
  end if;

  if coalesce(public.current_user_role(), '') not in ('limpieza', 'admin') then
    raise exception 'No autorizado';
  end if;

  update reservations set cleaning_status = p_status where id = p_reservation_id;

  select r.number, res.status into room_number_v, reservation_status_v
  from reservations res join rooms r on r.id = res.room_id
  where res.id = p_reservation_id;

  insert into cleaning_log (reservation_id, room_number, status, changed_by)
  values (p_reservation_id, room_number_v, p_status, auth.uid());

  if p_status = 'LIMPIADO' and reservation_status_v = 'CERRADA' then
    delete from reservations where id = p_reservation_id;
  end if;
end;
$$;
