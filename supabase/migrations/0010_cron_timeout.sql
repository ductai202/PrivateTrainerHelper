-- pg_net gives an HTTP call only 2 seconds by default; the tick can take longer (several pushes,
-- Zalo messages). Allow 30 seconds and send an explicit JSON content type.
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
      $job$select net.http_post(url := %L, headers := %L::jsonb, timeout_milliseconds := 30000)$job$,
      app_url || '/api/cron/tick',
      json_build_object(
        'Authorization', 'Bearer ' || cron_secret,
        'Content-Type', 'application/json'
      )::text
    )
  );
end
$fn$;

revoke all on function public.schedule_tick(text, text) from public, anon, authenticated;
