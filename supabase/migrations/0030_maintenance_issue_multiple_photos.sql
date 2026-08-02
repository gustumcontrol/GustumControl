-- Permitir varias fotos por incidencia de mantenimiento en vez de una sola.
drop view room_status;

alter table maintenance_issues add column photo_urls text[] not null default '{}';

update maintenance_issues
set photo_urls = array[photo_url]
where photo_url is not null;

alter table maintenance_issues drop column photo_url;

-- create or replace no reemplaza la función vieja porque el tipo del
-- tercer parámetro cambió (text -> text[]); hay que borrarla a mano o
-- queda un overload duplicado y roto (sigue referenciando photo_url).
drop function if exists open_maintenance_issue(uuid, text, text);

create or replace function open_maintenance_issue(
  p_room_id uuid,
  p_description text,
  p_photo_urls text[] default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  room_number_v text;
begin
  if coalesce(current_user_role(), '') not in ('recepcion', 'mantenimiento', 'admin') then
    raise exception 'No autorizado';
  end if;

  insert into maintenance_issues (room_id, description, photo_urls, opened_by)
  values (p_room_id, p_description, coalesce(p_photo_urls, '{}'), auth.uid())
  returning id into v_id;

  select number into room_number_v from rooms where id = p_room_id;

  insert into notifications (recipient_role, type, message, room_number)
  values (
    'mantenimiento',
    'new_maintenance_task',
    'Nuevo mantenimiento pendiente: habitación ' || room_number_v,
    room_number_v
  );

  insert into activity_log (actor_id, action, entity_type, entity_id, description, metadata)
  values (
    auth.uid(),
    'maintenance_opened',
    'maintenance_issue',
    v_id,
    'Reportó una incidencia de mantenimiento: habitación ' || room_number_v || ' — ' || p_description,
    jsonb_build_object('room_number', room_number_v, 'description', p_description)
  );

  return v_id;
end;
$$;

create view room_status as
select
  r.id as room_id,
  r.number,
  r.floor,
  r.type,
  r.capacity,
  case
    when open_issue.id is not null then 'MANTENIMIENTO'
    when staff_assignment.id is not null then 'EMPLEADO'
    when current_res.id is not null then 'OCUPADA'
    when needs_cleaning_res.id is not null then 'PENDIENTE LIMPIEZA'
    when future_res.id is not null then 'RESERVADA'
    else 'LIBRE'
  end as computed_status,
  coalesce(current_res.id, needs_cleaning_res.id, future_res.id) as reservation_id,
  coalesce(current_res.guest_name, needs_cleaning_res.guest_name, future_res.guest_name) as guest_name,
  coalesce(current_res.check_in, needs_cleaning_res.check_in, future_res.check_in) as check_in,
  coalesce(current_res.check_out, needs_cleaning_res.check_out, future_res.check_out) as check_out,
  coalesce(current_res.cleaning_status, needs_cleaning_res.cleaning_status) as cleaning_status,
  open_issue.id as maintenance_issue_id,
  open_issue.description as maintenance_description,
  staff_assignment.id as staff_assignment_id,
  staff_assignment.staff_name as staff_name
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
  order by res.check_in
  limit 1
) future_res on true
left join lateral (
  select * from maintenance_issues mi
  where mi.room_id = r.id
    and mi.status <> 'REALIZADO'
  order by mi.opened_at desc
  limit 1
) open_issue on true
left join lateral (
  select * from room_staff_assignments sa
  where sa.room_id = r.id
    and sa.released_at is null
  order by sa.assigned_at desc
  limit 1
) staff_assignment on true
where r.active = true;
