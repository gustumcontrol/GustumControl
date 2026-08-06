-- Cambia la prioridad por defecto de las incidencias de mantenimiento de
-- MEDIA a BAJA (tanto la columna como el default del RPC de creación).
alter table maintenance_issues alter column priority set default 'BAJA';

create or replace function open_maintenance_issue(
  p_room_id uuid,
  p_description text,
  p_photo_urls text[] default '{}',
  p_priority text default 'BAJA'
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
  priority_v text := coalesce(p_priority, 'BAJA');
begin
  if coalesce(current_user_role(), '') not in ('recepcion', 'mantenimiento', 'admin') then
    raise exception 'No autorizado';
  end if;

  if priority_v not in ('BAJA', 'MEDIA', 'ALTA', 'URGENTE') then
    raise exception 'Prioridad inválida: %', priority_v;
  end if;

  select hotel_id, number into hotel_id_v, room_number_v from rooms where id = p_room_id;
  if hotel_id_v is null then
    raise exception 'Habitación no encontrada';
  end if;
  if hotel_id_v <> public.current_user_hotel_id() then
    raise exception 'No autorizado';
  end if;

  insert into maintenance_issues (room_id, description, photo_urls, priority, opened_by)
  values (p_room_id, p_description, coalesce(p_photo_urls, '{}'), priority_v, auth.uid())
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
    jsonb_build_object('room_number', room_number_v, 'description', p_description, 'priority', priority_v),
    hotel_id_v
  );

  return v_id;
end;
$$;
