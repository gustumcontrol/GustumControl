create or replace function public.cleanup_old_notifications()
returns void
language sql
security definer
set search_path = public
as $$
  delete from notifications where created_at < now() - interval '8 hours';
$$;

select cron.schedule(
  'cleanup-old-notifications',
  '*/30 * * * *',
  $$select public.cleanup_old_notifications();$$
);
