import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(process.env.VITE_SUPABASE_URL, key);

async function deploy() {
  const sql = `
CREATE OR REPLACE FUNCTION handle_agent_commission()
RETURNS TRIGGER AS $$
DECLARE
  commission_amount NUMERIC;
  tier_price NUMERIC;
BEGIN
  -- Only trigger on tier upgrade from Free to paid
  IF NEW.artist_tier != OLD.artist_tier 
     AND OLD.artist_tier = 'Free' 
     AND NEW.artist_tier IN ('RisingStar', 'Standard', 'Elite')
     AND NEW.agent_reference IS NOT NULL THEN

    -- Get tier price and calculate 10% commission
    tier_price := CASE NEW.artist_tier
      WHEN 'RisingStar' THEN 8000
      WHEN 'Standard' THEN 16000
      WHEN 'Elite' THEN 27000
      ELSE 0
    END;

    commission_amount := (tier_price * 0.10)::NUMERIC;

    -- Insert commission record
    INSERT INTO agent_commissions (
      agent_id,
      artist_id,
      commission_amount,
      tier,
      status
    ) VALUES (
      NEW.agent_reference,
      NEW.id,
      commission_amount,
      NEW.artist_tier,
      'pending'
    );

    -- Update agent's total earned
    UPDATE agents 
    SET total_earned = COALESCE(total_earned, 0) + commission_amount
    WHERE user_id = NEW.agent_reference;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS agent_commission_trigger ON profiles;

CREATE TRIGGER agent_commission_trigger
AFTER UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION handle_agent_commission();
  `;
  
  // Actually, we can't run raw SQL easily with the supabase JS client without an RPC method like exec_sql.
  console.log("Checking if we have rpc('exec_sql')");
  const { data, error } = await supabase.rpc('exec_sql', { query: sql });
  if (error) {
     console.error("Error running exec_sql:", error.message);
  } else {
     console.log("Trigger deployed successfully");
  }
}
deploy();
