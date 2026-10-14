-- Calls the app's /api/cron/tick every 10 minutes (checklist + reminder pushes).
-- Run once per environment, with your deployed URL and the CRON_SECRET value:
--   select public.schedule_tick('https://your-app.vercel.app', '<CRON_SECRET>');
create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function public.schedule_tick(app_url text, cron_secret text)
returns void
language plpgsql security definer
as $fn$
begin
  perform cron.unschedule('pt-helper-tick')
  where exists (select 1 from cron.job where jobname = 'pt-helper-tick');
  perform cron.schedule(
    'pt-helper-tick',
    '*/10 * * * *',
    format(
      $job$select net.http_post(url := %L, headers := %L::jsonb)$job$,
      app_url || '/api/cron/tick',
      json_build_object('Authorization', 'Bearer ' || cron_secret)::text
    )
  );
end
$fn$;

revoke all on function public.schedule_tick(text, text) from public, anon, authenticated;
