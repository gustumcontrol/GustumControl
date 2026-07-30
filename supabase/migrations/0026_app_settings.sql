-- Interruptor de mantenimiento del sitio. Fila única (id = 1), sin política
-- de escritura: solo se cambia directamente desde la base de datos (SQL),
-- nunca desde la propia web. Se lee desde el middleware, antes que
-- cualquier otra lógica de auth/rutas, para cerrar el acceso a todos los
-- roles (incluido admin) cuando maintenance_mode = true.
create table app_settings (
  id int primary key default 1 check (id = 1),
  maintenance_mode boolean not null default false
);

insert into app_settings (id, maintenance_mode) values (1, false);

alter table app_settings enable row level security;

-- Lectura pública (incluso sin sesión): el middleware necesita poder leer
-- esto para bloquear la propia página de login.
create policy "app_settings: lectura pública" on app_settings
  for select
  using (true);
