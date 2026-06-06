-- Payment Fix Script to ensure transactions can be inserted
-- even if the server only has the ANON key.

-- 0. Recreate transactions table if missing
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  fan_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  gross_amount DECIMAL(12,2) NOT NULL,
  platform_fee DECIMAL(12,2) DEFAULT 0,
  net_amount DECIMAL(12,2) NOT NULL,
  status TEXT DEFAULT 'pending',
  paychangu_ref TEXT UNIQUE,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 1. Drop transactions type constraint to allow all transaction types
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_type_check;

-- 2. Allow ANON inserts to transactions
DROP POLICY IF EXISTS "transactions_anon_insert" ON transactions;
CREATE POLICY "transactions_anon_insert" 
ON transactions FOR INSERT 
TO public
WITH CHECK (true);

-- 3. Allow ANON selects for verification (if needed)
DROP POLICY IF EXISTS "transactions_anon_select" ON transactions;
CREATE POLICY "transactions_anon_select" 
ON transactions FOR SELECT 
TO public
USING (true);

-- 4. Allow ANON updates (for webhooks if admin key is missing)
DROP POLICY IF EXISTS "transactions_anon_update" ON transactions;
CREATE POLICY "transactions_anon_update" 
ON transactions FOR UPDATE 
TO public
USING (true);

-- 5. Give completely unauthenticated users access to webhook logs just in case
DROP POLICY IF EXISTS "webhook_logs_insert" ON webhook_logs;
CREATE POLICY "webhook_logs_insert" 
ON webhook_logs FOR INSERT 
TO public
WITH CHECK (true);
