ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS instagram_url TEXT,
  ADD COLUMN IF NOT EXISTS tiktok_url TEXT,
  ADD COLUMN IF NOT EXISTS facebook_url TEXT,
  ADD COLUMN IF NOT EXISTS youtube_url TEXT;

-- Safely trigger schema cache reload for PostgREST
NOTIFY pgrst, 'reload schema';
