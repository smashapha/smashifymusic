-- Store linked Smashify profile IDs for featured artists
ALTER TABLE public.songs
  ADD COLUMN IF NOT EXISTS featured_artist_ids UUID[] DEFAULT '{}';

-- Index for finding songs where an artist is featured
CREATE INDEX IF NOT EXISTS idx_songs_featured_artist_ids
  ON public.songs USING GIN (featured_artist_ids);

-- This lets us show on an artist's profile which songs they're featured on
