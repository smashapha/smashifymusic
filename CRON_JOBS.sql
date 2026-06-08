-- Enable pg_cron (run once in Supabase SQL Editor)
-- Nightly vault check at 2am
SELECT cron.schedule(
  'vault-expired-tracks',
  '0 2 * * *',
  'SELECT vault_expired_artist_tracks();'
);

-- Nightly slot reclassification at 3am
SELECT cron.schedule(
  'reclassify-song-slots',
  '0 3 * * *',
  'SELECT reclassify_song_slots();'
);

-- Monthly plays reset on 1st of each month at 4am
SELECT cron.schedule(
  'reset-monthly-plays',
  '0 4 1 * *',
  'UPDATE public.songs SET plays_this_month = 0;'
);

-- Daily renewal warning check at 9am
SELECT cron.schedule(
  'renewal-warnings',
  '0 9 * * *',
  'SELECT net.http_post(url := current_setting(''app.supabase_url'') || ''/functions/v1/send-renewal-warnings'', headers := json_build_object(''Authorization'', ''Bearer '' || current_setting(''app.service_role_key''))::jsonb);'
);
