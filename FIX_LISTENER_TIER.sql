-- Fix for the Listener Upgrade Bug where service_role was not properly bypassing triggers due to strict auth checks.

CREATE OR REPLACE FUNCTION protect_listener_columns()
RETURNS TRIGGER AS $$
BEGIN
  -- System and Admins bypass (Fix: explicitly check for service_role)
  IF current_setting('role') = 'service_role' OR auth.uid() IS NULL OR is_admin(auth.uid()) THEN
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

CREATE OR REPLACE FUNCTION protect_artist_columns()
RETURNS TRIGGER AS $$
BEGIN
  -- System and Admins bypass (Fix: explicitly check for service_role)
  IF current_setting('role') = 'service_role' OR auth.uid() IS NULL OR is_admin(auth.uid()) THEN
     RETURN NEW;
  END IF;

  -- Artists CANNOT approve themselves
  IF OLD.approved = false AND NEW.approved = true THEN
     NEW.approved = false;
  END IF;

  -- Artists CANNOT inflate their wallet balance manually
  IF NEW.wallet_balance > OLD.wallet_balance THEN
     NEW.wallet_balance = OLD.wallet_balance;
  END IF;

  -- Artists CANNOT elevate their own tier
  IF OLD.artist_tier IS DISTINCT FROM NEW.artist_tier THEN
     IF NEW.artist_tier != 'Free' THEN
       NEW.artist_tier = OLD.artist_tier;
     END IF;
  END IF;

  -- Add the same block for subscription_tier to prevent renaming circumvention
  IF OLD.subscription_tier IS DISTINCT FROM NEW.subscription_tier THEN
     IF NEW.subscription_tier != 'Free' THEN
       NEW.subscription_tier = OLD.subscription_tier;
     END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
