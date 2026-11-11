import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const PAYCHANGU_SECRET_KEY = Deno.env.get("PAYCHANGU_SECRET_KEY");

Deno.serve(async (req) => {
  // 1. Secure Authentication (Service Role Only)
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.includes(SUPABASE_SERVICE_ROLE_KEY!)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const results = [];
    const now = new Date();
    
    // 2. DETECT STALE PENDING ORDERS (Deterministic Batching)
    // Range: 15 mins to 7 days old
    const { data: staleTxs, error: staleError } = await supabase
      .from('transactions')
      .select('*')
      .eq('status', 'pending')
      .gt('created_at', new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .lt('created_at', new Date(now.getTime() - 15 * 60 * 1000).toISOString())
      .order('created_at', { ascending: true })
      .limit(50);

    if (staleError) throw staleError;

    for (const tx of staleTxs || []) {
      const txRef = tx.paychangu_ref || tx.reference;
      if (!txRef) continue;

      try {
        const pcRes = await fetch(`https://api.paychangu.com/verify-payment/${txRef}`, {
          headers: { Authorization: `Bearer ${PAYCHANGU_SECRET_KEY}`, Accept: "application/json" },
        });

        const payload = await pcRes.json();
        
        if (pcRes.ok && payload.status === "success" && payload.data) {
          const pcStatus = (payload.data.status || "").toLowerCase();
          
          if (["successful", "success", "paid"].includes(pcStatus)) {
            console.log(`[RECONCILE] ${txRef} verified SUCCESS on gateway. Fulfilling...`);
            const { data: rpcRes, error: rpcErr } = await supabase.rpc('finalize_payment_order', {
              p_paychangu_ref: txRef,
              p_gateway_amount: Number(payload.data.amount)
            });
            results.push({ txRef, status: 'fulfilled', rpcRes, rpcErr });
          } else if (["failed", "cancelled", "expired"].includes(pcStatus)) {
            console.log(`[RECONCILE] ${txRef} verified FAILURE on gateway. Marking failed.`);
            await supabase.from('transactions').update({ status: 'failed' }).eq('id', tx.id);
            results.push({ txRef, status: 'marked_failed' });
          }
        }
      } catch (err: any) {
        results.push({ txRef, status: 'gateway_error', error: err.message });
      }
    }

    // 3. DETECT UNFULFILLED COMPLETED ORDERS (Historical Repair)
    // Find 'completed' sales in last 7 days missing fan_purchases records
    const { data: unfulfilledSales, error: unfError } = await supabase
      .from('transactions')
      .select('*, fan_purchases(id)')
      .eq('status', 'completed')
      .or('type.eq.sale,type.eq.track_purchase,type.eq.album_purchase')
      .gt('created_at', new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .limit(50);

    if (!unfError) {
      for (const tx of unfulfilledSales || []) {
        if (!tx.fan_purchases || tx.fan_purchases.length === 0) {
           const txRef = tx.paychangu_ref || tx.reference;
           console.log(`[RECONCILE] Repairing unfulfilled completed sale: ${txRef}`);
           const { data: rpcRes, error: rpcErr } = await supabase.rpc('finalize_payment_order', {
              p_paychangu_ref: txRef,
              p_force_repair: true // Use repair mode to avoid duplicate financial side-effects
           });
           results.push({ txRef, status: 'repaired_sale', rpcRes, rpcErr });
        }
      }
    }

    // 4. DETECT EXPIRED/STUCK SUBSCRIPTIONS
    // (Optional: Logic to re-run subscription fulfillment if profile tier doesn't match transaction type)

    return new Response(JSON.stringify({ 
      processed_stale: staleTxs?.length || 0,
      processed_unfulfilled: results.length,
      results 
    }), { 
      headers: { "Content-Type": "application/json" },
      status: 200 
    });

  } catch (error: any) {
    console.error("[RECONCILE] Fatal Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});
