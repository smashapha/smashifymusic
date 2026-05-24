-- ==============================================================================
-- Smashify Security Vulnerability Patch V2
-- ==============================================================================
-- Addresses remaining Row-Level Security (RLS) vulnerabilities where users could
-- arbitrary elevate their account privileges, subscription tiers, or wallet
-- balances by directly calling the Supabase Data API from the client console.
-- ==============================================================================

-- 1. Protect critical columns on PROFILES table
CREATE OR REPLACE FUNCTION protect_profile_columns()
RETURNS TRIGGER AS $$
BEGIN
  -- System/Server-side operations (Edge Functions, Webhooks) bypass these checks
  -- Admin users also bypass these checks
  IF auth.uid() IS NULL OR is_admin(auth.uid()) THEN
     RETURN NEW;
  END IF;

  -- End users CANNOT arbitrarily change their wallet balance
  IF OLD.wallet_balance IS DISTINCT FROM NEW.wallet_balance THEN
     NEW.wallet_balance = OLD.wallet_balance;
  END IF;

  -- End users CANNOT upgrade their subscription tier directly
  -- (We allow downgrading to 'free' via AuthContext expiration checks)
  IF OLD.subscription_tier IS DISTINCT FROM NEW.subscription_tier THEN
     IF NEW.subscription_tier != 'free' THEN
       NEW.subscription_tier = OLD.subscription_tier;
     END IF;
  END IF;
  
  -- End users CANNOT approve their own accounts
  IF OLD.approved IS DISTINCT FROM NEW.approved THEN
     NEW.approved = OLD.approved;
  END IF;

  -- End users CANNOT elevate themselves to admins
  IF OLD.is_admin IS DISTINCT FROM NEW.is_admin THEN
     NEW.is_admin = OLD.is_admin;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_protect_profile_columns ON profiles;
CREATE TRIGGER tr_protect_profile_columns
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION protect_profile_columns();


-- 2. Protect critical columns on USER_PROFILES (Listeners) table
CREATE OR REPLACE FUNCTION protect_listener_columns()
RETURNS TRIGGER AS $$
BEGIN
  -- System and Admins bypass
  IF auth.uid() IS NULL OR is_admin(auth.uid()) THEN
     RETURN NEW;
  END IF;

  -- Listeners CANNOT elevate their tier
  IF OLD.subscription_tier IS DISTINCT FROM NEW.subscription_tier THEN
     IF NEW.subscription_tier != 'free' THEN
       NEW.subscription_tier = OLD.subscription_tier;
     END IF;
  END IF;

  -- Listeners CANNOT elevate to admin
  IF OLD.is_admin IS DISTINCT FROM NEW.is_admin AND OLD.is_admin = false THEN
     NEW.is_admin = OLD.is_admin;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_protect_listener_columns ON user_profiles;
CREATE TRIGGER tr_protect_listener_columns
BEFORE UPDATE ON user_profiles
FOR EACH ROW
EXECUTE FUNCTION protect_listener_columns();

-- 3. Protect critical columns on SONGS table
CREATE OR REPLACE FUNCTION protect_song_columns()
RETURNS TRIGGER AS $$
BEGIN
  -- System and Admins bypass
  IF auth.uid() IS NULL OR is_admin(auth.uid()) THEN
     RETURN NEW;
  END IF;

  -- Artists CANNOT auto-approve their own songs
  IF OLD.approved IS DISTINCT FROM NEW.approved THEN
     NEW.approved = OLD.approved;
  END IF;

  -- Artists CANNOT inflate their plays or sales manually via update
  IF OLD.plays IS DISTINCT FROM NEW.plays THEN
     NEW.plays = OLD.plays;
  END IF;
  
  IF OLD.sales_count IS DISTINCT FROM NEW.sales_count THEN
     NEW.sales_count = OLD.sales_count;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_protect_song_columns ON songs;
CREATE TRIGGER tr_protect_song_columns
BEFORE UPDATE ON songs
FOR EACH ROW
EXECUTE FUNCTION protect_song_columns();


-- 4. Cleanup of Vulnerable RPCs (Just in case they weren't removed)
DROP FUNCTION IF EXISTS increment_wallet_balance(uuid, numeric) CASCADE;
DROP FUNCTION IF EXISTS increment_song_sales(uuid) CASCADE;
