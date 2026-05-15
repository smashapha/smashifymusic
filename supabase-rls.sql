-- ==============================================================================
-- Smashify Hardened Supabase Schema & RLS Policies
-- ==============================================================================
-- This file implements the complete security layer for Smashify.
-- It covers roles, granular RLS, triggers for business logic, 
-- and the new Audio Ad system structure.
-- ==============================================================================

-- ═════════════════════════════════════════════════════════════════════════════
-- -1. TABLE UPDATES (ENSURE COLUMNS EXIST)
-- ═════════════════════════════════════════════════════════════════════════════
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stage_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS artist_tier TEXT DEFAULT 'Free';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'Free';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- ═════════════════════════════════════════════════════════════════════════════
-- 0. SCHEMA UPDATES (AUDIO ADS & TRANSACTIONS)
-- ═════════════════════════════════════════════════════════════════════════════

-- Create transactions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    artist_id UUID REFERENCES public.profiles(id),
    fan_id UUID REFERENCES public.user_profiles(id),
    type TEXT NOT NULL,
    gross_amount DECIMAL(12,2) NOT NULL,
    net_amount DECIMAL(12,2),
    status TEXT DEFAULT 'pending',
    paychangu_ref TEXT UNIQUE,
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure all columns exist on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS wallet_balance DECIMAL(12,2) DEFAULT 0;

-- Drop old visual ads table if it exists
DROP TABLE IF EXISTS ads CASCADE;

-- Create the new Audio Ad system
CREATE TABLE IF NOT EXISTS audio_ads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  artist_id UUID REFERENCES profiles(id), -- Null if platform ad
  type TEXT CHECK (type IN ('platform', 'promo')),
  title TEXT,
  advertiser_name TEXT,
  audio_url TEXT,
  duration_seconds INTEGER DEFAULT 30,
  target_city TEXT,
  target_genre TEXT,
  plays_purchased INTEGER DEFAULT 1000,
  plays_used INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS audio_ad_plays (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ad_id UUID REFERENCES audio_ads(id) ON DELETE CASCADE,
  listener_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  listener_city TEXT,
  source TEXT, -- 'player' or 'feed'
  completed BOOLEAN DEFAULT false,
  played_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ═════════════════════════════════════════════════════════════════════════════
-- 1. SECURITY HELPERS & FUNCTIONS
-- ═════════════════════════════════════════════════════════════════════════════

-- Admin Check Logic
CREATE OR REPLACE FUNCTION is_admin(u_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles WHERE id = u_id AND is_admin = true
    UNION
    SELECT 1 FROM profiles WHERE id = u_id AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check Upload Limit Logic
-- Prevents artists from uploading beyond their monthly tier limit
CREATE OR REPLACE FUNCTION check_upload_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_tier TEXT;
  v_count INTEGER;
  v_limit INTEGER;
BEGIN
  -- Get artist tier
  SELECT subscription_tier INTO v_tier FROM profiles WHERE id = NEW.artist_id;
  
  -- Determine limit
  IF LOWER(v_tier) = 'standard' THEN v_limit := 20;
  ELSIF LOWER(v_tier) = 'elite' THEN v_limit := 9999;
  ELSE v_limit := 3; -- Free/Rising Star
  END IF;

  -- Count uploads in current month
  SELECT COUNT(*) INTO v_count 
  FROM songs 
  WHERE artist_id = NEW.artist_id 
    AND created_at >= date_trunc('month', now());

  IF v_count >= v_limit THEN
    RAISE EXCEPTION 'Monthly upload limit reached for your tier.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Payout Eligibility Logic
CREATE OR REPLACE FUNCTION check_payout_eligibility()
RETURNS TRIGGER AS $$
BEGIN
  -- We rely on the Edge Function for balance validation and deduction.
  -- This trigger is now just for minimum amount safety.
  IF NEW.requested_amount < 2000 THEN
    RAISE EXCEPTION 'Minimum payout is MK 2,000.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update Wallet on Transaction
CREATE OR REPLACE FUNCTION update_wallet_on_transaction()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'success' AND NEW.type IN ('sale', 'donation', 'subscription') THEN
    UPDATE profiles 
    SET wallet_balance = wallet_balance + NEW.net_amount
    WHERE id = NEW.artist_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Deduct Wallet on Payout Approval
CREATE OR REPLACE FUNCTION deduct_wallet_on_payout()
RETURNS TRIGGER AS $$
BEGIN
  -- If status changed to approved/completed
  IF OLD.status = 'pending' AND NEW.status IN ('processed', 'completed') THEN
    UPDATE profiles 
    SET wallet_balance = wallet_balance - NEW.requested_amount
    WHERE id = NEW.artist_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Batch increment ad plays for performance and concurrency
CREATE OR REPLACE FUNCTION increment_ad_plays(ad_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE audio_ads 
  SET plays_used = plays_used + 1 
  WHERE id = ad_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger Attachments
DROP TRIGGER IF EXISTS tr_songs_upload_limit ON songs;
CREATE TRIGGER tr_songs_upload_limit
  BEFORE INSERT ON songs
  FOR EACH ROW EXECUTE FUNCTION check_upload_limit();

DROP TRIGGER IF EXISTS tr_payout_eligibility ON payout_requests;
CREATE TRIGGER tr_payout_eligibility
  BEFORE INSERT ON payout_requests
  FOR EACH ROW EXECUTE FUNCTION check_payout_eligibility();

DROP TRIGGER IF EXISTS tr_wallet_transaction ON transactions;
CREATE TRIGGER tr_wallet_transaction
  AFTER INSERT ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_wallet_on_transaction();

DROP TRIGGER IF EXISTS tr_wallet_payout ON payout_requests;
CREATE TRIGGER tr_wallet_payout
  AFTER UPDATE OF status ON payout_requests
  FOR EACH ROW EXECUTE FUNCTION deduct_wallet_on_payout();

-- ═════════════════════════════════════════════════════════════════════════════
-- 2. ROW LEVEL SECURITY (RLS) POLICIES
-- ═════════════════════════════════════════════════════════════════════════════

-- DEFAULT DENY (Handled by Supabase by enabling RLS without policies)
-- But we will be explicit.

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: user_profiles (Listeners)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_profiles_select_owner" ON user_profiles;
CREATE POLICY "user_profiles_select_owner" 
ON user_profiles FOR SELECT 
USING (auth.uid() = id OR is_admin(auth.uid()));

DROP POLICY IF EXISTS "user_profiles_update_owner" ON user_profiles;
CREATE POLICY "user_profiles_update_owner" 
ON user_profiles FOR UPDATE 
USING (auth.uid() = id OR is_admin(auth.uid()))
WITH CHECK (
  is_admin(auth.uid()) 
  OR (auth.uid() = id AND is_admin = false)
);

DROP POLICY IF EXISTS "user_profiles_insert_auth" ON user_profiles;
CREATE POLICY "user_profiles_insert_auth" 
ON user_profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

COMMENT ON POLICY "user_profiles_select_owner" ON user_profiles IS 'Owners read their own profile; Admins read all.';
COMMENT ON POLICY "user_profiles_update_owner" ON user_profiles IS 'Owners update their profile; cannot change admin status.';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: profiles (Artists)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_public" ON profiles;
CREATE POLICY "profiles_select_public" 
ON profiles FOR SELECT 
USING (approved = true OR auth.uid() = id OR is_admin(auth.uid()));

DROP POLICY IF EXISTS "profiles_insert_auth" ON profiles;
CREATE POLICY "profiles_insert_auth" 
ON profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_owner" ON profiles;
CREATE POLICY "profiles_update_owner" 
ON profiles FOR UPDATE 
USING (auth.uid() = id OR is_admin(auth.uid()))
WITH CHECK (
  is_admin(auth.uid()) 
  OR (auth.uid() = id AND is_admin = false)
);

COMMENT ON POLICY "profiles_select_public" ON profiles IS 'Approved artists visible to all; unapproved visible to owner/admin.';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: artist_applications
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS artist_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  stage_name TEXT,
  email TEXT,
  genre TEXT,
  city TEXT,
  phone TEXT,
  id_document_url TEXT,
  status TEXT DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE artist_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "artist_app_select" ON artist_applications;
CREATE POLICY "artist_app_select" 
ON artist_applications FOR SELECT 
USING (auth.uid() = profile_id OR is_admin(auth.uid()));

DROP POLICY IF EXISTS "artist_app_insert" ON artist_applications;
CREATE POLICY "artist_app_insert" 
ON artist_applications FOR INSERT 
WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "artist_app_update_admin" ON artist_applications;
CREATE POLICY "artist_app_update_admin" 
ON artist_applications FOR UPDATE 
USING (is_admin(auth.uid()));

COMMENT ON POLICY "artist_app_select" ON artist_applications IS 'Applicants read their own; Admins read all.';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: songs
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "songs_select_public" ON songs;
CREATE POLICY "songs_select_public" 
ON songs FOR SELECT 
USING (approved = true OR auth.uid() = artist_id OR is_admin(auth.uid()));

DROP POLICY IF EXISTS "songs_insert_artist" ON songs;
CREATE POLICY "songs_insert_artist" 
ON songs FOR INSERT 
WITH CHECK (auth.uid() = artist_id);

DROP POLICY IF EXISTS "songs_update_artist" ON songs;
CREATE POLICY "songs_update_artist" 
ON songs FOR UPDATE 
USING (auth.uid() = artist_id OR is_admin(auth.uid()));

DROP POLICY IF EXISTS "songs_delete_artist" ON songs;
CREATE POLICY "songs_delete_artist" 
ON songs FOR DELETE 
USING (auth.uid() = artist_id OR is_admin(auth.uid()));

COMMENT ON POLICY "songs_select_public" ON songs IS 'Public reads approved; Artists read their own uploads.';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: transactions
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- CRITICAL: Prevent ANY client-side modifications. 
-- Service role only handles INSERT/UPDATE/DELETE.
DROP POLICY IF EXISTS "transactions_select_parties" ON transactions;
CREATE POLICY "transactions_select_parties" 
ON transactions FOR SELECT 
USING (auth.uid() = artist_id OR auth.uid() = fan_id OR is_admin(auth.uid()));

-- Only admin or system can update/insert directly; usually handled by webhooks/edge functions
DROP POLICY IF EXISTS "transactions_admin_all" ON transactions;
CREATE POLICY "transactions_admin_all"
ON transactions FOR ALL TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

COMMENT ON POLICY "transactions_select_parties" ON transactions IS 'Parties read their own transactions. No client-side writes.';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: fan_subscriptions
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE fan_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fan_sub_select" 
ON fan_subscriptions FOR SELECT 
USING (auth.uid() = fan_id OR auth.uid() = artist_id OR is_admin(auth.uid()));

CREATE POLICY "fan_sub_update_status" 
ON fan_subscriptions FOR UPDATE 
USING (auth.uid() = fan_id AND status = 'active')
WITH CHECK (status = 'cancelled');

COMMENT ON POLICY "fan_sub_select" ON fan_subscriptions IS 'Parties to sub read info. Fans can cancel via status update.';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: payout_requests
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE payout_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payout_select" 
ON payout_requests FOR SELECT 
USING (auth.uid() = artist_id OR is_admin(auth.uid()));

CREATE POLICY "payout_insert" 
ON payout_requests FOR INSERT 
WITH CHECK (auth.uid() = artist_id);

CREATE POLICY "payout_update_admin" 
ON payout_requests FOR UPDATE 
USING (is_admin(auth.uid()));

COMMENT ON POLICY "payout_select" ON payout_requests IS 'Artists view their own requests. Admins manage state.';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: audio_ads
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE audio_ads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audio_ads_select_active" 
ON audio_ads FOR SELECT 
USING (active = true OR auth.uid() = artist_id OR is_admin(auth.uid()));

CREATE POLICY "audio_ads_insert" 
ON audio_ads FOR INSERT 
WITH CHECK (
  (auth.uid() = artist_id AND type = 'promo' AND active = false) -- Artists insert pending promos
  OR is_admin(auth.uid()) -- Admins insert platform/any ads
);

CREATE POLICY "audio_ads_update" 
ON audio_ads FOR UPDATE 
USING (auth.uid() = artist_id OR is_admin(auth.uid()))
WITH CHECK (
  is_admin(auth.uid()) 
  OR (auth.uid() = artist_id AND active = false) 
);

CREATE POLICY "audio_ads_delete" 
ON audio_ads FOR DELETE 
USING (is_admin(auth.uid()));

COMMENT ON POLICY "audio_ads_select_active" ON audio_ads IS 'Active ads visible to all. Owners/Admins see all.';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: audio_ad_plays
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE audio_ad_plays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audio_ad_plays_select_admin" 
ON audio_ad_plays FOR SELECT 
USING (is_admin(auth.uid()));

-- No client side insert directly - handled by Rpc or Edge Function typically,
-- but if using client SDK:
CREATE POLICY "audio_ad_plays_insert_auth" 
ON audio_ad_plays FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

COMMENT ON POLICY "audio_ad_plays_select_admin" ON audio_ad_plays IS 'Only admins view raw play metrics.';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: moto_feed (Snippets)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE moto_feed ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "moto_feed_select" ON moto_feed;
CREATE POLICY "moto_feed_select" ON moto_feed FOR SELECT USING (true);

DROP POLICY IF EXISTS "moto_feed_insert" ON moto_feed;
CREATE POLICY "moto_feed_insert" ON moto_feed FOR INSERT WITH CHECK (auth.uid() = artist_id);

DROP POLICY IF EXISTS "moto_feed_update" ON moto_feed;
CREATE POLICY "moto_feed_update" ON moto_feed FOR UPDATE USING (auth.uid() = artist_id);

DROP POLICY IF EXISTS "moto_feed_delete" ON moto_feed;
CREATE POLICY "moto_feed_delete" ON moto_feed FOR DELETE USING (auth.uid() = artist_id OR is_admin(auth.uid()));

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: moto_events
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE moto_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "moto_events_select_admin" ON moto_events;
CREATE POLICY "moto_events_select_admin" ON moto_events FOR SELECT USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "moto_events_insert_all" ON moto_events;
CREATE POLICY "moto_events_insert_all" ON moto_events FOR INSERT WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: likes
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "likes_select_all" ON likes;
CREATE POLICY "likes_select_all" ON likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "likes_insert_auth" ON likes;
CREATE POLICY "likes_insert_auth" ON likes FOR INSERT WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "likes_delete_owner" ON likes;
CREATE POLICY "likes_delete_owner" ON likes FOR DELETE USING (auth.uid() = profile_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: followers
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE followers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "followers_select_all" ON followers FOR SELECT USING (true);
CREATE POLICY "followers_insert_auth" ON followers FOR INSERT WITH CHECK (auth.uid() = follower_id AND follower_id != artist_id);
CREATE POLICY "followers_delete_owner" ON followers FOR DELETE USING (auth.uid() = follower_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: albums
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE albums ENABLE ROW LEVEL SECURITY;

CREATE POLICY "albums_select_public" ON albums FOR SELECT USING (true);
CREATE POLICY "albums_insert_artist" ON albums FOR INSERT WITH CHECK (auth.uid() = artist_id);
CREATE POLICY "albums_update_artist" ON albums FOR UPDATE USING (auth.uid() = artist_id OR is_admin(auth.uid()));
CREATE POLICY "albums_delete_artist" ON albums FOR DELETE USING (auth.uid() = artist_id OR is_admin(auth.uid()));

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: recently_played
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE recently_played ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recently_played_owner" ON recently_played FOR ALL USING (auth.uid() = profile_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: fan_purchases (formerly purchases)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE fan_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fan_purchases_select" ON fan_purchases FOR SELECT USING (auth.uid() = fan_id OR auth.uid() = artist_id OR is_admin(auth.uid()));

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: contact_messages
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contact_insert_all" ON contact_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "contact_select_admin" ON contact_messages FOR SELECT USING (is_admin(auth.uid()));

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: featured_placements
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE featured_placements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "featured_select_public" ON featured_placements FOR SELECT USING (active = true OR auth.uid() = artist_id OR is_admin(auth.uid()));
CREATE POLICY "featured_insert_artist" ON featured_placements FOR INSERT WITH CHECK (auth.uid() = artist_id AND active = false);
CREATE POLICY "featured_admin_update" ON featured_placements FOR UPDATE USING (is_admin(auth.uid()));

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: family_plans
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE family_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "family_select" 
ON family_plans FOR SELECT 
USING (
  auth.uid() = owner_id 
  OR auth.uid()::text = ANY(member_ids) 
  OR is_admin(auth.uid())
);

CREATE POLICY "family_insert" ON family_plans FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "family_update_owner" ON family_plans FOR UPDATE USING (auth.uid() = owner_id OR is_admin(auth.uid()));

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: notifications
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL,
  user_type TEXT CHECK (user_type IN ('listener', 'artist')),
  type TEXT,
  message TEXT,
  read BOOLEAN DEFAULT false,
  link TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_owner_select" ON notifications FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY "notifications_owner_update" ON notifications FOR UPDATE USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);
-- No client side inserts/deletes for security logic

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: webhook_logs
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tx_ref TEXT,
  type TEXT,
  status TEXT,
  payload TEXT,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "webhook_logs_admin_select" ON webhook_logs FOR SELECT USING (is_admin(auth.uid()));

-- ─────────────────────────────────────────────────────────────────────────────
-- RPC: wallet and sales increments
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION increment_wallet_balance(p_id UUID, amount NUMERIC)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET wallet_balance = COALESCE(wallet_balance, 0) + amount
  WHERE id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_song_sales(s_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE songs
  SET sales_count = COALESCE(sales_count, 0) + 1
  WHERE id = s_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────────────────────
-- FINAL COMMENT
-- ─────────────────────────────────────────────────────────────────────────────
COMMENT ON DATABASE postgres IS 'Smashify Production Database - Security Level 1 (Hardened RLS)';
