DROP TRIGGER IF EXISTS agent_commission_trigger ON transactions;
DROP TRIGGER IF EXISTS agent_commission_trigger ON user_profiles;
DROP TRIGGER IF EXISTS agent_commission_trigger ON profiles;
DROP TRIGGER IF EXISTS agent_commission_trigger ON songs;
DROP FUNCTION IF EXISTS handle_agent_commission() CASCADE;
