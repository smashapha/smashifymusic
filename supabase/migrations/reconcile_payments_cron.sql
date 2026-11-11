-- RECONCILIATION CRON JOB
-- This script schedules a job to call the reconciliation Edge Function every hour.

-- Ensure pg_cron and pg_net are available
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the job
SELECT cron.schedule(
  'reconcile-stuck-payments-job',
  '0 * * * *', -- Every hour
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/reconcile-stuck-payments',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Note: We rely on app_config having the necessary keys. 
-- If they aren't there, we can fallback to environment variables if the platform supports it, 
-- but in Supabase SQL Editor, we can also use:
-- current_setting('app.settings.supabase_url') if configured in the dashboard.
