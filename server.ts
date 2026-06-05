import express from 'express';
import cors from 'cors';
import fs from 'fs';

console.log('--- SERVER.TS BOOTING ---');

import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION at:', promise, 'reason:', reason);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  console.log(`NODE_ENV is: ${process.env.NODE_ENV}`);

  app.use(cors({
    origin: [
      'https://play-smashify.vercel.app',
      'http://localhost:5173',
      'http://localhost:3000'
    ],
    credentials: true
  }));
  app.use(express.json());

  // Log all API requests
  app.use('/api', (req, res, next) => {
    console.log(`[API_LOG] ${req.method} ${req.originalUrl}`);
    next();
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      time: new Date().toISOString(),
      supabaseReady: !!supabaseAdmin,
      env: process.env.NODE_ENV
    });
  });

  // Verify Email Domain MX Record
  app.post('/api/check-email-mx', (req, res) => {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    const domain = email.split('@')[1];
    import('dns').then(dns => {
      dns.resolveMx(domain, (err, addresses) => {
        if (err || !addresses || addresses.length === 0) {
          return res.json({ valid: false });
        }
        return res.json({ valid: true });
      });
    }).catch(() => {
      return res.json({ valid: true }); // Fallback true if dns import fails
    });
  });

  const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
  // Fallbacks for 15-character truncation limit in some panels
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPA_ADMIN_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;
  const PAYCHANGU_SECRET_KEY = process.env.PAYCHANGU_SEC || process.env.PAYCHANGU_SECRET_KEY || process.env.PAYCHANGU_SECRE || process.env.PAYCHANGU_SECRET;
  let APP_URL = process.env.APP_URL || process.env.VITE_APP_URL || `http://localhost:${PORT}`;
  if (APP_URL === 'YOUR_APP_URL' || APP_URL === 'APP_URL' || !APP_URL) {
    APP_URL = `http://localhost:${PORT}`;
  }

  let supabaseAdmin: any = null;
  if (!SUPABASE_SERVICE_ROLE_KEY || 
      SUPABASE_SERVICE_ROLE_KEY === 'YOUR_SUPABASE_SERVICE_ROLE_KEY' ||
      SUPABASE_SERVICE_ROLE_KEY === 'YOUR_SUPA_ADMIN_KEY') {
    console.error('CRITICAL: SUPABASE_SERVICE_ROLE_KEY is not set.');
    console.error('Server cannot perform admin operations safely. Admin endpoints will fail.');
    console.error('Set SUPABASE_SERVICE_ROLE_KEY within the container environment state.');
  } else {
    const adminKey = SUPABASE_SERVICE_ROLE_KEY;
    if (SUPABASE_URL && adminKey) {
      try {
        supabaseAdmin = createClient(SUPABASE_URL, adminKey);
        console.log('[Server] Service role key loaded successfully.');
      } catch (err) {
        console.error('Failed to initialize Supabase Admin:', err);
      }
    }
  }

  console.log('[DEBUG] PAYCHANGU_SECRET_KEY present:', !!PAYCHANGU_SECRET_KEY);

  // Helper to verify user
  const verifyUser = async (req: express.Request) => {
    if (!supabaseAdmin) {
      console.error('verifyUser: supabaseAdmin is null. SUPABASE_URL or adminKey is missing.');
      return null;
    }
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      console.error('verifyUser: Authorization header missing');
      return null;
    }
    const token = authHeader.replace('Bearer ', '');
    if (!token || token === 'undefined') {
      console.error('verifyUser: Token is empty or "undefined"');
      return null;
    }
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error) {
      console.error('verifyUser: auth.getUser failed:', error.message);
      return null;
    }
    if (!user) {
      console.error('verifyUser: user is null');
      return null;
    }
    return user;
  };

  // --- API ROUTES (Functions) ---
  
  // CORS Preflight for all functions
  app.options(['/api/functions/v1/create-payment', '/api/functions/create-payment', '/api/functions/v1/process-payout', '/api/functions/process-payout', '/api/functions/v1/verify-payment', '/api/functions/verify-payment'], (req, res) => {
    res.sendStatus(204);
  });

  // 1. Create Payment - explicit routes
  const handleCreatePayment = async (req: express.Request, res: express.Response) => {
    console.log('[API] create-payment received');
    try {
      if (!PAYCHANGU_SECRET_KEY || PAYCHANGU_SECRET_KEY === 'YOUR_PAYCHANGU_SECRET_KEY') {
        console.error('[API] PAYCHANGU_SECRET_KEY missing');
        throw new Error('PAYCHANGU_SECRET_KEY is missing or not configured');
      }

      const user = await verifyUser(req);
      if (!user) {
        console.error('[API] verifyUser failed');
        return res.status(401).json({ error: 'Unauthorized route access' });
      }

      const { amount, email, first_name, last_name, type, tx_ref, meta, return_url, currency, callback_url } = req.body;
      console.log(`[API] Processing ${type} for ${email}, amount: ${amount}, ref: ${tx_ref}`);
      console.log('[API] Meta received:', JSON.stringify(meta));

      const descriptions: Record<string, string> = {
        'track_purchase': `Purchase of music track on Smashify`,
        'tip': `Tip to artist on Smashify`,
        'fan_subscription': `Monthly fan subscription on Smashify`,
        'listener_premium': `Smashify Premium Subscription`,
        'listener_family': `Smashify Family Subscription`,
        'artist_rising_star': `Smashify Rising Star Studio Tier`,
        'artist_standard': `Smashify Standard Studio Tier`,
        'artist_elite': `Smashify Elite Studio Tier`,
        'artist_ad_campaign': `Promotion campaign on Smashify`,
        'featured_placement': `Featured placement on Smashify`,
      };

      // Create Pending Transaction
      const { error: txError } = await supabaseAdmin.from('transactions').insert({
        artist_id: meta.artistId || null,
        fan_id: meta.userId || user.id,
        type: type.includes('subscription') ? 'subscription' : (type === 'tip' ? 'donation' : (type === 'track_purchase' ? 'sale' : 'other')),
        gross_amount: amount,
        net_amount: amount * 0.85,
        status: 'pending',
        paychangu_ref: tx_ref,
        description: descriptions[type] || 'Smashify Payment',
        metadata: { ...meta, payment_type: type }
      });

      if (txError) {
        console.error('[API] txError:', txError.message);
        throw txError;
      }

      // Initialize PayChangu
      console.log('[API] Calling PayChangu /payment init...');
      const response = await fetch('https://api.paychangu.com/payment', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PAYCHANGU_SECRET_KEY.trim()}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          amount,
          currency: currency || 'MWK',
          email,
          first_name,
          last_name,
          tx_ref,
          callback_url: callback_url || `${APP_URL}/api/paychangu-webhook`,
          return_url: `${return_url}${tx_ref}`,
          customization: {
            title: 'Smashify',
            description: descriptions[type] || 'Smashify Payment',
          }
        })
      });

      const responseText = await response.text();
      console.log(`[API] PayChangu Response (${response.status}):`, responseText.substring(0, 200));

      let payload;
      try {
        payload = JSON.parse(responseText);
      } catch (err) {
        throw new Error(`PayChangu returned non-JSON (${response.status}): ${responseText.substring(0, 100)}...`);
      }

      if (!response.ok) {
        console.error('[API] PayChangu Failed:', payload);
        await supabaseAdmin.from('transactions').delete().eq('paychangu_ref', tx_ref);
        throw new Error(payload.message || 'PayChangu initialization failed');
      }

      if (!payload.data?.checkout_url) {
        console.error('[API] Missing checkout_url in payload:', payload);
        throw new Error('PayChangu did not return a checkout URL');
      }

      res.json({ checkout_url: payload.data.checkout_url });
    } catch (error: any) {
      console.error('[API] Create payment error:', error);
      res.status(400).json({ error: error.message });
    }
  };

  app.post('/api/functions/v1/create-payment', handleCreatePayment);
  app.post('/api/functions/create-payment', handleCreatePayment);

  // 2. Process Payout
  const handleProcessPayout = async (req: express.Request, res: express.Response) => {
    console.log('[API] process-payout received');
    try {
      if (!PAYCHANGU_SECRET_KEY || PAYCHANGU_SECRET_KEY === 'YOUR_PAYCHANGU_SECRET_KEY') {
        throw new Error('PAYCHANGU_SECRET_KEY is missing or not configured');
      }

      const user = await verifyUser(req);
      if (!user) {
        console.error('[API] Payout: verifyUser failed');
        return res.status(401).json({ error: 'Unauthorized route access' });
      }

      const { amount, phone, network } = req.body;
      console.log(`[API] Payout request: ${amount} to ${phone} (${network})`);

      const { data: artist, error: artistError } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (artistError || !artist) throw new Error('Artist profile not found');
      if (artist.wallet_balance < amount) throw new Error('Insufficient wallet balance');
      if (amount < 2000) throw new Error('Minimum withdrawal is MK 2,000');

      // Optimistically deduct balance
      const { data: updatedArtist, error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ wallet_balance: artist.wallet_balance - amount })
        .eq('id', user.id)
        .gte('wallet_balance', amount)
        .select()
        .single();

      if (updateError || !updatedArtist) throw new Error('Failed to update balance. Check your funds.');

      const payoutRef = `WD-${user.id}-${Date.now()}`;
      
      // Calculate net amount after 3% network fee
      const feePercent = 0.03;
      const netAmount = Math.floor(Number(amount) * (1 - feePercent));

      const { data: payoutReq, error: payoutReqError } = await supabaseAdmin
        .from('payout_requests')
        .insert({
          artist_id: user.id,
          requested_amount: amount,
          // net_amount: netAmount, // Temporarily disabled until schema update
          phone,
          network,
          status: 'pending',
          reference: payoutRef
        })
        .select()
        .single();

      if (payoutReqError) {
        console.error('[API] payoutReqError:', payoutReqError);
        await supabaseAdmin.from('profiles').update({ wallet_balance: artist.wallet_balance }).eq('id', user.id);
        throw payoutReqError;
      }

      console.log(`[PAYOUT] Manual payout recorded for user: ${user.id}, ref: ${payoutRef}`);
      
      res.json({ 
        success: true, 
        reference: payoutRef,
        message: "Your request has been received. Please wait for a moment while we verify your payout. You will be notified once it is processed."
      });
    } catch (error: any) {
      console.error('[API] Payout error:', error);
      res.status(400).json({ error: error.message });
    }
  };

  app.post('/api/functions/v1/process-payout', handleProcessPayout);
  app.post('/api/functions/process-payout', handleProcessPayout);

  const handleVerifyPayment = async (req: express.Request, res: express.Response) => {
    try {
      if (!PAYCHANGU_SECRET_KEY || PAYCHANGU_SECRET_KEY === 'YOUR_PAYCHANGU_SECRET_KEY') {
        throw new Error('PAYCHANGU_SECRET_KEY missing');
      }
      
      let tx_ref = req.query.tx_ref as string;
      if (req.method === "POST" && req.body?.tx_ref) {
        tx_ref = req.body.tx_ref;
      }

      if (!tx_ref) {
        return res.status(400).json({ error: "Missing tx_ref" });
      }

      console.log(`[API] Verifying payment for: ${tx_ref}`);

      const { data: dbTx, error: dbError } = await supabaseAdmin
        .from("transactions")
        .select("*")
        .eq("paychangu_ref", tx_ref)
        .single();

      if (dbError || !dbTx) {
        return res.status(404).json({ error: "Transaction not found in our database" });
      }

      if (dbTx.status === "completed" || dbTx.status === "failed") {
        return res.status(200).json({ status: dbTx.status, transaction: dbTx });
      }

      const response = await fetch(
        `https://api.paychangu.com/verify-payment/${tx_ref}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${PAYCHANGU_SECRET_KEY.trim()}`,
            Accept: "application/json",
          },
        }
      );

      const payload = await response.json();
      console.log("[API] PayChangu verification response:", payload);

      if (response.ok && payload.status === "success" && payload.data) {
        const pcStatus = payload.data.status;
        if (pcStatus === "successful" || pcStatus === "success") {
            return res.status(200).json({ status: 'completed', transaction: dbTx, wait_for_webhook: true });
        } else if (pcStatus === "failed") {
          const { data: failedTxs } = await supabaseAdmin
            .from("transactions")
            .update({ status: "failed" })
            .eq("id", dbTx.id)
            .eq("status", "pending")
            .select();
  
          dbTx.status = "failed";
        }
      }
      
      return res.status(200).json({ status: dbTx.status, transaction: dbTx });
    } catch (error: any) {
      console.error("[API] Verification error:", error);
      return res.status(500).json({ error: error.message });
    }
  };

  app.post('/api/functions/v1/verify-payment', handleVerifyPayment);
  app.post('/api/functions/verify-payment', handleVerifyPayment);
  app.get('/api/functions/v1/verify-payment', handleVerifyPayment);
  app.get('/api/functions/verify-payment', handleVerifyPayment);

  // New endpoint for admin to manually update payout status
  app.post('/api/admin/payouts/:id/status', async (req, res) => {
    try {
      const user = await verifyUser(req);
      if (!user) return res.status(401).json({ error: 'Unauthorized' });

      // Check if user is admin
      const { data: profile, error: profileErr } = await supabaseAdmin.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
      const { data: userProfile, error: upErr } = await supabaseAdmin.from('user_profiles').select('is_admin').eq('id', user.id).maybeSingle();
      
      const isSystemAdmin = profile?.is_admin === true || userProfile?.is_admin === true;
      
      if (!isSystemAdmin) {
         console.warn(`[API] Admin access denied for user ${user.id}`);
         return res.status(403).json({ error: 'Admin access required' });
      }

      const { id } = req.params;
      const { status, error_message } = req.body;

      if (!['paid', 'failed'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      const { data: payout, error: payoutError } = await supabaseAdmin
        .from('payout_requests')
        .select('*')
        .eq('id', id)
        .single();

      if (payoutError || !payout) throw new Error('Payout request not found');
      if (payout.status === 'paid' || payout.status === 'failed') {
        return res.status(400).json({ error: 'Payout already processed' });
      }

      if (status === 'paid') {
        const { error: updateError } = await supabaseAdmin.from('payout_requests').update({
          status: 'paid',
          paid_at: new Date().toISOString()
        }).eq('id', id);

        if (updateError) {
          console.error('[API] Payout update failed:', updateError);
          throw new Error(`Update failed: ${updateError.message}`);
        }

        // Record the transaction for accounting
        const { error: txError } = await supabaseAdmin.from('transactions').insert({
          artist_id: payout.artist_id,
          type: 'withdrawal',
          gross_amount: payout.requested_amount,
          net_amount: payout.net_amount || (payout.requested_amount * 0.97),
          status: 'completed',
          paychangu_ref: payout.reference || `manual-${id}`,
          description: `Manual payout withdrawal to ${payout.phone} (${payout.network})`
        });
        
        if (txError) console.error('[API] Withdrawal transaction recording failed:', txError);

        await supabaseAdmin.from('notifications').insert({
          profile_id: payout.artist_id,
          user_type: 'artist',
          type: 'payout_sent',
          message: `Your manual payout of MK ${payout.requested_amount.toLocaleString()} has been verified and processed! 🥳`,
          link: '/artist-hub#wallet'
        });
      } else if (status === 'failed') {
        const { error: updateError } = await supabaseAdmin.from('payout_requests').update({ 
          status: 'failed',
          error_message: error_message || 'Manual verification failed'
        }).eq('id', id);

        if (updateError) throw new Error(`Status update failed: ${updateError.message}`);

        // Refund wallet
        const { data: artist } = await supabaseAdmin.from('profiles').select('wallet_balance').eq('id', payout.artist_id).single();
        const { error: refundError } = await supabaseAdmin.from('profiles').update({
          wallet_balance: (artist?.wallet_balance || 0) + payout.requested_amount
        }).eq('id', payout.artist_id);

        if (refundError) console.error('[API] Wallet refund failed:', refundError);

        await supabaseAdmin.from('notifications').insert({
          profile_id: payout.artist_id,
          user_type: 'artist',
          type: 'payout_failed',
          message: `Your withdrawal request of MK ${payout.requested_amount.toLocaleString()} was declined. Funds have been returned to your wallet.`,
          link: '/artist-hub#wallet'
        });
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error('[API] Admin payout update error:', error);
      res.status(400).json({ error: error.message });
    }
  });

  // 3. Payout Webhook
  app.post('/api/functions/payout-webhook', async (req, res) => {
    try {
      if (!supabaseAdmin) throw new Error('Supabase Admin not initialized');
      const { reference, status, amount } = req.body;

      const { data: payout, error: payoutError } = await supabaseAdmin
        .from('payout_requests')
        .select('*')
        .eq('reference', reference)
        .single();

      if (payoutError || !payout) {
        return res.sendStatus(200);
      }

      if (payout.status === 'paid' || payout.status === 'failed') {
        return res.sendStatus(200);
      }

      if (status === 'successful') {
        await supabaseAdmin.from('payout_requests').update({
          status: 'paid',
          paid_at: new Date().toISOString()
        }).eq('id', payout.id);

        await supabaseAdmin.from('transactions').insert({
          artist_id: payout.artist_id,
          type: 'withdrawal',
          gross_amount: amount,
          status: 'completed',
          paychangu_ref: reference
        });

        await supabaseAdmin.from('notifications').insert({
          profile_id: payout.artist_id,
          user_type: 'artist',
          type: 'payout_sent',
          message: `MK ${amount.toLocaleString()} has been sent to your ${payout.network} number 🥳`,
          link: '/artist-hub#wallet'
        });
      } else if (status === 'failed') {
        await supabaseAdmin.from('payout_requests').update({ status: 'failed' }).eq('id', payout.id);
        const { data: artist } = await supabaseAdmin.from('profiles').select('wallet_balance').eq('id', payout.artist_id).single();
        await supabaseAdmin.from('profiles').update({
          wallet_balance: (artist?.wallet_balance || 0) + payout.requested_amount
        }).eq('id', payout.artist_id);

        await supabaseAdmin.from('notifications').insert({
          profile_id: payout.artist_id,
          user_type: 'artist',
          type: 'payout_failed',
          message: `Your withdrawal failed. MK ${amount.toLocaleString()} returned to your wallet.`,
          link: '/artist-hub#payouts'
        });
      }

      res.sendStatus(200);
    } catch (error) {
      console.error('Payout webhook error:', error);
      res.sendStatus(200);
    }
  });

  // 4. Send SMS
  app.post('/api/functions/send-sms', async (req, res) => {
    try {
      const { to, message } = req.body;
      if (!to || !message) throw new Error("Missing recipient or message");

      const response = await fetch('https://api.africastalking.com/version1/messaging', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
          'apiKey': process.env.AT_API_KEY!,
        },
        body: new URLSearchParams({
          username: process.env.AT_USERNAME!,
          to,
          message,
        }),
      });

      const result = await response.json();
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // 5. PayChangu Webhook (previously 3)
  app.post('/api/paychangu-webhook', async (req, res) => {
    try {
      if (!supabaseAdmin) throw new Error('Supabase Admin not initialized');
      const payload = req.body;
      const tx_ref = payload.tx_ref || payload.transaction_reference || payload.reference;
      const status = payload.status;
      const amount = payload.amount;
      
      if (!tx_ref) {
        console.error('[WEBHOOK] Missing reference in payload:', payload);
        return res.sendStatus(200);
      }
      
      const { data: transaction, error: txError } = await supabaseAdmin
        .from('transactions')
        .select('*')
        .eq('paychangu_ref', tx_ref)
        .single();

      if (txError || !transaction) {
        console.error(`Transaction not found: ${tx_ref}`);
        return res.sendStatus(200);
      }

      if (transaction.status === 'completed' || transaction.status === 'failed') {
        return res.sendStatus(200);
      }

      if (status !== 'successful') {
        await supabaseAdmin.from('transactions').update({ status: 'failed' }).eq('id', transaction.id);
        return res.sendStatus(200);
      }

      const type = (transaction.metadata?.payment_type || tx_ref.split('-')[1]).toUpperCase();
      const metadata = transaction.metadata || {};
      const userId = metadata.userId || transaction.fan_id;
      const { artistId, songId, anonymous } = metadata;

      console.log(`[WEBHOOK] Payload received:`, JSON.stringify(payload));
      console.log(`[WEBHOOK] Processing type: ${type} for ref: ${tx_ref}, userId: ${userId}, artistId: ${artistId}`);

      // Calculate dynamic platform fee based on artist tier
      let pFee = 0;
      let artistNet = 0;
      let platformFeeRate = 0.15; // Default for Free tier

      if (artistId) {
        const { data: artistProfile } = await supabaseAdmin
          .from('profiles')
          .select('subscription_tier, artist_tier')
          .eq('id', artistId)
          .single();
        
        const currentTier = (artistProfile?.subscription_tier || artistProfile?.artist_tier || 'Free').toLowerCase();
        
        if (currentTier.includes('rising')) {
          platformFeeRate = 0.10;
        } else if (currentTier.includes('standard')) {
          platformFeeRate = 0.07;
        } else if (currentTier.includes('elite') || currentTier.includes('platinum')) {
          platformFeeRate = 0.05;
        }
      }

      if (type === 'TRACK_PURCHASE') {
        pFee = amount * platformFeeRate;
      } else if (type === 'TIP') {
        pFee = amount * platformFeeRate;
      } else if (type === 'FAN_SUBSCRIPTION') {
        pFee = amount * platformFeeRate;
      } else if (type.includes('LISTENER_') || type.includes('ARTIST_')) {
        pFee = amount; // Platform takes 100% for studio tiers and listener subs
      }

      artistNet = amount - pFee;

      await supabaseAdmin.from('transactions').update({ 
        status: 'completed',
        gross_amount: amount,
        platform_fee: pFee,
        net_amount: artistNet,
        completed_at: new Date().toISOString()
      }).eq('id', transaction.id);

      // Increment Admin Wallet if platform fee exists
      if (pFee > 0) {
        try {
          const { data: adminUser } = await supabaseAdmin
            .from('profiles')
            .select('id, wallet_balance')
            .eq('is_admin', true)
            .limit(1)
            .maybeSingle();
            
          if (adminUser) {
             await supabaseAdmin.from('profiles').update({ wallet_balance: (adminUser.wallet_balance || 0) + pFee }).eq('id', adminUser.id);
          }
        } catch (adminErr) {
          console.error('[WEBHOOK] Admin wallet update error:', adminErr);
        }
      }

      await supabaseAdmin.from('webhook_logs').insert({
        tx_ref,
        type: type,
        status: 'processed',
        payload: JSON.stringify(payload)
      });

      switch (type) {
        case 'TRACK_PURCHASE':
          if (!userId || !songId) {
            console.error('[WEBHOOK] Missing metadata for TRACK_PURCHASE:', metadata);
            break;
          }
          // EXPLICIT LOCK RELIEF
          const { error: fanError } = await supabaseAdmin.from('fan_purchases').upsert({ 
            fan_id: userId, 
            song_id: songId, 
            transaction_id: transaction.id,
            amount: amount,
            status: 'completed',
            purchased_at: new Date().toISOString()
          }, { onConflict: 'fan_id,song_id' });
          
          if (fanError) console.error('[WEBHOOK] fan_purchases insert error:', fanError);

          await supabaseAdmin.rpc('increment_song_sales', { s_id: songId });
          
          if (artistId) {
            try {
              const { error: rpcErr } = await supabaseAdmin.rpc('increment_wallet_balance', { p_id: artistId, amount: artistNet });
              if (rpcErr) {
                 console.warn('[WEBHOOK] RPC increment failed, trying manual fallback...', rpcErr.message);
                 const { data: p } = await supabaseAdmin.from('profiles').select('wallet_balance').eq('id', artistId).single();
                 await supabaseAdmin.from('profiles').update({ wallet_balance: (p?.wallet_balance || 0) + artistNet }).eq('id', artistId);
              }
            } catch(e) {
               console.error('[WEBHOOK] Wallet update error:', e);
            }
            
            await supabaseAdmin.from('notifications').insert({
               profile_id: artistId,
               user_type: 'artist',
               type: 'track_sold',
               message: `You sold a track! MWK ${amount.toLocaleString()} earned. 💿`,
               link: '/artist-hub#dashboard'
            });
          }
          break;

        case 'TIP':
          if (artistId) {
            console.log(`[WEBHOOK] Incrementing wallet for artist ${artistId} by ${artistNet}`);
            const { error: tipRpcErr } = await supabaseAdmin.rpc('increment_wallet_balance', { p_id: artistId, amount: artistNet });
            if (tipRpcErr) {
              console.warn('[WEBHOOK] TIP RPC failed, trying manual fallback...', tipRpcErr.message);
              const { data: p } = await supabaseAdmin.from('profiles').select('wallet_balance').eq('id', artistId).single();
              const { error: manualErr } = await supabaseAdmin.from('profiles').update({ wallet_balance: (p?.wallet_balance || 0) + artistNet }).eq('id', artistId);
              if (manualErr) console.error('[WEBHOOK] Manual wallet update failed:', manualErr);
            }

            if (!anonymous) {
              await supabaseAdmin.from('notifications').insert({
                profile_id: artistId,
                user_type: 'artist',
                type: 'tip_received',
                message: `You received a MWK ${amount.toLocaleString()} tip! (Net: MWK ${artistNet.toLocaleString()}) 💸`,
                link: '/artist-hub#dashboard'
              });
            }
          } else {
            console.error('[WEBHOOK] No artistId found for TIP payment');
          }
          break;

        case 'FAN_SUBSCRIPTION':
          const renewsAt = new Date();
          renewsAt.setDate(renewsAt.getDate() + 30);
          await supabaseAdmin.from('fan_subscriptions').upsert({
            fan_id: userId,
            artist_id: artistId,
            status: 'active',
            next_billing_at: renewsAt.toISOString()
          });

          if (artistId) {
            try {
              const { error: rpcErr } = await supabaseAdmin.rpc('increment_wallet_balance', { p_id: artistId, amount: artistNet });
              if (rpcErr) {
                 const { data: p } = await supabaseAdmin.from('profiles').select('wallet_balance').eq('id', artistId).single();
                 await supabaseAdmin.from('profiles').update({ wallet_balance: (p?.wallet_balance || 0) + artistNet }).eq('id', artistId);
              }
            } catch(e) {
               console.error('[WEBHOOK] Fan sub wallet update error:', e);
            }
          }

          await supabaseAdmin.from('notifications').insert({
            profile_id: artistId,
            user_type: 'artist',
            type: 'fan_subscribed',
            message: `A fan has subscribed to you! MWK ${amount.toLocaleString()} earned. 💖`,
            link: '/artist-hub#fans'
          });
          break;

        case 'LISTENER_PREMIUM':
        case 'LISTENER_FAMILY':
          const subEnds = new Date();
          subEnds.setDate(subEnds.getDate() + 30);
          const subTierName = type === 'LISTENER_PREMIUM' ? 'Premium' : 'Family';
          await supabaseAdmin.from('user_profiles').update({
            subscription_tier: subTierName,
            subscription_ends: subEnds.toISOString()
          }).eq('id', userId);
          await supabaseAdmin.from('profiles').update({
            subscription_tier: subTierName,
            subscription_ends: subEnds.toISOString()
          }).eq('id', userId);
          console.log(`[WEBHOOK] Updated listener subscription for ${userId} to ${type}`);
          break;

        case 'ARTIST_RISING_STAR':
        case 'ARTIST_STANDARD':
        case 'ARTIST_ELITE':
          const artistTierEnds = new Date();
          artistTierEnds.setDate(artistTierEnds.getDate() + 365);
          
          const tierMap: Record<string,string> = {
            'ARTIST_RISING_STAR': 'RisingStar',
            'ARTIST_STANDARD': 'Standard', 
            'ARTIST_ELITE': 'Elite'
          }
          const artistTierName = tierMap[type] || 'Free';
          
          await supabaseAdmin.from('profiles').update({
            subscription_tier: artistTierName,
            artist_tier: artistTierName,
            subscription_ends: artistTierEnds.toISOString()
          }).eq('id', userId);
          console.log(`[WEBHOOK] Updated artist subscription for ${userId} to ${artistTierName}`);
          break;
      }

      res.sendStatus(200);
    } catch (error) {
      console.error('Webhook error:', error);
      res.sendStatus(200);
    }
  });

  // --- VITE MIDDLEWARE OR STATIC SERVING ---
  const distPath = path.resolve(__dirname, 'dist');
  const indexHtmlExists = fs.existsSync(path.join(distPath, 'index.html'));

  if (process.env.NODE_ENV === 'production') {
    console.log('--- PRODUCTION MODE ---');
    if (indexHtmlExists) {
      console.log('Serving static files from dist/');
      app.use(express.static(distPath, {
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('index.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
          } else if (filePath.match(/\.(js|css|webp|png|jpg|jpeg|gif|svg|woff2?)$/)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000');
          }
        }
      }));
      
      app.get('*', (req, res) => {
        // Do not return index.html for missing static assets
        if (req.originalUrl.match(/\.(js|css|webp|png|jpg|jpeg|gif|svg|woff2?|map)$/)) {
          return res.status(404).send('Not found');
        }
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.sendFile(path.join(distPath, 'index.html'));
      });
    } else {
      console.error('CRITICAL: dist/index.html not found in production!');
      app.get('*', (req, res) => res.status(500).send('Production build missing. Please run npm run build.'));
    }
  } else {
    console.log('--- DEVELOPMENT MODE (Vite Middleware) ---');
    try {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
      
      // Fallback for SPA if Vite middleware doesn't catch it
      app.get('*', async (req, res, next) => {
        const url = req.originalUrl;
        try {
          const indexPath = path.resolve(__dirname, 'index.html');
          if (!fs.existsSync(indexPath)) {
             return res.status(404).send('index.html not found in root');
          }
          let template = fs.readFileSync(indexPath, 'utf-8');
          template = await vite.transformIndexHtml(url, template);
          res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
        } catch (e) {
          next(e);
        }
      });
    } catch (err) {
      console.error('Vite failed to initialize:', err);
      if (indexHtmlExists) {
        console.warn('Vite failed, falling back to static dist/ as emergency fallback');
        app.use(express.static(distPath));
        app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
      }
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`--- SERVER READY ---`);
    console.log(`URL: http://localhost:${PORT}`);
    console.log(`MODE: ${indexHtmlExists ? 'Production (Static)' : 'Development (Vite)'}`);
  });
}

startServer();
