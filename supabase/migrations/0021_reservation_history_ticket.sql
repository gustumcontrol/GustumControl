alter table reservation_history add column ticket text;

create policy "history: update recepcion/admin" on reservation_history
  for update
  using (coalesce(current_user_role(), '') in ('recepcion', 'admin'))
  with check (coalesce(current_user_role(), '') in ('recepcion', 'admin'));
