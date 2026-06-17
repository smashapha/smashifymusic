-- Run every 5 minutes to catch stuck pending transactions
SELECT cron.schedule(
  'reconcile-stuck-transactions',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/verify-payment',
    headers := json_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
      'Content-Type', 'application/json'
    )::jsonb,
    body := json_build_object('action', 'reconcile_stuck')::jsonb
  );
  $$
);
