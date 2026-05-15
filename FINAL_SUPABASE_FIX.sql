-- SMASHIFY FINAL DATABASE FIX
-- Run this in your Supabase SQL Editor to fix all recent issues

-- PART 0: ENSURE PROFILES TABLE IS SOLID
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    stage_name TEXT,
    email TEXT,
    phone TEXT,
    avatar_url TEXT,
    banner_url TEXT,
    bio TEXT,
    wallet_balance DECIMAL(12,2) DEFAULT 0,
    artist_tier TEXT DEFAULT 'Free',
    subscription_tier TEXT DEFAULT 'Free',
    is_admin BOOLEAN DEFAULT false,
    approved BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PART 1: FIX PAYOUT REQUESTS TABLE
-- We ensure the table exists and has the correct foreign key to PROFILES
CREATE TABLE IF NOT EXISTS public.payout_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    artist_id UUID NOT NULL,
    requested_amount DECIMAL(12,2) NOT NULL,
    phone TEXT NOT NULL,
    network TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    reference TEXT UNIQUE,
    paychangu_reference TEXT,
    error_message TEXT,
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Re-link the foreign key to avoid ANY constraint issues from old versions
-- We link to profiles(id). If this fails, the user is not in the profiles table.
ALTER TABLE public.payout_requests DROP CONSTRAINT IF EXISTS payout_requests_artist_id_fkey;
ALTER TABLE public.payout_requests ADD CONSTRAINT payout_requests_artist_id_fkey 
    FOREIGN KEY (artist_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Handle legacy columns
DO $$ 
BEGIN 
    -- Ensure columns are nullable if they still exist from previous failed migrations
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payout_requests' AND column_name='amount') THEN
        ALTER TABLE public.payout_requests ALTER COLUMN amount DROP NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payout_requests' AND column_name='payout_amount') THEN
        ALTER TABLE public.payout_requests ALTER COLUMN payout_amount DROP NOT NULL;
    END IF;
    
    -- Ensure phone inconsistency is handled
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payout_requests' AND column_name='phone') THEN
        ALTER TABLE public.payout_requests ADD COLUMN phone TEXT;
    END IF;
END $$;

-- Update RLS policies for payout_requests
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payout_select" ON public.payout_requests;
CREATE POLICY "payout_select" 
ON public.payout_requests FOR SELECT 
USING (auth.uid() = artist_id OR (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)));

DROP POLICY IF EXISTS "payout_insert" ON public.payout_requests;
CREATE POLICY "payout_insert" 
ON public.payout_requests FOR INSERT 
WITH CHECK (auth.uid() = artist_id);

DROP POLICY IF EXISTS "payout_update_admin" ON public.payout_requests;
CREATE POLICY "payout_update_admin" 
ON public.payout_requests FOR UPDATE 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));


-- PART 2: FIX TRANSACTIONS CONSTRAINTS
ALTER TABLE public.transactions 
DROP CONSTRAINT IF EXISTS transactions_type_check;

ALTER TABLE public.transactions 
ADD CONSTRAINT transactions_type_check 
CHECK (type IN ('sale', 'donation', 'subscription', 'upgrade', 'promotion', 'withdrawal', 'other'));


-- PART 3: PAYOUT ELIGIBILITY TRIGGER (REPAIRED)
-- We must remove the balance check from the trigger because the Edge Function 
-- already deducts the balance BEFORE inserting into this table. 
-- Keeping the check in the trigger causes a double-deduction failure.

CREATE OR REPLACE FUNCTION check_payout_eligibility()
RETURNS TRIGGER AS $$
BEGIN
  -- Minimum amount safety only
  IF NEW.requested_amount < 2000 THEN
    RAISE EXCEPTION 'Minimum payout is MK 2,000.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-attach trigger
DROP TRIGGER IF EXISTS tr_payout_eligibility ON public.payout_requests;
CREATE TRIGGER tr_payout_eligibility
  BEFORE INSERT ON public.payout_requests
  FOR EACH ROW EXECUTE FUNCTION check_payout_eligibility();

-- PART 4: REFRESH CACHE
NOTIFY pgrst, 'reload schema';
