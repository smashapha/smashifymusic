CREATE TABLE IF NOT EXISTS moto_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id text NOT NULL,
  profile_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(content) <= 200),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE moto_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "moto_comments_read" ON moto_comments;
DROP POLICY IF EXISTS "moto_comments_insert" ON moto_comments;
DROP POLICY IF EXISTS "moto_comments_delete" ON moto_comments;
CREATE POLICY "moto_comments_read" ON moto_comments FOR SELECT USING (true);
CREATE POLICY "moto_comments_insert" ON moto_comments FOR INSERT WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "moto_comments_delete" ON moto_comments FOR DELETE USING (auth.uid() = profile_id);

CREATE OR REPLACE FUNCTION increment_shares(song_id text)
RETURNS void AS $$
  UPDATE songs SET shares = COALESCE(shares, 0) + 1 WHERE id = song_id::uuid;
$$ LANGUAGE sql;
