-- Bitácora de actividad por usuario. Solo lectura para admin; el resto de
-- las inserciones se hacen desde las funciones SECURITY DEFINER ya
-- existentes (bypasean RLS, igual que ya hacen con cleaning_log/notifications)
-- o desde acciones de servidor autenticadas (reservas, que no pasan por RPC).
create table activity_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles(id),
  action text not null,
  entity_type text,
  entity_id uuid,
  description text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index on activity_log (actor_id, created_at desc);

alter table activity_log enable row level security;

create policy "activity_log: lectura admin" on activity_log
  for select
  using (coalesce(current_user_role(), '') = 'admin');

create policy "activity_log: insertar propio" on activity_log
  for insert
  with check (actor_id = auth.uid() and current_user_role() is not null);

-- ── close_reservation: registra el cierre ──────────────────────────────
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

  select number, floor, type into room_number_v, room_floor_v, room_type_v
  from rooms where id = rec.room_id;

  insert into reservation_history (
    original_reservation_id, room_number, floor, guest_name, guests_count,
    check_in, check_out, nights, room_type, price_per_night, total,
    payment_method, notes, country, municipio, provincia, board_plan
  ) values (
    rec.id, room_number_v, room_floor_v, rec.guest_name, rec.guests_count,
    rec.check_in, rec.check_out, rec.nights, room_type_v, rec.price_per_night, rec.total,
    rec.payment_method, rec.notes, rec.country, rec.municipio, rec.provincia, rec.board_plan
  );

  update reservations
    set status = 'CERRADA',
        closed_at = now(),
        cleaning_status = case when cleaning_status = 'NO' then 'PENDIENTE' else cleaning_status end
    where id = p_reservation_id;

  insert into activity_log (actor_id, action, entity_type, entity_id, description, metadata)
  values (
    auth.uid(), 'reservation_closed', 'reservation', p_reservation_id,
    'Cerró la reserva de ' || rec.guest_name || ' en la habitación ' || coalesce(room_number_v, '?'),
    jsonb_build_object('room_number', room_number_v, 'guest_name', rec.guest_name)
  );
end;
$$;

-- ── update_cleaning_status: registra inicio/fin de limpieza ────────────
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

  insert into activity_log (actor_id, action, entity_type, entity_id, description, metadata)
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
    jsonb_build_object('room_number', room_number_v, 'status', p_status)
  );

  if p_status = 'LIMPIADO' and reservation_status_v = 'CERRADA' then
    delete from reservations where id = p_reservation_id;
  end if;
end;
$$;

-- ── open_maintenance_issue: registra el reporte de la incidencia ───────
create or replace function open_maintenance_issue(
  p_room_id uuid,
  p_description text,
  p_photo_url text default null
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

  insert into maintenance_issues (room_id, description, photo_url, opened_by)
  values (p_room_id, p_description, p_photo_url, auth.uid())
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
    auth.uid(), 'maintenance_opened', 'maintenance_issue', v_id,
    'Reportó una incidencia de mantenimiento en la habitación ' || coalesce(room_number_v, '?') || ': ' || p_description,
    jsonb_build_object('room_number', room_number_v, 'description', p_description)
  );

  return v_id;
end;
$$;

-- ── update_maintenance_issue_status: registra inicio/resolución ────────
create or replace function update_maintenance_issue_status(p_issue_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  room_number_v text;
begin
  if p_status not in ('PENDIENTE', 'EN PROCESO', 'REALIZADO') then
    raise exception 'Estado de mantenimiento inválido: %', p_status;
  end if;

  if coalesce(current_user_role(), '') not in ('mantenimiento', 'admin') then
    raise exception 'No autorizado';
  end if;

  select r.number into room_number_v
  from maintenance_issues mi join rooms r on r.id = mi.room_id
  where mi.id = p_issue_id;

  update maintenance_issues
  set
    status = p_status,
    started_at = case when p_status = 'EN PROCESO' and started_at is null then now() else started_at end,
    closed_at = case when p_status = 'REALIZADO' then now() else closed_at end,
    closed_by = case when p_status = 'REALIZADO' then auth.uid() else closed_by end
  where id = p_issue_id;

  insert into activity_log (actor_id, action, entity_type, entity_id, description, metadata)
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
    jsonb_build_object('room_number', room_number_v, 'status', p_status)
  );
end;
$$;

-- ── assign_room_to_staff: registra la asignación ────────────────────────
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
begin
  if coalesce(current_user_role(), '') not in ('recepcion', 'admin') then
    raise exception 'No autorizado';
  end if;

  insert into room_staff_assignments (room_id, staff_name, notes, assigned_by)
  values (p_room_id, p_staff_name, p_notes, auth.uid())
  returning id into v_id;

  select number into room_number_v from rooms where id = p_room_id;

  insert into activity_log (actor_id, action, entity_type, entity_id, description, metadata)
  values (
    auth.uid(), 'staff_room_assigned', 'room_staff_assignment', v_id,
    'Asignó la habitación ' || coalesce(room_number_v, '?') || ' al empleado ' || p_staff_name,
    jsonb_build_object('room_number', room_number_v, 'staff_name', p_staff_name)
  );

  return v_id;
end;
$$;

-- ── release_staff_room: registra la liberación ──────────────────────────
create or replace function release_staff_room(p_assignment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  room_number_v text;
  staff_name_v text;
begin
  if coalesce(current_user_role(), '') not in ('recepcion', 'admin') then
    raise exception 'No autorizado';
  end if;

  select r.number, sa.staff_name into room_number_v, staff_name_v
  from room_staff_assignments sa join rooms r on r.id = sa.room_id
  where sa.id = p_assignment_id;

  update room_staff_assignments
  set released_at = now(), released_by = auth.uid()
  where id = p_assignment_id and released_at is null;

  insert into activity_log (actor_id, action, entity_type, entity_id, description, metadata)
  values (
    auth.uid(), 'staff_room_released', 'room_staff_assignment', p_assignment_id,
    'Liberó la habitación ' || coalesce(room_number_v, '?') || ' (antes asignada a ' || coalesce(staff_name_v, '?') || ')',
    jsonb_build_object('room_number', room_number_v, 'staff_name', staff_name_v)
  );
end;
$$;
