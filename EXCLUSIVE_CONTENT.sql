ALTER TABLE public.songs
  ADD COLUMN IF NOT EXISTS is_exclusive BOOLEAN DEFAULT false;

-- Exclusive songs are only visible to subscribers
-- RLS: allow select if not exclusive, OR if user has active fan_subscription
DROP POLICY IF EXISTS "songs_select_exclusive" ON public.songs;
CREATE POLICY "songs_select_exclusive" ON public.songs
  FOR SELECT USING (
    is_exclusive = false
    OR artist_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.fan_subscriptions
      WHERE fan_id = auth.uid()
        AND artist_id = songs.artist_id
        AND status = 'active'
    )
  );
