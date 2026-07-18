var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_cors = __toESM(require("cors"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_crypto = __toESM(require("crypto"), 1);
var import_express_rate_limit = __toESM(require("express-rate-limit"), 1);
var import_vite = require("vite");
var import_supabase_js = require("@supabase/supabase-js");
var import_path = __toESM(require("path"), 1);
var import_dotenv = __toESM(require("dotenv"), 1);
console.log("--- SERVER.TS BOOTING ---");
import_dotenv.default.config();
process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
});
process.on("unhandledRejection", (reason, promise) => {
  console.error("UNHANDLED REJECTION at:", promise, "reason:", reason);
});
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  console.log(`NODE_ENV is: ${process.env.NODE_ENV}`);
  const allowedOrigins = [
    "https://smashifymusic.vercel.app",
    "https://play-smashify.vercel.app",
    "http://localhost:3000",
    "http://localhost:5173"
  ];
  app.use((0, import_cors.default)({
    origin: function(origin, callback) {
      if (!origin || allowedOrigins.includes(origin) || origin.endsWith(".run.app")) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true
  }));
  app.use(import_express.default.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    }
  }));
  app.use((req, res, next) => {
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
    next();
  });
  const apiLimiter = (0, import_express_rate_limit.default)({
    windowMs: 15 * 60 * 1e3,
    // 15 minutes
    max: 100,
    // Limit each IP to 100 requests per windowMs
    message: { error: "Too many requests from this IP, please try again later." },
    standardHeaders: true,
    legacyHeaders: false
  });
  app.use("/api/", apiLimiter);
  const authLimiter = (0, import_express_rate_limit.default)({
    windowMs: 60 * 1e3,
    // 1 minute
    max: 5,
    // Limit each IP to 5 requests per windowMs
    message: { error: "Too many login attempts. Please try again later." }
  });
  app.use("/api/auth/", authLimiter);
  app.use("/api", (req, res, next) => {
    console.log(`[API_LOG] ${req.method} ${req.originalUrl}`);
    next();
  });
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      time: (/* @__PURE__ */ new Date()).toISOString(),
      supabaseReady: !!supabaseAdmin,
      env: process.env.NODE_ENV
    });
  });
  app.post("/api/check-email-mx", (req, res) => {
    const { email } = req.body;
    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "Invalid email format" });
    }
    const domain = email.split("@")[1];
    import("dns").then((dns) => {
      dns.resolveMx(domain, (err, addresses) => {
        if (err || !addresses || addresses.length === 0) {
          return res.json({ valid: false });
        }
        return res.json({ valid: true });
      });
    }).catch(() => {
      return res.json({ valid: true });
    });
  });
  const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPA_ADMIN_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;
  const PAYCHANGU_SECRET_KEY = process.env.PAYCHANGU_SEC || process.env.PAYCHANGU_SECRET_KEY || process.env.PAYCHANGU_SECRE || process.env.PAYCHANGU_SECRET;
  let APP_URL = process.env.APP_URL || process.env.VITE_APP_URL || `http://localhost:${PORT}`;
  if (APP_URL === "YOUR_APP_URL" || APP_URL === "APP_URL" || !APP_URL) {
    APP_URL = `http://localhost:${PORT}`;
  }
  let supabaseAdmin = null;
  if (SUPABASE_URL) {
    const adminKey = !SUPABASE_SERVICE_ROLE_KEY || SUPABASE_SERVICE_ROLE_KEY === "YOUR_SUPABASE_SERVICE_ROLE_KEY" || SUPABASE_SERVICE_ROLE_KEY === "YOUR_SUPA_ADMIN_KEY" ? process.env.VITE_SUPABASE_ANON_KEY : SUPABASE_SERVICE_ROLE_KEY;
    if (adminKey) {
      try {
        supabaseAdmin = (0, import_supabase_js.createClient)(SUPABASE_URL, adminKey);
        if (adminKey === process.env.VITE_SUPABASE_ANON_KEY) {
          console.warn("[Server] WARNING: SUPABASE_SERVICE_ROLE_KEY is not set. Falling back to VITE_SUPABASE_ANON_KEY. Admin bypass will be restricted.");
        } else {
          console.log("[Server] Supabase client initialized successfully.");
        }
      } catch (err) {
        console.error("Failed to initialize Supabase client:", err);
      }
    }
  }
  console.log("[DEBUG] PAYCHANGU_SECRET_KEY present:", !!PAYCHANGU_SECRET_KEY);
  const verifyUser = async (req) => {
    if (!supabaseAdmin) {
      console.error("verifyUser: supabaseAdmin is null. SUPABASE_URL or adminKey is missing.");
      return null;
    }
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      console.error("verifyUser: Authorization header missing");
      return null;
    }
    const token = authHeader.replace("Bearer ", "");
    if (!token || token === "undefined") {
      console.error('verifyUser: Token is empty or "undefined"');
      return null;
    }
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error) {
      console.error("verifyUser: auth.getUser failed:", error.message);
      return null;
    }
    if (!user) {
      console.error("verifyUser: user is null");
      return null;
    }
    return user;
  };
  const verifyPayChanguSignature = (req) => {
    const signature = req.headers["x-paychangu-signature"];
    if (!signature) {
      console.error("[SIGNATURE] Missing x-paychangu-signature header");
      return false;
    }
    const webhookSecret = process.env.PAYCHANGU_WEBHOOK_SECRET || PAYCHANGU_SECRET_KEY;
    if (!webhookSecret) {
      console.error("[SIGNATURE] Webhook secret not configured");
      return false;
    }
    const rawBody = req.rawBody;
    if (!rawBody) {
      console.error("[SIGNATURE] Raw body is missing - cannot verify signature");
      return false;
    }
    try {
      const expectedSignature = import_crypto.default.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
      return expectedSignature === signature;
    } catch (e) {
      console.error("[SIGNATURE] Error computing signature HMAC:", e);
      return false;
    }
  };
  app.options([
    "/api/functions/v1/create-payment",
    "/api/functions/create-payment",
    "/api/functions/v1/process-payout",
    "/api/functions/process-payout",
    "/api/functions/v1/verify-payment",
    "/api/functions/verify-payment",
    "/api/pay/create-payment",
    "/api/pay/process-payout",
    "/api/pay/verify-payment"
  ], (req, res) => {
    res.sendStatus(204);
  });
  const handleCreatePayment = async (req, res) => {
    console.log("[API] create-payment received");
    try {
      if (!PAYCHANGU_SECRET_KEY || PAYCHANGU_SECRET_KEY === "YOUR_PAYCHANGU_SECRET_KEY") {
        console.error("[API] PAYCHANGU_SECRET_KEY missing");
        throw new Error("PAYCHANGU_SECRET_KEY is missing or not configured");
      }
      const user = await verifyUser(req);
      if (!user) {
        console.error("[API] verifyUser failed");
        return res.status(401).json({ error: "Unauthorized route access" });
      }
      const { amount, email, first_name, last_name, type, tx_ref, meta, return_url, currency, callback_url } = req.body;
      console.log(`[API] Processing ${type} for ${email}, amount: ${amount}, ref: ${tx_ref}`);
      console.log("[API] Meta received:", JSON.stringify(meta));
      const descriptions = {
        "track_purchase": `Purchase of music track on Smashify`,
        "tip": `Tip to artist on Smashify`,
        "fan_subscription": `Monthly fan subscription on Smashify`,
        "listener_premium": `Smashify Premium Subscription`,
        "listener_family": `Smashify Family Subscription`,
        "artist_rising_star": `Smashify Rising Star Studio Tier`,
        "artist_standard": `Smashify Standard Studio Tier`,
        "artist_elite": `Smashify Elite Studio Tier`,
        "artist_ad_campaign": `Promotion campaign on Smashify`,
        "featured_placement": `Featured placement on Smashify`
      };
      let dbType = "other";
      if (type.includes("listener_") || type.includes("artist_") || type.includes("subscription")) {
        if (type === "artist_ad_campaign" || type === "featured_placement") {
          dbType = "promotion";
        } else {
          dbType = "subscription";
        }
      } else if (type === "tip") {
        dbType = "donation";
      } else if (type === "track_purchase") {
        dbType = "sale";
      }
      let txArtistId = meta.artistId || null;
      if (!txArtistId && type.includes("artist_")) {
        txArtistId = meta.userId || user.id;
      }
      const txFanId = meta.userId || user.id;
      const { data: existingFan } = await supabaseAdmin.from("user_profiles").select("id").eq("id", txFanId).maybeSingle();
      if (!existingFan) {
        console.log(`Payer ${txFanId} not found in user_profiles. Creating shadow user_profile for transactions support.`);
        await supabaseAdmin.from("user_profiles").upsert({
          id: txFanId,
          full_name: first_name || last_name ? `${first_name} ${last_name}`.trim() : "Smashify Artist",
          email: email || user.email || "",
          user_type: "listener",
          subscription_tier: "free"
        });
      }
      const { error: txError } = await supabaseAdmin.from("transactions").insert({
        artist_id: txArtistId,
        fan_id: txFanId,
        type: dbType,
        gross_amount: amount,
        net_amount: amount * 0.85,
        status: "pending",
        paychangu_ref: tx_ref,
        description: descriptions[type] || "Smashify Payment",
        metadata: { ...meta, payment_type: type }
      });
      if (txError) {
        console.error("[API] txError:", txError.message);
        throw txError;
      }
      let resolvedReturnUrl = return_url;
      if (!resolvedReturnUrl || typeof resolvedReturnUrl !== "string" || !resolvedReturnUrl.startsWith("http")) {
        console.warn(`[API] Invalid or missing return_url received: ${return_url}. Constructing fallback.`);
        const songId = meta?.songId || "unknown";
        const artistId = meta?.artistId || "unknown";
        const plan = meta?.plan || "Premium";
        const tier = meta?.tier || "RisingStar";
        if (type === "track_purchase") {
          resolvedReturnUrl = `${APP_URL}/purchase-success?song_id=${songId}&tx_ref=`;
        } else if (type === "tip") {
          resolvedReturnUrl = `${APP_URL}/tip-success?artist_id=${artistId}&tx_ref=`;
        } else if (type === "fan_subscription") {
          resolvedReturnUrl = `${APP_URL}/subscribe-success?artist_id=${artistId}&tx_ref=`;
        } else if (type.includes("listener_")) {
          resolvedReturnUrl = `${APP_URL}/upgrade-success?plan=${plan}&tx_ref=`;
        } else if (type.includes("artist_") && type !== "artist_ad_campaign") {
          resolvedReturnUrl = `${APP_URL}/tier-success?tier=${tier}&tx_ref=`;
        } else if (type === "artist_ad_campaign") {
          resolvedReturnUrl = `${APP_URL}/ad-success?tx_ref=`;
        } else {
          resolvedReturnUrl = `${APP_URL}/purchase-success?tx_ref=`;
        }
      }
      let finalReturnUrl = resolvedReturnUrl;
      if (!finalReturnUrl.endsWith(tx_ref)) {
        finalReturnUrl = `${finalReturnUrl}${tx_ref}`;
      }
      console.log("[API] Calling PayChangu /payment init with return_url:", finalReturnUrl);
      const response = await fetch("https://api.paychangu.com/payment", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${PAYCHANGU_SECRET_KEY.trim()}`,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          amount,
          currency: currency || "MWK",
          email,
          first_name,
          last_name,
          tx_ref,
          callback_url: callback_url || `${APP_URL}/api/paychangu-webhook`,
          return_url: finalReturnUrl,
          customization: {
            title: "Smashify",
            description: descriptions[type] || "Smashify Payment"
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
        console.error("[API] PayChangu Failed:", payload);
        await supabaseAdmin.from("transactions").delete().eq("paychangu_ref", tx_ref);
        let errorMsg = "PayChangu initialization failed";
        if (payload?.message) {
          if (typeof payload.message === "string") {
            errorMsg = payload.message;
          } else if (typeof payload.message === "object") {
            errorMsg = Object.entries(payload.message).map(([key, value]) => {
              const formattedVal = Array.isArray(value) ? value.join(", ") : String(value);
              return `${key}: ${formattedVal}`;
            }).join("; ");
          }
        } else if (payload?.error) {
          errorMsg = typeof payload.error === "string" ? payload.error : JSON.stringify(payload.error);
        }
        throw new Error(errorMsg);
      }
      if (!payload.data?.checkout_url) {
        console.error("[API] Missing checkout_url in payload:", payload);
        throw new Error("PayChangu did not return a checkout URL");
      }
      res.json({ checkout_url: payload.data.checkout_url });
    } catch (error) {
      console.error("[API] Create payment error:", error);
      res.status(400).json({ error: error.message });
    }
  };
  app.post("/api/functions/v1/create-payment", handleCreatePayment);
  app.post("/api/functions/create-payment", handleCreatePayment);
  app.post("/api/pay/create-payment", handleCreatePayment);
  const handleVerifyPayment = async (req, res) => {
    console.log("[API] verify-payment received");
    try {
      if (!supabaseAdmin) throw new Error("Supabase Admin not initialized");
      const user = await verifyUser(req);
      if (!user) {
        console.error("[API] Verify: verifyUser failed");
        return res.status(401).json({ error: "Unauthorized route access" });
      }
      let tx_ref = req.body.tx_ref || req.query.tx_ref;
      if (!tx_ref) {
        return res.status(400).json({ error: "Missing tx_ref" });
      }
      if (typeof tx_ref === "string") {
        tx_ref = tx_ref.trim().replace(/\/$/, "").replace(/^["']|["']$/g, "");
      }
      console.log(`[API] Verifying payment for ref: ${tx_ref}`);
      const { data: dbTx, error: dbError } = await supabaseAdmin.from("transactions").select("*").eq("paychangu_ref", tx_ref).maybeSingle();
      if (dbError || !dbTx) {
        console.error(`[API] Transaction not found for ref ${tx_ref}:`, dbError);
        return res.status(404).json({ error: "Transaction not found in our database" });
      }
      if (dbTx.fan_id !== user.id && dbTx.artist_id !== user.id) {
        const { data: pAdmin } = await supabaseAdmin.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
        const { data: upAdmin } = await supabaseAdmin.from("user_profiles").select("is_admin").eq("id", user.id).maybeSingle();
        const isAdmin = pAdmin?.is_admin === true || upAdmin?.is_admin === true;
        if (!isAdmin) {
          return res.status(403).json({ error: "Unauthorized access to verify this transaction" });
        }
      }
      if (dbTx.status === "completed") {
        return res.json({ status: dbTx.status, transaction: dbTx });
      }
      if (!PAYCHANGU_SECRET_KEY || PAYCHANGU_SECRET_KEY === "YOUR_PAYCHANGU_SECRET_KEY") {
        throw new Error("PAYCHANGU_SECRET_KEY is missing or not configured");
      }
      console.log(`[API] Querying PayChangu verification endpoint for ref ${tx_ref}...`);
      const pcResponse = await fetch(`https://api.paychangu.com/verify-payment/${tx_ref}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${PAYCHANGU_SECRET_KEY.trim()}`,
          "Accept": "application/json"
        }
      });
      const payload = await pcResponse.json();
      console.log("[API] PayChangu verification payload:", JSON.stringify(payload));
      if (pcResponse.ok && payload.status === "success" && payload.data) {
        const pcStatus = payload.data.status;
        if (pcStatus === "successful" || pcStatus === "success") {
          const type = (dbTx.metadata?.payment_type || tx_ref.split("-")[1]).toUpperCase();
          const metadata = dbTx.metadata || {};
          const userId = metadata.userId || dbTx.fan_id;
          const artistId = metadata.artistId || dbTx.artist_id;
          const { songId, anonymous, plays } = metadata;
          let pFee = 0;
          let artistNet = dbTx.gross_amount;
          if (type.includes("LISTENER_") || type.includes("ARTIST_") || type === "ARTIST_AD_CAMPAIGN" || type === "FEATURED_PLACEMENT") {
            pFee = dbTx.gross_amount;
            artistNet = 0;
          } else if (type === "TIP") {
            pFee = Math.round(dbTx.gross_amount * 0.05);
            artistNet = dbTx.gross_amount - pFee;
          } else if (type === "TRACK_PURCHASE") {
            const SALE_FLAT_FEE = 50;
            let platformFeeRate = 0.2;
            if (artistId) {
              const { data: artistProfile } = await supabaseAdmin.from("profiles").select("subscription_tier, artist_tier").eq("id", artistId).single();
              const currentTier = (artistProfile?.subscription_tier || artistProfile?.artist_tier || "Standard").toLowerCase();
              if (currentTier.includes("elite") || currentTier.includes("platinum")) platformFeeRate = 0.1;
              else if (currentTier.includes("label")) platformFeeRate = 0.05;
            }
            pFee = Math.round(dbTx.gross_amount * platformFeeRate) + SALE_FLAT_FEE;
            artistNet = Math.max(dbTx.gross_amount - pFee, 0);
          } else if (type === "FAN_SUBSCRIPTION") {
            pFee = Math.round(dbTx.gross_amount * 0.1);
            artistNet = dbTx.gross_amount - pFee;
          } else {
            pFee = Math.round(dbTx.gross_amount * 0.15);
            artistNet = dbTx.gross_amount - pFee;
          }
          const { data: updatedTxs, error: updateError } = await supabaseAdmin.from("transactions").update({
            status: "completed",
            platform_fee: pFee,
            net_amount: artistNet,
            completed_at: (/* @__PURE__ */ new Date()).toISOString()
          }).eq("id", dbTx.id).neq("status", "completed").select();
          if (!updateError && updatedTxs && updatedTxs.length > 0) {
            console.log(`[API] Handled verification success for type ${type}, completing db transactions...`);
            if (pFee > 0) {
              try {
                const { data: adminUser } = await supabaseAdmin.from("profiles").select("id, wallet_balance").eq("is_admin", true).limit(1).maybeSingle();
                if (adminUser) {
                  await supabaseAdmin.from("profiles").update({ wallet_balance: (adminUser.wallet_balance || 0) + pFee }).eq("id", adminUser.id);
                }
              } catch (adminErr) {
                console.error("[API VERIFY] Admin wallet update error:", adminErr);
              }
            }
            switch (type) {
              case "TRACK_PURCHASE":
                if (userId && songId) {
                  await supabaseAdmin.from("fan_purchases").upsert({
                    fan_id: userId,
                    song_id: songId,
                    transaction_id: dbTx.id,
                    amount: dbTx.gross_amount,
                    status: "completed",
                    purchased_at: (/* @__PURE__ */ new Date()).toISOString()
                  }, { onConflict: "fan_id,song_id" });
                  await supabaseAdmin.rpc("increment_song_sales", { s_id: songId });
                  if (artistId) {
                    await supabaseAdmin.rpc("increment_wallet_balance", { p_id: artistId, amount: artistNet }).catch(async () => {
                      const { data: p } = await supabaseAdmin.from("profiles").select("wallet_balance").eq("id", artistId).single();
                      await supabaseAdmin.from("profiles").update({ wallet_balance: (p?.wallet_balance || 0) + artistNet }).eq("id", artistId);
                    });
                    await supabaseAdmin.from("notifications").insert({
                      profile_id: artistId,
                      user_type: "artist",
                      type: "track_sold",
                      message: `You sold a track! MWK ${dbTx.gross_amount.toLocaleString()} earned. \u{1F4BF}`,
                      link: "/artist-hub#dashboard"
                    });
                  }
                }
                break;
              case "TIP":
                if (artistId) {
                  await supabaseAdmin.rpc("increment_wallet_balance", { p_id: artistId, amount: artistNet }).catch(async () => {
                    const { data: p } = await supabaseAdmin.from("profiles").select("wallet_balance").eq("id", artistId).single();
                    await supabaseAdmin.from("profiles").update({ wallet_balance: (p?.wallet_balance || 0) + artistNet }).eq("id", artistId);
                  });
                  if (!anonymous) {
                    await supabaseAdmin.from("notifications").insert({
                      profile_id: artistId,
                      user_type: "artist",
                      type: "tip_received",
                      message: `You received a MWK ${dbTx.gross_amount.toLocaleString()} tip! (Net: MWK ${artistNet.toLocaleString()}) \u{1F4B8}`,
                      link: "/artist-hub#dashboard"
                    });
                  }
                }
                break;
              case "FAN_SUBSCRIPTION":
                const fanSubRenewsAt = /* @__PURE__ */ new Date();
                fanSubRenewsAt.setDate(fanSubRenewsAt.getDate() + 30);
                await supabaseAdmin.from("fan_subscriptions").upsert({
                  fan_id: userId,
                  artist_id: artistId,
                  status: "active",
                  next_billing_at: fanSubRenewsAt.toISOString()
                });
                if (artistId) {
                  await supabaseAdmin.rpc("increment_wallet_balance", { p_id: artistId, amount: artistNet }).catch(async () => {
                    const { data: p } = await supabaseAdmin.from("profiles").select("wallet_balance").eq("id", artistId).single();
                    await supabaseAdmin.from("profiles").update({ wallet_balance: (p?.wallet_balance || 0) + artistNet }).eq("id", artistId);
                  });
                  await supabaseAdmin.from("notifications").insert({
                    profile_id: artistId,
                    user_type: "artist",
                    type: "fan_subscribed",
                    message: `A fan has subscribed to you! MWK ${dbTx.gross_amount.toLocaleString()} earned. \u{1F496}`,
                    link: "/artist-hub#fans"
                  });
                }
                break;
              case "LISTENER_PREMIUM":
              case "LISTENER_FAMILY": {
                const subEnds = /* @__PURE__ */ new Date();
                subEnds.setDate(subEnds.getDate() + 30);
                const subTierName = type === "LISTENER_PREMIUM" ? "Premium" : "Family";
                await supabaseAdmin.from("user_profiles").update({
                  subscription_tier: subTierName,
                  subscription_ends: subEnds.toISOString()
                }).eq("id", userId);
                await supabaseAdmin.from("profiles").update({
                  subscription_tier: subTierName,
                  subscription_ends: subEnds.toISOString()
                }).eq("id", userId);
                break;
              }
              case "ARTIST_RISING_STAR":
              case "ARTIST_STANDARD":
              case "ARTIST_ELITE": {
                const artistTierEnds = /* @__PURE__ */ new Date();
                artistTierEnds.setDate(artistTierEnds.getDate() + 180);
                const tierMap = {
                  "ARTIST_RISING_STAR": "RisingStar",
                  "ARTIST_STANDARD": "Standard",
                  "ARTIST_ELITE": "Elite"
                };
                const artistTierName = tierMap[type] || "Free";
                await supabaseAdmin.from("profiles").update({
                  subscription_tier: artistTierName,
                  artist_tier: artistTierName,
                  subscription_ends: artistTierEnds.toISOString()
                }).eq("id", userId);
                await supabaseAdmin.from("user_profiles").upsert({
                  id: userId,
                  subscription_tier: "Premium",
                  subscription_ends: artistTierEnds.toISOString()
                }, { onConflict: "id" });
                break;
              }
              case "ARTIST_AD_CAMPAIGN":
                await supabaseAdmin.from("audio_ads").insert({
                  artist_id: userId,
                  type: "promo",
                  plays_purchased: plays || 1e3,
                  active: false
                });
                break;
            }
          }
          dbTx.status = "completed";
        } else if (pcStatus === "failed") {
          await supabaseAdmin.from("transactions").update({ status: "failed" }).eq("id", dbTx.id);
          dbTx.status = "failed";
        }
      }
      res.json({ status: dbTx.status, transaction: dbTx });
    } catch (error) {
      console.error("[API] Verify payment error:", error);
      res.status(400).json({ error: error.message });
    }
  };
  app.post("/api/functions/v1/verify-payment", handleVerifyPayment);
  app.post("/api/functions/verify-payment", handleVerifyPayment);
  app.post("/api/pay/verify-payment", handleVerifyPayment);
  const handleProcessPayout = async (req, res) => {
    console.log("[API] process-payout received");
    try {
      if (!PAYCHANGU_SECRET_KEY || PAYCHANGU_SECRET_KEY === "YOUR_PAYCHANGU_SECRET_KEY") {
        throw new Error("PAYCHANGU_SECRET_KEY is missing or not configured");
      }
      const user = await verifyUser(req);
      if (!user) {
        console.error("[API] Payout: verifyUser failed");
        return res.status(401).json({ error: "Unauthorized route access" });
      }
      const { amount, phone, network } = req.body;
      console.log(`[API] Payout request: ${amount} to ${phone} (${network})`);
      const { data: artist, error: artistError } = await supabaseAdmin.from("profiles").select("*").eq("id", user.id).single();
      if (artistError || !artist) throw new Error("Artist profile not found");
      if (artist.wallet_balance < amount) throw new Error("Insufficient wallet balance");
      if (amount < 1e4) throw new Error("Minimum withdrawal is MK 10,000");
      const { data: updatedArtist, error: updateError } = await supabaseAdmin.from("profiles").update({ wallet_balance: artist.wallet_balance - amount }).eq("id", user.id).gte("wallet_balance", amount).select().single();
      if (updateError || !updatedArtist) throw new Error("Failed to update balance. Check your funds.");
      const payoutRef = `WD-${user.id}-${Date.now()}`;
      const feePercent = 0.03;
      const netAmount = Math.floor(Number(amount) * (1 - feePercent));
      const { data: payoutReq, error: payoutReqError } = await supabaseAdmin.from("payout_requests").insert({
        artist_id: user.id,
        requested_amount: amount,
        // net_amount: netAmount, // Temporarily disabled until schema update
        phone,
        network,
        status: "pending",
        reference: payoutRef
      }).select().single();
      if (payoutReqError) {
        console.error("[API] payoutReqError:", payoutReqError);
        await supabaseAdmin.from("profiles").update({ wallet_balance: artist.wallet_balance }).eq("id", user.id);
        throw payoutReqError;
      }
      console.log(`[PAYOUT] Manual payout recorded for user: ${user.id}, ref: ${payoutRef}`);
      res.json({
        success: true,
        reference: payoutRef,
        message: "Your request has been received. Please wait for a moment while we verify your payout. You will be notified once it is processed."
      });
    } catch (error) {
      console.error("[API] Payout error:", error);
      res.status(400).json({ error: error.message });
    }
  };
  app.post("/api/functions/v1/process-payout", handleProcessPayout);
  app.post("/api/functions/process-payout", handleProcessPayout);
  app.post("/api/pay/process-payout", handleProcessPayout);
  app.post("/api/admin/payouts/:id/status", async (req, res) => {
    try {
      const user = await verifyUser(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      const { data: profile, error: profileErr } = await supabaseAdmin.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
      const { data: userProfile, error: upErr } = await supabaseAdmin.from("user_profiles").select("is_admin").eq("id", user.id).maybeSingle();
      const isSystemAdmin = profile?.is_admin === true || userProfile?.is_admin === true;
      if (!isSystemAdmin) {
        console.warn(`[API] Admin access denied for user ${user.id}`);
        return res.status(403).json({ error: "Admin access required" });
      }
      const { id } = req.params;
      const { status, error_message } = req.body;
      if (!["paid", "failed"].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }
      const { data: payout, error: payoutError } = await supabaseAdmin.from("payout_requests").select("*").eq("id", id).single();
      if (payoutError || !payout) throw new Error("Payout request not found");
      if (payout.status === "paid" || payout.status === "failed") {
        return res.status(400).json({ error: "Payout already processed" });
      }
      if (status === "paid") {
        const { error: updateError } = await supabaseAdmin.from("payout_requests").update({
          status: "paid",
          paid_at: (/* @__PURE__ */ new Date()).toISOString()
        }).eq("id", id);
        if (updateError) {
          console.error("[API] Payout update failed:", updateError);
          throw new Error(`Update failed: ${updateError.message}`);
        }
        const { error: txError } = await supabaseAdmin.from("transactions").insert({
          artist_id: payout.artist_id,
          type: "withdrawal",
          gross_amount: payout.requested_amount,
          net_amount: payout.net_amount || payout.requested_amount * 0.97,
          status: "completed",
          paychangu_ref: payout.reference || `manual-${id}`,
          description: `Manual payout withdrawal to ${payout.phone} (${payout.network})`
        });
        if (txError) console.error("[API] Withdrawal transaction recording failed:", txError);
        await supabaseAdmin.from("notifications").insert({
          profile_id: payout.artist_id,
          user_type: "artist",
          type: "payout_sent",
          message: `Your manual payout of MK ${payout.requested_amount.toLocaleString()} has been verified and processed! \u{1F973}`,
          link: "/artist-hub#wallet"
        });
      } else if (status === "failed") {
        const { error: updateError } = await supabaseAdmin.from("payout_requests").update({
          status: "failed",
          error_message: error_message || "Manual verification failed"
        }).eq("id", id);
        if (updateError) throw new Error(`Status update failed: ${updateError.message}`);
        const { data: artist } = await supabaseAdmin.from("profiles").select("wallet_balance").eq("id", payout.artist_id).single();
        const { error: refundError } = await supabaseAdmin.from("profiles").update({
          wallet_balance: (artist?.wallet_balance || 0) + payout.requested_amount
        }).eq("id", payout.artist_id);
        if (refundError) console.error("[API] Wallet refund failed:", refundError);
        await supabaseAdmin.from("notifications").insert({
          profile_id: payout.artist_id,
          user_type: "artist",
          type: "payout_failed",
          message: `Your withdrawal request of MK ${payout.requested_amount.toLocaleString()} was declined. Funds have been returned to your wallet.`,
          link: "/artist-hub#wallet"
        });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("[API] Admin payout update error:", error);
      res.status(400).json({ error: error.message });
    }
  });
  app.post("/api/functions/payout-webhook", async (req, res) => {
    try {
      if (!supabaseAdmin) throw new Error("Supabase Admin not initialized");
      if (!verifyPayChanguSignature(req)) {
        console.error("[PAYOUT WEBHOOK] Invalid PayChangu payout signature");
        return res.status(401).send("Invalid signature");
      }
      const { reference, status, amount } = req.body;
      const { data: payout, error: payoutError } = await supabaseAdmin.from("payout_requests").select("*").eq("reference", reference).single();
      if (payoutError || !payout) {
        return res.sendStatus(200);
      }
      if (payout.status === "paid" || payout.status === "failed") {
        return res.sendStatus(200);
      }
      if (status === "successful") {
        await supabaseAdmin.from("payout_requests").update({
          status: "paid",
          paid_at: (/* @__PURE__ */ new Date()).toISOString()
        }).eq("id", payout.id);
        await supabaseAdmin.from("transactions").insert({
          artist_id: payout.artist_id,
          type: "withdrawal",
          gross_amount: amount,
          status: "completed",
          paychangu_ref: reference
        });
        await supabaseAdmin.from("notifications").insert({
          profile_id: payout.artist_id,
          user_type: "artist",
          type: "payout_sent",
          message: `MK ${amount.toLocaleString()} has been sent to your ${payout.network} number \u{1F973}`,
          link: "/artist-hub#wallet"
        });
      } else if (status === "failed") {
        await supabaseAdmin.from("payout_requests").update({ status: "failed" }).eq("id", payout.id);
        const { data: artist } = await supabaseAdmin.from("profiles").select("wallet_balance").eq("id", payout.artist_id).single();
        await supabaseAdmin.from("profiles").update({
          wallet_balance: (artist?.wallet_balance || 0) + payout.requested_amount
        }).eq("id", payout.artist_id);
        await supabaseAdmin.from("notifications").insert({
          profile_id: payout.artist_id,
          user_type: "artist",
          type: "payout_failed",
          message: `Your withdrawal failed. MK ${amount.toLocaleString()} returned to your wallet.`,
          link: "/artist-hub#payouts"
        });
      }
      res.sendStatus(200);
    } catch (error) {
      console.error("Payout webhook error:", error);
      res.sendStatus(200);
    }
  });
  app.post("/api/functions/send-sms", async (req, res) => {
    try {
      const user = await verifyUser(req);
      if (!user) {
        return res.status(401).json({ error: "Unauthorized route access" });
      }
      const { to, message } = req.body;
      if (!to || !message) throw new Error("Missing recipient or message");
      const response = await fetch("https://api.africastalking.com/version1/messaging", {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
          "apiKey": process.env.AT_API_KEY
        },
        body: new URLSearchParams({
          username: process.env.AT_USERNAME,
          to,
          message
        })
      });
      const result = await response.json();
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  app.post("/api/paychangu-webhook", async (req, res) => {
    try {
      if (!supabaseAdmin) throw new Error("Supabase Admin not initialized");
      if (!verifyPayChanguSignature(req)) {
        console.error("[WEBHOOK] Invalid PayChangu payment signature");
        return res.status(401).send("Invalid signature");
      }
      const payload = req.body;
      const tx_ref = payload.tx_ref || payload.transaction_reference || payload.reference;
      const status = payload.status;
      const amount = payload.amount;
      if (!tx_ref) {
        console.error("[WEBHOOK] Missing reference in payload:", payload);
        return res.sendStatus(200);
      }
      const { data: transaction, error: txError } = await supabaseAdmin.from("transactions").select("*").eq("paychangu_ref", tx_ref).single();
      if (txError || !transaction) {
        console.error(`Transaction not found: ${tx_ref}`);
        return res.sendStatus(200);
      }
      if (transaction.status === "completed") {
        return res.sendStatus(200);
      }
      if (status !== "successful") {
        await supabaseAdmin.from("transactions").update({ status: "failed" }).eq("id", transaction.id).neq("status", "completed");
        return res.sendStatus(200);
      }
      const type = (transaction.metadata?.payment_type || tx_ref.split("-")[1]).toUpperCase();
      const metadata = transaction.metadata || {};
      const userId = metadata.userId || transaction.fan_id;
      const { artistId, songId, anonymous } = metadata;
      console.log(`[WEBHOOK] Payload received:`, JSON.stringify(payload));
      console.log(`[WEBHOOK] Processing type: ${type} for ref: ${tx_ref}, userId: ${userId}, artistId: ${artistId}`);
      let pFee = 0;
      let artistNet = amount;
      if (type.includes("LISTENER_") || type.includes("ARTIST_") || type === "ARTIST_AD_CAMPAIGN" || type === "FEATURED_PLACEMENT") {
        pFee = amount;
        artistNet = 0;
      } else if (type === "TIP") {
        pFee = Math.round(amount * 0.05);
        artistNet = amount - pFee;
      } else if (type === "TRACK_PURCHASE") {
        const SALE_FLAT_FEE = 50;
        let platformFeeRate = 0.2;
        if (artistId) {
          const { data: artistProfile } = await supabaseAdmin.from("profiles").select("subscription_tier, artist_tier").eq("id", artistId).single();
          const currentTier = (artistProfile?.subscription_tier || artistProfile?.artist_tier || "Standard").toLowerCase();
          if (currentTier.includes("elite") || currentTier.includes("platinum")) platformFeeRate = 0.1;
          else if (currentTier.includes("label")) platformFeeRate = 0.05;
        }
        pFee = Math.round(amount * platformFeeRate) + SALE_FLAT_FEE;
        artistNet = Math.max(amount - pFee, 0);
      } else if (type === "FAN_SUBSCRIPTION") {
        pFee = Math.round(amount * 0.1);
        artistNet = amount - pFee;
      } else {
        pFee = Math.round(amount * 0.15);
        artistNet = amount - pFee;
      }
      await supabaseAdmin.from("transactions").update({
        status: "completed",
        gross_amount: amount,
        platform_fee: pFee,
        net_amount: artistNet,
        completed_at: (/* @__PURE__ */ new Date()).toISOString()
      }).eq("id", transaction.id).neq("status", "completed");
      if (pFee > 0) {
        try {
          const { data: adminUser } = await supabaseAdmin.from("profiles").select("id, wallet_balance").eq("is_admin", true).limit(1).maybeSingle();
          if (adminUser) {
            await supabaseAdmin.from("profiles").update({ wallet_balance: (adminUser.wallet_balance || 0) + pFee }).eq("id", adminUser.id);
          }
        } catch (adminErr) {
          console.error("[WEBHOOK] Admin wallet update error:", adminErr);
        }
      }
      await supabaseAdmin.from("webhook_logs").insert({
        tx_ref,
        type,
        status: "processed",
        payload: JSON.stringify(payload)
      });
      switch (type) {
        case "TRACK_PURCHASE":
          if (!userId || !songId) {
            console.error("[WEBHOOK] Missing metadata for TRACK_PURCHASE:", metadata);
            break;
          }
          const { error: fanError } = await supabaseAdmin.from("fan_purchases").upsert({
            fan_id: userId,
            song_id: songId,
            transaction_id: transaction.id,
            amount,
            status: "completed",
            purchased_at: (/* @__PURE__ */ new Date()).toISOString()
          }, { onConflict: "fan_id,song_id" });
          if (fanError) console.error("[WEBHOOK] fan_purchases insert error:", fanError);
          await supabaseAdmin.rpc("increment_song_sales", { s_id: songId });
          if (artistId) {
            try {
              const { error: rpcErr } = await supabaseAdmin.rpc("increment_wallet_balance", { p_id: artistId, amount: artistNet });
              if (rpcErr) {
                console.warn("[WEBHOOK] RPC increment failed, trying manual fallback...", rpcErr.message);
                const { data: p } = await supabaseAdmin.from("profiles").select("wallet_balance").eq("id", artistId).single();
                await supabaseAdmin.from("profiles").update({ wallet_balance: (p?.wallet_balance || 0) + artistNet }).eq("id", artistId);
              }
            } catch (e) {
              console.error("[WEBHOOK] Wallet update error:", e);
            }
            await supabaseAdmin.from("notifications").insert({
              profile_id: artistId,
              user_type: "artist",
              type: "track_sold",
              message: `You sold a track! MWK ${amount.toLocaleString()} earned. \u{1F4BF}`,
              link: "/artist-hub#dashboard"
            });
          }
          break;
        case "TIP":
          if (artistId) {
            console.log(`[WEBHOOK] Incrementing wallet for artist ${artistId} by ${artistNet}`);
            const { error: tipRpcErr } = await supabaseAdmin.rpc("increment_wallet_balance", { p_id: artistId, amount: artistNet });
            if (tipRpcErr) {
              console.warn("[WEBHOOK] TIP RPC failed, trying manual fallback...", tipRpcErr.message);
              const { data: p } = await supabaseAdmin.from("profiles").select("wallet_balance").eq("id", artistId).single();
              const { error: manualErr } = await supabaseAdmin.from("profiles").update({ wallet_balance: (p?.wallet_balance || 0) + artistNet }).eq("id", artistId);
              if (manualErr) console.error("[WEBHOOK] Manual wallet update failed:", manualErr);
            }
            if (!anonymous) {
              await supabaseAdmin.from("notifications").insert({
                profile_id: artistId,
                user_type: "artist",
                type: "tip_received",
                message: `You received a MWK ${amount.toLocaleString()} tip! (Net: MWK ${artistNet.toLocaleString()}) \u{1F4B8}`,
                link: "/artist-hub#dashboard"
              });
            }
          } else {
            console.error("[WEBHOOK] No artistId found for TIP payment");
          }
          break;
        case "FAN_SUBSCRIPTION":
          const renewsAt = /* @__PURE__ */ new Date();
          renewsAt.setDate(renewsAt.getDate() + 30);
          await supabaseAdmin.from("fan_subscriptions").upsert({
            fan_id: userId,
            artist_id: artistId,
            status: "active",
            next_billing_at: renewsAt.toISOString()
          });
          if (artistId) {
            try {
              const { error: rpcErr } = await supabaseAdmin.rpc("increment_wallet_balance", { p_id: artistId, amount: artistNet });
              if (rpcErr) {
                const { data: p } = await supabaseAdmin.from("profiles").select("wallet_balance").eq("id", artistId).single();
                await supabaseAdmin.from("profiles").update({ wallet_balance: (p?.wallet_balance || 0) + artistNet }).eq("id", artistId);
              }
            } catch (e) {
              console.error("[WEBHOOK] Fan sub wallet update error:", e);
            }
          }
          await supabaseAdmin.from("notifications").insert({
            profile_id: artistId,
            user_type: "artist",
            type: "fan_subscribed",
            message: `A fan has subscribed to you! MWK ${amount.toLocaleString()} earned. \u{1F496}`,
            link: "/artist-hub#fans"
          });
          break;
        case "LISTENER_PREMIUM":
        case "LISTENER_FAMILY":
          const subEnds = /* @__PURE__ */ new Date();
          subEnds.setDate(subEnds.getDate() + 30);
          const subTierName = type === "LISTENER_PREMIUM" ? "Premium" : "Family";
          await supabaseAdmin.from("user_profiles").update({
            subscription_tier: subTierName,
            subscription_ends: subEnds.toISOString()
          }).eq("id", userId);
          await supabaseAdmin.from("profiles").update({
            subscription_tier: subTierName,
            subscription_ends: subEnds.toISOString()
          }).eq("id", userId);
          console.log(`[WEBHOOK] Updated listener subscription for ${userId} to ${type}`);
          break;
        case "ARTIST_RISING_STAR":
        case "ARTIST_STANDARD":
        case "ARTIST_ELITE":
          const artistTierEnds = /* @__PURE__ */ new Date();
          artistTierEnds.setDate(artistTierEnds.getDate() + 365);
          const tierMap = {
            "ARTIST_RISING_STAR": "RisingStar",
            "ARTIST_STANDARD": "Standard",
            "ARTIST_ELITE": "Elite"
          };
          const artistTierName = tierMap[type] || "Free";
          await supabaseAdmin.from("profiles").update({
            subscription_tier: artistTierName,
            artist_tier: artistTierName,
            subscription_ends: artistTierEnds.toISOString()
          }).eq("id", userId);
          console.log(`[WEBHOOK] Updated artist subscription for ${userId} to ${artistTierName}`);
          break;
      }
      res.sendStatus(200);
    } catch (error) {
      console.error("Webhook error:", error);
      res.sendStatus(200);
    }
  });
  const distPath = import_path.default.resolve(process.cwd(), "dist");
  const indexHtmlExists = import_fs.default.existsSync(import_path.default.join(distPath, "index.html"));
  if (process.env.NODE_ENV === "production") {
    console.log("--- PRODUCTION MODE ---");
    if (indexHtmlExists) {
      console.log("Serving static files from dist/");
      app.use(import_express.default.static(distPath, {
        setHeaders: (res, filePath) => {
          if (filePath.endsWith("index.html")) {
            res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
            res.setHeader("Pragma", "no-cache");
            res.setHeader("Expires", "0");
          } else if (filePath.match(/\.(js|css|webp|png|jpg|jpeg|gif|svg|woff2?)$/)) {
            res.setHeader("Cache-Control", "public, max-age=31536000");
          }
        }
      }));
      app.get("*", (req, res) => {
        if (req.originalUrl.match(/\.(js|css|webp|png|jpg|jpeg|gif|svg|woff2?|map)$/)) {
          return res.status(404).send("Not found");
        }
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.sendFile(import_path.default.join(distPath, "index.html"));
      });
    } else {
      console.error("CRITICAL: dist/index.html not found in production!");
      app.get("*", (req, res) => res.status(500).send("Production build missing. Please run npm run build."));
    }
  } else {
    console.log("--- DEVELOPMENT MODE (Vite Middleware) ---");
    try {
      const vite = await (0, import_vite.createServer)({
        server: { middlewareMode: true },
        appType: "spa"
      });
      app.use(vite.middlewares);
      app.get("*", async (req, res, next) => {
        const url = req.originalUrl;
        try {
          const indexPath = import_path.default.resolve(process.cwd(), "dist/index.html");
          if (!import_fs.default.existsSync(indexPath)) {
            return res.status(404).send("index.html not found in root");
          }
          let template = import_fs.default.readFileSync(indexPath, "utf-8");
          template = await vite.transformIndexHtml(url, template);
          res.status(200).set({ "Content-Type": "text/html" }).end(template);
        } catch (e) {
          next(e);
        }
      });
    } catch (err) {
      console.error("Vite failed to initialize:", err);
      if (indexHtmlExists) {
        console.warn("Vite failed, falling back to static dist/ as emergency fallback");
        app.use(import_express.default.static(distPath));
        app.get("*", (req, res) => res.sendFile(import_path.default.join(distPath, "index.html")));
      }
    }
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`--- SERVER READY ---`);
    console.log(`URL: http://localhost:${PORT}`);
    console.log(`MODE: ${indexHtmlExists ? "Production (Static)" : "Development (Vite)"}`);
  });
}
startServer();
