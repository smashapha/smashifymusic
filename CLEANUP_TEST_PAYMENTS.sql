-- ==============================================================================
-- Smashify - Cleanup Test Payments
-- ==============================================================================
-- This script cleans up the test transactions (Tips and Fan Subscriptions) 
-- that were mistakenly registered as "System" due to the missing artist_id bug.
-- It safely removes them without affecting genuine data or platform balances.
-- ==============================================================================

BEGIN;

-- 1. Remove the raw webhook logs for the bugged transactions
DELETE FROM public.webhook_logs
WHERE tx_ref IN (
  SELECT paychangu_ref 
  FROM public.transactions 
  WHERE artist_id IS NULL 
    AND type IN ('tip', 'donation', 'subscription', 'fan_subscription')
);

-- 2. Remove the actual bugged test transactions from the ledger
DELETE FROM public.transactions 
WHERE artist_id IS NULL 
  AND type IN ('tip', 'donation', 'subscription', 'fan_subscription');

-- 3. (Optional) If you created 'System Upgrade' tests and want to clear them too, uncomment this:
-- DELETE FROM public.transactions WHERE type = 'upgrade' AND artist_id IS NULL;

-- 4. (Optional) If you have any test sales to clear that went to system:
-- DELETE FROM public.transactions WHERE type = 'sale' AND artist_id IS NULL;

COMMIT;
