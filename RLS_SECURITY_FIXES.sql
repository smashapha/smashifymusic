-- SECURITY PATCH: Strict RLS Policies for Supabase
-- This enforces Row Level Security across users, profiles, payments, transactions, and songs.

-- 1. Enable RLS on all relevant tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;

-- Assuming there is a "users" table or you mean "auth.users"
-- If you have a custom users table (often it's profiles):
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing overlapping policies to prevent conflicts
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can read their own payments" ON payments;
DROP POLICY IF EXISTS "Users can read their own transactions" ON transactions;
DROP POLICY IF EXISTS "Artists can update their own songs" ON songs;

-- ==========================================
-- PROFILES (USERS) TABLE POLICIES
-- ==========================================
-- Read: Users can only read their own profile data (or public data if necessary, adjust as needed)
CREATE POLICY "Users can view their own profile" 
ON profiles 
FOR SELECT 
USING (auth.uid() = id);

-- Write: Users can only update their own profile
CREATE POLICY "Users can update own profile" 
ON profiles 
FOR UPDATE 
USING (auth.uid() = id);

-- ==========================================
-- PAYMENTS TABLE POLICIES
-- ==========================================
-- Read: Users can only see payments they created/own
CREATE POLICY "Users can read their own payments" 
ON payments 
FOR SELECT 
USING (auth.uid() = user_id);

-- Write: Users cannot modify or delete payments (should be handled by secure backend)
-- No UPDATE or DELETE policies created.
CREATE POLICY "Users can insert own payments" 
ON payments 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- ==========================================
-- TRANSACTIONS TABLE POLICIES
-- ==========================================
-- Read: Users can only view their own transactions
CREATE POLICY "Users can read their own transactions" 
ON transactions 
FOR SELECT 
USING (auth.uid() = artist_id); -- Assuming artist_id or user_id represents the owner

-- Write: Read-only for users. Backend/admin handles updates.
-- No UPDATE or DELETE policies created.
CREATE POLICY "Users can insert own transactions" 
ON transactions 
FOR INSERT 
WITH CHECK (auth.uid() = artist_id);

-- ==========================================
-- SONGS TABLE POLICIES
-- ==========================================
-- Read: Songs are generally public for listening, so SELECT might be open
CREATE POLICY "Anyone can view songs" 
ON songs 
FOR SELECT 
USING (true);

-- Write: Only the artist who owns the song can update/delete it
CREATE POLICY "Artists can update their own songs" 
ON songs 
FOR UPDATE 
USING (auth.uid() = artist_id);

CREATE POLICY "Artists can delete their own songs" 
ON songs 
FOR DELETE 
USING (auth.uid() = artist_id);

CREATE POLICY "Artists can insert own songs" 
ON songs 
FOR INSERT 
WITH CHECK (auth.uid() = artist_id);
