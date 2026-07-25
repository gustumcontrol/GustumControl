-- Para mostrar "quién" hizo un cambio (bitácora de limpieza, historial de
-- reservas por created_by) hace falta que el personal activo pueda leer
-- los nombres de sus compañeros, no solo el propio.
create policy "profiles: lectura para cuentas activas" on profiles
  for select using (public.current_user_role() is not null);
