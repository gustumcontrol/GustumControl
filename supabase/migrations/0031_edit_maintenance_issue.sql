-- Permite editar la descripción y/o agregar más fotos a una incidencia
-- de mantenimiento ya existente (sin tocar su estado).
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
begin
  if coalesce(current_user_role(), '') not in ('recepcion', 'mantenimiento', 'admin') then
    raise exception 'No autorizado';
  end if;

  update maintenance_issues
  set description = coalesce(nullif(trim(p_description), ''), description),
      photo_urls = photo_urls || coalesce(p_new_photo_urls, '{}')
  where id = p_issue_id;

  select r.number into room_number_v
  from maintenance_issues mi
  join rooms r on r.id = mi.room_id
  where mi.id = p_issue_id;

  insert into activity_log (actor_id, action, entity_type, entity_id, description, metadata)
  values (
    auth.uid(),
    'maintenance_edited',
    'maintenance_issue',
    p_issue_id,
    'Editó la incidencia de mantenimiento de la habitación ' || room_number_v,
    jsonb_build_object('room_number', room_number_v)
  );
end;
$$;
