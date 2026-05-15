-- First, drop the old function to avoid param name conflicts
DROP FUNCTION IF EXISTS increment_wallet_balance(uuid, numeric);

-- Recreate the function and accept the net amount
CREATE OR REPLACE FUNCTION increment_wallet_balance(p_id UUID, amount NUMERIC)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET wallet_balance = COALESCE(wallet_balance, 0) + amount
  WHERE id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
