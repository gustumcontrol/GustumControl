-- Habitaciones ocupadas de forma fija por personal (no huéspedes), sin
-- fecha de salida conocida. Igual que mantenimiento: bloquea la habitación
-- sin ensuciar reservations/reservation_history con datos falsos.
create table room_staff_assignments (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id),
  staff_name text not null,
  notes text,
  assigned_by uuid references profiles(id),
  assigned_at timestamptz not null default now(),
  released_by uuid references profiles(id),
  released_at timestamptz
);

create index on room_staff_assignments (room_id);

alter table room_staff_assignments enable row level security;

create policy "room_staff_assignments: lectura para cuentas activas" on room_staff_assignments
  for select
  using (current_user_role() is not null);

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
begin
  if coalesce(current_user_role(), '') not in ('recepcion', 'admin') then
    raise exception 'No autorizado';
  end if;

  insert into room_staff_assignments (room_id, staff_name, notes, assigned_by)
  values (p_room_id, p_staff_name, p_notes, auth.uid())
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function release_staff_room(p_assignment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(current_user_role(), '') not in ('recepcion', 'admin') then
    raise exception 'No autorizado';
  end if;

  update room_staff_assignments
  set released_at = now(), released_by = auth.uid()
  where id = p_assignment_id and released_at is null;
end;
$$;

alter publication supabase_realtime add table room_staff_assignments;

-- ── room_status: agrega el motivo EMPLEADO, con prioridad justo debajo
-- de MANTENIMIENTO (ambos bloquean sin depender de una reserva).
drop view room_status;

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
