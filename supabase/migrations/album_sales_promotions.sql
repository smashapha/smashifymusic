-- ==============================================================================
-- ALBUM PURCHASES AND PROMOTIONS SCHEMA MIGRATION
-- ==============================================================================

-- 1. Add pricing, promotional, and metadata columns to albums table
ALTER TABLE public.albums ADD COLUMN IF NOT EXISTS price NUMERIC(10,2) DEFAULT 0;
ALTER TABLE public.albums ADD COLUMN IF NOT EXISTS is_for_sale BOOLEAN DEFAULT true;
ALTER TABLE public.albums ADD COLUMN IF NOT EXISTS discount_percent INTEGER DEFAULT 0;
ALTER TABLE public.albums ADD COLUMN IF NOT EXISTS sale_ends_at TIMESTAMPTZ;
ALTER TABLE public.albums ADD COLUMN IF NOT EXISTS genre TEXT;
ALTER TABLE public.albums ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.albums ADD COLUMN IF NOT EXISTS sales INTEGER DEFAULT 0;

-- 2. Update atomic finalizer to support album purchases
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
  v_album_id UUID;
  v_gross NUMERIC;
  v_net NUMERIC;
  v_fee NUMERIC;
  v_song RECORD;
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
  v_album_id := (v_meta->>'albumId')::UUID;
  
  v_gross := COALESCE(p_gateway_amount, v_tx.gross_amount, 0);
  v_net := COALESCE(v_tx.net_amount, v_gross);
  v_fee := COALESCE(v_tx.platform_fee, 0);

  -- Update transaction to completed
  UPDATE public.transactions
  SET status = 'completed',
      gross_amount = v_gross,
      completed_at = NOW()
  WHERE id = v_tx.id;

  -- 1. Full Album Purchase
  IF v_type LIKE '%ALBUM%' OR v_album_id IS NOT NULL THEN
    IF v_user_id IS NOT NULL AND v_album_id IS NOT NULL THEN
      -- Grant purchases for all tracks in this album
      FOR v_song IN SELECT id FROM public.songs WHERE album_id = v_album_id LOOP
        INSERT INTO public.fan_purchases (fan_id, song_id, transaction_id, amount, status, purchased_at)
        VALUES (v_user_id, v_song.id, v_tx.id, v_gross, 'completed', NOW())
        ON CONFLICT (fan_id, song_id) DO UPDATE SET status = 'completed', purchased_at = NOW();

        UPDATE public.songs SET sales = COALESCE(sales, 0) + 1 WHERE id = v_song.id;
      END LOOP;

      UPDATE public.albums SET sales = COALESCE(sales, 0) + 1 WHERE id = v_album_id;

      IF v_artist_id IS NOT NULL AND v_net > 0 THEN
        PERFORM public.increment_wallet(v_artist_id, v_net);
      END IF;
    END IF;

  -- 2. Single Track Purchase
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

  -- 3. Tips / Donations
  ELSIF v_type LIKE '%TIP%' OR v_type = 'DONATION' THEN
    IF v_artist_id IS NOT NULL AND v_net > 0 THEN
      PERFORM public.increment_wallet(v_artist_id, v_net);
    END IF;

  -- 4. Fan Subscriptions
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

  -- 5. Listener Subscriptions
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

  -- 6. Artist Tier Subscriptions
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
