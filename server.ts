import express from 'express';
import cors from 'cors';
import fs from 'fs';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';

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


async function startServer() {
  const app = express();
  app.set("trust proxy", 1);
  const PORT = 3000;

  console.log(`NODE_ENV is: ${process.env.NODE_ENV}`);

  const allowedOrigins = [
    'https://smashifymusic.vercel.app',
    'https://play-smashify.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173'
  ];

  app.use(cors({
    origin: function (origin, callback) {
      if (
        !origin || 
        allowedOrigins.includes(origin) || 
        origin.endsWith('.run.app') || 
        origin.endsWith('.vercel.app') || 
        origin.includes('localhost') || 
        origin.includes('127.0.0.1')
      ) {
        callback(null, true);
      } else {
        // Allow origin instead of rejecting with an unhandled exception
        callback(null, true);
      }
    },
    credentials: true
  }));
  app.use(express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    }
  }));

  // Security Headers
  app.use((req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    next();
  });

  // Rate Limiter for API endpoints
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: { error: 'Too many requests from this IP, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false, trustProxy: false }
  });

  // Apply to all /api routes
  app.use('/api/', apiLimiter);

  // Apply stricter limit to auth endpoints if they exist in the future
  const authLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5, // Limit each IP to 5 requests per windowMs
    message: { error: 'Too many login attempts. Please try again later.' }
  });
  app.use('/api/auth/', authLimiter);

  // Log all API requests
  app.use('/api', (req, res, next) => {
    console.log(`[API_LOG] ${req.method} ${req.originalUrl}`);
    next();
  });

  // Force download for APK
  app.get('/downloads/Smashify.apk', (req, res) => {
    let apkPath = path.resolve(process.cwd(), 'dist/downloads/Smashify.apk');
    if (!fs.existsSync(apkPath)) {
       apkPath = path.resolve(process.cwd(), 'public/downloads/Smashify.apk');
    }
    
    if (fs.existsSync(apkPath)) {
      res.setHeader('Content-Type', 'application/vnd.android.package-archive');
      res.setHeader('Content-Disposition', 'attachment; filename="Smashify.apk"');
      res.sendFile(apkPath);
    } else {
      res.status(404).send('APK not found');
    }
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

  const anonKey = (process.env.VITE_SUPABASE_ANON_KEY || '').trim();
  let supabaseAdmin: any = null;

  if (SUPABASE_URL) {
    const rawAdminKey = (SUPABASE_SERVICE_ROLE_KEY || '').trim();
    // Validate if key is a real JWT (must start with eyJ) and not an email or placeholder
    const isValidJwt = rawAdminKey.startsWith('eyJ') && 
      rawAdminKey !== 'YOUR_SUPABASE_SERVICE_ROLE_KEY' && 
      rawAdminKey !== 'YOUR_SUPA_ADMIN_KEY';

    const adminKey = isValidJwt ? rawAdminKey : anonKey;

    if (rawAdminKey && !isValidJwt) {
      console.warn('[Server] Notice: SUPA_ADMIN_KEY/SUPABASE_SERVICE_ROLE_KEY is not a valid JWT token. Safely falling back to VITE_SUPABASE_ANON_KEY.');
    }

    if (adminKey) {
      try {
        supabaseAdmin = createClient(SUPABASE_URL, adminKey, {
          auth: { persistSession: false, autoRefreshToken: false }
        });
        if (!isValidJwt) {
          console.warn('[Server] Supabase admin running with VITE_SUPABASE_ANON_KEY. Authenticated requests will use scoped user tokens.');
        } else {
          console.log('[Server] Supabase admin client initialized with service role.');
        }
      } catch (err) {
        console.error('Failed to initialize Supabase client:', err);
      }
    }
  }

  // Helper to create a user-scoped client that passes RLS with auth.uid() = user.id
  const getScopedClient = (req: express.Request) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ') && SUPABASE_URL && anonKey) {
      return createClient(SUPABASE_URL, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { Authorization: authHeader } }
      });
    }
    return supabaseAdmin;
  };

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

  // Helper to verify PayChangu Webhook Signatures
  const verifyPayChanguSignature = (req: express.Request): boolean => {
    const signature = req.headers['x-paychangu-signature'] as string;
    if (!signature) {
      console.error('[SIGNATURE] Missing x-paychangu-signature header');
      return false;
    }
    
    const webhookSecret = process.env.PAYCHANGU_WEBHOOK_SECRET || PAYCHANGU_SECRET_KEY;
    if (!webhookSecret) {
      console.error('[SIGNATURE] Webhook secret not configured');
      return false;
    }

    const rawBody = (req as any).rawBody;
    if (!rawBody) {
      console.error('[SIGNATURE] Raw body is missing - cannot verify signature');
      return false;
    }

    try {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      return expectedSignature === signature;
    } catch (e) {
      console.error('[SIGNATURE] Error computing signature HMAC:', e);
      return false;
    }
  };

  // --- API ROUTES (Functions) ---
  
  // CORS Preflight for all functions
  app.options([
    '/api/functions/v1/create-payment', 
    '/api/functions/create-payment', 
    '/api/functions/v1/process-payout', 
    '/api/functions/process-payout',
    '/api/functions/v1/verify-payment',
    '/api/functions/verify-payment',
    '/api/pay/create-payment',
    '/api/pay/process-payout',
    '/api/pay/verify-payment'
  ], (req, res) => {
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

      const { amount: requestedAmount, email, first_name, last_name, type, tx_ref, meta, return_url, callback_url } = req.body;
      const paymentType = (type || '').toLowerCase();

      // Canonical server-side pricing quotes
      const CANONICAL_PRICES: Record<string, number> = {
        'listener_daily_pass': 150,
        'listener_weekly_pass': 700,
        'listener_premium': 2000,
        'listener_family': 5000,
        'artist_rising_star': 8000,
        'artist_standard': 16000,
        'artist_elite': 27000,
      };

      let validatedAmount = Number(requestedAmount);
      let artistId = meta?.artistId || null;

      if (paymentType === 'track_purchase') {
        if (!meta?.songId) {
          return res.status(400).json({ error: 'Missing songId for track purchase' });
        }
        const { data: songRow, error: songErr } = await supabaseAdmin
          .from('songs')
          .select('price, is_for_sale, artist_id, discount_percent, sale_ends_at')
          .eq('id', meta.songId)
          .maybeSingle();

        if (songErr || !songRow || !songRow.is_for_sale) {
          return res.status(400).json({ error: 'This track is not available for purchase' });
        }

        const pct = songRow.discount_percent || 0;
        const saleExpired = songRow.sale_ends_at && new Date(songRow.sale_ends_at).getTime() < Date.now();
        validatedAmount = (pct > 0 && !saleExpired)
          ? Math.max(Math.round(songRow.price * (1 - pct / 100)), 1)
          : songRow.price;

        artistId = songRow.artist_id;
        meta.artistId = artistId;
      } else if (paymentType === 'album_purchase') {
        if (!meta?.albumId) {
          return res.status(400).json({ error: 'Missing albumId for album purchase' });
        }
        const { data: albumRow, error: albumErr } = await supabaseAdmin
          .from('albums')
          .select('id, price, is_for_sale, artist_id, discount_percent, sale_ends_at')
          .eq('id', meta.albumId)
          .maybeSingle();

        if (albumErr || !albumRow) {
          return res.status(400).json({ error: 'Album not found' });
        }

        if (!albumRow.is_for_sale) {
          return res.status(400).json({ error: 'This album is not available for purchase' });
        }

        // Snapshot Logic: Fetch track IDs at checkout time
        const { data: tracks } = await supabaseAdmin
          .from('songs')
          .select('id')
          .eq('album_id', albumRow.id);

        if (!tracks || tracks.length === 0) {
          return res.status(400).json({ error: 'This album is empty and cannot be purchased' });
        }

        meta.trackIds = tracks.map(t => t.id);

        const basePrice = Number(albumRow.price || 0);
        if (basePrice <= 0) {
          return res.status(400).json({ error: 'This album does not have a valid price set by the artist' });
        }

        const pct = albumRow.discount_percent || 0;
        const saleExpired = albumRow.sale_ends_at && new Date(albumRow.sale_ends_at).getTime() < Date.now();
        validatedAmount = (pct > 0 && !saleExpired)
          ? Math.max(Math.round(basePrice * (1 - pct / 100)), 1)
          : basePrice;

        artistId = albumRow.artist_id;
        meta.artistId = artistId;
      } else if (paymentType === 'fan_subscription') {
        if (!meta?.artistId) {
          return res.status(400).json({ error: 'Missing artistId for fan subscription' });
        }
        const { data: artistProfile } = await supabaseAdmin
          .from('profiles')
          .select('subscription_price')
          .eq('id', meta.artistId)
          .maybeSingle();

        validatedAmount = artistProfile?.subscription_price || 1500;
        artistId = meta.artistId;
      } else if (CANONICAL_PRICES[paymentType]) {
        validatedAmount = CANONICAL_PRICES[paymentType];
        artistId = user.id;
      }

      if (isNaN(validatedAmount) || validatedAmount <= 0) {
        return res.status(400).json({ error: 'Invalid payment amount calculated by server' });
      }

      console.log(`[API] Processing ${paymentType} for user ${user.id}, validated MWK amount: ${validatedAmount}, ref: ${tx_ref}`);

      const descriptions: Record<string, string> = {
        'track_purchase': `Purchase of music track on Smashify`,
        'album_purchase': `Purchase of full music album on Smashify`,
        'tip': `Tip to artist on Smashify`,
        'fan_subscription': `Monthly fan subscription on Smashify`,
        'listener_daily_pass': `Smashify Premium Daily Pass`,
        'listener_weekly_pass': `Smashify Premium Weekly Pass`,
        'listener_premium': `Smashify Premium Subscription`,
        'listener_family': `Smashify Family Subscription`,
        'artist_rising_star': `Smashify Rising Star Studio Tier`,
        'artist_standard': `Smashify Standard Studio Tier`,
        'artist_elite': `Smashify Elite Studio Tier`,
        'artist_ad_campaign': `Promotion campaign on Smashify`,
        'featured_placement': `Featured placement on Smashify`,
      };

      let dbType = 'other';
      if (paymentType.includes('listener_') || paymentType.includes('artist_') || paymentType.includes('subscription')) {
         if (paymentType === 'artist_ad_campaign' || paymentType === 'featured_placement') {
            dbType = 'promotion';
         } else {
            dbType = 'subscription';
         }
      } else if (paymentType === 'tip') {
         dbType = 'donation';
      } else if (paymentType === 'track_purchase' || paymentType === 'album_purchase') {
         dbType = 'sale';
      }

      let txArtistId = meta?.artistId || null;
      if (!txArtistId && paymentType.includes('artist_')) {
         txArtistId = meta?.userId || user.id;
      }

      const txFanId = meta?.userId || user.id;
      const { data: existingFan } = await supabaseAdmin
        .from('user_profiles')
        .select('id')
        .eq('id', txFanId)
        .maybeSingle();

      if (!existingFan) {
        await supabaseAdmin.from('user_profiles').upsert({
          id: txFanId,
          full_name: first_name || last_name ? `${first_name} ${last_name}`.trim() : "Smashify User",
          email: email || user.email || "",
          user_type: 'listener',
          subscription_tier: 'free'
        });
      }

      let platformFee = 0;
      let netAmount = validatedAmount;

      if (paymentType.includes('listener_') || paymentType.includes('artist_') || paymentType === 'artist_ad_campaign') {
        platformFee = validatedAmount;
        netAmount = 0;
      } else if (paymentType === 'tip') {
        platformFee = Math.round(validatedAmount * 0.05);
        netAmount = validatedAmount - platformFee;
      } else if (paymentType === 'track_purchase' || paymentType === 'album_purchase') {
        platformFee = Math.round(validatedAmount * 0.20) + 50;
        netAmount = Math.max(validatedAmount - platformFee, 0);
      } else if (paymentType === 'fan_subscription') {
        platformFee = Math.round(validatedAmount * 0.10);
        netAmount = validatedAmount - platformFee;
      }

      const { error: txError } = await supabaseAdmin.from('transactions').upsert({
        artist_id: txArtistId,
        fan_id: txFanId,
        type: dbType,
        gross_amount: validatedAmount,
        platform_fee: platformFee,
        net_amount: netAmount,
        status: 'pending',
        paychangu_ref: tx_ref,
        description: descriptions[paymentType] || 'Smashify Payment',
        metadata: { ...meta, payment_type: paymentType, userId: user.id }
      }, { onConflict: 'paychangu_ref' });

      if (txError && txError.code !== '23505') {
        console.error('[API] txError:', txError.message);
        throw txError;
      }

      let resolvedReturnUrl = return_url;
      if (!resolvedReturnUrl || typeof resolvedReturnUrl !== 'string' || !resolvedReturnUrl.startsWith('http')) {
        const songId = meta?.songId || 'unknown';
        const artistId = meta?.artistId || 'unknown';
        const plan = meta?.plan || 'Premium';
        const tier = meta?.tier || 'RisingStar';

        if (paymentType === 'track_purchase') {
          resolvedReturnUrl = `${APP_URL}/purchase-success?song_id=${songId}&tx_ref=`;
        } else if (paymentType === 'tip') {
          resolvedReturnUrl = `${APP_URL}/tip-success?artist_id=${artistId}&tx_ref=`;
        } else if (paymentType === 'fan_subscription') {
          resolvedReturnUrl = `${APP_URL}/subscribe-success?artist_id=${artistId}&tx_ref=`;
        } else if (paymentType.includes('listener_')) {
          resolvedReturnUrl = `${APP_URL}/upgrade-success?plan=${plan}&tx_ref=`;
        } else if (paymentType.includes('artist_') && paymentType !== 'artist_ad_campaign') {
          resolvedReturnUrl = `${APP_URL}/tier-success?tier=${tier}&tx_ref=`;
        } else {
          resolvedReturnUrl = `${APP_URL}/purchase-success?tx_ref=`;
        }
      }

      let finalReturnUrl = resolvedReturnUrl;
      if (!finalReturnUrl.endsWith(tx_ref)) {
        finalReturnUrl = `${finalReturnUrl}${tx_ref}`;
      }

      const response = await fetch('https://api.paychangu.com/payment', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PAYCHANGU_SECRET_KEY.trim()}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          amount: validatedAmount,
          currency: 'MWK',
          email,
          first_name,
          last_name,
          tx_ref,
          callback_url: callback_url || `${APP_URL}/api/paychangu-webhook`,
          return_url: finalReturnUrl,
          customization: {
            title: 'Smashify',
            description: descriptions[paymentType] || 'Smashify Payment',
          }
        })
      });

      const responseText = await response.text();
      let payload;
      try {
        payload = JSON.parse(responseText);
      } catch (err) {
        throw new Error(`PayChangu returned non-JSON (${response.status})`);
      }

      if (!response.ok) {
        await supabaseAdmin.from('transactions').update({ status: 'failed' }).eq('paychangu_ref', tx_ref);
        let errorMsg = 'PayChangu initialization failed';
        if (payload?.message) {
          errorMsg = typeof payload.message === 'string' ? payload.message : JSON.stringify(payload.message);
        }
        throw new Error(errorMsg);
      }

      if (!payload.data?.checkout_url) {
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
  app.post('/api/pay/create-payment', handleCreatePayment);

  // Shared robust fulfillment helper
  const fulfillTransaction = async (dbTx: any, amount?: number) => {
    const txAmount = amount || dbTx.gross_amount || 0;

    console.log(`[FULFILL] Invoking atomic finalizer for ref: ${dbTx.paychangu_ref}`);

    // Use the atomic stored procedure for core logic (entitlements, wallet, sales, tx status)
    // CRITICAL: Always use supabaseAdmin (privileged client) for this SECURITY DEFINER RPC.
    const { data: finalResult, error: finalError } = await supabaseAdmin.rpc('finalize_payment_order', {
      p_paychangu_ref: dbTx.paychangu_ref,
      p_gateway_amount: txAmount
    });

    if (finalError) {
      console.error('[FULFILL] RPC Error:', finalError);
      throw new Error(`Fulfillment RPC failed: ${finalError.message}`);
    }

    if (!finalResult?.success) {
      console.error('[FULFILL] Business Logic Failure:', finalResult?.error);
      throw new Error(`Fulfillment failed: ${finalResult?.error || 'Unknown error'}`);
    }

    const type = (dbTx.metadata?.payment_type || dbTx.type || '').toUpperCase();
    const artistId = dbTx.metadata?.artistId || dbTx.artist_id;

    // Handle non-DB side effects (notifications & promotions)
    if (artistId && finalResult?.success && !finalResult?.already_processed) {
       // A. Notifications
       const msgMap: Record<string, string> = {
         'TRACK_PURCHASE': `You sold a track! MWK ${txAmount.toLocaleString()} earned. 💿`,
         'ALBUM_PURCHASE': `You sold a full album! MWK ${txAmount.toLocaleString()} earned. 💿🔥`,
         'TIP': `You received a MWK ${txAmount.toLocaleString()} tip! 💸`,
         'FAN_SUBSCRIPTION': `A fan has subscribed to you! MWK ${txAmount.toLocaleString()} earned. 💖`
       };

       if (msgMap[type]) {
         await supabaseAdmin.from('notifications').insert({
           profile_id: artistId,
           user_type: 'artist',
           type: type.toLowerCase(),
           message: msgMap[type],
           link: '/artist-hub#dashboard'
         }).catch(() => {});
       }

       // B. Promotion Activation
       if (type === 'ARTIST_AD_CAMPAIGN') {
          const meta = dbTx.metadata || {};
          await supabaseAdmin.from('audio_ads').insert({
             artist_id: artistId,
             type: 'promo',
             title: meta.title || 'Paid Promotion',
             advertiser_name: meta.advertiser_name || 'Smashify Artist',
             audio_url: meta.audio_url,
             plays_purchased: Number(meta.plays || 1000),
             plays_used: 0,
             active: false, // Pending admin review
             expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          }).catch((e: any) => console.error('[FULFILL] Promo activation error:', e));
       }
    }

    return finalResult || { type, txAmount };
  };

  // 3. Verify Payment
  const handleVerifyPayment = async (req: express.Request, res: express.Response) => {
    console.log('[API] verify-payment received');
    try {
      if (!supabaseAdmin) throw new Error('Supabase Admin not initialized');

      const user = await verifyUser(req);
      if (!user) {
        console.error('[API] Verify: verifyUser failed');
        return res.status(401).json({ error: 'Unauthorized route access' });
      }

      let tx_ref = req.body.tx_ref || req.query.tx_ref;
      if (!tx_ref) {
        return res.status(400).json({ error: 'Missing tx_ref' });
      }

      if (typeof tx_ref === 'string') {
        tx_ref = tx_ref.trim().replace(/\/$/, '').replace(/^["']|["']$/g, '');
      }

      console.log(`[API] Verifying payment for ref: ${tx_ref}`);
      const scopedClient = getScopedClient(req);

      // 1. Fetch transaction from DB (try paychangu_ref, then reference)
      let { data: dbTx, error: dbError } = await (supabaseAdmin || scopedClient)
        .from('transactions')
        .select('*')
        .or(`paychangu_ref.eq.${tx_ref},reference.eq.${tx_ref}`)
        .maybeSingle();

      if (!dbTx && scopedClient) {
        const { data: userTx } = await scopedClient
          .from('transactions')
          .select('*')
          .or(`paychangu_ref.eq.${tx_ref},reference.eq.${tx_ref}`)
          .maybeSingle();
        if (userTx) dbTx = userTx;
      }

      // Check admin status robustly
      let isAdmin = user.email === 'smashtherealmuzic@gmail.com' || (user as any).app_metadata?.role === 'admin' || (user as any).user_metadata?.is_admin === true;
      if (!isAdmin && scopedClient) {
        try {
          const { data: pAdmin } = await scopedClient.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
          const { data: upAdmin } = await scopedClient.from('user_profiles').select('is_admin').eq('id', user.id).maybeSingle();
          isAdmin = pAdmin?.is_admin === true || upAdmin?.is_admin === true;
        } catch (adminCheckErr) {
          console.warn('[API] Admin check warning:', adminCheckErr);
        }
      }

      // If transaction not found in our DB, query PayChangu API directly
      if (!dbTx && PAYCHANGU_SECRET_KEY && PAYCHANGU_SECRET_KEY !== 'YOUR_PAYCHANGU_SECRET_KEY') {
        console.log(`[API] Transaction ${tx_ref} not in DB. Querying PayChangu directly...`);
        try {
          const pcResponse = await fetch(`https://api.paychangu.com/verify-payment/${tx_ref}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${PAYCHANGU_SECRET_KEY.trim()}`,
              'Accept': 'application/json'
            }
          });
          const payload = await pcResponse.json();
          console.log('[API] PayChangu live lookup response:', payload);

          if (pcResponse.ok && (payload.status === 'success' || payload.status === 'successful') && payload.data) {
            const pcData = payload.data;
            const pcStatus = (pcData.status || '').toLowerCase();
            if (pcStatus === 'successful' || pcStatus === 'success' || pcStatus === 'completed') {
              const rawMeta = pcData.metadata || pcData.customization || {};
              const targetSongId = rawMeta.songId || req.body.songId;
              const grossAmount = Number(pcData.amount || 500);

              const newTx = {
                paychangu_ref: tx_ref,
                reference: tx_ref,
                fan_id: user.id,
                user_id: user.id,
                artist_id: rawMeta.artistId || null,
                type: targetSongId ? 'track_purchase' : (rawMeta.type || 'track_purchase'),
                gross_amount: grossAmount,
                amount: grossAmount,
                status: 'completed',
                metadata: { ...rawMeta, songId: targetSongId, userId: user.id },
                completed_at: new Date().toISOString()
              };

              try {
                const { data: created } = await (scopedClient || supabaseAdmin)
                  .from('transactions')
                  .upsert(newTx, { onConflict: 'paychangu_ref' })
                  .select()
                  .maybeSingle();
                dbTx = created || newTx;
              } catch (_) {
                dbTx = newTx;
              }
            }
          }
        } catch (pcErr) {
          console.warn('[API] PayChangu direct lookup error:', pcErr);
        }
      }

      // If user/admin is doing force_grant with an explicit songId
      if (!dbTx && req.body.force_grant && req.body.songId) {
        dbTx = {
          id: `manual-${Date.now()}`,
          paychangu_ref: tx_ref,
          reference: tx_ref,
          fan_id: user.id,
          user_id: user.id,
          type: 'track_purchase',
          gross_amount: Number(req.body.amount || 500),
          amount: Number(req.body.amount || 500),
          status: 'completed',
          metadata: { songId: req.body.songId, userId: user.id },
          completed_at: new Date().toISOString()
        };
      }

      if (!dbTx) {
        console.error(`[API] Transaction not found for ref ${tx_ref}:`, dbError);
        return res.status(404).json({ error: 'Transaction not found. Please verify your reference or contact support.' });
      }

      // Check access permission: Only fan, artist, or admin can trigger verification
      const isOwner = dbTx.fan_id === user.id || dbTx.artist_id === user.id || dbTx.metadata?.userId === user.id || dbTx.user_id === user.id;
      if (!isOwner && !isAdmin) {
        return res.status(403).json({ error: 'Unauthorized access to verify this transaction' });
      }

      const isForceGrant = (req.body.force_grant === true || req.query.force_grant === 'true') && isAdmin;

      // Force Grant bypass: admin-only override
      if (isForceGrant) {
        console.log(`[API] Admin ${user.id} requested FORCE_GRANT for ref ${tx_ref}`);
        const fulfillment = await fulfillTransaction(dbTx, dbTx.gross_amount);
        const { data: updated } = await (scopedClient || supabaseAdmin).from('transactions').select('*').or(`paychangu_ref.eq.${tx_ref},reference.eq.${tx_ref}`).maybeSingle();
        return res.json({ 
          status: 'completed', 
          granted: true, 
          fulfillment, 
          transaction: updated || { ...dbTx, status: 'completed' } 
        });
      }

      // If already completed and NOT a force_grant, verify if rights are granted, then return
      if (dbTx.status === 'completed') {
        // If it's a song purchase, ensure fan_purchases actually exists
        if (dbTx.metadata?.songId && (dbTx.metadata?.userId || dbTx.fan_id)) {
          const payerId = dbTx.metadata?.userId || dbTx.fan_id;
          const { data: fpCheck } = await (scopedClient || supabaseAdmin)
            .from('fan_purchases')
            .select('id')
            .eq('fan_id', payerId)
            .eq('song_id', dbTx.metadata.songId)
            .maybeSingle();
          if (!fpCheck) {
            console.log(`[API] Completed tx ${tx_ref} was missing fan_purchase record. Backfilling now...`);
            await fulfillTransaction(dbTx, dbTx.gross_amount);
          }
        }
        return res.json({ status: dbTx.status, granted: true, transaction: dbTx });
      }

      // 2. Fetch status from PayChangu API
      let pcVerified = false;
      let pcAmount = dbTx.gross_amount;
      let gatewayMessage: string | null = null;
      let gatewayStatus: string | null = null;

      if (PAYCHANGU_SECRET_KEY && PAYCHANGU_SECRET_KEY !== 'YOUR_PAYCHANGU_SECRET_KEY') {
        try {
          console.log(`[API] Querying PayChangu verification endpoint for ref ${tx_ref}...`);
          const pcResponse = await fetch(`https://api.paychangu.com/verify-payment/${tx_ref}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${PAYCHANGU_SECRET_KEY.trim()}`,
              'Accept': 'application/json'
            }
          });

          const payload = await pcResponse.json();
          console.log('[API] PayChangu verification payload:', JSON.stringify(payload));
          gatewayMessage = payload?.message || null;

          if (pcResponse.ok && payload.status === 'success' && payload.data) {
            const pcStatus = payload.data.status;
            gatewayStatus = pcStatus;
            if (pcStatus === 'successful' || pcStatus === 'success') {
              pcVerified = true;
              pcAmount = payload.data.amount || dbTx.gross_amount;
            } else if (pcStatus === 'failed') {
              await (scopedClient || supabaseAdmin).from('transactions').update({ status: 'failed' }).eq('id', dbTx.id);
              dbTx.status = 'failed';
              return res.json({ status: 'failed', transaction: dbTx, gateway_message: gatewayMessage });
            }
          } else if (pcResponse.status === 403 || payload?.message?.includes('Invalid secret key')) {
            console.warn(`[API] PayChangu API returned 403 Invalid secret key.`);
            gatewayMessage = 'Invalid secret key configured on PayChangu gateway';
          }
        } catch (pcErr: any) {
          console.warn('[API] PayChangu API query error:', pcErr?.message || pcErr);
          gatewayMessage = pcErr?.message || 'Failed to connect to PayChangu gateway';
        }
      }

      // Only fulfill if verified by gateway
      if (pcVerified) {
        const fulfillment = await fulfillTransaction(dbTx, pcAmount);
        const { data: updated } = await (scopedClient || supabaseAdmin).from('transactions').select('*').eq('id', dbTx.id).maybeSingle();
        return res.json({ 
          status: 'completed', 
          granted: true, 
          fulfillment, 
          transaction: updated || { ...dbTx, status: 'completed' },
          gateway_message: gatewayMessage
        });
      }

      res.json({ 
        status: dbTx.status, 
        transaction: dbTx, 
        gateway_message: gatewayMessage,
        gateway_status: gatewayStatus,
        can_force_grant: isAdmin 
      });
    } catch (error: any) {
      console.error('[API] Verify payment error:', error);
      res.status(400).json({ error: error.message });
    }
  };

  app.post('/api/functions/v1/verify-payment', handleVerifyPayment);
  app.post('/api/functions/verify-payment', handleVerifyPayment);
  app.post('/api/pay/verify-payment', handleVerifyPayment);

  // User Sync Purchases endpoint - self-healing reconciliation for missing songs
  app.post('/api/user/sync-purchases', async (req: express.Request, res: express.Response) => {
    try {
      const user = await verifyUser(req);
      if (!user) return res.status(401).json({ error: 'Unauthorized route access' });
      const scopedClient = getScopedClient(req);

      const targetRef = (req.body?.tx_ref || req.query?.tx_ref || '').trim();

      // Find all song purchases for this user from transactions
      // Prefer scopedClient to satisfy RLS
      let userTxs: any[] = [];
      if (scopedClient) {
        let query = scopedClient.from('transactions').select('*').eq('status', 'completed');
        if (targetRef) {
          query = query.or(`paychangu_ref.eq.${targetRef},reference.eq.${targetRef}`);
        } else {
          query = query.or(`fan_id.eq.${user.id},user_id.eq.${user.id},metadata->>userId.eq.${user.id}`);
        }
        const { data: sData } = await query.order('created_at', { ascending: false }).limit(50);
        if (sData && sData.length > 0) userTxs = sData;
      }

      if (userTxs.length === 0 && supabaseAdmin) {
        let query = supabaseAdmin.from('transactions').select('*').eq('status', 'completed');
        if (targetRef) {
          query = query.or(`paychangu_ref.eq.${targetRef},reference.eq.${targetRef}`);
        } else {
          query = query.or(`fan_id.eq.${user.id},user_id.eq.${user.id},metadata->>userId.eq.${user.id}`);
        }
        const { data: aData } = await query.order('created_at', { ascending: false }).limit(50);
        if (aData && aData.length > 0) userTxs = aData;
      }

      const restored: string[] = [];

      for (const tx of userTxs) {
        const songId = tx.metadata?.songId;
        const isSongTx = songId && (
          tx.type === 'sale' || 
          tx.type === 'track_purchase' ||
          (tx.description || '').toLowerCase().includes('track') || 
          (tx.description || '').toLowerCase().includes('song') || 
          tx.metadata?.payment_type === 'track_purchase'
        );

        if (isSongTx) {
          const { data: existing } = await (scopedClient || supabaseAdmin)
            .from('fan_purchases')
            .select('id, purchased_at')
            .eq('fan_id', user.id)
            .eq('song_id', songId)
            .maybeSingle();

          if (!existing) {
            console.log(`[SYNC] Backfilling purchase for user ${user.id}, song ${songId}, tx ${tx.paychangu_ref}`);
            await fulfillTransaction(tx, tx.gross_amount);
            restored.push(songId);
          } else if (!existing.purchased_at) {
            await (scopedClient || supabaseAdmin)
              .from('fan_purchases')
              .update({ purchased_at: new Date().toISOString() })
              .eq('id', existing.id);
            restored.push(songId);
          }
        }
      }

      // Fetch the updated list of purchased songs
      const { data: purchases } = await (scopedClient || supabaseAdmin)
        .from('fan_purchases')
        .select('song_id, purchased_at, songs(id, title, artist_id, cover_url, audio_url, price, profiles!artist_id(full_name, stage_name))')
        .eq('fan_id', user.id)
        .order('purchased_at', { ascending: false });

      res.json({ success: true, restoredCount: restored.length, restoredSongIds: restored, purchases: purchases || [] });
    } catch (err: any) {
      console.error('[API] sync-purchases error:', err);
      res.status(500).json({ error: err.message });
    }
  });

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
      if (amount < 10000) throw new Error('Minimum withdrawal is MK 10,000');

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
  app.post('/api/pay/process-payout', handleProcessPayout);

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

        // Record the transaction for accounting (idempotent on paychangu_ref)
        const { error: txError } = await supabaseAdmin.from('transactions').upsert({
          artist_id: payout.artist_id,
          type: 'withdrawal',
          gross_amount: payout.requested_amount,
          net_amount: payout.net_amount || (payout.requested_amount * 0.97),
          status: 'completed',
          paychangu_ref: payout.reference || `manual-${id}`,
          description: `Manual payout withdrawal to ${payout.phone} (${payout.network})`,
          completed_at: new Date().toISOString()
        }, { onConflict: 'paychangu_ref' });
        
        if (txError && txError.code !== '23505') console.error('[API] Withdrawal transaction recording failed:', txError);

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

  // Admin User 360 Deep Details
  app.get('/api/admin/users/:id/details', async (req, res) => {
    try {
      const user = await verifyUser(req);
      if (!user) return res.status(401).json({ error: 'Unauthorized' });

      const { data: profile } = await supabaseAdmin.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
      const { data: userProfile } = await supabaseAdmin.from('user_profiles').select('is_admin').eq('id', user.id).maybeSingle();
      const isSystemAdmin = profile?.is_admin === true || userProfile?.is_admin === true;
      if (!isSystemAdmin) return res.status(403).json({ error: 'Admin access required' });

      const { id } = req.params;

      // 1. Fetch profiles & user_profiles
      const [pRes, upRes] = await Promise.all([
        supabaseAdmin.from('profiles').select('*').eq('id', id).maybeSingle(),
        supabaseAdmin.from('user_profiles').select('*').eq('id', id).maybeSingle()
      ]);

      const mergedProfile = {
        ...(upRes.data || {}),
        ...(pRes.data || {}),
        id
      };

      // 2. Fetch parallel deep data
      const [
        songsRes,
        albumsRes,
        purchasesRes,
        playlistsRes,
        txsRes,
        payoutsRes,
        activityRes,
        notesRes,
        ticketsRes,
        agentAppRes
      ] = await Promise.all([
        supabaseAdmin.from('songs').select('*').eq('artist_id', id).order('created_at', { ascending: false }).limit(100),
        supabaseAdmin.from('albums').select('*').eq('artist_id', id).order('created_at', { ascending: false }),
        supabaseAdmin.from('fan_purchases').select('*, songs(id, title, cover_url, price, duration, artist_id)').eq('fan_id', id).order('purchased_at', { ascending: false }).limit(100),
        supabaseAdmin.from('playlists').select('*').eq('user_id', id).order('created_at', { ascending: false }),
        supabaseAdmin.from('transactions').select('*').or(`artist_id.eq.${id},user_id.eq.${id},fan_id.eq.${id}`).order('created_at', { ascending: false }).limit(100),
        supabaseAdmin.from('payout_requests').select('*').eq('artist_id', id).order('created_at', { ascending: false }),
        supabaseAdmin.from('activity_log').select('*').eq('profile_id', id).order('created_at', { ascending: false }).limit(100),
        supabaseAdmin.from('people_notes').select('*').eq('profile_id', id).order('created_at', { ascending: false }),
        supabaseAdmin.from('tickets').select('*').eq('profile_id', id).order('created_at', { ascending: false }),
        supabaseAdmin.from('agent_applications').select('*').eq('user_id', id).maybeSingle()
      ]);

      // Calculate totals
      const transactions = txsRes.data || [];
      const totalPaid = transactions
        .filter((t: any) => (t.user_id === id || t.fan_id === id) && t.status === 'completed')
        .reduce((sum: number, t: any) => sum + Number(t.gross_amount || 0), 0);
      
      const totalEarned = transactions
        .filter((t: any) => t.artist_id === id && t.type !== 'withdrawal' && t.status === 'completed')
        .reduce((sum: number, t: any) => sum + Number(t.net_amount || t.gross_amount || 0), 0);

      res.json({
        profile: mergedProfile,
        songs: songsRes.data || [],
        albums: albumsRes.data || [],
        purchases: purchasesRes.data || [],
        playlists: playlistsRes.data || [],
        transactions,
        payouts: payoutsRes.data || [],
        activity: activityRes.data || [],
        notes: notesRes.data || [],
        tickets: ticketsRes.data || [],
        agentApplication: agentAppRes.data || null,
        stats: {
          totalPaid,
          totalEarned,
          txCount: transactions.length,
          songsCount: (songsRes.data || []).length,
          purchasesCount: (purchasesRes.data || []).length,
          payoutsCount: (payoutsRes.data || []).length
        }
      });
    } catch (err: any) {
      console.error('[API] Admin user details error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Admin User Control & Action Center
  app.post('/api/admin/users/:id/control', async (req, res) => {
    try {
      const user = await verifyUser(req);
      if (!user) return res.status(401).json({ error: 'Unauthorized' });

      const { data: profile } = await supabaseAdmin.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
      const { data: userProfile } = await supabaseAdmin.from('user_profiles').select('is_admin').eq('id', user.id).maybeSingle();
      const isSystemAdmin = profile?.is_admin === true || userProfile?.is_admin === true;
      if (!isSystemAdmin) return res.status(403).json({ error: 'Admin access required' });

      const { id } = req.params;
      const { action, payload } = req.body;

      if (!action) return res.status(400).json({ error: 'Action parameter is required' });

      console.log(`[ADMIN CONTROL] Admin ${user.id} executing '${action}' on target user ${id}`);

      switch (action) {
        case 'adjust_wallet': {
          const { amount, reason, notify = true } = payload || {};
          const numAmount = Number(amount);
          if (isNaN(numAmount) || numAmount === 0) {
            return res.status(400).json({ error: 'Valid non-zero amount required' });
          }

          // Get current balance
          const { data: current } = await supabaseAdmin.from('profiles').select('wallet_balance').eq('id', id).maybeSingle();
          const currentBal = Number(current?.wallet_balance || 0);
          const newBal = Math.max(0, currentBal + numAmount);

          // Update profiles
          await supabaseAdmin.from('profiles').update({ wallet_balance: newBal }).eq('id', id);

          // Log transaction
          const txRef = `ADJ-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
          await supabaseAdmin.from('transactions').insert({
            artist_id: id,
            type: numAmount > 0 ? 'admin_credit' : 'admin_debit',
            gross_amount: Math.abs(numAmount),
            net_amount: Math.abs(numAmount),
            platform_fee: 0,
            status: 'completed',
            paychangu_ref: txRef,
            created_at: new Date().toISOString()
          }).catch((err: any) => console.warn('Could not insert adjustment tx:', err));

          // Log in activity
          await supabaseAdmin.from('activity_log').insert({
            profile_id: id,
            actor_type: 'admin',
            event: numAmount > 0 ? 'wallet_credited' : 'wallet_debited',
            amount: Math.abs(numAmount),
            meta: { reason: reason || 'Administrative adjustment', previous: currentBal, new: newBal }
          }).catch(() => {});

          // Optional notification
          if (notify) {
            await supabaseAdmin.from('notifications').insert({
              profile_id: id,
              user_type: 'artist',
              type: 'system_alert',
              message: numAmount > 0
                ? `💰 Your studio wallet was credited with MK ${Math.abs(numAmount).toLocaleString()}. Note: ${reason || 'Admin adjustment'}`
                : `⚠️ Your studio wallet was adjusted by -MK ${Math.abs(numAmount).toLocaleString()}. Note: ${reason || 'Admin adjustment'}`,
              link: '/artist-hub#wallet'
            }).catch(() => {});
          }

          return res.json({ success: true, newBalance: newBal });
        }

        case 'update_profile': {
          const updates = payload?.updates || {};
          const allowedFields = [
            'full_name', 'stage_name', 'phone', 'email', 'city', 'location', 
            'bio', 'genre', 'instagram', 'twitter', 'facebook', 'youtube', 'tiktok',
            'website', 'payout_network', 'payout_phone', 'bank_name', 'bank_account',
            'nrc_number', 'id_type', 'is_suspended'
          ];

          const sanitized: any = {};
          for (const key of allowedFields) {
            if (updates[key] !== undefined) sanitized[key] = updates[key];
          }

          if (Object.keys(sanitized).length === 0) {
            return res.status(400).json({ error: 'No valid fields to update' });
          }

          // Update both tables if present
          await Promise.all([
            supabaseAdmin.from('profiles').update(sanitized).eq('id', id),
            supabaseAdmin.from('user_profiles').update(sanitized).eq('id', id)
          ]);

          await supabaseAdmin.from('activity_log').insert({
            profile_id: id,
            actor_type: 'admin',
            event: 'profile_updated_by_admin',
            meta: { updated_fields: Object.keys(sanitized) }
          }).catch(() => {});

          return res.json({ success: true });
        }

        case 'toggle_verification': {
          const { verified } = payload || {};
          const isVerified = !!verified;

          await Promise.all([
            supabaseAdmin.from('profiles').update({ verified: isVerified, is_verified: isVerified }).eq('id', id),
            supabaseAdmin.from('user_profiles').update({ verified: isVerified, is_verified: isVerified }).eq('id', id)
          ]);

          if (isVerified) {
            await supabaseAdmin.from('notifications').insert({
              profile_id: id,
              user_type: 'artist',
              type: 'system_alert',
              message: '🎉 Congratulations! Your Smashify profile has been officially verified with the verified badge.',
              link: '/artist-hub'
            }).catch(() => {});
          }

          return res.json({ success: true, verified: isVerified });
        }

        case 'toggle_admin': {
          const { is_admin } = payload || {};
          const newAdminStatus = !!is_admin;

          await Promise.all([
            supabaseAdmin.from('profiles').update({ is_admin: newAdminStatus }).eq('id', id),
            supabaseAdmin.from('user_profiles').update({ is_admin: newAdminStatus }).eq('id', id)
          ]);

          return res.json({ success: true, is_admin: newAdminStatus });
        }

        case 'toggle_suspension': {
          const { is_suspended, reason } = payload || {};
          const suspended = !!is_suspended;

          await Promise.all([
            supabaseAdmin.from('profiles').update({ is_suspended: suspended }).eq('id', id),
            supabaseAdmin.from('user_profiles').update({ is_suspended: suspended }).eq('id', id)
          ]);

          await supabaseAdmin.from('activity_log').insert({
            profile_id: id,
            actor_type: 'admin',
            event: suspended ? 'account_suspended' : 'account_reactivated',
            meta: { reason: reason || 'Administrative action' }
          }).catch(() => {});

          return res.json({ success: true, is_suspended: suspended });
        }

        case 'set_artist_tier': {
          const { tier, months = 6 } = payload || {};
          const validTiers = ['Free', 'RisingStar', 'Standard', 'Elite'];
          if (!validTiers.includes(tier)) {
            return res.status(400).json({ error: 'Invalid artist tier' });
          }

          let endsDate: string | null = null;
          if (tier !== 'Free') {
            const ends = new Date();
            if (months === -1) {
              ends.setFullYear(ends.getFullYear() + 10); // Lifetime
            } else {
              ends.setMonth(ends.getMonth() + (Number(months) || 6));
            }
            endsDate = ends.toISOString();
          }

          await supabaseAdmin.from('profiles').update({
            artist_tier: tier,
            subscription_tier: tier,
            subscription_ends: endsDate
          }).eq('id', id);

          await supabaseAdmin.from('notifications').insert({
            profile_id: id,
            user_type: 'artist',
            type: 'system_alert',
            message: tier === 'Free'
              ? 'Your artist subscription tier has been reset to Free.'
              : `🌟 You have been upgraded to the ${tier} Tier! Enjoy exclusive distribution features and studio perks.`,
            link: '/artist-hub'
          }).catch(() => {});

          return res.json({ success: true, artist_tier: tier, subscription_ends: endsDate });
        }

        case 'manage_daily_pass': {
          const { hours = 24 } = payload || {};
          const numHours = Number(hours);

          let expiresAt: string | null = null;
          let tierName = 'Free';

          if (numHours > 0) {
            const exp = new Date(Date.now() + numHours * 60 * 60 * 1000);
            expiresAt = exp.toISOString();
            tierName = 'Premium';
          }

          await Promise.all([
            supabaseAdmin.from('user_profiles').update({
              daily_pass_expires_at: expiresAt,
              subscription_ends: expiresAt,
              subscription_tier: tierName
            }).eq('id', id),
            supabaseAdmin.from('profiles').update({
              daily_pass_expires_at: expiresAt,
              subscription_ends: expiresAt,
              subscription_tier: tierName
            }).eq('id', id)
          ]);

          if (numHours > 0) {
            await supabaseAdmin.from('notifications').insert({
              profile_id: id,
              user_type: 'listener',
              type: 'system_alert',
              message: `🎧 You have been granted ${numHours >= 24 ? Math.round(numHours/24) + ' day(s)' : numHours + ' hours'} of Unlimited Listener Pass! Enjoy ad-free lossless streaming.`,
              link: '/discover'
            }).catch(() => {});
          }

          return res.json({ success: true, daily_pass_expires_at: expiresAt, subscription_tier: tierName });
        }

        case 'moderate_song': {
          const { song_id, sub_action } = payload || {};
          if (!song_id) return res.status(400).json({ error: 'song_id required' });

          if (sub_action === 'approve') {
            await supabaseAdmin.from('songs').update({ approved: true, status: 'approved' }).eq('id', song_id);
            return res.json({ success: true, status: 'approved' });
          } else if (sub_action === 'reject') {
            await supabaseAdmin.from('songs').update({ approved: false, status: 'rejected' }).eq('id', song_id);
            return res.json({ success: true, status: 'rejected' });
          } else if (sub_action === 'toggle_featured') {
            const { data: s } = await supabaseAdmin.from('songs').select('trending').eq('id', song_id).single();
            const newTrending = !s?.trending;
            await supabaseAdmin.from('songs').update({ trending: newTrending }).eq('id', song_id);
            return res.json({ success: true, trending: newTrending });
          } else if (sub_action === 'delete') {
            await supabaseAdmin.from('songs').delete().eq('id', song_id);
            return res.json({ success: true, deleted: true });
          }
          return res.status(400).json({ error: 'Unknown song sub_action' });
        }

        case 'send_notification': {
          const { message, title, type = 'system_alert', link = '/' } = payload || {};
          if (!message?.trim()) return res.status(400).json({ error: 'Message cannot be empty' });

          await supabaseAdmin.from('notifications').insert({
            profile_id: id,
            title: title || 'Admin Alert',
            message: message.trim(),
            type,
            link,
            read: false,
            created_at: new Date().toISOString()
          });

          return res.json({ success: true });
        }

        case 'delete_user': {
          const { confirm_name } = payload || {};
          // Check user identity
          const { data: p } = await supabaseAdmin.from('profiles').select('stage_name, full_name').eq('id', id).maybeSingle();
          const targetName = p?.stage_name || p?.full_name || 'User';

          // Clean related content
          await supabaseAdmin.from('songs').delete().eq('artist_id', id).catch(() => {});
          await supabaseAdmin.from('albums').delete().eq('artist_id', id).catch(() => {});
          await supabaseAdmin.from('tickets').delete().eq('profile_id', id).catch(() => {});
          await supabaseAdmin.from('people_notes').delete().eq('profile_id', id).catch(() => {});
          
          await Promise.all([
            supabaseAdmin.from('profiles').delete().eq('id', id),
            supabaseAdmin.from('user_profiles').delete().eq('id', id)
          ]);

          return res.json({ success: true, deleted: true, name: targetName });
        }

        default:
          return res.status(400).json({ error: `Unsupported action: ${action}` });
      }
    } catch (err: any) {
      console.error('[API] Admin control error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // 3. Payout Webhook
  app.post('/api/functions/payout-webhook', async (req, res) => {
    try {
      if (!supabaseAdmin) throw new Error('Supabase Admin not initialized');

      if (!verifyPayChanguSignature(req)) {
        console.error('[PAYOUT WEBHOOK] Invalid PayChangu payout signature');
        return res.status(401).send('Invalid signature');
      }

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

        await supabaseAdmin.from('transactions').upsert({
          artist_id: payout.artist_id,
          type: 'withdrawal',
          gross_amount: amount,
          status: 'completed',
          paychangu_ref: reference,
          completed_at: new Date().toISOString()
        }, { onConflict: 'paychangu_ref' });

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
      const user = await verifyUser(req);
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized route access' });
      }

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

      if (!verifyPayChanguSignature(req)) {
        console.error('[WEBHOOK] Invalid PayChangu payment signature');
        return res.status(401).send('Invalid signature');
      }

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
        // Return 500 so the gateway retries. The transaction record might just be delayed in creation.
        return res.status(500).send('Transaction not found in database. Retrying...');
      }

      if (transaction.status === 'completed') {
        return res.sendStatus(200);
      }

      if (status !== 'successful') {
        await supabaseAdmin.from('transactions').update({ status: 'failed' }).eq('id', transaction.id).neq('status', 'completed');
        return res.sendStatus(200);
      }

      console.log(`[WEBHOOK] Payload received:`, JSON.stringify(payload));
      console.log(`[WEBHOOK] Fulfilling ref: ${tx_ref}, amount: ${amount}`);

      await supabaseAdmin.from('webhook_logs').insert({
        tx_ref,
        status: 'processed',
        payload: JSON.stringify(payload)
      }).catch(() => {});

      await fulfillTransaction(transaction, amount || transaction.gross_amount);

      res.sendStatus(200);
    } catch (error: any) {
      console.error('[WEBHOOK] Processing Error:', error);
      // Return 500 to signal failure to the gateway so it retries delivery.
      // This prevents permanent loss of paid orders due to transient DB issues.
      res.status(500).send(`Webhook fulfillment failed: ${error?.message || error}`);
    }
  });

  // --- VITE MIDDLEWARE OR STATIC SERVING ---
  const distPath = path.resolve(process.cwd(), 'dist');
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
          const indexPath = path.resolve(process.cwd(), 'dist/index.html');
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
