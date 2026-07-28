create table maintenance_log (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null,
  room_number text not null,
  status text not null,
  changed_by uuid references profiles(id),
  changed_at timestamptz not null default now()
);

create index on maintenance_log (reservation_id);

alter table maintenance_log enable row level security;

create policy "maintenance_log: lectura para cuentas activas" on maintenance_log
  for select
  using (current_user_role() is not null);

-- update_maintenance_status ahora registra cada cambio en maintenance_log,
-- igual que update_cleaning_status hace con cleaning_log.
create or replace function update_maintenance_status(p_reservation_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  room_number_v text;
begin
  if p_status not in ('NO','PENDIENTE','EN PROCESO','REALIZADO') then
    raise exception 'Estado de mantenimiento inválido: %', p_status;
  end if;

  if coalesce(public.current_user_role(), '') not in ('mantenimiento', 'admin') then
    raise exception 'No autorizado';
  end if;

  update reservations set maintenance_status = p_status where id = p_reservation_id;

  select r.number into room_number_v
  from reservations res join rooms r on r.id = res.room_id
  where res.id = p_reservation_id;

  insert into maintenance_log (reservation_id, room_number, status, changed_by)
  values (p_reservation_id, room_number_v, p_status, auth.uid());
end;
$$;

alter publication supabase_realtime add table maintenance_log;
