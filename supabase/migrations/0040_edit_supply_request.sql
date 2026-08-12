-- ── edit_supply_request: permite corregir un pedido ya creado ──────────
create or replace function edit_supply_request(
  p_id uuid,
  p_item text,
  p_quantity integer,
  p_notes text default null
)
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

  update supply_requests
  set item = p_item, quantity = p_quantity, notes = p_notes
  where id = p_id;
end;
$$;
