import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPA_ADMIN_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing environment variables");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkHistoricals() {
  const { data: txs, error } = await supabase
    .from('transactions')
    .select('id, type, gross_amount, platform_fee, status, created_at')
    .eq('status', 'completed')
    .in('type', ['sale', 'track_purchase', 'album_purchase']);

  if (error) {
    console.error("Error fetching transactions:", error);
    return;
  }

  let mismatchCount = 0;
  let totalImpact = 0;

  for (const tx of txs) {
    const expectedFee = Math.min(tx.gross_amount, Math.round(tx.gross_amount * 0.10) + 50);
    if (Math.abs(tx.platform_fee - expectedFee) > 1) {
      mismatchCount++;
      totalImpact += (tx.platform_fee - expectedFee);
    }
  }

  console.log(`--- HISTORICAL FEE REPORT ---`);
  console.log(`Total Sales checked: ${txs.length}`);
  console.log(`Mismatched Fees: ${mismatchCount}`);
  console.log(`Total Excess Fees Collected: MK ${totalImpact}`);
  console.log(`-----------------------------`);
}

checkHistoricals();
