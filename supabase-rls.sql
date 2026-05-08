-- Smashify Row Level Security (RLS) Policies

-- 1. Profiles Table (Artists)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone." ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile." ON profiles FOR UPDATE USING (auth.uid() = id);

-- 2. User Profiles Table (Listeners)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own profile." ON user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile." ON user_profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile." ON user_profiles FOR UPDATE USING (auth.uid() = id);

-- 3. Songs Table
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;
-- Everyone can view approved songs, or artists can view their own unapproved songs
CREATE POLICY "Songs are viewable by everyone if approved." ON songs FOR SELECT USING (approved = true OR auth.uid() = artist_id);
-- Artists can insert their own songs
CREATE POLICY "Artists can insert their own songs." ON songs FOR INSERT WITH CHECK (auth.uid() = artist_id);
-- Artists can update their own songs
CREATE POLICY "Artists can update their own songs." ON songs FOR UPDATE USING (auth.uid() = artist_id);
-- Artists can delete their own songs
CREATE POLICY "Artists can delete their own songs." ON songs FOR DELETE USING (auth.uid() = artist_id);

-- 4. Albums Table
ALTER TABLE albums ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Albums are viewable by everyone." ON albums FOR SELECT USING (true);
CREATE POLICY "Artists can insert their own albums." ON albums FOR INSERT WITH CHECK (auth.uid() = artist_id);
CREATE POLICY "Artists can update their own albums." ON albums FOR UPDATE USING (auth.uid() = artist_id);
CREATE POLICY "Artists can delete their own albums." ON albums FOR DELETE USING (auth.uid() = artist_id);

-- 5. Likes Table
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own likes." ON likes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own likes." ON likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own likes." ON likes FOR DELETE USING (auth.uid() = user_id);

-- 6. Recently Played
ALTER TABLE recently_played ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own history." ON recently_played FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own history." ON recently_played FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own history." ON recently_played FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own history." ON recently_played FOR DELETE USING (auth.uid() = user_id);

-- 7. Purchases
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own purchases." ON purchases FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own purchases." ON purchases FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 8. Payout Requests
ALTER TABLE payout_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Artists can view their own payout requests." ON payout_requests FOR SELECT USING (auth.uid() = artist_id);
CREATE POLICY "Artists can insert their own payout requests." ON payout_requests FOR INSERT WITH CHECK (auth.uid() = artist_id);

-- 9. Transactions
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own transactions." ON transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own transactions." ON transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 10. Contact Messages
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert contact messages." ON contact_messages FOR INSERT WITH CHECK (true);

-- 11. Storage Buckets (Optional, requires storage.objects policies)
-- NOTE: For Supabase Storage, you also need to set up policies in the `storage.objects` table.
-- e.g. 
-- CREATE POLICY "Anyone can view covers" ON storage.objects FOR SELECT USING (bucket_id = 'covers');
-- CREATE POLICY "Artists can upload covers" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'covers' AND auth.role() = 'authenticated');
-- CREATE POLICY "Artists can delete their covers" ON storage.objects FOR DELETE USING (bucket_id = 'covers' AND auth.uid() = owner);
