-- Fix 3: Downgrade Protection Window
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS downgrade_grace_ends TIMESTAMP WITH TIME ZONE;

-- Fix 5: Auto-Renewal Options
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_renew_tier TEXT,
  ADD COLUMN IF NOT EXISTS auto_renew_cycle TEXT DEFAULT 'monthly';

-- Fix 7: Race Condition Lock during Renewals
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS renewal_in_progress BOOLEAN DEFAULT false;

-- Enhance the vaulting function with all new fair use business rules
CREATE OR REPLACE FUNCTION vault_expired_artist_tracks()
RETURNS void AS $$
DECLARE
  r RECORD;
  max_slots INT;
  active_cnt INT;
BEGIN
  -- 1. Vault expired subscriptions (with 7-day grace period)
  FOR r IN
    SELECT id FROM public.profiles
    WHERE artist_tier != 'Free'
      AND is_legacy = false
      AND is_paused = false
      AND renewal_in_progress = false
      AND subscription_ends IS NOT NULL
      AND subscription_ends < NOW() - INTERVAL '7 days'
  LOOP
    -- Demote to Free tier
    UPDATE public.profiles
    SET is_paused = true, artist_tier = 'Free'
    WHERE id = r.id;

    -- Vault tracks beyond the free tier top 3
    UPDATE public.songs
    SET
      is_active = false,
      vaulted_at = NOW(),
      vaulted_reason = 'subscription_expired'
    WHERE artist_id = r.id
      AND is_active = true
      AND id NOT IN (
        SELECT id FROM public.songs
        WHERE artist_id = r.id
          AND is_active = true
        ORDER BY plays DESC, created_at ASC
        LIMIT 3
      );
  END LOOP;

  -- 2. Process expired downgrade grace periods (Fix 3)
  FOR r IN
    SELECT id, artist_tier, extra_track_slots FROM public.profiles
    WHERE downgrade_grace_ends IS NOT NULL
      AND downgrade_grace_ends < NOW()
      AND renewal_in_progress = false
  LOOP
    -- Calculate new slots threshold
    max_slots := CASE lower(artist_tier)
      WHEN 'free' THEN 3
      WHEN 'risingstar' THEN 10
      WHEN 'standard' THEN 15
      WHEN 'elite' THEN 25
      ELSE 3
    END;
    max_slots := max_slots + (COALESCE(r.extra_track_slots, 0) * 10);

    -- Get current active songs count
    SELECT count(*) INTO active_cnt FROM public.songs WHERE artist_id = r.id AND is_active = true;

    IF active_cnt > max_slots THEN
      -- Vault excess tracks (lowest played first)
      UPDATE public.songs
      SET
        is_active = false,
        vaulted_at = NOW(),
        vaulted_reason = 'tier_downgrade'
      WHERE id IN (
        SELECT id FROM public.songs
        WHERE artist_id = r.id AND is_active = true
        ORDER BY plays ASC, created_at DESC
        LIMIT (active_cnt - max_slots)
      );
    END IF;

    -- Clear the grace period flag since we have processed it
    UPDATE public.profiles SET downgrade_grace_ends = NULL WHERE id = r.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix 6: Schedule the vault job to run nightly using pg_cron (Only run if your Supabase instance supports it)
-- Note: This might require being run separately or you might prefer configuring cron via Supabase Dashboard Edge Functions.
-- Uncomment to execute if you have pg_cron enabled:
-- SELECT cron.schedule(
--   'vault-expired-tracks',
--   '0 2 * * *', -- 2am every night
--   'SELECT vault_expired_artist_tracks();'
-- );
