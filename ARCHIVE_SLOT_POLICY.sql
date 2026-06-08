ALTER TABLE public.songs
  ADD COLUMN IF NOT EXISTS plays_this_month INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS slot_mode TEXT DEFAULT 'active'
    CHECK (slot_mode IN ('hot', 'active', 'cold', 'archive'));

-- Nightly job to reclassify slots
CREATE OR REPLACE FUNCTION reclassify_song_slots()
RETURNS void AS $$
BEGIN
  -- Songs with 0 plays in 90 days → archive (free, no slot consumed)
  UPDATE public.songs
  SET slot_mode = 'archive'
  WHERE is_active = true
    AND created_at < NOW() - INTERVAL '90 days'
    AND plays_this_month = 0;

  -- Songs with 1000+ plays this month → hot
  UPDATE public.songs
  SET slot_mode = 'hot'
  WHERE is_active = true
    AND plays_this_month >= 1000;

  -- Songs with 100-999 plays → active
  UPDATE public.songs
  SET slot_mode = 'active'
  WHERE is_active = true
    AND plays_this_month BETWEEN 100 AND 999;

  -- Everything else → cold
  UPDATE public.songs
  SET slot_mode = 'cold'
  WHERE is_active = true
    AND plays_this_month < 100
    AND slot_mode != 'archive';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
