import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const PAYCHANGU_SECRET_KEY = Deno.env.get("PAYCHANGU_SECRET_KEY");

Deno.serve(async (req) => {
  // Only allow service role or admin (verified by Supabase auth if needed, but cron uses service_role)
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.includes(SUPABASE_SERVICE_ROLE_KEY!)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    
    // 1. Find stale pending transactions (older than 10 mins, younger than 24 hours)
    const { data: staleTxs, error: staleError } = await supabase
      .from('transactions')
      .select('*')
      .eq('status', 'pending')
      .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .lt('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString())
      .limit(20);

    if (staleError) throw staleError;

    const results = [];

    for (const tx of staleTxs || []) {
      const txRef = tx.paychangu_ref || tx.reference;
      if (!txRef) continue;

      console.log(`[RECONCILE] Checking status for ${txRef}...`);

      try {
        const pcRes = await fetch(`https://api.paychangu.com/verify-payment/${txRef}`, {
          headers: {
            Authorization: `Bearer ${PAYCHANGU_SECRET_KEY}`,
            Accept: "application/json",
          },
        });

        const payload = await pcRes.json();
        
        if (pcRes.ok && payload.status === "success" && payload.data) {
          const pcStatus = (payload.data.status || "").toLowerCase();
          
          if (["successful", "success", "paid"].includes(pcStatus)) {
            console.log(`[RECONCILE] ${txRef} is SUCCESSFUL on gateway. Fulfilling...`);
            const { data: rpcRes, error: rpcErr } = await supabase.rpc('finalize_payment_order', {
              p_paychangu_ref: txRef,
              p_gateway_amount: Number(payload.data.amount)
            });
            
            results.push({ txRef, status: 'fulfilled', rpcRes, rpcErr });
          } else if (["failed", "cancelled", "expired"].includes(pcStatus)) {
            console.log(`[RECONCILE] ${txRef} is FAILED on gateway. Marking failed...`);
            await supabase.from('transactions').update({ status: 'failed' }).eq('id', tx.id);
            results.push({ txRef, status: 'marked_failed' });
          } else {
            results.push({ txRef, status: 'still_pending_on_gateway' });
          }
        } else {
          results.push({ txRef, status: 'gateway_lookup_failed', error: payload.message });
        }
      } catch (err: any) {
        results.push({ txRef, status: 'error', error: err.message });
      }
    }

    // 2. Find completed transactions that might be unfulfilled (missing fan_purchases record)
    // We only check the last 24 hours to keep it bounded.
    const { data: completedTxs, error: completedError } = await supabase
      .from('transactions')
      .select('*, fan_purchases(id)')
      .eq('status', 'completed')
      .or('type.eq.sale,type.eq.track_purchase,type.eq.album_purchase')
      .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .limit(20);

    if (completedError) console.warn("[RECONCILE] Completed lookup error:", completedError);

    for (const tx of completedTxs || []) {
       if (!tx.fan_purchases || tx.fan_purchases.length === 0) {
          const txRef = tx.paychangu_ref || tx.reference;
          console.log(`[RECONCILE] Completed tx ${txRef} is missing entitlements. Repairing...`);
          const { data: rpcRes, error: rpcErr } = await supabase.rpc('finalize_payment_order', {
             p_paychangu_ref: txRef,
             p_force_repair: true
          });
          results.push({ txRef, status: 'repaired_missing_entitlements', rpcRes, rpcErr });
       }
    }
    return new Response(JSON.stringify({ 
      processed_stale: staleTxs?.length || 0,
      processed_completed: completedTxs?.length || 0,
      results 
    }), { 
      headers: { "Content-Type": "application/json" },
      status: 200 
    });
  } catch (error: any) {
    console.error("[RECONCILE] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});
