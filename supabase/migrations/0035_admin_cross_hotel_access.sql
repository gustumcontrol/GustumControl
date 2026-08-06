-- Los admins ahora pueden ver y operar en TODOS los hoteles (se van a ir
-- agregando más con el tiempo, y el admin tiene que poder entrar a
-- cualquiera). El resto de roles (recepcion/limpieza/mantenimiento) se
-- quedan atados a un solo hotel, como antes. El patrón en cada política
-- pasa de "hotel_id = current_user_hotel_id()" a
-- "current_user_role() = 'admin' or hotel_id = current_user_hotel_id()".
-- room_status también expone hotel_id ahora: el admin necesita saber a
-- qué hotel pertenece cada fila para poder filtrar en la UI por el hotel
-- que tiene seleccionado en un momento dado.

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

alter view room_status set (security_invoker = true);

-- ── RLS: agregar bypass de admin ─────────────────────────────────────
drop policy "profiles: admin ve y gestiona todos" on profiles;
create policy "profiles: admin ve y gestiona todos" on profiles
  for all using (public.current_user_role() = 'admin');

drop policy "profiles: lectura para cuentas activas" on profiles;
create policy "profiles: lectura para cuentas activas" on profiles
  for select using (
    public.current_user_role() is not null
    and (public.current_user_role() = 'admin' or hotel_id = public.current_user_hotel_id())
  );

drop policy "rooms: lectura para cualquier usuario autenticado" on rooms;
create policy "rooms: lectura para cualquier usuario autenticado" on rooms
  for select using (
    public.current_user_role() is not null
    and (public.current_user_role() = 'admin' or hotel_id = public.current_user_hotel_id())
  );

drop policy "rooms: solo admin escribe" on rooms;
create policy "rooms: solo admin escribe" on rooms
  for insert with check (public.current_user_role() = 'admin');

drop policy "rooms: solo admin actualiza" on rooms;
create policy "rooms: solo admin actualiza" on rooms
  for update using (public.current_user_role() = 'admin');

drop policy "rooms: solo admin elimina" on rooms;
create policy "rooms: solo admin elimina" on rooms
  for delete using (public.current_user_role() = 'admin');

drop policy "reservations: lectura para todos los roles operativos" on reservations;
create policy "reservations: lectura para todos los roles operativos" on reservations
  for select using (
    public.current_user_role() is not null
    and (public.current_user_role() = 'admin' or hotel_id = public.current_user_hotel_id())
  );

drop policy "reservations: recepcion y admin crean" on reservations;
create policy "reservations: recepcion y admin crean" on reservations
  for insert with check (
    public.current_user_role() in ('recepcion','admin')
    and (public.current_user_role() = 'admin' or hotel_id = public.current_user_hotel_id())
  );

drop policy "reservations: recepcion/admin actualizan todo" on reservations;
create policy "reservations: recepcion/admin actualizan todo" on reservations
  for update using (
    public.current_user_role() in ('recepcion','admin')
    and (public.current_user_role() = 'admin' or hotel_id = public.current_user_hotel_id())
  );

drop policy "history: lectura autenticados" on reservation_history;
create policy "history: lectura autenticados" on reservation_history
  for select using (
    public.current_user_role() is not null
    and (public.current_user_role() = 'admin' or hotel_id = public.current_user_hotel_id())
  );

drop policy "cleaning_log: lectura para cuentas activas" on cleaning_log;
create policy "cleaning_log: lectura para cuentas activas" on cleaning_log
  for select using (
    public.current_user_role() is not null
    and (public.current_user_role() = 'admin' or hotel_id = public.current_user_hotel_id())
  );

drop policy "notifications: cada rol ve las suyas" on notifications;
create policy "notifications: cada rol ve las suyas" on notifications
  for select using (
    recipient_role = public.current_user_role()
    and (public.current_user_role() = 'admin' or hotel_id = public.current_user_hotel_id())
  );

drop policy "maintenance_issues: lectura para cuentas activas" on maintenance_issues;
create policy "maintenance_issues: lectura para cuentas activas" on maintenance_issues
  for select using (
    public.current_user_role() is not null
    and (public.current_user_role() = 'admin' or hotel_id = public.current_user_hotel_id())
  );

drop policy "room_staff_assignments: lectura para cuentas activas" on room_staff_assignments;
create policy "room_staff_assignments: lectura para cuentas activas" on room_staff_assignments
  for select using (
    public.current_user_role() is not null
    and (public.current_user_role() = 'admin' or hotel_id = public.current_user_hotel_id())
  );

drop policy "activity_log: lectura admin" on activity_log;
create policy "activity_log: lectura admin" on activity_log
  for select using (coalesce(public.current_user_role(), '') = 'admin');

drop policy "activity_log: insertar propio" on activity_log;
create policy "activity_log: insertar propio" on activity_log
  for insert with check (
    actor_id = auth.uid()
    and public.current_user_role() is not null
    and (public.current_user_role() = 'admin' or hotel_id = public.current_user_hotel_id())
  );

-- ── RPCs: mismo bypass para admin en cada chequeo manual de hotel ────
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
    payment_method, notes, country, municipio, provincia, board_plan, hotel_id
  ) values (
    rec.id, room_number_v, room_floor_v, rec.guest_name, rec.guests_count,
    rec.check_in, rec.check_out, rec.nights, room_type_v, rec.price_per_night, rec.total,
    rec.payment_method, rec.notes, rec.country, rec.municipio, rec.provincia, rec.board_plan, rec.hotel_id
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

create or replace function update_cleaning_status(p_reservation_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  room_number_v text;
  reservation_status_v text;
  hotel_id_v uuid;
begin
  if p_status not in ('PENDIENTE','EN PROCESO','LIMPIADO') then
    raise exception 'Estado de limpieza inválido: %', p_status;
  end if;

  if coalesce(public.current_user_role(), '') not in ('limpieza', 'admin') then
    raise exception 'No autorizado';
  end if;

  select hotel_id into hotel_id_v from reservations where id = p_reservation_id;
  if hotel_id_v is null then
    raise exception 'Reserva no encontrada';
  end if;
  if public.current_user_role() <> 'admin' and hotel_id_v <> public.current_user_hotel_id() then
    raise exception 'No autorizado';
  end if;

  update reservations set cleaning_status = p_status where id = p_reservation_id;

  select r.number, res.status into room_number_v, reservation_status_v
  from reservations res join rooms r on r.id = res.room_id
  where res.id = p_reservation_id;

  insert into cleaning_log (reservation_id, room_number, status, changed_by, hotel_id)
  values (p_reservation_id, room_number_v, p_status, auth.uid(), hotel_id_v);

  insert into activity_log (actor_id, action, entity_type, entity_id, description, metadata, hotel_id)
  values (
    auth.uid(),
    case p_status
      when 'EN PROCESO' then 'cleaning_started'
      when 'LIMPIADO' then 'cleaning_finished'
      else 'cleaning_pending'
    end,
    'reservation', p_reservation_id,
    case p_status
      when 'EN PROCESO' then 'Comenzó a limpiar la habitación ' || coalesce(room_number_v, '?')
      when 'LIMPIADO' then 'Terminó de limpiar la habitación ' || coalesce(room_number_v, '?')
      else 'Marcó como pendiente de limpieza la habitación ' || coalesce(room_number_v, '?')
    end,
    jsonb_build_object('room_number', room_number_v, 'status', p_status),
    hotel_id_v
  );

  if p_status = 'LIMPIADO' and reservation_status_v = 'CERRADA' then
    delete from reservations where id = p_reservation_id;
  end if;
end;
$$;

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
  hotel_id_v uuid;
begin
  if coalesce(current_user_role(), '') not in ('recepcion', 'mantenimiento', 'admin') then
    raise exception 'No autorizado';
  end if;

  select hotel_id, number into hotel_id_v, room_number_v from rooms where id = p_room_id;
  if hotel_id_v is null then
    raise exception 'Habitación no encontrada';
  end if;
  if public.current_user_role() <> 'admin' and hotel_id_v <> public.current_user_hotel_id() then
    raise exception 'No autorizado';
  end if;

  insert into maintenance_issues (room_id, description, photo_urls, opened_by)
  values (p_room_id, p_description, coalesce(p_photo_urls, '{}'), auth.uid())
  returning id into v_id;

  insert into notifications (recipient_role, type, message, room_number, hotel_id)
  values (
    'mantenimiento',
    'new_maintenance_task',
    'Nuevo mantenimiento pendiente: habitación ' || room_number_v,
    room_number_v,
    hotel_id_v
  );

  insert into activity_log (actor_id, action, entity_type, entity_id, description, metadata, hotel_id)
  values (
    auth.uid(),
    'maintenance_opened',
    'maintenance_issue',
    v_id,
    'Reportó una incidencia de mantenimiento: habitación ' || room_number_v || ' — ' || p_description,
    jsonb_build_object('room_number', room_number_v, 'description', p_description),
    hotel_id_v
  );

  return v_id;
end;
$$;

create or replace function update_maintenance_issue_status(p_issue_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  room_number_v text;
  hotel_id_v uuid;
begin
  if p_status not in ('PENDIENTE', 'EN PROCESO', 'REALIZADO') then
    raise exception 'Estado de mantenimiento inválido: %', p_status;
  end if;

  if coalesce(current_user_role(), '') not in ('mantenimiento', 'admin') then
    raise exception 'No autorizado';
  end if;

  select r.number, mi.hotel_id into room_number_v, hotel_id_v
  from maintenance_issues mi join rooms r on r.id = mi.room_id
  where mi.id = p_issue_id;

  if hotel_id_v is null then
    raise exception 'Incidencia no encontrada';
  end if;
  if public.current_user_role() <> 'admin' and hotel_id_v <> public.current_user_hotel_id() then
    raise exception 'No autorizado';
  end if;

  update maintenance_issues
  set
    status = p_status,
    started_at = case when p_status = 'EN PROCESO' and started_at is null then now() else started_at end,
    closed_at = case when p_status = 'REALIZADO' then now() else closed_at end,
    closed_by = case when p_status = 'REALIZADO' then auth.uid() else closed_by end
  where id = p_issue_id;

  insert into activity_log (actor_id, action, entity_type, entity_id, description, metadata, hotel_id)
  values (
    auth.uid(),
    case p_status
      when 'EN PROCESO' then 'maintenance_started'
      when 'REALIZADO' then 'maintenance_resolved'
      else 'maintenance_pending'
    end,
    'maintenance_issue', p_issue_id,
    case p_status
      when 'EN PROCESO' then 'Comenzó a resolver la incidencia en la habitación ' || coalesce(room_number_v, '?')
      when 'REALIZADO' then 'Resolvió la incidencia en la habitación ' || coalesce(room_number_v, '?')
      else 'Reabrió la incidencia en la habitación ' || coalesce(room_number_v, '?')
    end,
    jsonb_build_object('room_number', room_number_v, 'status', p_status),
    hotel_id_v
  );
end;
$$;

create or replace function edit_maintenance_issue(
  p_issue_id uuid,
  p_description text default null,
  p_new_photo_urls text[] default '{}'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  room_number_v text;
  hotel_id_v uuid;
begin
  if coalesce(current_user_role(), '') not in ('recepcion', 'mantenimiento', 'admin') then
    raise exception 'No autorizado';
  end if;

  select r.number, mi.hotel_id into room_number_v, hotel_id_v
  from maintenance_issues mi
  join rooms r on r.id = mi.room_id
  where mi.id = p_issue_id;

  if hotel_id_v is null then
    raise exception 'Incidencia no encontrada';
  end if;
  if public.current_user_role() <> 'admin' and hotel_id_v <> public.current_user_hotel_id() then
    raise exception 'No autorizado';
  end if;

  update maintenance_issues
  set description = coalesce(nullif(trim(p_description), ''), description),
      photo_urls = photo_urls || coalesce(p_new_photo_urls, '{}')
  where id = p_issue_id;

  insert into activity_log (actor_id, action, entity_type, entity_id, description, metadata, hotel_id)
  values (
    auth.uid(),
    'maintenance_edited',
    'maintenance_issue',
    p_issue_id,
    'Editó la incidencia de mantenimiento de la habitación ' || room_number_v,
    jsonb_build_object('room_number', room_number_v),
    hotel_id_v
  );
end;
$$;

create or replace function assign_room_to_staff(
  p_room_id uuid,
  p_staff_name text,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
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

  insert into room_staff_assignments (room_id, staff_name, notes, assigned_by)
  values (p_room_id, p_staff_name, p_notes, auth.uid())
  returning id into v_id;

  insert into activity_log (actor_id, action, entity_type, entity_id, description, metadata, hotel_id)
  values (
    auth.uid(), 'staff_room_assigned', 'room_staff_assignment', v_id,
    'Asignó la habitación ' || coalesce(room_number_v, '?') || ' al empleado ' || p_staff_name,
    jsonb_build_object('room_number', room_number_v, 'staff_name', p_staff_name),
    hotel_id_v
  );

  return v_id;
end;
$$;

create or replace function release_staff_room(p_assignment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  room_number_v text;
  staff_name_v text;
  hotel_id_v uuid;
begin
  if coalesce(current_user_role(), '') not in ('recepcion', 'admin') then
    raise exception 'No autorizado';
  end if;

  select r.number, sa.staff_name, sa.hotel_id into room_number_v, staff_name_v, hotel_id_v
  from room_staff_assignments sa join rooms r on r.id = sa.room_id
  where sa.id = p_assignment_id;

  if hotel_id_v is null then
    raise exception 'Asignación no encontrada';
  end if;
  if public.current_user_role() <> 'admin' and hotel_id_v <> public.current_user_hotel_id() then
    raise exception 'No autorizado';
  end if;

  update room_staff_assignments
  set released_at = now(), released_by = auth.uid()
  where id = p_assignment_id and released_at is null;

  insert into activity_log (actor_id, action, entity_type, entity_id, description, metadata, hotel_id)
  values (
    auth.uid(), 'staff_room_released', 'room_staff_assignment', p_assignment_id,
    'Liberó la habitación ' || coalesce(room_number_v, '?') || ' (antes asignada a ' || coalesce(staff_name_v, '?') || ')',
    jsonb_build_object('room_number', room_number_v, 'staff_name', staff_name_v),
    hotel_id_v
  );
end;
$$;
