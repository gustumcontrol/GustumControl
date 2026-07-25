-- ── Datos adicionales de perfil para la pantalla de administración de
-- usuarios: email (denormalizado desde auth.users para no necesitar
-- service_role en la app), departamento, estado, y última actividad.
alter table profiles add column email text;
alter table profiles add column department text;
alter table profiles add column status text not null default 'active'
  check (status in ('active', 'inactive', 'suspended'));
alter table profiles add column last_active timestamptz;

-- Backfill de las cuentas que ya existían.
update profiles p
set email = u.email,
    last_active = u.last_sign_in_at
from auth.users u
where u.id = p.id and p.email is null;

-- El trigger de alta ahora también guarda email y departamento.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, email, department)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'recepcion'),
    new.email,
    new.raw_user_meta_data->>'department'
  );
  return new;
end;
$$;

-- Mantiene profiles.last_active sincronizado con cada inicio de sesión real
-- (auth.users.last_sign_in_at lo actualiza Supabase Auth automáticamente).
create or replace function public.handle_user_sign_in()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.last_sign_in_at is distinct from old.last_sign_in_at then
    update public.profiles set last_active = new.last_sign_in_at where id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_sign_in
  after update on auth.users
  for each row execute function public.handle_user_sign_in();

-- ── Seguridad: una cuenta desactivada/suspendida pierde todo permiso
-- basado en rol, no solo el acceso a la UI. Al hacer que current_user_role()
-- devuelva NULL para status != 'active', todas las policies que dependen
-- de ella (reservations, rooms, etc.) automáticamente le niegan el paso,
-- aunque su sesión de Supabase siga técnicamente activa.
create or replace function public.current_user_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role from profiles where id = auth.uid() and status = 'active';
$$;
