create table notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_role text not null check (recipient_role in ('admin','recepcion','limpieza','mantenimiento')),
  type text not null,
  message text not null,
  room_number text,
  reservation_id uuid references reservations(id),
  created_at timestamptz not null default now()
);

create index on notifications (recipient_role, created_at desc);

alter table notifications enable row level security;

create policy "notifications: cada rol ve las suyas" on notifications
  for select using (recipient_role = public.current_user_role());

alter publication supabase_realtime add table notifications;

-- Nueva reserva creada -> avisa a limpieza (cada reserva nueva nace con
-- cleaning_status = PENDIENTE, así que siempre implica una tarea nueva).
create or replace function public.notify_new_cleaning_task()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  room_number_v text;
begin
  select number into room_number_v from rooms where id = new.room_id;
  insert into notifications (recipient_role, type, message, room_number, reservation_id)
  values (
    'limpieza',
    'new_cleaning_task',
    'Nueva limpieza pendiente: habitación ' || room_number_v,
    room_number_v,
    new.id
  );
  return new;
end;
$$;

create trigger on_reservation_created_notify_cleaning
  after insert on reservations
  for each row execute function public.notify_new_cleaning_task();

-- maintenance_status pasa a PENDIENTE -> avisa a mantenimiento.
create or replace function public.notify_new_maintenance_task()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  room_number_v text;
begin
  if new.maintenance_status = 'PENDIENTE'
     and (old.maintenance_status is distinct from new.maintenance_status) then
    select number into room_number_v from rooms where id = new.room_id;
    insert into notifications (recipient_role, type, message, room_number, reservation_id)
    values (
      'mantenimiento',
      'new_maintenance_task',
      'Nuevo mantenimiento pendiente: habitación ' || room_number_v,
      room_number_v,
      new.id
    );
  end if;
  return new;
end;
$$;

create trigger on_reservation_updated_notify_maintenance
  after update on reservations
  for each row execute function public.notify_new_maintenance_task();

-- Revisa limpiezas EN PROCESO que llevan más del umbral sin terminar, y
-- avisa a admin. Se llama desde un cron job cada 5 minutos.
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
    select cl.reservation_id, cl.room_number, cl.changed_at as started_at, p.full_name
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
  loop
    insert into notifications (recipient_role, type, message, room_number, reservation_id)
    values (
      'admin',
      'cleaning_too_long',
      coalesce(rec.full_name, 'Alguien') || ' ha durado mucho limpiando la habitación ' || rec.room_number,
      rec.room_number,
      rec.reservation_id
    );
  end loop;
end;
$$;

select cron.schedule(
  'check-long-cleanings',
  '*/5 * * * *',
  $$select public.check_long_cleanings();$$
);
