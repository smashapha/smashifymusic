ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_starts_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS subscription_ends TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS is_paused BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS extra_track_slots INTEGER DEFAULT 0;

ALTER TABLE public.songs
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS vaulted_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS vaulted_reason TEXT;

CREATE OR REPLACE FUNCTION vault_expired_artist_tracks()
RETURNS void AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT id FROM public.profiles
        WHERE artist_tier != 'Free'
      AND is_legacy = false
      AND is_paused = false
      AND subscription_ends IS NOT NULL
      AND subscription_ends < NOW()
  LOOP
    UPDATE public.profiles
    SET is_paused = true, artist_tier = 'Free'
    WHERE id = r.id;

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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
