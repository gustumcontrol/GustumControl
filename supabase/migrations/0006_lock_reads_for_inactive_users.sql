-- Las policies de lectura usaban auth.role() = 'authenticated', que no
-- distingue una cuenta activa de una suspendida/inactiva. current_user_role()
-- ya devuelve NULL para cuentas no activas, así que basta con exigir que
-- no sea NULL.
drop policy "reservations: lectura para todos los roles operativos" on reservations;
create policy "reservations: lectura para todos los roles operativos" on reservations
  for select using (public.current_user_role() is not null);

drop policy "history: lectura autenticados" on reservation_history;
create policy "history: lectura autenticados" on reservation_history
  for select using (public.current_user_role() is not null);

drop policy "room_types: lectura autenticados" on room_types;
create policy "room_types: lectura autenticados" on room_types
  for select using (public.current_user_role() is not null);

drop policy "rooms: lectura para cualquier usuario autenticado" on rooms;
create policy "rooms: lectura para cualquier usuario autenticado" on rooms
  for select using (public.current_user_role() is not null);
