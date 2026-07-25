-- ── Roles y perfiles ─────────────────────────────────────────
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('recepcion','limpieza','mantenimiento','admin')),
  created_at timestamptz default now()
);

-- Crea automáticamente un perfil al registrarse un usuario.
-- El rol por defecto es 'recepcion'; un admin lo puede reasignar después.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'recepcion')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Habitaciones ─────────────────────────────────────────────
create table rooms (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  floor text not null,
  type text not null,                 -- "Individual", "Doble", "Triple"
  capacity int not null,
  active boolean not null default true
);

create table room_types (
  name text primary key,
  price_per_night numeric(10,2) not null
);

-- ── Reservas (siempre registros nuevos, nunca se reutilizan filas) ──
create table reservations (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id),
  guest_name text not null,
  guests_count int not null check (guests_count > 0),
  check_in date not null,
  nights int not null check (nights > 0),
  check_out date generated always as (check_in + nights) stored,
  price_per_night numeric(10,2) not null,
  total numeric(10,2) generated always as (nights * price_per_night) stored,
  payment_method text,
  phone text,
  notes text,
  cleaning_status text not null default 'PENDIENTE'
    check (cleaning_status in ('PENDIENTE','EN PROCESO','LIMPIADO')),
  maintenance_status text not null default 'NO'
    check (maintenance_status in ('NO','PENDIENTE','EN PROCESO','REALIZADO')),
  status text not null default 'ACTIVA' check (status in ('ACTIVA','CERRADA')),
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

create index on reservations (room_id, status);

-- ── Historial (copia permanente al cerrar) ──────────────────
create table reservation_history (
  id uuid primary key default gen_random_uuid(),
  original_reservation_id uuid not null,
  room_number text not null,
  floor text not null,
  guest_name text not null,
  guests_count int not null,
  check_in date not null,
  check_out date not null,
  nights int not null,
  room_type text not null,
  price_per_night numeric(10,2) not null,
  total numeric(10,2) not null,
  payment_method text,
  notes text,
  archived_at timestamptz not null default now()
);

-- ── Vista: estado calculado de cada habitación ───────────────
create view room_status as
select
  r.id as room_id,
  r.number,
  r.floor,
  r.type,
  r.capacity,
  case
    when active_res.maintenance_status is not null
         and active_res.maintenance_status <> 'NO'
      then 'MANTENIMIENTO'
    when active_res.check_out is not null
         and active_res.check_out < current_date
         and active_res.cleaning_status <> 'LIMPIADO'
      then 'PENDIENTE LIMPIEZA'
    when active_res.id is not null
      then 'OCUPADA'
    else 'LIBRE'
  end as computed_status,
  active_res.id as reservation_id,
  active_res.guest_name,
  active_res.check_in,
  active_res.check_out,
  active_res.cleaning_status,
  active_res.maintenance_status
from rooms r
left join lateral (
  select *
  from reservations res
  where res.room_id = r.id
    and res.status = 'ACTIVA'
  order by res.created_at desc
  limit 1
) active_res on true
where r.active = true;

-- ── Función: cerrar reserva (archiva y marca CERRADA) ────────
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
  select * into rec from reservations where id = p_reservation_id and status = 'ACTIVA';
  if not found then
    raise exception 'Reserva no encontrada o ya cerrada';
  end if;

  select number, floor, type into room_number_v, room_floor_v, room_type_v
  from rooms where id = rec.room_id;

  insert into reservation_history (
    original_reservation_id, room_number, floor, guest_name, guests_count,
    check_in, check_out, nights, room_type, price_per_night, total,
    payment_method, notes
  ) values (
    rec.id, room_number_v, room_floor_v, rec.guest_name, rec.guests_count,
    rec.check_in, rec.check_out, rec.nights, room_type_v, rec.price_per_night, rec.total,
    rec.payment_method, rec.notes
  );

  update reservations
    set status = 'CERRADA', closed_at = now()
    where id = p_reservation_id;
end;
$$;

-- ── Funciones: actualizar solo el estado que cada rol puede tocar ──
-- RLS filtra filas, no columnas: para que "limpieza" solo pueda cambiar
-- cleaning_status y "mantenimiento" solo maintenance_status, esos roles
-- no tienen policy de UPDATE directo sobre reservations, solo pueden
-- llamar a estas funciones security definer.
create or replace function update_cleaning_status(p_reservation_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_status not in ('PENDIENTE','EN PROCESO','LIMPIADO') then
    raise exception 'Estado de limpieza inválido: %', p_status;
  end if;

  if not exists (
    select 1 from profiles
    where id = auth.uid() and role in ('limpieza','admin')
  ) then
    raise exception 'No autorizado';
  end if;

  update reservations set cleaning_status = p_status where id = p_reservation_id;
end;
$$;

create or replace function update_maintenance_status(p_reservation_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_status not in ('NO','PENDIENTE','EN PROCESO','REALIZADO') then
    raise exception 'Estado de mantenimiento inválido: %', p_status;
  end if;

  if not exists (
    select 1 from profiles
    where id = auth.uid() and role in ('mantenimiento','admin')
  ) then
    raise exception 'No autorizado';
  end if;

  update reservations set maintenance_status = p_status where id = p_reservation_id;
end;
$$;

-- ── RLS ───────────────────────────────────────────────────────
alter table profiles enable row level security;
alter table rooms enable row level security;
alter table room_types enable row level security;
alter table reservations enable row level security;
alter table reservation_history enable row level security;

create policy "profiles: ver el propio" on profiles
  for select using (auth.uid() = id);

create policy "profiles: admin ve y gestiona todos" on profiles
  for all using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "room_types: lectura autenticados" on room_types
  for select using (auth.role() = 'authenticated');

create policy "rooms: lectura para cualquier usuario autenticado" on rooms
  for select using (auth.role() = 'authenticated');

create policy "rooms: solo admin escribe" on rooms
  for insert with check (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "rooms: solo admin actualiza" on rooms
  for update using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "rooms: solo admin elimina" on rooms
  for delete using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "reservations: lectura para todos los roles operativos" on reservations
  for select using (auth.role() = 'authenticated');

create policy "reservations: recepcion y admin crean" on reservations
  for insert with check (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('recepcion','admin'))
  );

create policy "reservations: recepcion/admin actualizan todo" on reservations
  for update using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('recepcion','admin'))
  );

create policy "history: lectura autenticados" on reservation_history
  for select using (auth.role() = 'authenticated');

-- ── 0003_fix_rls_recursion ──────────────────────────────────────
-- La policy "profiles: admin ve y gestiona todos" consultaba profiles
-- dentro de su propia USING clause, causando "infinite recursion detected
-- in policy for relation profiles". Esta función security definer
-- consulta profiles como el dueño de la función (bypassa RLS).
create or replace function public.current_user_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role from profiles where id = auth.uid();
$$;

drop policy "profiles: admin ve y gestiona todos" on profiles;
create policy "profiles: admin ve y gestiona todos" on profiles
  for all using (public.current_user_role() = 'admin');

drop policy "rooms: solo admin escribe" on rooms;
create policy "rooms: solo admin escribe" on rooms
  for insert with check (public.current_user_role() = 'admin');

drop policy "rooms: solo admin actualiza" on rooms;
create policy "rooms: solo admin actualiza" on rooms
  for update using (public.current_user_role() = 'admin');

drop policy "rooms: solo admin elimina" on rooms;
create policy "rooms: solo admin elimina" on rooms
  for delete using (public.current_user_role() = 'admin');

drop policy "reservations: recepcion y admin crean" on reservations;
create policy "reservations: recepcion y admin crean" on reservations
  for insert with check (public.current_user_role() in ('recepcion','admin'));

drop policy "reservations: recepcion/admin actualizan todo" on reservations;
create policy "reservations: recepcion/admin actualizan todo" on reservations
  for update using (public.current_user_role() in ('recepcion','admin'));
