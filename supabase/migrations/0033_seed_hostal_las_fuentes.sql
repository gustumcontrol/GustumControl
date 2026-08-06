-- rooms.number era único a nivel global (de antes de multi-hotel, migración
-- 0001). Con dos hoteles compartiendo la misma tabla rooms, cada uno
-- necesita poder tener su propia habitación "1", "3", etc. sin chocar con
-- las del otro — la unicidad debe ser por (hotel_id, number), no global.
alter table rooms drop constraint rooms_number_key;
alter table rooms add constraint rooms_hotel_id_number_key unique (hotel_id, number);

-- Segundo hotel: Hostal las Fuentes, una sola planta (12 habitaciones).
with new_hotel as (
  insert into hotels (name, slug) values ('Hostal las Fuentes', 'hostal-las-fuentes')
  returning id
)
insert into rooms (number, floor, type, capacity, hotel_id)
select v.number, '1', v.type, case v.type when 'Doble' then 2 else 3 end, new_hotel.id
from new_hotel, (values
  ('1', 'Doble'),
  ('3', 'Doble'),
  ('4', 'Doble'),
  ('6', 'Doble'),
  ('7', 'Triple'),
  ('13', 'Triple'),
  ('15', 'Triple'),
  ('16', 'Triple'),
  ('18', 'Triple'),
  ('19', 'Triple'),
  ('20', 'Triple'),
  ('21', 'Triple')
) as v(number, type);
