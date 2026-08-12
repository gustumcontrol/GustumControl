-- ── Corrige supply_requests: activity_log.hotel_id no se estaba pasando
-- (esa tabla no lo deriva por trigger, hay que pasarlo explícito, igual
-- que ya hacen close_reservation/open_maintenance_issue/etc). Aprovecha
-- para agregar el mismo chequeo de hotel_id que el resto de las RPCs
-- (admin puede operar en cualquier hotel, el resto solo en el suyo).
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
  hotel_id_v uuid;
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

  select hotel_id, number into hotel_id_v, room_number_v from rooms where id = p_room_id;
  if hotel_id_v is null then
    raise exception 'Habitación no encontrada';
  end if;
  if current_user_role() <> 'admin' and hotel_id_v <> current_user_hotel_id() then
    raise exception 'No autorizado';
  end if;

  insert into supply_requests (room_id, category, item, quantity, notes, requested_by)
  values (p_room_id, p_category, p_item, coalesce(p_quantity, 1), p_notes, auth.uid())
  returning id into v_id;

  insert into activity_log (actor_id, action, entity_type, entity_id, description, metadata, hotel_id)
  values (
    auth.uid(),
    case p_category when 'LIMPIEZA' then 'supply_requested_cleaning' else 'supply_requested_maintenance' end,
    'supply_request', v_id,
    'Pidió ' || p_item || ' para la habitación ' || coalesce(room_number_v, '?'),
    jsonb_build_object('room_number', room_number_v, 'item', p_item, 'quantity', coalesce(p_quantity, 1)),
    hotel_id_v
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
  hotel_id_v uuid;
begin
  select sr.category, sr.item, sr.hotel_id, r.number
    into category_v, item_v, hotel_id_v, room_number_v
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

  if current_user_role() <> 'admin' and hotel_id_v <> current_user_hotel_id() then
    raise exception 'No autorizado';
  end if;

  update supply_requests
  set status = 'COMPRADO', purchased_at = now(), purchased_by = auth.uid()
  where id = p_id and status = 'PENDIENTE';

  insert into activity_log (actor_id, action, entity_type, entity_id, description, metadata, hotel_id)
  values (
    auth.uid(),
    case category_v when 'LIMPIEZA' then 'supply_purchased_cleaning' else 'supply_purchased_maintenance' end,
    'supply_request', p_id,
    'Marcó como comprado ' || item_v || ' para la habitación ' || coalesce(room_number_v, '?'),
    jsonb_build_object('room_number', room_number_v, 'item', item_v),
    hotel_id_v
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
  hotel_id_v uuid;
begin
  select category, hotel_id into category_v, hotel_id_v from supply_requests where id = p_id;

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

  if current_user_role() <> 'admin' and hotel_id_v <> current_user_hotel_id() then
    raise exception 'No autorizado';
  end if;

  delete from supply_requests where id = p_id;
end;
$$;
