ALTER TABLE public.playlist_songs
  ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0;

-- Backfill existing rows with sequential positions per playlist
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY playlist_id ORDER BY created_at) - 1 AS rn
  FROM public.playlist_songs
)
UPDATE public.playlist_songs ps
SET position = o.rn
FROM ordered o
WHERE ps.id = o.id;

CREATE INDEX IF NOT EXISTS idx_playlist_songs_position
  ON public.playlist_songs(playlist_id, position);
