-- ── Multi-hotel: un solo proyecto Supabase, separado por hotel_id + RLS ──
-- El plan es que este panel sirva a varios hoteles desde la misma base de
-- datos: cada usuario pertenece a un hotel (profiles.hotel_id) y ya no
-- puede ver ni tocar datos de otro hotel, gracias a políticas RLS que
-- ahora también filtran por hotel además de por rol.
--
-- Alcance de esta migración:
--   * Se agrega hotel_id a las tablas "operativas" (rooms, reservations,
--     reservation_history, cleaning_log, notifications, maintenance_issues,
--     room_staff_assignments, activity_log, profiles).
--   * room_types, board_plans y app_settings quedan GLOBALES a propósito
--     (catálogos/ajustes de plataforma, no datos de huéspedes) — si más
--     adelante cada hotel necesita su propio catálogo de tipos/pensiones,
--     eso es una migración aparte.
--   * Cualquier usuario con role='admin' puede crear/editar hoteles (tabla
--     `hotels`), sin importar a qué hotel pertenezca — es la única tabla
--     que no queda aislada por hotel, porque hace falta para que un admin
--     pueda dar de alta hoteles nuevos desde la UI.

-- ── 1) Tabla de hoteles (sin políticas todavía: current_user_hotel_id()
-- se define más abajo y las políticas la necesitan) ──────────────────
create table hotels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  timezone text not null default 'Europe/Madrid',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references profiles(id)
);

-- Hotel existente (el único hasta ahora), para poder migrar los datos
-- actuales sin dejarlos huérfanos. El nombre coincide con el que ya
-- estaba hardcodeado en /hoteles.
insert into hotels (name, slug) values ('Los Toreros', 'los-toreros');

-- ── 2) hotel_id en profiles primero: current_user_hotel_id() lo necesita
-- en su cuerpo, así que la columna tiene que existir antes de crear esa
-- función (si no, "language sql" falla al no poder resolver la columna).
alter table profiles add column hotel_id uuid references hotels(id);

-- ── 3) Funciones de contexto de hotel ────────────────────────────────
create or replace function public.current_user_hotel_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select hotel_id from profiles where id = auth.uid();
$$;

-- Fallback para inserciones sin usuario autenticado en contexto (alta por
-- signup, cron jobs): el primer hotel creado. Con un solo hotel esto es
-- siempre correcto; en cuanto haya varios, el alta de usuarios debe pasar
-- hotel_id explícito (ver handle_new_user más abajo).
create or replace function public.first_hotel_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select id from hotels order by created_at limit 1;
$$;

-- ── 3b) Políticas de hotels, ahora que current_user_hotel_id() existe ──
alter table hotels enable row level security;

create policy "hotels: admin ve todos" on hotels
  for select using (public.current_user_role() = 'admin');

create policy "hotels: cada quien ve el propio" on hotels
  for select using (id = public.current_user_hotel_id());

create policy "hotels: admin crea" on hotels
  for insert with check (public.current_user_role() = 'admin');

create policy "hotels: admin actualiza" on hotels
  for update using (public.current_user_role() = 'admin');

-- ── 4) hotel_id en el resto de tablas operativas: agregar, rellenar, exigir ──
update profiles set hotel_id = public.first_hotel_id() where hotel_id is null;
alter table profiles alter column hotel_id set not null;
alter table profiles alter column hotel_id set default public.first_hotel_id();

alter table rooms add column hotel_id uuid references hotels(id);
update rooms set hotel_id = public.first_hotel_id() where hotel_id is null;
alter table rooms alter column hotel_id set not null;
alter table rooms alter column hotel_id set default public.current_user_hotel_id();

alter table reservations add column hotel_id uuid references hotels(id);
update reservations set hotel_id = public.first_hotel_id() where hotel_id is null;
alter table reservations alter column hotel_id set not null;

alter table reservation_history add column hotel_id uuid references hotels(id);
update reservation_history set hotel_id = public.first_hotel_id() where hotel_id is null;
alter table reservation_history alter column hotel_id set not null;

alter table cleaning_log add column hotel_id uuid references hotels(id);
update cleaning_log set hotel_id = public.first_hotel_id() where hotel_id is null;
alter table cleaning_log alter column hotel_id set not null;

alter table notifications add column hotel_id uuid references hotels(id);
update notifications set hotel_id = public.first_hotel_id() where hotel_id is null;
alter table notifications alter column hotel_id set not null;

alter table maintenance_issues add column hotel_id uuid references hotels(id);
update maintenance_issues set hotel_id = public.first_hotel_id() where hotel_id is null;
alter table maintenance_issues alter column hotel_id set not null;

alter table room_staff_assignments add column hotel_id uuid references hotels(id);
update room_staff_assignments set hotel_id = public.first_hotel_id() where hotel_id is null;
alter table room_staff_assignments alter column hotel_id set not null;

alter table activity_log add column hotel_id uuid references hotels(id);
update activity_log set hotel_id = public.first_hotel_id() where hotel_id is null;
alter table activity_log alter column hotel_id set not null;

-- ── 5) hotel_id automático a partir de la habitación ─────────────────
-- reservations, maintenance_issues y room_staff_assignments siempre
-- cuelgan de una habitación: en vez de confiar en que el cliente mande el
-- hotel_id correcto, se deriva SIEMPRE del room_id en un trigger. Así es
-- imposible crear una reserva/incidencia/asignación en un hotel distinto
-- al de la habitación, ni por bug ni por request manipulado.
create or replace function public.set_hotel_id_from_room()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select hotel_id into new.hotel_id from rooms where id = new.room_id;
  if new.hotel_id is null then
    raise exception 'Habitación inválida: no se pudo determinar el hotel';
  end if;
  return new;
end;
$$;

create trigger set_hotel_id_before_insert_reservations
  before insert on reservations
  for each row execute function public.set_hotel_id_from_room();

create trigger set_hotel_id_before_insert_maintenance_issues
  before insert on maintenance_issues
  for each row execute function public.set_hotel_id_from_room();

create trigger set_hotel_id_before_insert_room_staff_assignments
  before insert on room_staff_assignments
  for each row execute function public.set_hotel_id_from_room();

-- ── 5) RLS: agregar filtro de hotel a las políticas existentes ───────
drop policy "profiles: admin ve y gestiona todos" on profiles;
create policy "profiles: admin ve y gestiona todos" on profiles
  for all using (
    public.current_user_role() = 'admin' and hotel_id = public.current_user_hotel_id()
  );

drop policy "profiles: lectura para cuentas activas" on profiles;
create policy "profiles: lectura para cuentas activas" on profiles
  for select using (
    public.current_user_role() is not null and hotel_id = public.current_user_hotel_id()
  );

drop policy "rooms: lectura para cualquier usuario autenticado" on rooms;
create policy "rooms: lectura para cualquier usuario autenticado" on rooms
  for select using (
    public.current_user_role() is not null and hotel_id = public.current_user_hotel_id()
  );

drop policy "rooms: solo admin escribe" on rooms;
create policy "rooms: solo admin escribe" on rooms
  for insert with check (
    public.current_user_role() = 'admin' and hotel_id = public.current_user_hotel_id()
  );

drop policy "rooms: solo admin actualiza" on rooms;
create policy "rooms: solo admin actualiza" on rooms
  for update using (
    public.current_user_role() = 'admin' and hotel_id = public.current_user_hotel_id()
  );

drop policy "rooms: solo admin elimina" on rooms;
create policy "rooms: solo admin elimina" on rooms
  for delete using (
    public.current_user_role() = 'admin' and hotel_id = public.current_user_hotel_id()
  );

drop policy "reservations: lectura para todos los roles operativos" on reservations;
create policy "reservations: lectura para todos los roles operativos" on reservations
  for select using (
    public.current_user_role() is not null and hotel_id = public.current_user_hotel_id()
  );

-- El trigger set_hotel_id_before_insert_reservations ya fija hotel_id a
-- partir del room_id antes de que esta política se evalúe, así que el
-- chequeo de abajo rechaza cualquier intento de crear una reserva para
-- una habitación de otro hotel (aunque el rol sea válido).
drop policy "reservations: recepcion y admin crean" on reservations;
create policy "reservations: recepcion y admin crean" on reservations
  for insert with check (
    public.current_user_role() in ('recepcion','admin')
    and hotel_id = public.current_user_hotel_id()
  );

drop policy "reservations: recepcion/admin actualizan todo" on reservations;
create policy "reservations: recepcion/admin actualizan todo" on reservations
  for update using (
    public.current_user_role() in ('recepcion','admin') and hotel_id = public.current_user_hotel_id()
  );

drop policy "history: lectura autenticados" on reservation_history;
create policy "history: lectura autenticados" on reservation_history
  for select using (
    public.current_user_role() is not null and hotel_id = public.current_user_hotel_id()
  );

drop policy "cleaning_log: lectura para cuentas activas" on cleaning_log;
create policy "cleaning_log: lectura para cuentas activas" on cleaning_log
  for select using (
    public.current_user_role() is not null and hotel_id = public.current_user_hotel_id()
  );

drop policy "notifications: cada rol ve las suyas" on notifications;
create policy "notifications: cada rol ve las suyas" on notifications
  for select using (
    recipient_role = public.current_user_role() and hotel_id = public.current_user_hotel_id()
  );

drop policy "maintenance_issues: lectura para cuentas activas" on maintenance_issues;
create policy "maintenance_issues: lectura para cuentas activas" on maintenance_issues
  for select using (
    public.current_user_role() is not null and hotel_id = public.current_user_hotel_id()
  );

drop policy "room_staff_assignments: lectura para cuentas activas" on room_staff_assignments;
create policy "room_staff_assignments: lectura para cuentas activas" on room_staff_assignments
  for select using (
    public.current_user_role() is not null and hotel_id = public.current_user_hotel_id()
  );

drop policy "activity_log: lectura admin" on activity_log;
create policy "activity_log: lectura admin" on activity_log
  for select using (
    coalesce(public.current_user_role(), '') = 'admin' and hotel_id = public.current_user_hotel_id()
  );

drop policy "activity_log: insertar propio" on activity_log;
create policy "activity_log: insertar propio" on activity_log
  for insert with check (
    actor_id = auth.uid()
    and public.current_user_role() is not null
    and hotel_id = public.current_user_hotel_id()
  );

-- room_types, board_plans y app_settings no se tocan: quedan globales.

-- ── 6) Alta de usuarios: hotel_id viene de los metadatos, con fallback ──
-- Mientras solo exista un hotel, el fallback a first_hotel_id() basta.
-- En cuanto haya más de uno, el alta de usuarios (signup o admin) debe
-- mandar hotel_id explícito en raw_user_meta_data — si no, el usuario
-- nuevo cae siempre en el primer hotel creado.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, email, department, hotel_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'recepcion'),
    new.email,
    new.raw_user_meta_data->>'department',
    coalesce((new.raw_user_meta_data->>'hotel_id')::uuid, public.first_hotel_id())
  );
  return new;
end;
$$;

-- ── 7) RPCs SECURITY DEFINER: bypassean RLS, así que hay que validar
-- el hotel a mano en cada una (no basta con las políticas de arriba). El
-- patrón "auth.uid() is not null and ..." replica el que ya usaban estas
-- funciones para el chequeo de rol: si no hay sesión (cron/sistema), se
-- deja pasar; si hay sesión, tiene que ser del mismo hotel que el dato.

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

  if auth.uid() is not null and rec.hotel_id <> public.current_user_hotel_id() then
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
  if hotel_id_v <> public.current_user_hotel_id() then
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
  if hotel_id_v <> public.current_user_hotel_id() then
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
  if hotel_id_v <> public.current_user_hotel_id() then
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
  if hotel_id_v <> public.current_user_hotel_id() then
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
  if hotel_id_v <> public.current_user_hotel_id() then
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
  if hotel_id_v <> public.current_user_hotel_id() then
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

-- Notificación de "necesita limpieza": ahora incluye el hotel de la reserva.
create or replace function public.notify_room_needs_cleaning()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  room_number_v text;
begin
  if new.cleaning_status = 'PENDIENTE' and (old.cleaning_status is distinct from new.cleaning_status) then
    select number into room_number_v from rooms where id = new.room_id;
    insert into notifications (recipient_role, type, message, room_number, reservation_id, hotel_id)
    values (
      'limpieza',
      'new_cleaning_task',
      'Nueva limpieza pendiente: habitación ' || room_number_v,
      room_number_v,
      new.id,
      new.hotel_id
    );
  end if;
  return new;
end;
$$;

-- Cron de limpiezas demasiado largas: ahora agrupa por hotel al notificar.
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
