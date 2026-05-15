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

  app.use(cors());
  app.use(express.json());

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      time: new Date().toISOString(),
      supabaseReady: !!supabaseAdmin,
      env: process.env.NODE_ENV
    });
  });

  const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
  // Fallbacks for 15-character truncation limit in some panels
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPA_ADMIN_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVIC || process.env.SUPABASE_SECRE;
  const PAYCHANGU_SECRET_KEY = process.env.PAYCHANGU_SEC || process.env.PAYCHANGU_SECRET_KEY || process.env.PAYCHANGU_SECRE;
  let APP_URL = process.env.APP_URL || process.env.VITE_APP_URL || `http://localhost:${PORT}`;
  if (APP_URL === 'YOUR_APP_URL' || APP_URL === 'APP_URL') {
    APP_URL = `http://localhost:${PORT}`;
  }

  let supabaseAdmin: any = null;
  const adminKey = SUPABASE_SERVICE_ROLE_KEY && SUPABASE_SERVICE_ROLE_KEY !== 'YOUR_SUPABASE_SERVICE_ROLE_KEY' && SUPABASE_SERVICE_ROLE_KEY !== 'YOUR_SUPA_ADMIN_KEY'
    ? SUPABASE_SERVICE_ROLE_KEY 
    : process.env.VITE_SUPABASE_ANON_KEY;

  console.log('[DEBUG] SUPABASE_SERVICE_ROLE_KEY present:', !!SUPABASE_SERVICE_ROLE_KEY);
  console.log('[DEBUG] PAYCHANGU_SECRET_KEY present:', !!PAYCHANGU_SECRET_KEY);

  if (SUPABASE_URL && adminKey) {
    try {
      supabaseAdmin = createClient(SUPABASE_URL, adminKey);
      if (adminKey === process.env.VITE_SUPABASE_ANON_KEY) {
        console.warn('CRITICAL WARNING: SUPABASE_SERVICE_ROLE_KEY is missing or invalid. Using ANON key for server operations, which will cause RLS violations.');
      } else {
        console.log('SUPABASE_SERVICE_ROLE_KEY successfully loaded. Admin operations enabled.');
      }
    } catch (err) {
      console.error('Failed to initialize Supabase Admin:', err);
    }
  } else {
    console.warn('Supabase credentials missing. Admin operations will fail.');
  }

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

  // 1. Create Payment
  app.post(['/api/functions/v1/create-payment', '/api/functions/create-payment'], async (req, res) => {
    try {
      if (!PAYCHANGU_SECRET_KEY || PAYCHANGU_SECRET_KEY === 'YOUR_PAYCHANGU_SECRET_KEY') {
        throw new Error('PAYCHANGU_SECRET_KEY is missing or not configured');
      }

      const user = await verifyUser(req);
      if (!user) return res.status(401).json({ error: 'Unauthorized route access' });

      const { amount, email, first_name, last_name, type, tx_ref, meta, return_url, currency, callback_url } = req.body;

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
        net_amount: amount * 0.9,
        status: 'pending',
        paychangu_ref: tx_ref,
        description: descriptions[type] || 'Smashify Payment',
        metadata: meta
      });

      if (txError) {
        console.error('create-payment: txError:', txError.message);
        throw txError;
      }

      // Initialize PayChangu
      const response = await fetch('https://api.paychangu.com/payment', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PAYCHANGU_SECRET_KEY}`,
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
      let payload;
      try {
        payload = JSON.parse(responseText);
      } catch (err) {
        throw new Error(`PayChangu returned non-JSON: ${responseText.substring(0, 100)}...`);
      }

      if (!response.ok) {
        await supabaseAdmin.from('transactions').delete().eq('paychangu_ref', tx_ref);
        throw new Error(payload.message || 'PayChangu initialization failed');
      }

      res.json({ checkout_url: payload.data.checkout_url });
    } catch (error: any) {
      console.error('Create payment error:', error);
      res.status(400).json({ error: error.message });
    }
  });

  // 2. Process Payout
  app.post(['/api/functions/v1/process-payout', '/api/functions/process-payout'], async (req, res) => {
    try {
      if (!PAYCHANGU_SECRET_KEY || PAYCHANGU_SECRET_KEY === 'YOUR_PAYCHANGU_SECRET_KEY') {
        throw new Error('PAYCHANGU_SECRET_KEY is missing or not configured');
      }

      const user = await verifyUser(req);
      if (!user) return res.status(401).json({ error: 'Unauthorized route access' });

      const { amount, phone, network } = req.body;

      const { data: artist, error: artistError } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (artistError || !artist) throw new Error('Artist profile not found');
      if (artist.wallet_balance < amount) throw new Error('Insufficient wallet balance');
      if (amount < 2000) throw new Error('Minimum withdrawal is MK 2,000');

      const { data: updatedArtist, error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ wallet_balance: artist.wallet_balance - amount })
        .eq('id', user.id)
        .gte('wallet_balance', amount)
        .select()
        .single();

      if (updateError || !updatedArtist) throw new Error('Failed to update balance. Check your funds.');

      const payoutRef = `WD-${user.id}-${Date.now()}`;

      const { data: payoutReq, error: payoutReqError } = await supabaseAdmin
        .from('payout_requests')
        .insert({
          artist_id: user.id,
          requested_amount: amount,
          phone,
          network,
          status: 'processing',
          reference: payoutRef
        })
        .select()
        .single();

      if (payoutReqError) {
        await supabaseAdmin.from('profiles').update({ wallet_balance: artist.wallet_balance }).eq('id', user.id);
        throw payoutReqError;
      }

      console.log("PayChangu Payout: Calling endpoint...", 'https://api.paychangu.com/mobile-money/transfer');
      // Clean KEY and ensure plural/singular consistency
      const cleanKey = PAYCHANGU_SECRET_KEY.trim();
      const response = await fetch('https://api.paychangu.com/mobile-money/transfer', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cleanKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          amount,
          currency: 'MWK',
          mobile: phone,
          service: network.toLowerCase(), // CRITICAL: Must be lowercase
          reference: payoutRef,
          // Removed first_name/last_name as they can trigger different route logic in PayChangu
        })
      });

      const responseText = await response.text();
      console.log("PayChangu Payout Status:", response.status);
      console.log("PayChangu Payout Response:", responseText);

      let payload;
      try {
        payload = JSON.parse(responseText);
      } catch (err) {
        throw new Error(`PayChangu returned non-JSON (${response.status}): ${responseText.substring(0, 100)}...`);
      }

      if (!response.ok) {
        await supabaseAdmin.from('profiles').update({ wallet_balance: artist.wallet_balance }).eq('id', user.id);
        await supabaseAdmin.from('payout_requests').update({ status: 'failed', error_message: payload.message || responseText }).eq('id', payoutReq.id);
        throw new Error(payload.message || `PayChangu payout initialization failed (${response.status})`);
      }

      await supabaseAdmin.from('payout_requests').update({ 
        status: 'pending',
        paychangu_reference: payload.data?.reference 
      }).eq('id', payoutReq.id);

      res.json({ success: true, reference: payoutRef });
    } catch (error: any) {
      console.error('Payout error:', error);
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
          processed_at: new Date().toISOString()
        }).eq('id', payout.id);

        await supabaseAdmin.from('transactions').insert({
          artist_id: payout.artist_id,
          type: 'withdrawal',
          gross_amount: amount,
          status: 'completed',
          paychangu_ref: reference
        });

        await supabaseAdmin.from('notifications').insert({
          user_id: payout.artist_id,
          user_type: 'artist',
          type: 'payout_sent',
          message: `MK ${amount.toLocaleString()} has been sent to your ${payout.network} number 🎉`,
          link: '/artist-hub#wallet'
        });
      } else if (status === 'failed') {
        await supabaseAdmin.from('payout_requests').update({ status: 'failed' }).eq('id', payout.id);
        const { data: artist } = await supabaseAdmin.from('profiles').select('wallet_balance').eq('id', payout.artist_id).single();
        await supabaseAdmin.from('profiles').update({
          wallet_balance: (artist?.wallet_balance || 0) + payout.requested_amount
        }).eq('id', payout.artist_id);

        await supabaseAdmin.from('notifications').insert({
          user_id: payout.artist_id,
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
      const { tx_ref, status, amount } = payload;
      
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

      const type = tx_ref.split('-')[1];
      const { userId, artistId, songId, plan, tier, plays, anonymous } = transaction.metadata || {};

      await supabaseAdmin.from('transactions').update({ 
        status: 'completed',
        completed_at: new Date().toISOString()
      }).eq('id', transaction.id);

      await supabaseAdmin.from('webhook_logs').insert({
        tx_ref,
        type,
        status: 'processed',
        payload: JSON.stringify(payload)
      });

      switch (type) {
        case 'TRACK_PURCHASE':
          await supabaseAdmin.from('fan_purchases').insert({ fan_id: userId, song_id: songId, transaction_id: transaction.id });
          await supabaseAdmin.rpc('increment_song_sales', { s_id: songId });
          const saleFee = 0.15;
          const saleNet = amount * (1 - saleFee);
          await supabaseAdmin.rpc('increment_wallet_balance', { p_id: artistId, amount: saleNet });
          break;

        case 'TIP':
          const tipFee = 0.10;
          const tipNet = amount * (1 - tipFee);
          await supabaseAdmin.rpc('increment_wallet_balance', { p_id: artistId, amount: tipNet });
          if (!anonymous) {
            await supabaseAdmin.from('notifications').insert({
              user_id: artistId,
              user_type: 'artist',
              type: 'tip_received',
              message: `You received a MWK ${amount.toLocaleString()} tip! (Net: MWK ${tipNet.toLocaleString()}) 💸`,
              link: '/artist-hub#dashboard'
            });
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
          break;

        case 'LISTENER_PREMIUM':
        case 'LISTENER_FAMILY':
          const subEnds = new Date();
          subEnds.setDate(subEnds.getDate() + 30);
          await supabaseAdmin.from('user_profiles').update({
            subscription_tier: type === 'LISTENER_PREMIUM' ? 'Premium' : 'Family',
            subscription_ends: subEnds.toISOString()
          }).eq('id', userId);
          break;

        case 'ARTIST_RISING_STAR':
        case 'ARTIST_STANDARD':
        case 'ARTIST_ELITE':
          const artistTierEnds = new Date();
          artistTierEnds.setDate(artistTierEnds.getDate() + 365);
          const tierName = type.split('_')[1].toLowerCase() === 'rising' ? 'rising_star' : type.split('_')[1].toLowerCase();
          await supabaseAdmin.from('profiles').update({
            subscription_tier: tierName,
            subscription_ends: artistTierEnds.toISOString()
          }).eq('id', userId);
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

  if (process.env.NODE_ENV === 'production' || indexHtmlExists) {
    console.log('Serving static files from dist/');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    console.log('Starting Vite in middleware mode...');
    try {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (err) {
      console.error('Vite failed to initialize:', err);
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`--- SERVER READY ---`);
    console.log(`URL: http://localhost:${PORT}`);
    console.log(`MODE: ${indexHtmlExists ? 'Production (Static)' : 'Development (Vite)'}`);
  });
}

startServer();
