-- Enable pg_cron and refresh public snapshots hourly.
-- (On Supabase, pg_cron may need to be enabled in the dashboard once; this is
--  idempotent and safe to re-run.)
create extension if not exists pg_cron;

select cron.unschedule('refresh-snapshots-hourly')
where exists (select 1 from cron.job where jobname = 'refresh-snapshots-hourly');

select cron.schedule('refresh-snapshots-hourly', '0 * * * *', $$select public.refresh_due_snapshots()$$);
