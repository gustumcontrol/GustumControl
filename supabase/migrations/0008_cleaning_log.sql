-- Bitácora de limpieza: hoy solo guardamos el estado actual de limpieza en
-- la reserva (se sobrescribe), sin rastro de quién lo cambió ni cuándo.
create table cleaning_log (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references reservations(id),
  room_number text not null,
  status text not null check (status in ('PENDIENTE', 'EN PROCESO', 'LIMPIADO')),
  changed_by uuid references profiles(id),
  changed_at timestamptz not null default now()
);

create index on cleaning_log (reservation_id);
create index on cleaning_log (changed_at desc);

alter table cleaning_log enable row level security;

create policy "cleaning_log: lectura para cuentas activas" on cleaning_log
  for select using (public.current_user_role() is not null);

-- update_cleaning_status ahora también deja registro en cleaning_log,
-- capturando quién hizo el cambio (auth.uid()) y el número de habitación.
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

  if public.current_user_role() not in ('limpieza', 'admin') then
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
