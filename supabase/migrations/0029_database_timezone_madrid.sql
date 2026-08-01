-- El hotel opera en España (Valladolid, horario de Madrid). La base de
-- datos corría en UTC por defecto, lo que desalineaba "hoy" (current_date,
-- usado en room_status y en el cierre automático de reservas) respecto al
-- calendario real del hotel durante la 1-2 horas posteriores a la
-- medianoche española. Se fija la zona horaria de la base de datos para
-- que current_date/now() resuelvan siempre en hora de Madrid.
alter database postgres set timezone to 'Europe/Madrid';
