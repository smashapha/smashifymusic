-- ==============================================================================
-- AUTHORITATIVE SMASHIFY PAYMENT & ALBUM FULFILLMENT MIGRATION
-- This script consolidates and secures the fulfillment system.
-- ==============================================================================

-- 1. EXTEND ALBUMS SCHEMA (Ensure all required columns exist)
ALTER TABLE public.albums ADD COLUMN IF NOT EXISTS price NUMERIC(10,2) DEFAULT 0;
ALTER TABLE public.albums ADD COLUMN IF NOT EXISTS is_for_sale BOOLEAN DEFAULT true;
ALTER TABLE public.albums ADD COLUMN IF NOT EXISTS discount_percent INTEGER DEFAULT 0;
ALTER TABLE public.albums ADD COLUMN IF NOT EXISTS sale_ends_at TIMESTAMPTZ;
ALTER TABLE public.albums ADD COLUMN IF NOT EXISTS genre TEXT;
ALTER TABLE public.albums ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.albums ADD COLUMN IF NOT EXISTS sales INTEGER DEFAULT 0;

-- 2. EXTEND TRANSACTIONS SCHEMA
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS return_url TEXT;

-- 2. SECURE WALLET INCREMENTER
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

-- REVOKE ALL and GRANT ONLY to service_role
REVOKE ALL ON FUNCTION public.increment_wallet(uuid, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_wallet(uuid, numeric) TO service_role;

-- 3. UNIFIED ATOMIC PAYMENT FINALIZER (Hardened)
-- SECURITY DEFINER allows it to bypass RLS, so it MUST NOT be accessible to users.
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
  v_track_ids UUID[];
  v_gross NUMERIC;
  v_net NUMERIC;
  v_track_id UUID;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  -- 1. Find and lock transaction row for update to prevent concurrent race conditions
  SELECT * INTO v_tx
  FROM public.transactions
  WHERE paychangu_ref = p_paychangu_ref OR reference = p_paychangu_ref
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transaction reference not found');
  END IF;

  -- 2. Idempotency check: Don't process already completed orders
  IF v_tx.status = 'completed' THEN
    RETURN jsonb_build_object('success', true, 'status', 'completed', 'already_processed', true, 'transaction_id', v_tx.id);
  END IF;

  -- 3. Validation: Amount matching (Protect against tampered callback data)
  -- We allow a small tolerance of 1 MWK for rounding discrepancies, but otherwise must match.
  IF p_gateway_amount IS NOT NULL AND ABS(v_tx.gross_amount - p_gateway_amount) > 1 THEN
     RETURN jsonb_build_object('success', false, 'error', 'Amount mismatch', 'expected', v_tx.gross_amount, 'received', p_gateway_amount);
  END IF;

  -- 4. Resolve metadata and fulfillment targets
  v_meta := COALESCE(v_tx.metadata, '{}'::jsonb);
  v_type := UPPER(COALESCE(v_meta->>'payment_type', v_tx.type, ''));
  v_user_id := COALESCE((v_meta->>'userId')::UUID, (v_meta->>'fan_id')::UUID, v_tx.fan_id);
  v_artist_id := COALESCE((v_meta->>'artistId')::UUID, v_tx.artist_id);
  v_song_id := (v_meta->>'songId')::UUID;
  v_album_id := (v_meta->>'albumId')::UUID;
  
  -- Snapshot logic: Favor pre-authorized track IDs in metadata from checkout time
  IF v_meta ? 'trackIds' THEN
     v_track_ids := ARRAY(SELECT jsonb_array_elements_text(v_meta->'trackIds')::UUID);
  END IF;

  v_gross := COALESCE(p_gateway_amount, v_tx.gross_amount, 0);
  v_net := v_tx.net_amount; 

  -- 5. Commit Transaction Status
  UPDATE public.transactions
  SET status = 'completed',
      gross_amount = v_gross,
      completed_at = v_now
  WHERE id = v_tx.id;

  -- 6. DISPATCH FULFILLMENT BY TYPE
  
  -- --- CASE A: Album Purchase (Snapshot or Dynamic fallback) ---
  IF v_type LIKE '%ALBUM%' OR v_album_id IS NOT NULL THEN
    IF v_user_id IS NOT NULL THEN
      DECLARE
        v_song_count INTEGER;
        v_amount_per_song NUMERIC;
      BEGIN
        -- If no snapshot, fall back to current album tracklist (less ideal but keeps legacy working)
        IF v_track_ids IS NULL AND v_album_id IS NOT NULL THEN
           v_track_ids := ARRAY(SELECT id FROM public.songs WHERE album_id = v_album_id);
        END IF;

        IF v_track_ids IS NOT NULL THEN
            v_song_count := array_length(v_track_ids, 1);
            v_amount_per_song := CASE WHEN v_song_count > 0 THEN ROUND(v_gross / v_song_count, 2) ELSE 0 END;

            -- Grant access to every track in the list
            FOR v_track_id IN SELECT unnest(v_track_ids) LOOP
              -- PRESERVE PURCHASE HISTORY: Only record as new purchase if they don't already own it.
              -- This prevents overwriting an expensive single-purchase with a cheap "album slice" amount.
              INSERT INTO public.fan_purchases (fan_id, song_id, transaction_id, amount, status, purchased_at)
              VALUES (v_user_id, v_track_id, v_tx.id, v_amount_per_song, 'completed', v_now)
              ON CONFLICT (fan_id, song_id) DO UPDATE SET 
                status = 'completed', 
                purchased_at = v_now
                WHERE fan_purchases.status != 'completed';

              UPDATE public.songs SET sales = COALESCE(sales, 0) + 1 WHERE id = v_track_id;
            END LOOP;
        END IF;
      END;

      IF v_album_id IS NOT NULL THEN
         UPDATE public.albums SET sales = COALESCE(sales, 0) + 1 WHERE id = v_album_id;
      END IF;

      -- Credit Artist
      IF v_artist_id IS NOT NULL AND v_net > 0 THEN
        PERFORM public.increment_wallet(v_artist_id, v_net);
      END IF;
    END IF;

  -- --- CASE B: Single Track Purchase ---
  ELSIF v_type LIKE '%TRACK%' OR v_type LIKE '%PURCHASE%' OR v_type = 'SALE' OR v_song_id IS NOT NULL THEN
    IF v_user_id IS NOT NULL AND v_song_id IS NOT NULL THEN
      INSERT INTO public.fan_purchases (fan_id, song_id, transaction_id, amount, status, purchased_at)
      VALUES (v_user_id, v_song_id, v_tx.id, v_gross, 'completed', v_now)
      ON CONFLICT (fan_id, song_id) DO UPDATE SET 
         status = 'completed', 
         purchased_at = v_now,
         transaction_id = v_tx.id,
         amount = v_gross;

      UPDATE public.songs SET sales = COALESCE(sales, 0) + 1 WHERE id = v_song_id;

      IF v_artist_id IS NOT NULL AND v_net > 0 THEN
        PERFORM public.increment_wallet(v_artist_id, v_net);
      END IF;
    END IF;

  -- --- CASE C: Tips / Donations ---
  ELSIF v_type LIKE '%TIP%' OR v_type = 'DONATION' THEN
    IF v_artist_id IS NOT NULL AND v_net > 0 THEN
      PERFORM public.increment_wallet(v_artist_id, v_net);
    END IF;

  -- --- CASE D: Fan Subscriptions ---
  ELSIF v_type LIKE '%FAN_SUB%' OR v_type = 'FAN_SUBSCRIPTION' THEN
    IF v_user_id IS NOT NULL AND v_artist_id IS NOT NULL THEN
      INSERT INTO public.fan_subscriptions (fan_id, artist_id, status, amount, started_at, next_billing_at)
      VALUES (v_user_id, v_artist_id, 'active', v_gross, v_now, v_now + INTERVAL '30 days')
      ON CONFLICT (fan_id, artist_id) DO UPDATE SET
        status = 'active',
        next_billing_at = v_now + INTERVAL '30 days';

      IF v_net > 0 THEN
        PERFORM public.increment_wallet(v_artist_id, v_net);
      END IF;
    END IF;
  
  -- --- CASE E: Account Upgrades (Correct Durations) ---
  ELSIF v_type LIKE '%LISTENER_%' OR v_type LIKE '%ARTIST_%' THEN
    IF v_user_id IS NOT NULL THEN
       DECLARE
         v_tier TEXT;
         v_interval INTERVAL;
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

         -- Restore Establish Entitlement Durations
         v_interval := CASE
           WHEN v_type LIKE '%DAILY%' THEN INTERVAL '1 day'
           WHEN v_type LIKE '%WEEKLY%' THEN INTERVAL '7 days'
           WHEN v_type LIKE '%ARTIST_%' THEN INTERVAL '180 days' -- Artist plans are bi-annual
           ELSE INTERVAL '30 days' -- Default monthly
         END;
         
         IF v_type LIKE '%ARTIST_%' THEN
           UPDATE public.profiles SET artist_tier = v_tier, subscription_tier = v_tier, approved = true, subscription_ends = v_now + v_interval WHERE id = v_user_id;
           -- Artists also get Premium listener features
           INSERT INTO public.user_profiles (id, subscription_tier, subscription_expires_at) VALUES (v_user_id, 'Premium', v_now + v_interval)
           ON CONFLICT (id) DO UPDATE SET subscription_tier = 'Premium', subscription_expires_at = v_now + v_interval;
         ELSE
           UPDATE public.user_profiles SET subscription_tier = v_tier, subscription_expires_at = v_now + v_interval WHERE id = v_user_id;
           UPDATE public.profiles SET subscription_tier = v_tier, subscription_ends = v_now + v_interval WHERE id = v_user_id;
         END IF;
       END;
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true, 'status', 'completed', 'transaction_id', v_tx.id);
END;
$$;

-- CRITICAL: REVOKE ALL and GRANT ONLY to service_role
REVOKE ALL ON FUNCTION public.finalize_payment_order(TEXT, NUMERIC, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_payment_order(TEXT, NUMERIC, TEXT) TO service_role;

-- 7. REFRESH ALBUM RLS
ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "albums_select_public" ON public.albums;
CREATE POLICY "albums_select_public" ON public.albums FOR SELECT USING (true);

DROP POLICY IF EXISTS "albums_insert_artist" ON public.albums;
CREATE POLICY "albums_insert_artist" ON public.albums FOR INSERT WITH CHECK (auth.uid() = artist_id OR is_admin(auth.uid()));

DROP POLICY IF EXISTS "albums_update_artist" ON public.albums;
CREATE POLICY "albums_update_artist" ON public.albums FOR UPDATE USING (auth.uid() = artist_id OR is_admin(auth.uid()));

DROP POLICY IF EXISTS "albums_delete_artist" ON public.albums;
CREATE POLICY "albums_delete_artist" ON public.albums FOR DELETE USING (auth.uid() = artist_id OR is_admin(auth.uid()));

NOTIFY pgrst, 'reload schema';
