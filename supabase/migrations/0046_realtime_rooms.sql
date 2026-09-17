-- "Mandar a limpieza" escribe en `rooms.cleaning_status`, pero el tablero
-- de habitaciones (room-grid.tsx) y la lista de limpieza escuchan cambios
-- en tablas específicas para saber cuándo refrescar. `rooms` nunca se había
-- agregado a la publicación de Realtime (a diferencia de `reservations`,
-- que sí lo está pero no por una migración de este repo), así que un
-- cambio en `rooms` no disparaba ningún refresco — había que recargar la
-- página a mano. Idempotente por si ya estuviera agregada de otra forma.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'rooms'
  ) then
    alter publication supabase_realtime add table rooms;
  end if;
end $$;
