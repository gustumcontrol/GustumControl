-- Hasta ahora la única forma de mandar una habitación a limpieza era crear
-- una reserva y cerrarla (cleaning_status vive solo en `reservations`). Esto
-- agrega un estado de limpieza a nivel de habitación, independiente de que
-- haya o no una reserva de por medio, para poder marcar "mandar a limpieza"
-- directo desde el panel de habitaciones sin inventar una reserva falsa.

alter table rooms
  add column cleaning_status text not null default 'NO'
    check (cleaning_status in ('NO', 'PENDIENTE', 'EN PROCESO'));

-- cleaning_log es el log de auditoría compartido por ambos caminos (el de
-- reserva, ya existente, y el nuevo de habitación); cada fila referencia
-- exactamente uno de los dos.
alter table cleaning_log alter column reservation_id drop not null;
alter table cleaning_log add column room_id uuid references rooms(id);
alter table cleaning_log add constraint cleaning_log_one_source
  check ((reservation_id is not null) <> (room_id is not null));

-- ── room_status: mezclar el estado de limpieza de la reserva (si la hay)
-- con el de la habitación (si no la hay) ────────────────────────────────
drop view room_status;

create view room_status as
select
  r.id as room_id,
  r.hotel_id,
  r.number,
  r.floor,
  r.type,
  r.capacity,
  case
    when open_issue.id is not null then 'MANTENIMIENTO'
    when staff_assignment.id is not null then 'EMPLEADO'
    when current_res.id is not null then 'OCUPADA'
    when needs_cleaning_res.id is not null or r.cleaning_status <> 'NO' then 'PENDIENTE LIMPIEZA'
    when future_res.id is not null then 'RESERVADA'
    else 'LIBRE'
  end as computed_status,
  coalesce(current_res.id, needs_cleaning_res.id, future_res.id) as reservation_id,
  coalesce(current_res.guest_name, needs_cleaning_res.guest_name, future_res.guest_name) as guest_name,
  coalesce(current_res.check_in, needs_cleaning_res.check_in, future_res.check_in) as check_in,
  coalesce(current_res.check_out, needs_cleaning_res.check_out, future_res.check_out) as check_out,
  coalesce(current_res.cleaning_status, needs_cleaning_res.cleaning_status, nullif(r.cleaning_status, 'NO')) as cleaning_status,
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

alter view room_status set (security_invoker = true);

-- ── RPCs ──────────────────────────────────────────────────────────────
create or replace function mark_room_for_cleaning(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  room_number_v text;
  hotel_id_v uuid;
begin
  if coalesce(current_user_role(), '') not in ('recepcion', 'admin') then
    raise exception 'No autorizado';
  end if;

  select hotel_id, number into hotel_id_v, room_number_v from rooms where id = p_room_id;
  if hotel_id_v is null then
    raise exception 'Habitación no encontrada';
  end if;
  if public.current_user_role() <> 'admin' and hotel_id_v <> public.current_user_hotel_id() then
    raise exception 'No autorizado';
  end if;

  if exists (
    select 1 from reservations res
    where res.room_id = p_room_id and res.status = 'ACTIVA'
      and res.check_in <= current_date and res.check_out >= current_date
  ) then
    raise exception 'La habitación está ocupada';
  end if;

  if exists (
    select 1 from maintenance_issues mi where mi.room_id = p_room_id and mi.status <> 'REALIZADO'
  ) then
    raise exception 'La habitación está en mantenimiento';
  end if;

  if exists (
    select 1 from room_staff_assignments sa where sa.room_id = p_room_id and sa.released_at is null
  ) then
    raise exception 'La habitación está asignada a un empleado';
  end if;

  update rooms set cleaning_status = 'PENDIENTE' where id = p_room_id and cleaning_status = 'NO';
  if not found then
    raise exception 'La habitación ya está marcada para limpieza';
  end if;

  insert into cleaning_log (room_id, room_number, status, changed_by, hotel_id)
  values (p_room_id, room_number_v, 'PENDIENTE', auth.uid(), hotel_id_v);

  insert into notifications (recipient_role, type, message, room_number, hotel_id)
  values (
    'limpieza', 'new_cleaning_task',
    'Nueva limpieza pendiente: habitación ' || room_number_v,
    room_number_v, hotel_id_v
  );

  insert into activity_log (actor_id, action, entity_type, entity_id, description, metadata, hotel_id)
  values (
    auth.uid(), 'cleaning_pending', 'room', p_room_id,
    'Mandó a limpieza la habitación ' || coalesce(room_number_v, '?'),
    jsonb_build_object('room_number', room_number_v),
    hotel_id_v
  );
end;
$$;

create or replace function update_room_cleaning_status(p_room_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  room_number_v text;
  hotel_id_v uuid;
begin
  if p_status not in ('PENDIENTE', 'EN PROCESO', 'LIMPIADO') then
    raise exception 'Estado de limpieza inválido: %', p_status;
  end if;

  if coalesce(current_user_role(), '') not in ('limpieza', 'admin') then
    raise exception 'No autorizado';
  end if;

  select hotel_id, number into hotel_id_v, room_number_v from rooms where id = p_room_id;
  if hotel_id_v is null then
    raise exception 'Habitación no encontrada';
  end if;
  if public.current_user_role() <> 'admin' and hotel_id_v <> public.current_user_hotel_id() then
    raise exception 'No autorizado';
  end if;

  update rooms
  set cleaning_status = case when p_status = 'LIMPIADO' then 'NO' else p_status end
  where id = p_room_id;

  insert into cleaning_log (room_id, room_number, status, changed_by, hotel_id)
  values (p_room_id, room_number_v, p_status, auth.uid(), hotel_id_v);

  insert into activity_log (actor_id, action, entity_type, entity_id, description, metadata, hotel_id)
  values (
    auth.uid(),
    case p_status
      when 'EN PROCESO' then 'cleaning_started'
      when 'LIMPIADO' then 'cleaning_finished'
      else 'cleaning_pending'
    end,
    'room', p_room_id,
    case p_status
      when 'EN PROCESO' then 'Comenzó a limpiar la habitación ' || coalesce(room_number_v, '?')
      when 'LIMPIADO' then 'Terminó de limpiar la habitación ' || coalesce(room_number_v, '?')
      else 'Marcó como pendiente de limpieza la habitación ' || coalesce(room_number_v, '?')
    end,
    jsonb_build_object('room_number', room_number_v, 'status', p_status),
    hotel_id_v
  );
end;
$$;

-- ── check_long_cleanings: revisar también las limpiezas de habitación ──
create or replace function public.check_long_cleanings(p_threshold_minutes int default 45)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
begin
  for rec in
    select cl.reservation_id, cl.room_number, cl.hotel_id, cl.changed_at as started_at, p.full_name
    from cleaning_log cl
    join reservations r on r.id = cl.reservation_id
    left join profiles p on p.id = cl.changed_by
    where cl.status = 'EN PROCESO'
      and r.cleaning_status = 'EN PROCESO'
      and cl.changed_at = (
        select max(changed_at) from cleaning_log
        where reservation_id = cl.reservation_id and status = 'EN PROCESO'
      )
      and cl.changed_at < now() - (p_threshold_minutes || ' minutes')::interval
      and not exists (
        select 1 from notifications n
        where n.reservation_id = cl.reservation_id
          and n.type = 'cleaning_too_long'
          and n.created_at > cl.changed_at
      )
    union all
    select cl.reservation_id, cl.room_number, cl.hotel_id, cl.changed_at as started_at, p.full_name
    from cleaning_log cl
    join rooms rm on rm.id = cl.room_id
    left join profiles p on p.id = cl.changed_by
    where cl.status = 'EN PROCESO'
      and rm.cleaning_status = 'EN PROCESO'
      and cl.changed_at = (
        select max(changed_at) from cleaning_log
        where room_id = cl.room_id and status = 'EN PROCESO'
      )
      and cl.changed_at < now() - (p_threshold_minutes || ' minutes')::interval
      and not exists (
        select 1 from notifications n
        where n.room_number = cl.room_number
          and n.hotel_id = cl.hotel_id
          and n.type = 'cleaning_too_long'
          and n.created_at > cl.changed_at
      )
  loop
    insert into notifications (recipient_role, type, message, room_number, reservation_id, hotel_id)
    values (
      'admin',
      'cleaning_too_long',
      coalesce(rec.full_name, 'Alguien') || ' ha durado mucho limpiando la habitación ' || rec.room_number,
      rec.room_number,
      rec.reservation_id,
      rec.hotel_id
    );
  end loop;
end;
$$;
