-- ==============================================================================
-- AUTHORITATIVE SMASHIFY PAYMENT & ALBUM FULFILLMENT MIGRATION (V4)
-- Consolidates all previous versions and fixes syntax/search_path issues.
-- ==============================================================================

-- 1. CLEANUP PREVIOUS OVERLOADS
-- Drops the various versions to avoid ambiguity
DROP FUNCTION IF EXISTS public.finalize_payment_order(TEXT, NUMERIC, TEXT);
DROP FUNCTION IF EXISTS public.finalize_payment_order(TEXT, NUMERIC, TEXT, BOOLEAN);

-- 2. EXTEND SCHEMA (Idempotent)
ALTER TABLE public.albums ADD COLUMN IF NOT EXISTS price NUMERIC(10,2) DEFAULT 0;
ALTER TABLE public.albums ADD COLUMN IF NOT EXISTS is_for_sale BOOLEAN DEFAULT true;
ALTER TABLE public.albums ADD COLUMN IF NOT EXISTS discount_percent INTEGER DEFAULT 0;
ALTER TABLE public.albums ADD COLUMN IF NOT EXISTS sale_ends_at TIMESTAMPTZ;
ALTER TABLE public.albums ADD COLUMN IF NOT EXISTS sales INTEGER DEFAULT 0;

ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS return_url TEXT;

-- 3. HELPER: Admin Check
DROP FUNCTION IF EXISTS public.is_admin(UUID);
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

-- 4. SECURE WALLET INCREMENTER
DROP FUNCTION IF EXISTS public.increment_wallet(uuid, numeric);
CREATE OR REPLACE FUNCTION public.increment_wallet(artist_id uuid, amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, auth, extensions, pgsodium
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

REVOKE ALL ON FUNCTION public.increment_wallet(uuid, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_wallet(uuid, numeric) TO service_role;

-- 5. UNIFIED ATOMIC PAYMENT FINALIZER (Hardened V4)
-- Removed semicolon between search_path and AS
CREATE OR REPLACE FUNCTION public.finalize_payment_order(
  p_paychangu_ref TEXT,
  p_gateway_amount NUMERIC DEFAULT NULL,
  p_gateway_status TEXT DEFAULT 'successful',
  p_force_repair BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, auth, extensions, pgsodium
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
  -- 1. Find and lock transaction row
  SELECT * INTO v_tx
  FROM public.transactions
  WHERE paychangu_ref = p_paychangu_ref OR reference = p_paychangu_ref
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transaction reference not found');
  END IF;

  -- 2. Idempotency Check (Unless force repair)
  IF v_tx.status = 'completed' AND NOT p_force_repair THEN
    RETURN jsonb_build_object('success', true, 'status', 'completed', 'already_processed', true, 'transaction_id', v_tx.id);
  END IF;

  -- 3. Validation: Amount matching (1 MWK tolerance for rounding)
  IF p_gateway_amount IS NOT NULL AND v_tx.gross_amount IS NOT NULL THEN
     IF ABS(v_tx.gross_amount - p_gateway_amount) > 1 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Amount mismatch', 'expected', v_tx.gross_amount, 'received', p_gateway_amount);
     END IF;
  END IF;

  -- 4. Resolve metadata
  v_meta := COALESCE(v_tx.metadata, '{}'::jsonb);
  -- Normalize type to UPPER for internal comparison, handles frontend lowercase
  v_type := UPPER(COALESCE(v_meta->>'payment_type', v_tx.type, ''));
  v_user_id := COALESCE((v_meta->>'userId')::UUID, (v_meta->>'fan_id')::UUID, v_tx.fan_id);
  v_artist_id := COALESCE((v_meta->>'artistId')::UUID, v_tx.artist_id);
  v_song_id := (v_meta->>'songId')::UUID;
  v_album_id := (v_meta->>'albumId')::UUID;
  
  -- Load snapshot if available
  IF v_meta ? 'trackIds' THEN
     v_track_ids := ARRAY(SELECT jsonb_array_elements_text(v_meta->'trackIds')::UUID);
  END IF;

  v_gross := COALESCE(p_gateway_amount, v_tx.gross_amount, 0);
  v_net := v_tx.net_amount; 

  -- 5. Mark status
  IF v_tx.status != 'completed' THEN
    UPDATE public.transactions
    SET status = 'completed',
        gross_amount = v_gross,
        completed_at = v_now
    WHERE id = v_tx.id;
  END IF;

  -- 6. DISPATCH FULFILLMENT
  
  -- CASE A: TRACK_PURCHASE
  IF v_type = 'TRACK_PURCHASE' OR (v_type = 'SALE' AND v_song_id IS NOT NULL) THEN
    IF v_user_id IS NOT NULL AND v_song_id IS NOT NULL THEN
      INSERT INTO public.fan_purchases (fan_id, song_id, transaction_id, amount, status, purchased_at)
      VALUES (v_user_id, v_song_id, v_tx.id, v_gross, 'completed', v_now)
      ON CONFLICT (fan_id, song_id) DO UPDATE SET 
         status = 'completed', 
         purchased_at = v_now,
         transaction_id = v_tx.id,
         amount = v_gross;

      IF NOT p_force_repair THEN
        UPDATE public.songs SET sales = COALESCE(sales, 0) + 1 WHERE id = v_song_id;
        IF v_artist_id IS NOT NULL AND v_net > 0 THEN
          PERFORM public.increment_wallet(v_artist_id, v_net);
        END IF;
      END IF;
    END IF;

  -- CASE B: ALBUM_PURCHASE
  ELSIF v_type = 'ALBUM_PURCHASE' OR (v_type = 'SALE' AND v_album_id IS NOT NULL) THEN
    IF v_user_id IS NOT NULL THEN
      -- Use snapshot if available, else current tracks as fallback for very old orders
      IF v_track_ids IS NULL AND v_album_id IS NOT NULL THEN
         v_track_ids := ARRAY(SELECT id FROM public.songs WHERE album_id = v_album_id);
      END IF;

      IF v_track_ids IS NOT NULL THEN
          DECLARE
            v_song_count INTEGER := array_length(v_track_ids, 1);
            v_amount_per_song NUMERIC := CASE WHEN v_song_count > 0 THEN ROUND(v_gross / v_song_count, 2) ELSE 0 END;
          BEGIN
            FOR v_track_id IN SELECT unnest(v_track_ids) LOOP
              INSERT INTO public.fan_purchases (fan_id, song_id, transaction_id, amount, status, purchased_at)
              VALUES (v_user_id, v_track_id, v_tx.id, v_amount_per_song, 'completed', v_now)
              ON CONFLICT (fan_id, song_id) DO UPDATE SET 
                status = 'completed', 
                purchased_at = v_now
                WHERE fan_purchases.status != 'completed';
              
              IF NOT p_force_repair THEN
                UPDATE public.songs SET sales = COALESCE(sales, 0) + 1 WHERE id = v_track_id;
              END IF;
            END LOOP;
          END;
      END IF;

      IF NOT p_force_repair THEN
        IF v_album_id IS NOT NULL THEN
           UPDATE public.albums SET sales = COALESCE(sales, 0) + 1 WHERE id = v_album_id;
        END IF;
        IF v_artist_id IS NOT NULL AND v_net > 0 THEN
          PERFORM public.increment_wallet(v_artist_id, v_net);
        END IF;
      END IF;
    END IF;

  -- CASE C: TIP / DONATION
  ELSIF v_type = 'TIP' OR v_type = 'DONATION' THEN
    IF NOT p_force_repair AND v_artist_id IS NOT NULL AND v_net > 0 THEN
      PERFORM public.increment_wallet(v_artist_id, v_net);
    END IF;

  -- CASE D: FAN_SUBSCRIPTION
  ELSIF v_type = 'FAN_SUBSCRIPTION' THEN
    IF v_user_id IS NOT NULL AND v_artist_id IS NOT NULL THEN
      INSERT INTO public.fan_subscriptions (fan_id, artist_id, status, amount, started_at, next_billing_at)
      VALUES (v_user_id, v_artist_id, 'active', v_gross, v_now, v_now + INTERVAL '30 days')
      ON CONFLICT (fan_id, artist_id) DO UPDATE SET
        status = 'active',
        next_billing_at = v_now + INTERVAL '30 days';

      IF NOT p_force_repair AND v_net > 0 THEN
        PERFORM public.increment_wallet(v_artist_id, v_net);
      END IF;
    END IF;

  -- CASE E: ARTIST_AD_CAMPAIGN / PROMOTION
  ELSIF v_type = 'ARTIST_AD_CAMPAIGN' OR v_type = 'PROMOTION' THEN
    UPDATE public.transactions SET metadata = v_meta || '{"fulfilled": true}'::jsonb WHERE id = v_tx.id;
    -- Note: Ad campaign activation logic should ideally be triggered here or via a separate worker watching this flag

  -- CASE F: LISTENER/ARTIST TIERS
  ELSIF v_type LIKE 'LISTENER_%' OR v_type LIKE 'ARTIST_%' THEN
    IF v_user_id IS NOT NULL THEN
       DECLARE
         v_tier TEXT;
         v_interval INTERVAL;
         v_base_time TIMESTAMPTZ := COALESCE(v_tx.created_at, v_now);
       BEGIN
         v_tier := CASE 
           WHEN v_type LIKE '%DAILY%' THEN 'DailyPass'
           WHEN v_type LIKE '%WEEKLY%' THEN 'WeeklyPass'
           WHEN v_type LIKE '%PREMIUM%' THEN 'Premium'
           WHEN v_type LIKE '%FAMILY%' THEN 'Family'
           WHEN v_type LIKE '%RISINGSTAR%' THEN 'RisingStar'
           WHEN v_type LIKE '%STANDARD%' THEN 'Standard'
           WHEN v_type LIKE '%ELITE%' THEN 'Elite'
           ELSE 'free'
         END;

         v_interval := CASE
           WHEN v_type LIKE '%DAILY%' THEN INTERVAL '1 day'
           WHEN v_type LIKE '%WEEKLY%' THEN INTERVAL '7 days'
           WHEN v_type LIKE '%ARTIST_%' THEN INTERVAL '180 days'
           ELSE INTERVAL '30 days'
         END;
         
         IF v_type LIKE 'ARTIST_%' THEN
           UPDATE public.profiles SET artist_tier = v_tier, subscription_tier = v_tier, approved = true, subscription_ends = v_base_time + v_interval WHERE id = v_user_id;
           INSERT INTO public.user_profiles (id, subscription_tier, subscription_expires_at) VALUES (v_user_id, 'Premium', v_base_time + v_interval)
           ON CONFLICT (id) DO UPDATE SET subscription_tier = 'Premium', subscription_expires_at = v_base_time + v_interval;
         ELSE
           UPDATE public.user_profiles SET subscription_tier = v_tier, subscription_expires_at = v_base_time + v_interval WHERE id = v_user_id;
           UPDATE public.profiles SET subscription_tier = v_tier, subscription_ends = v_base_time + v_interval WHERE id = v_user_id;
         END IF;
       END;
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true, 'status', 'completed', 'transaction_id', v_tx.id);
END;
$$;

-- REVOKE and GRANT
REVOKE ALL ON FUNCTION public.finalize_payment_order(TEXT, NUMERIC, TEXT, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_payment_order(TEXT, NUMERIC, TEXT, BOOLEAN) TO service_role;

-- 8. REPAIR: Specific Albums
UPDATE public.albums SET price = 1500, is_for_sale = true 
WHERE id IN ('e14a4995-03b9-4f16-ab7a-c8694d0a7608', '7c998e8c-06ad-4603-a6ae-61cd73f8d91e') 
AND (price IS NULL OR price = 0);

-- 9. REPAIR: Historical unfulfilled orders (bounded)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT paychangu_ref FROM public.transactions 
    WHERE status = 'completed' AND (type = 'sale' OR type = 'subscription')
    AND completed_at > NOW() - INTERVAL '30 days'
    LIMIT 100
  ) LOOP
    PERFORM public.finalize_payment_order(r.paychangu_ref, NULL, 'successful', true);
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
