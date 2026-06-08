CREATE OR REPLACE FUNCTION increment_plays_this_month(song_id UUID)
RETURNS void AS $$
  UPDATE public.songs
  SET plays_this_month = COALESCE(plays_this_month, 0) + 1
  WHERE id = song_id;
$$ LANGUAGE sql SECURITY DEFINER;
