-- The edge function already deducts on submission
-- so the trigger must NOT deduct again
-- Drop the conflicting trigger entirely
DROP TRIGGER IF EXISTS tr_wallet_payout ON public.payout_requests;

-- Also drop the function since edge function handles all wallet logic
DROP FUNCTION IF EXISTS deduct_wallet_on_payout();

-- Fix the wallet balance for your test account
-- (replace the amount with actual correct balance)
UPDATE profiles
SET wallet_balance = 10000
WHERE id = '27f5655e-1895-4c05-b47a-f8c3602877f3';

NOTIFY pgrst, 'reload schema';
