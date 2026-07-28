-- ── Bucket para fotos de incidencias de mantenimiento ──────────────────
insert into storage.buckets (id, name, public)
values ('maintenance-photos', 'maintenance-photos', true)
on conflict (id) do nothing;

create policy "maintenance-photos: lectura pública"
  on storage.objects for select
  using (bucket_id = 'maintenance-photos');

create policy "maintenance-photos: subida de cuentas autenticadas"
  on storage.objects for insert
  with check (bucket_id = 'maintenance-photos' and auth.uid() is not null);

-- ── Incidencias de mantenimiento, independientes de las reservas ───────
-- Antes el mantenimiento solo se podía marcar sobre una reserva activa
-- (reservations.maintenance_status). Esto lo desacopla: cualquier
-- habitación puede pasar a mantenimiento aunque no tenga huésped.
create table maintenance_issues (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id),
  description text not null,
  photo_url text,
  status text not null default 'PENDIENTE'
    check (status in ('PENDIENTE', 'EN PROCESO', 'REALIZADO')),
  opened_by uuid references profiles(id),
  opened_at timestamptz not null default now(),
  started_at timestamptz,
  closed_by uuid references profiles(id),
  closed_at timestamptz
);

create index on maintenance_issues (room_id);
create index on maintenance_issues (status);

alter table maintenance_issues enable row level security;

create policy "maintenance_issues: lectura para cuentas activas" on maintenance_issues
  for select
  using (current_user_role() is not null);

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

  return v_id;
end;
$$;

create or replace function update_maintenance_issue_status(p_issue_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_status not in ('PENDIENTE', 'EN PROCESO', 'REALIZADO') then
    raise exception 'Estado de mantenimiento inválido: %', p_status;
  end if;

  if coalesce(current_user_role(), '') not in ('mantenimiento', 'admin') then
    raise exception 'No autorizado';
  end if;

  update maintenance_issues
  set
    status = p_status,
    started_at = case when p_status = 'EN PROCESO' and started_at is null then now() else started_at end,
    closed_at = case when p_status = 'REALIZADO' then now() else closed_at end,
    closed_by = case when p_status = 'REALIZADO' then auth.uid() else closed_by end
  where id = p_issue_id;
end;
$$;

alter publication supabase_realtime add table maintenance_issues;

-- ── room_status: MANTENIMIENTO ahora depende de maintenance_issues,
-- no de la reserva activa, así una habitación se puede bloquear aunque
-- no tenga huésped.
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
  open_issue.description as maintenance_description
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
where r.active = true;

-- ── Limpieza del sistema viejo de mantenimiento atado a reservas ───────
drop trigger if exists on_reservation_updated_notify_maintenance on reservations;
drop function if exists notify_new_maintenance_task();
drop function if exists update_maintenance_status(uuid, text);
drop table if exists maintenance_log;
