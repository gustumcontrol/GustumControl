-- ── Bug fix: room_status marcaba OCUPADA cualquier habitación con una
-- reserva ACTIVA, sin importar si la fecha de hoy caía dentro del rango.
-- Una reserva futura (cargada por adelantado) pintaba la habitación como
-- ocupada desde el momento en que se creaba. Esta vista separa tres casos:
-- la reserva que cubre HOY, la última ya finalizada sin limpiar, y la
-- próxima reserva futura (que no ocupa el cuarto hoy, solo lo reserva).
drop view room_status;

create view room_status as
select
  r.id as room_id,
  r.number,
  r.floor,
  r.type,
  r.capacity,
  case
    when coalesce(current_res.maintenance_status, finished_res.maintenance_status) is not null
         and coalesce(current_res.maintenance_status, finished_res.maintenance_status) <> 'NO'
      then 'MANTENIMIENTO'
    when current_res.id is not null
      then 'OCUPADA'
    when finished_res.id is not null and finished_res.cleaning_status <> 'LIMPIADO'
      then 'PENDIENTE LIMPIEZA'
    when future_res.id is not null
      then 'RESERVADA'
    else 'LIBRE'
  end as computed_status,
  coalesce(current_res.id, finished_res.id, future_res.id) as reservation_id,
  coalesce(current_res.guest_name, finished_res.guest_name, future_res.guest_name) as guest_name,
  coalesce(current_res.check_in, finished_res.check_in, future_res.check_in) as check_in,
  coalesce(current_res.check_out, finished_res.check_out, future_res.check_out) as check_out,
  coalesce(current_res.cleaning_status, finished_res.cleaning_status) as cleaning_status,
  coalesce(current_res.maintenance_status, finished_res.maintenance_status) as maintenance_status
from rooms r
-- La reserva que cubre hoy (check_in <= hoy <= check_out): a lo sumo una,
-- garantizado por la exclusion constraint que impide solapamientos.
left join lateral (
  select * from reservations res
  where res.room_id = r.id
    and res.status = 'ACTIVA'
    and res.check_in <= current_date
    and res.check_out >= current_date
  limit 1
) current_res on true
-- La última reserva ya finalizada (check_out < hoy), para saber si falta
-- limpieza, sea cual sea su estado real.
left join lateral (
  select * from reservations res
  where res.room_id = r.id
    and res.status = 'ACTIVA'
    and res.check_out < current_date
  order by res.check_out desc
  limit 1
) finished_res on true
-- La próxima reserva futura (check_in > hoy), solo para marcar "reservada"
-- sin que eso pinte la habitación como ocupada hoy.
left join lateral (
  select * from reservations res
  where res.room_id = r.id
    and res.status = 'ACTIVA'
    and res.check_in > current_date
  order by res.check_in asc
  limit 1
) future_res on true
where r.active = true;

-- ── Restricción: no permitir dos reservas ACTIVA con fechas solapadas
-- para la misma habitación. Nada lo impedía hasta ahora.
create extension if not exists btree_gist;

alter table reservations
  add constraint reservations_no_overlap
  exclude using gist (
    room_id with =,
    daterange(check_in, check_out, '[)') with &&
  )
  where (status = 'ACTIVA');
