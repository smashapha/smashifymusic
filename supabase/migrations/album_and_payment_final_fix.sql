-- ==============================================================================
-- FINAL SMASHIFY ALBUM & PAYMENT SYSTEM CONSOLIDATION
-- This script fixes the "Buy Full Album" feature and unified fulfillment logic.
-- Run this in your Supabase SQL Editor.
-- ==============================================================================

-- 1. EXTEND ALBUMS SCHEMA
ALTER TABLE public.albums ADD COLUMN IF NOT EXISTS price NUMERIC(10,2) DEFAULT 0;
ALTER TABLE public.albums ADD COLUMN IF NOT EXISTS is_for_sale BOOLEAN DEFAULT true;
ALTER TABLE public.albums ADD COLUMN IF NOT EXISTS discount_percent INTEGER DEFAULT 0;
ALTER TABLE public.albums ADD COLUMN IF NOT EXISTS sale_ends_at TIMESTAMPTZ;
ALTER TABLE public.albums ADD COLUMN IF NOT EXISTS genre TEXT;
ALTER TABLE public.albums ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.albums ADD COLUMN IF NOT EXISTS sales INTEGER DEFAULT 0;

-- 2. HELPER FUNCTIONS
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles WHERE id = user_id AND is_admin = true
  ) OR EXISTS (
    SELECT 1 FROM public.user_profiles WHERE id = user_id AND is_admin = true
  ) OR user_id IN (
    SELECT id FROM auth.users WHERE email = 'smashtherealmuzic@gmail.com'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. HARDENED WALLET INCREMENTER
CREATE OR REPLACE FUNCTION public.increment_wallet(artist_id uuid, amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
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

REVOKE EXECUTE ON FUNCTION public.increment_wallet(uuid, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_wallet(uuid, numeric) TO service_role;

-- 4. UNIFIED ATOMIC PAYMENT FINALIZER
-- Note: search_path removed to prevent conflict with encrypted column triggers/pgsodium
CREATE OR REPLACE FUNCTION public.finalize_payment_order(
  p_paychangu_ref TEXT,
  p_gateway_amount NUMERIC DEFAULT NULL,
  p_gateway_status TEXT DEFAULT 'successful'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tx RECORD;
  v_meta JSONB;
  v_type TEXT;
  v_user_id UUID;
  v_artist_id UUID;
  v_song_id UUID;
  v_album_id UUID;
  v_gross NUMERIC;
  v_net NUMERIC;
  v_song RECORD;
BEGIN
  -- 1. Find and lock transaction
  SELECT * INTO v_tx
  FROM public.transactions
  WHERE paychangu_ref = p_paychangu_ref OR reference = p_paychangu_ref
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transaction reference not found');
  END IF;

  -- 2. Idempotency check
  IF v_tx.status = 'completed' THEN
    RETURN jsonb_build_object('success', true, 'status', 'completed', 'already_processed', true, 'transaction_id', v_tx.id);
  END IF;

  -- 3. Resolve metadata and types
  v_meta := COALESCE(v_tx.metadata, '{}'::jsonb);
  v_type := UPPER(COALESCE(v_meta->>'payment_type', v_tx.type, ''));
  v_user_id := COALESCE((v_meta->>'userId')::UUID, (v_meta->>'fan_id')::UUID, v_tx.fan_id);
  v_artist_id := COALESCE((v_meta->>'artistId')::UUID, v_tx.artist_id);
  v_song_id := (v_meta->>'songId')::UUID;
  v_album_id := (v_meta->>'albumId')::UUID;
  
  v_gross := COALESCE(p_gateway_amount, v_tx.gross_amount, 0);
  v_net := COALESCE(v_tx.net_amount, v_gross);

  -- 4. Mark transaction as completed
  UPDATE public.transactions
  SET status = 'completed',
      gross_amount = v_gross,
      completed_at = NOW()
  WHERE id = v_tx.id;

  -- 5. FULFILLMENT LOGIC
  
  -- CASE A: Full Album Purchase
  IF v_type LIKE '%ALBUM%' OR v_album_id IS NOT NULL THEN
    IF v_user_id IS NOT NULL AND v_album_id IS NOT NULL THEN
      DECLARE
        v_song_count INTEGER;
        v_amount_per_song NUMERIC;
      BEGIN
        SELECT COUNT(*) INTO v_song_count FROM public.songs WHERE album_id = v_album_id;
        v_amount_per_song := CASE WHEN v_song_count > 0 THEN ROUND(v_gross / v_song_count, 2) ELSE 0 END;

        -- Grant access to all songs in the album
        FOR v_song IN SELECT id FROM public.songs WHERE album_id = v_album_id LOOP
          INSERT INTO public.fan_purchases (fan_id, song_id, transaction_id, amount, status, purchased_at)
          VALUES (v_user_id, v_song.id, v_tx.id, v_amount_per_song, 'completed', NOW())
          ON CONFLICT (fan_id, song_id) DO UPDATE SET 
            status = 'completed', 
            purchased_at = NOW(),
            transaction_id = v_tx.id,
            amount = v_amount_per_song;

          UPDATE public.songs SET sales = COALESCE(sales, 0) + 1 WHERE id = v_song.id;
        END LOOP;
      END;

      -- Update album sales stats
      UPDATE public.albums SET sales = COALESCE(sales, 0) + 1 WHERE id = v_album_id;

      -- Credit artist
      IF v_artist_id IS NOT NULL AND v_net > 0 THEN
        PERFORM public.increment_wallet(v_artist_id, v_net);
      END IF;
    END IF;

  -- CASE B: Single Track Purchase
  ELSIF v_type LIKE '%TRACK%' OR v_type LIKE '%PURCHASE%' OR v_type = 'SALE' OR v_song_id IS NOT NULL THEN
    IF v_user_id IS NOT NULL AND v_song_id IS NOT NULL THEN
      INSERT INTO public.fan_purchases (fan_id, song_id, transaction_id, amount, status, purchased_at)
      VALUES (v_user_id, v_song_id, v_tx.id, v_gross, 'completed', NOW())
      ON CONFLICT (fan_id, song_id) DO UPDATE SET status = 'completed', purchased_at = NOW();

      UPDATE public.songs SET sales = COALESCE(sales, 0) + 1 WHERE id = v_song_id;

      IF v_artist_id IS NOT NULL AND v_net > 0 THEN
        PERFORM public.increment_wallet(v_artist_id, v_net);
      END IF;
    END IF;

  -- CASE C: Tips / Donations
  ELSIF v_type LIKE '%TIP%' OR v_type = 'DONATION' THEN
    IF v_artist_id IS NOT NULL AND v_net > 0 THEN
      PERFORM public.increment_wallet(v_artist_id, v_net);
    END IF;

  -- CASE D: Subscriptions
  ELSIF v_type LIKE '%FAN_SUB%' OR v_type = 'FAN_SUBSCRIPTION' THEN
    IF v_user_id IS NOT NULL AND v_artist_id IS NOT NULL THEN
      INSERT INTO public.fan_subscriptions (fan_id, artist_id, status, amount, started_at, next_billing_at)
      VALUES (v_user_id, v_artist_id, 'active', v_gross, NOW(), NOW() + INTERVAL '30 days')
      ON CONFLICT (fan_id, artist_id) DO UPDATE SET
        status = 'active',
        next_billing_at = NOW() + INTERVAL '30 days';

      IF v_net > 0 THEN
        PERFORM public.increment_wallet(v_artist_id, v_net);
      END IF;
    END IF;
  
  -- CASE E: Account Upgrades
  ELSIF v_type LIKE '%LISTENER_%' OR v_type LIKE '%ARTIST_%' THEN
    -- Account tiers are handled by checking the transactions table on login,
    -- but we can update profiles here too for immediate effect.
    IF v_user_id IS NOT NULL THEN
       DECLARE
         v_tier TEXT;
       BEGIN
         v_tier := CASE 
           WHEN v_type LIKE '%DAILY%' THEN 'DailyPass'
           WHEN v_type LIKE '%WEEKLY%' THEN 'WeeklyPass'
           WHEN v_type LIKE '%PREMIUM%' THEN 'Premium'
           WHEN v_type LIKE '%FAMILY%' THEN 'Family'
           WHEN v_type LIKE '%RISING%' THEN 'RisingStar'
           WHEN v_type LIKE '%STANDARD%' THEN 'Standard'
           WHEN v_type LIKE '%ELITE%' THEN 'Elite'
           ELSE 'free'
         END;
         
         IF v_type LIKE '%ARTIST_%' THEN
           UPDATE public.profiles SET artist_tier = v_tier, subscription_tier = v_tier, approved = true, subscription_ends = NOW() + INTERVAL '180 days' WHERE id = v_user_id;
           INSERT INTO public.user_profiles (id, subscription_tier, subscription_expires_at) VALUES (v_user_id, 'Premium', NOW() + INTERVAL '180 days')
           ON CONFLICT (id) DO UPDATE SET subscription_tier = 'Premium', subscription_expires_at = NOW() + INTERVAL '180 days';
         ELSE
           UPDATE public.user_profiles SET subscription_tier = v_tier, subscription_expires_at = NOW() + INTERVAL '30 days' WHERE id = v_user_id;
           UPDATE public.profiles SET subscription_tier = v_tier, subscription_ends = NOW() + INTERVAL '30 days' WHERE id = v_user_id;
         END IF;
       END;
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true, 'status', 'completed', 'transaction_id', v_tx.id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.finalize_payment_order(TEXT, NUMERIC, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.finalize_payment_order(TEXT, NUMERIC, TEXT) TO authenticated;

-- 5. REFRESH ALBUM RLS
ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "albums_select_public" ON public.albums;
CREATE POLICY "albums_select_public" ON public.albums 
FOR SELECT USING (true);

DROP POLICY IF EXISTS "albums_insert_artist" ON public.albums;
CREATE POLICY "albums_insert_artist" ON public.albums 
FOR INSERT WITH CHECK (auth.uid() = artist_id OR is_admin(auth.uid()));

DROP POLICY IF EXISTS "albums_update_artist" ON public.albums;
CREATE POLICY "albums_update_artist" ON public.albums 
FOR UPDATE USING (auth.uid() = artist_id OR is_admin(auth.uid()));

DROP POLICY IF EXISTS "albums_delete_artist" ON public.albums;
CREATE POLICY "albums_delete_artist" ON public.albums 
FOR DELETE USING (auth.uid() = artist_id OR is_admin(auth.uid()));

-- 6. ENSURE NOTIFICATIONS TABLE HAS LINKS
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS link TEXT;

-- 7. NOTIFY POSTGREST
NOTIFY pgrst, 'reload schema';
