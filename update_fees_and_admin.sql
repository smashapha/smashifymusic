-- Update Fee Structure and Admin Wallet Logic
-- Run this in your Supabase SQL Editor

-- 1. Ensure platform_fee exists in profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS platform_fee INTEGER DEFAULT 15;

-- 2. Function to calculate fees based on Artist Tier
-- Rising Star: 10%
-- Standard: 7%
-- Elite: 5%
CREATE OR REPLACE FUNCTION get_tier_fee(tier TEXT) 
RETURNS INTEGER AS $$
BEGIN
    RETURN CASE 
        WHEN tier = 'Elite' THEN 5
        WHEN tier = 'Standard' THEN 7
        ELSE 10 -- Rising Star or Default
    END;
END;
$$ LANGUAGE plpgsql;

-- 3. Update existing profiles with tier-based fees
UPDATE public.profiles p
SET platform_fee = get_tier_fee(up.tier)
FROM public.user_profiles up
WHERE p.id = up.id AND up.role = 'artist';

-- 4. Track Admin Wallet (Platform Revenue)
-- Create a table for platform statistics or use a central admin profile
-- For this app, we assume an 'admin' role profile exists or we track it via a new table

CREATE TABLE IF NOT EXISTS public.platform_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    amount DECIMAL NOT NULL,
    source TEXT NOT NULL, -- 'subscription', 'tip', 'donation', 'ad'
    reference_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Trigger to update artist revenue correctly taking tier into account
-- (This logic is mostly handled in server.ts but good to have in DB)

-- Example RPC for marking as paid and adjusting balance
CREATE OR REPLACE FUNCTION process_payout_settlement(payout_id UUID)
RETURNS VOID AS $$
DECLARE
    artist_id UUID;
    amount DECIMAL;
BEGIN
    SELECT artist_id, requested_amount INTO artist_id, amount 
    FROM payout_requests WHERE id = payout_id;
    
    UPDATE profiles 
    SET wallet_balance = wallet_balance - amount 
    WHERE id = artist_id;
    
    UPDATE payout_requests 
    SET status = 'paid' 
    WHERE id = payout_id;
END;
$$ LANGUAGE plpgsql;
