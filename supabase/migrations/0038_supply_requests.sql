-- ── Pedidos de suministros por habitación (limpieza y mantenimiento) ───
-- Lista de cosas que hay que comprar (sábanas, escobas, bombillos...),
-- asociadas siempre a una habitación, separadas por categoría para que
-- cada equipo vea solo lo suyo. hotel_id se deriva del room_id igual que
-- reservations/maintenance_issues/room_staff_assignments.
create table supply_requests (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references hotels(id),
  room_id uuid not null references rooms(id),
  category text not null check (category in ('LIMPIEZA', 'MANTENIMIENTO')),
  item text not null,
  quantity integer not null default 1 check (quantity > 0),
  notes text,
  status text not null default 'PENDIENTE' check (status in ('PENDIENTE', 'COMPRADO')),
  requested_by uuid references profiles(id),
  requested_at timestamptz not null default now(),
  purchased_by uuid references profiles(id),
  purchased_at timestamptz
);

create index on supply_requests (hotel_id, category, status);
create index on supply_requests (room_id);

alter table supply_requests enable row level security;

create policy "supply_requests: lectura para cuentas activas" on supply_requests
  for select using (
    current_user_role() is not null
    and (current_user_role() = 'admin' or hotel_id = current_user_hotel_id())
  );

create trigger set_hotel_id_before_insert_supply_requests
  before insert on supply_requests
  for each row execute function public.set_hotel_id_from_room();

alter publication supabase_realtime add table supply_requests;

create or replace function add_supply_request(
  p_room_id uuid,
  p_category text,
  p_item text,
  p_quantity integer default 1,
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
  allowed_roles text[];
begin
  if p_category not in ('LIMPIEZA', 'MANTENIMIENTO') then
    raise exception 'Categoría inválida: %', p_category;
  end if;

  allowed_roles := case p_category
    when 'LIMPIEZA' then array['limpieza', 'admin']
    else array['mantenimiento', 'admin']
  end;

  if not (coalesce(current_user_role(), '') = any(allowed_roles)) then
    raise exception 'No autorizado';
  end if;

  insert into supply_requests (room_id, category, item, quantity, notes, requested_by)
  values (p_room_id, p_category, p_item, coalesce(p_quantity, 1), p_notes, auth.uid())
  returning id into v_id;

  select number into room_number_v from rooms where id = p_room_id;

  insert into activity_log (actor_id, action, entity_type, entity_id, description, metadata)
  values (
    auth.uid(),
    case p_category when 'LIMPIEZA' then 'supply_requested_cleaning' else 'supply_requested_maintenance' end,
    'supply_request', v_id,
    'Pidió ' || p_item || ' para la habitación ' || coalesce(room_number_v, '?'),
    jsonb_build_object('room_number', room_number_v, 'item', p_item, 'quantity', coalesce(p_quantity, 1))
  );

  return v_id;
end;
$$;

create or replace function mark_supply_request_purchased(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  category_v text;
  room_number_v text;
  item_v text;
begin
  select sr.category, sr.item, r.number
    into category_v, item_v, room_number_v
  from supply_requests sr join rooms r on r.id = sr.room_id
  where sr.id = p_id;

  if category_v is null then
    raise exception 'Pedido no encontrado';
  end if;

  if not (
    coalesce(current_user_role(), '') = any(
      case category_v
        when 'LIMPIEZA' then array['limpieza', 'admin']
        else array['mantenimiento', 'admin']
      end
    )
  ) then
    raise exception 'No autorizado';
  end if;

  update supply_requests
  set status = 'COMPRADO', purchased_at = now(), purchased_by = auth.uid()
  where id = p_id and status = 'PENDIENTE';

  insert into activity_log (actor_id, action, entity_type, entity_id, description, metadata)
  values (
    auth.uid(),
    case category_v when 'LIMPIEZA' then 'supply_purchased_cleaning' else 'supply_purchased_maintenance' end,
    'supply_request', p_id,
    'Marcó como comprado ' || item_v || ' para la habitación ' || coalesce(room_number_v, '?'),
    jsonb_build_object('room_number', room_number_v, 'item', item_v)
  );
end;
$$;

create or replace function delete_supply_request(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  category_v text;
begin
  select category into category_v from supply_requests where id = p_id;

  if category_v is null then
    raise exception 'Pedido no encontrado';
  end if;

  if not (
    coalesce(current_user_role(), '') = any(
      case category_v
        when 'LIMPIEZA' then array['limpieza', 'admin']
        else array['mantenimiento', 'admin']
      end
    )
  ) then
    raise exception 'No autorizado';
  end if;

  delete from supply_requests where id = p_id;
end;
$$;
