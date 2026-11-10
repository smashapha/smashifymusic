# Prompt for Gemini AI Studio — Smashify website payment hardening

Work on the EXISTING Smashify V5.6 website repository; do not redesign it or replace the native Android app with Capacitor/WebView. Preserve accounts, catalogue, artist approvals, existing purchases and balances. Android is a separate native Kotlin/Compose app using the same Supabase backend.

Owner authorizes local source fixes and tests, NOT automatic production deployment, live charges, financial grants, destructive cleanup or RLS relaxation. First checkpoint source and record actual deployed hosting routes/Edge versions. No keys/tokens in code, logs or prompt replies. Use synthetic accounts and mocks/sandbox only.

## Evidence already reviewed
The owner exported Supabase schema/policies/functions. An uploaded website archive contains server.ts and supabase/functions/{create-payment,verify-payment,paychangu-webhook}/index.ts. Website src/lib/paychangu.ts falls back across same-origin Express and direct Edge endpoints. Every reachable payment path must share safe semantics; patching one path is insufficient.

Findings in original source:
- server verify accepts owner/admin force_grant, fabricates manual completed orders, allows clientSaysSuccess, and even admin auto-verification on invalid gateway secret. user_metadata admin flags and hardcoded email are not trusted authorization.
- Completed-order recovery and sync-purchases can repeat full fulfillment including financial effects. Browser verify attempts fan_purchases INSERT from response/localStorage with default amount500. Remove all client financial/entitlement writes, fallback grants and success inference.
- Edge handlers mark completed before separate wallet/entitlement writes and often log rather than roll back failures. Match provider reference, exact amount and currency to server-reserved order. Pending/processing is not failure. Unknown initiation timeout must not trigger a new charge.
- Legacy server uses increment_wallet_balance and increment_song_sales; Edge uses increment_wallet. Inventory actual definitions and grants before migration.

## Confirmed Supabase schema concerns
- PUBLIC permissive subscription INSERT true and UPDATE true with client grants; restrictive-looking owner policies do not override permissive true policies.
- PUBLIC UPDATE USING true system_manage_profiles and system_manage_user_profiles with client grants. Existing triggers protect only subsets; use safe owner field grants and owner policies plus server-only privileged writes. Revoke explicit column grants as well as table grants where necessary.
- profiles authenticated table SELECT exposes sensitive identity/contact/KYC fields; row policies do not redact columns. Provide explicit safe public metadata view and private owner/server access. Keep public catalogue functional.
- songs public SELECT true policies override permissive exclusivity policy; audio_url is anon-readable. Inspect storage object/bucket rules before claiming media protection. Do not solve by hiding only the UI.
- increment_wallet(uuid,numeric) SECURITY DEFINER has PUBLIC/anon/authenticated EXECUTE, no order/amount/idempotency guard, no pinned search_path. Restrict generic financial RPCs and replace with verified-order finalization. Guard trigger can suppress non-admin credits, so public EXECUTE alone does not prove actual exploit.
- guard_profile_updates uses no-arg is_admin() based on auth.uid(); NULL request uid returns false and trigger restores wallet/tier fields even on RLS-bypass server operations. Fix trusted-server path without making NULL uid a general bypass.
- transactions status check permits pending/completed/failed/refunded/disputed, NOT success. Old AFTER INSERT wallet trigger checks success and is incompatible. Do not introduce duplicate completion credit paths.
- transactions.paychangu_ref is already unique; initiation/effect idempotency still missing. fan_purchases has duplicate unique(fan_id,song_id) constraints; do not delete purchase records as cleanup.
- fan_subscriptions has only id,fan_id,artist_id,status,created_at, no billing/expiry fields or pair uniqueness. profiles.subscription_price absent. Current functions use missing columns. Explicit reviewed pricing/duration/expiry schema required; never invent automatic renewal/provider mandate.
- agent_commissions has no tier column. Unique(agent_id,artist_id) models once-per-referred-artist, not every renewal. agents.id differs from agents.user_id. Referral trigger resolves approved agent code to profiles.referred_by_agent_id. Preserve or explicitly confirm existing business rules.
- signup creates profiles for listeners too; profile existence/default user_type artist is NOT proof of artist eligibility.

## Required implementation
Use authenticated payer identity from validated session, server-side immutable quotes, explicit MWK first, server-generated references and initiation idempotency. Add one private atomic finalizer with consistent row locks and unique order-effect ledger. Mandatory purchase/subscription/wallet effects and completed/fulfilled status commit together or all roll back. Ensure refunds/disputes are not silently reopened. Restrict reconciliation owner/internal access. Redact provider payload/phone/key logging. Never collect mobile-money PINs.

Preserve historical orders/balances without blind backfill/recredit; handle reconciliation separately with authoritative evidence. Fix UI troubleshooting controls to verified status/recovery, not grants. Show pending, unknown/retry-safe and failed states accurately. Do not label a browser redirect completed. Refresh authoritative entitlements only after committed fulfillment.

Payment scope: tips, track purchases, fan memberships, listener plans, Artist Studio plans. Withdrawals excluded. Direct Airtel/TNM only once merchant confirms enabled methods/currency. Foreign residence is not currency eligibility.

## Tests / deliverables
Provide targeted source diff, migration and rollback drafts, prerequisite/backup/deployment order, all routing/Edge paths covered, and test evidence. Test anon/owner/other/admin/server insert+update permissions, exact quote/provider mismatches, duplicate concurrent verification+webhooks, injected SQL failure rollback, timeout idempotency, stale accounts, expiry, referral and historical-order recovery without double credits. Build/typecheck website and regression-test listener/artist/catalogue flows. Clearly distinguish mock/local DB/provider sandbox/production evidence. Do not deploy partial containment patches that permit initiation while fulfillment is intentionally blocked.
