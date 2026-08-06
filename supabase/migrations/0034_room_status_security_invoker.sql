-- La vista room_status corría con SECURITY DEFINER implícito (comportamiento
-- por defecto de Postgres si no se especifica security_invoker), es decir,
-- con los privilegios del dueño de la vista — lo que bypasea por completo
-- las políticas RLS de rooms/reservations/maintenance_issues/etc. Esto no
-- importaba cuando solo había un hotel, pero ahora significa que CUALQUIER
-- usuario vería las habitaciones de TODOS los hoteles a través del
-- dashboard, sin importar el filtro de hotel_id que se acaba de agregar.
-- security_invoker = true hace que la vista respete las políticas RLS del
-- usuario que consulta, igual que si consultara las tablas directamente.
alter view room_status set (security_invoker = true);
