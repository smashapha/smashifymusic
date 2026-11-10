-- ==============================================================================
-- SMASHIFY PAYMENT HARDENING & DATABASE SECURITY MIGRATION
-- ==============================================================================

-- 1. Ensure columns exist on fan_subscriptions
ALTER TABLE public.fan_subscriptions ADD COLUMN IF NOT EXISTS amount NUMERIC(10,2) DEFAULT 0;
ALTER TABLE public.fan_subscriptions ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.fan_subscriptions ADD COLUMN IF NOT EXISTS next_billing_at TIMESTAMPTZ;
ALTER TABLE public.fan_subscriptions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fan_subscriptions_fan_artist_unique'
  ) THEN
    ALTER TABLE public.fan_subscriptions ADD CONSTRAINT fan_subscriptions_fan_artist_unique UNIQUE (fan_id, artist_id);
  END IF;
END $$;

-- 2. Ensure columns exist on profiles & user_profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_price NUMERIC(10,2) DEFAULT 1500;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS platform_fee INTEGER DEFAULT 15;
ALTER TABLE public.agent_commissions ADD COLUMN IF NOT EXISTS tier TEXT;

-- 3. Revoke public/anon/authenticated execute permissions on generic financial RPCs
REVOKE EXECUTE ON FUNCTION public.increment_wallet(uuid, numeric) FROM PUBLIC, anon, authenticated;

-- Hardened increment_wallet function with pinned search_path
CREATE OR REPLACE FUNCTION public.increment_wallet(artist_id uuid, amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF amount IS NULL OR amount <= 0 THEN
    RETURN;
  END IF;
  UPDATE public.profiles
  SET wallet_balance = COALESCE(wallet_balance, 0) + amount,
      updated_at = NOW()
  WHERE id = artist_id;
END;
$$;

-- Grant execute ONLY to service_role
GRANT EXECUTE ON FUNCTION public.increment_wallet(uuid, numeric) TO service_role;

-- 4. Drop outdated / incompatible triggers on transactions
DROP TRIGGER IF EXISTS tr_wallet_transaction ON transactions;
DROP FUNCTION IF EXISTS update_wallet_on_transaction() CASCADE;

-- 5. Fix protect_profile_columns trigger to prevent NULL auth.uid() bypass
CREATE OR REPLACE FUNCTION protect_profile_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role TEXT;
BEGIN
  v_role := COALESCE(current_setting('role', true), '');
  
  -- Service role and system admins are trusted
  IF v_role = 'service_role' OR (auth.uid() IS NOT NULL AND is_admin(auth.uid())) THEN
     RETURN NEW;
  END IF;

  -- End users CANNOT change wallet_balance
  IF OLD.wallet_balance IS DISTINCT FROM NEW.wallet_balance THEN
     NEW.wallet_balance = OLD.wallet_balance;
  END IF;

  -- End users CANNOT change subscription_tier (except resetting to free on expiration)
  IF OLD.subscription_tier IS DISTINCT FROM NEW.subscription_tier THEN
     IF NEW.subscription_tier != 'free' THEN
       NEW.subscription_tier = OLD.subscription_tier;
     END IF;
  END IF;

  -- End users CANNOT change artist_tier
  IF OLD.artist_tier IS DISTINCT FROM NEW.artist_tier THEN
     NEW.artist_tier = OLD.artist_tier;
  END IF;
  
  -- End users CANNOT approve their own accounts
  IF OLD.approved IS DISTINCT FROM NEW.approved THEN
     NEW.approved = OLD.approved;
  END IF;

  -- End users CANNOT elevate to admin
  IF OLD.is_admin IS DISTINCT FROM NEW.is_admin THEN
     NEW.is_admin = OLD.is_admin;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_protect_profile_columns ON profiles;
CREATE TRIGGER tr_protect_profile_columns
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION protect_profile_columns();

-- Protect listener columns trigger
CREATE OR REPLACE FUNCTION protect_listener_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role TEXT;
BEGIN
  v_role := COALESCE(current_setting('role', true), '');
  IF v_role = 'service_role' OR (auth.uid() IS NOT NULL AND is_admin(auth.uid())) THEN
     RETURN NEW;
  END IF;

  IF OLD.subscription_tier IS DISTINCT FROM NEW.subscription_tier THEN
     IF NEW.subscription_tier != 'free' THEN
       NEW.subscription_tier = OLD.subscription_tier;
     END IF;
  END IF;

  IF OLD.is_admin IS DISTINCT FROM NEW.is_admin AND OLD.is_admin = false THEN
     NEW.is_admin = OLD.is_admin;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_protect_listener_columns ON user_profiles;
CREATE TRIGGER tr_protect_listener_columns
BEFORE UPDATE ON user_profiles
FOR EACH ROW
EXECUTE FUNCTION protect_listener_columns();

-- 6. Atomic Finalizer for Verified Payments (Single Source of Truth)
CREATE OR REPLACE FUNCTION public.finalize_payment_order(
  p_paychangu_ref TEXT,
  p_gateway_amount NUMERIC DEFAULT NULL,
  p_gateway_status TEXT DEFAULT 'successful'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_tx RECORD;
  v_meta JSONB;
  v_type TEXT;
  v_user_id UUID;
  v_artist_id UUID;
  v_song_id UUID;
  v_gross NUMERIC;
  v_net NUMERIC;
  v_fee NUMERIC;
BEGIN
  -- Lock transaction row for update
  SELECT * INTO v_tx
  FROM public.transactions
  WHERE paychangu_ref = p_paychangu_ref OR reference = p_paychangu_ref
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transaction reference not found');
  END IF;

  -- If already completed, return success idempotently
  IF v_tx.status = 'completed' THEN
    RETURN jsonb_build_object('success', true, 'status', 'completed', 'already_processed', true, 'transaction_id', v_tx.id);
  END IF;

  IF v_tx.status = 'failed' AND LOWER(p_gateway_status) NOT IN ('successful', 'success', 'paid') THEN
    RETURN jsonb_build_object('success', false, 'status', 'failed', 'already_processed', true);
  END IF;

  v_meta := COALESCE(v_tx.metadata, '{}'::jsonb);
  v_type := UPPER(COALESCE(v_meta->>'payment_type', v_tx.type, ''));
  v_user_id := COALESCE((v_meta->>'userId')::UUID, (v_meta->>'fan_id')::UUID, v_tx.fan_id);
  v_artist_id := COALESCE((v_meta->>'artistId')::UUID, v_tx.artist_id);
  v_song_id := (v_meta->>'songId')::UUID;
  
  v_gross := COALESCE(p_gateway_amount, v_tx.gross_amount, 0);
  v_net := COALESCE(v_tx.net_amount, v_gross);
  v_fee := COALESCE(v_tx.platform_fee, 0);

  -- Update transaction to completed
  UPDATE public.transactions
  SET status = 'completed',
      gross_amount = v_gross,
      completed_at = NOW()
  WHERE id = v_tx.id;

  -- Apply Fulfillments
  IF v_type LIKE '%TRACK%' OR v_type LIKE '%PURCHASE%' OR v_type = 'SALE' OR v_song_id IS NOT NULL THEN
    IF v_user_id IS NOT NULL AND v_song_id IS NOT NULL THEN
      INSERT INTO public.fan_purchases (fan_id, song_id, transaction_id, amount, status, purchased_at)
      VALUES (v_user_id, v_song_id, v_tx.id, v_gross, 'completed', NOW())
      ON CONFLICT (fan_id, song_id) DO UPDATE SET status = 'completed', purchased_at = NOW();

      UPDATE public.songs SET sales = COALESCE(sales, 0) + 1 WHERE id = v_song_id;

      IF v_artist_id IS NOT NULL AND v_net > 0 THEN
        PERFORM public.increment_wallet(v_artist_id, v_net);
      END IF;
    END IF;

  ELSIF v_type LIKE '%TIP%' OR v_type = 'DONATION' THEN
    IF v_artist_id IS NOT NULL AND v_net > 0 THEN
      PERFORM public.increment_wallet(v_artist_id, v_net);
    END IF;

  ELSIF v_type LIKE '%FAN_SUB%' OR v_type = 'FAN_SUBSCRIPTION' THEN
    IF v_user_id IS NOT NULL AND v_artist_id IS NOT NULL THEN
      INSERT INTO public.fan_subscriptions (fan_id, artist_id, status, amount, started_at, next_billing_at, expires_at)
      VALUES (v_user_id, v_artist_id, 'active', v_gross, NOW(), NOW() + INTERVAL '30 days', NOW() + INTERVAL '30 days')
      ON CONFLICT (fan_id, artist_id) DO UPDATE SET
        status = 'active',
        amount = EXCLUDED.amount,
        next_billing_at = NOW() + INTERVAL '30 days',
        expires_at = NOW() + INTERVAL '30 days';

      IF v_net > 0 THEN
        PERFORM public.increment_wallet(v_artist_id, v_net);
      END IF;
    END IF;

  ELSIF v_type LIKE '%LISTENER%' OR v_type LIKE '%PREMIUM%' OR v_type LIKE '%DAILY%' OR v_type LIKE '%WEEKLY%' OR v_type LIKE '%FAMILY%' THEN
    IF v_user_id IS NOT NULL THEN
      DECLARE
        v_days INT := 30;
        v_tier_name TEXT := 'Premium';
      BEGIN
        IF v_type LIKE '%DAILY%' THEN v_days := 1; v_tier_name := 'DailyPass';
        ELSIF v_type LIKE '%WEEKLY%' THEN v_days := 7; v_tier_name := 'WeeklyPass';
        ELSIF v_type LIKE '%FAMILY%' THEN v_days := 30; v_tier_name := 'Family';
        END IF;

        INSERT INTO public.user_profiles (id, subscription_tier, subscription_expires_at)
        VALUES (v_user_id, v_tier_name, NOW() + (v_days || ' days')::INTERVAL)
        ON CONFLICT (id) DO UPDATE SET
          subscription_tier = v_tier_name,
          subscription_expires_at = NOW() + (v_days || ' days')::INTERVAL;
          
        UPDATE public.profiles
        SET subscription_tier = v_tier_name,
            subscription_ends = NOW() + (v_days || ' days')::INTERVAL
        WHERE id = v_user_id;
      END;
    END IF;

  ELSIF v_type LIKE '%ARTIST_%' AND v_type NOT LIKE '%AD_CAMPAIGN%' THEN
    IF v_user_id IS NOT NULL THEN
      DECLARE
        v_tier_name TEXT := 'Standard';
      BEGIN
        IF v_type LIKE '%RISING%' THEN v_tier_name := 'RisingStar';
        ELSIF v_type LIKE '%ELITE%' THEN v_tier_name := 'Elite';
        END IF;

        UPDATE public.profiles
        SET subscription_tier = v_tier_name,
            artist_tier = v_tier_name,
            subscription_ends = NOW() + INTERVAL '180 days',
            approved = true
        WHERE id = v_user_id;

        INSERT INTO public.user_profiles (id, subscription_tier, subscription_expires_at)
        VALUES (v_user_id, 'Premium', NOW() + INTERVAL '180 days')
        ON CONFLICT (id) DO UPDATE SET
          subscription_tier = 'Premium',
          subscription_expires_at = NOW() + INTERVAL '180 days';
      END;
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true, 'status', 'completed', 'transaction_id', v_tx.id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.finalize_payment_order(TEXT, NUMERIC, TEXT) TO service_role;

-- 7. Consolidate Song SELECT Policies to Fix Permissive OR Override
DROP POLICY IF EXISTS "songs_select_public" ON public.songs;
DROP POLICY IF EXISTS "songs_select_exclusive" ON public.songs;

CREATE POLICY "songs_select_unified" ON public.songs
FOR SELECT USING (
  (
    COALESCE(approved, false) = true 
    AND (release_date IS NULL OR release_date::date <= NOW()::date)
    AND (
      COALESCE(is_exclusive, false) = false
      OR artist_id = auth.uid()
      OR is_admin(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.fan_subscriptions
        WHERE fan_id = auth.uid()
          AND artist_id = songs.artist_id
          AND status = 'active'
      )
      OR EXISTS (
        SELECT 1 FROM public.fan_purchases
        WHERE fan_id = auth.uid()
          AND song_id = songs.id
          AND status = 'completed'
      )
    )
  )
  OR auth.uid() = artist_id
  OR is_admin(auth.uid())
);

-- 8. Fix fan_subscriptions permissive policies
DROP POLICY IF EXISTS "fan_sub_insert_public" ON public.fan_subscriptions;
DROP POLICY IF EXISTS "fan_sub_update_public" ON public.fan_subscriptions;
