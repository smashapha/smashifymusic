-- ==============================================================================
-- Smashify Database Security: Enable Row Level Security (RLS) & Policies
-- Run this script in the Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)
-- ==============================================================================

-- 1. Enable RLS on vulnerable tables
ALTER TABLE IF EXISTS public.fan_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.transactions ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 2. fan_purchases Policies
-- ------------------------------------------------------------------------------
-- Drop existing policies if any to prevent duplicates
DROP POLICY IF EXISTS "Users can view own purchases" ON public.fan_purchases;
DROP POLICY IF EXISTS "Artists can view sales of their music" ON public.fan_purchases;
DROP POLICY IF EXISTS "Authenticated users can insert purchases" ON public.fan_purchases;

-- Allow buyers (fans) to view their own purchase records
CREATE POLICY "Users can view own purchases" 
  ON public.fan_purchases
  FOR SELECT 
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow artists to view purchases made for their songs
CREATE POLICY "Artists can view sales of their music" 
  ON public.fan_purchases
  FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.songs 
      WHERE public.songs.id = public.fan_purchases.song_id 
        AND public.songs.artist_id = auth.uid()
    )
  );

-- Allow authenticated users to insert their purchases
CREATE POLICY "Authenticated users can insert purchases" 
  ON public.fan_purchases
  FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 3. likes Policies
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own likes" ON public.likes;
DROP POLICY IF EXISTS "Users can insert own likes" ON public.likes;
DROP POLICY IF EXISTS "Users can delete own likes" ON public.likes;

-- Allow users to read their own likes
CREATE POLICY "Users can view own likes" 
  ON public.likes
  FOR SELECT 
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow users to like tracks
CREATE POLICY "Users can insert own likes" 
  ON public.likes
  FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow users to unlike tracks
CREATE POLICY "Users can delete own likes" 
  ON public.likes
  FOR DELETE 
  TO authenticated
  USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 4. transactions Policies
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Artists can view their payouts and earnings" ON public.transactions;
DROP POLICY IF EXISTS "Authenticated users can insert transactions" ON public.transactions;

-- Allow users to view transactions where they are the buyer/payer
CREATE POLICY "Users can view own transactions" 
  ON public.transactions
  FOR SELECT 
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow artists to view transactions where they are the recipient/artist
CREATE POLICY "Artists can view their payouts and earnings" 
  ON public.transactions
  FOR SELECT 
  TO authenticated
  USING (auth.uid() = artist_id);

-- Allow authenticated users to create transactions
CREATE POLICY "Authenticated users can insert transactions" 
  ON public.transactions
  FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
