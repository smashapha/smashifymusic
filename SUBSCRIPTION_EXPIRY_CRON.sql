-- Enable pg_cron extension (run once as superuser)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Nightly job at 1am: reset expired listener subscriptions
SELECT cron.schedule(
  'expire-listener-subscriptions',
  '0 1 * * *',
  $$
  UPDATE public.user_profiles
  SET
    subscription_tier = 'Free',
    subscription_expires_at = NULL
  WHERE
    subscription_tier != 'Free'
    AND subscription_expires_at IS NOT NULL
    AND subscription_expires_at < NOW();
  $$
);

-- Nightly job at 2am: vault expired artist tracks and reset tier
SELECT cron.schedule(
  'expire-artist-tiers',
  '0 2 * * *',
  $$
  UPDATE public.profiles
  SET artist_tier = 'Free', is_paused = true
  WHERE artist_tier != 'Free'
    AND subscription_ends IS NOT NULL
    AND subscription_ends < NOW() - INTERVAL '7 days'; -- 7 day grace period
  $$
);

-- Verify jobs are registered:
-- SELECT * FROM cron.job;
