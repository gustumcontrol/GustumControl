create table board_plans (
  name text primary key,
  price_per_person numeric not null
);

alter table board_plans enable row level security;

create policy "board_plans_select_all" on board_plans
  for select
  using (true);

insert into board_plans (name, price_per_person) values
  ('Media pensión', 62),
  ('Pensión completa', 75);

alter table reservations add column board_plan text references board_plans(name) on update cascade on delete set null;
alter table reservation_history add column board_plan text;

-- close_reservation debe copiar board_plan al archivar.
create or replace function close_reservation(p_reservation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  rec reservations%rowtype;
  room_number_v text;
  room_floor_v text;
  room_type_v text;
begin
  if auth.uid() is not null
     and coalesce(public.current_user_role(), '') not in ('recepcion', 'admin') then
    raise exception 'No autorizado';
  end if;

  select * into rec from reservations where id = p_reservation_id and status = 'ACTIVA';
  if not found then
    raise exception 'Reserva no encontrada o ya cerrada';
  end if;

  select number, floor, type into room_number_v, room_floor_v, room_type_v
  from rooms where id = rec.room_id;

  insert into reservation_history (
    original_reservation_id, room_number, floor, guest_name, guests_count,
    check_in, check_out, nights, room_type, price_per_night, total,
    payment_method, notes, country, municipio, provincia, board_plan
  ) values (
    rec.id, room_number_v, room_floor_v, rec.guest_name, rec.guests_count,
    rec.check_in, rec.check_out, rec.nights, room_type_v, rec.price_per_night, rec.total,
    rec.payment_method, rec.notes, rec.country, rec.municipio, rec.provincia, rec.board_plan
  );

  update reservations
    set status = 'CERRADA',
        closed_at = now(),
        cleaning_status = case when cleaning_status = 'NO' then 'PENDIENTE' else cleaning_status end
    where id = p_reservation_id;
end;
$$;
