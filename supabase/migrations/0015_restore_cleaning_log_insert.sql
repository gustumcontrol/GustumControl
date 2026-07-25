-- La migración 0014 reescribió update_cleaning_status para corregir el
-- chequeo de rol, pero por error se perdió la lógica de la 0008 que
-- insertaba en cleaning_log en cada cambio de estado. Restaurada.
create or replace function update_cleaning_status(p_reservation_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  room_number_v text;
begin
  if p_status not in ('PENDIENTE','EN PROCESO','LIMPIADO') then
    raise exception 'Estado de limpieza inválido: %', p_status;
  end if;

  if coalesce(public.current_user_role(), '') not in ('limpieza', 'admin') then
    raise exception 'No autorizado';
  end if;

  update reservations set cleaning_status = p_status where id = p_reservation_id;

  select r.number into room_number_v
  from reservations res join rooms r on r.id = res.room_id
  where res.id = p_reservation_id;

  insert into cleaning_log (reservation_id, room_number, status, changed_by)
  values (p_reservation_id, room_number_v, p_status, auth.uid());
end;
$$;
