-- VULNERABILITY FIX: 
-- The increment_wallet_balance function allows client-side authenticated (and anon)
-- users to artificially create infinite wallet balance.
-- Webhooks automatically increment wallet_balance using the Service Role privately,
-- so this public RPC is not needed and is incredibly dangerous.

DROP FUNCTION IF EXISTS increment_wallet_balance(uuid, numeric) CASCADE;
