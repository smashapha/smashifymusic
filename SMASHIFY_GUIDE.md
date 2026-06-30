# Smashify Project Guide & Business Logic Handbook

Welcome to the Smashify internal guide. This document serves as a map of the codebase and the "source of truth" for the platform's business logic. Keep this handy when you need to make changes to prices, fees, or UI layouts.

## 📁 Codebase Map (Where to find what)

### Backend & Business Logic
*   **`server.ts`**: The most critical file for money and logic. This file handles all webhook events from Paychangu, calculates the platform fees, increments artist wallets, and handles withdrawal logic. If you ever need to change the % Smashify takes from a sale or tip, you change it here.
*   `*.sql` files (e.g., `FINAL_SUPABASE_FIX.sql`, `supabase-rls.sql`): These contain the database definitions and Row Level Security (RLS) rules. If you add a new column to a table, it is defined in one of these SQL migrations.

### Frontend Pages (`/src/pages/`)
*   **`Admin.tsx`**: The control center for Smashify staff. Used to view total revenue, approve/reject payouts, verify artists, and manage ad campaigns.
*   **`ArtistPortal.tsx`**: The dashboard for artists. They upload songs, view their wallet balance, request payouts, and view analytics here.
*   **`Home.tsx`** & **`Discover.tsx`**: The main listener experiences. The music player and trending tracks are displayed here.
*   **`Feed.tsx`**: The social feed where artists can drop updates and fans can interact.
*   **`ArtistProfile.tsx`**: The public-facing page for an artist where fans can tip, subscribe, and buy tracks.

### Key Components (`/src/components/`)
*   **`MusicPlayer.tsx`**: The persistent global audio player.
*   **`PaymentModal.tsx`**: The popup that handles taking user input and initiating a Paychangu checkout.

---

## 💰 Monetization & Fee Structure (The Math)

The platform fee logic is strictly enforced in `server.ts` inside the Paychangu webhook handler (`/api/webhook/paychangu`).

### 1. Song Purchases (`TRACK_PURCHASE`)
When a fan buys a song, Smashify takes a dynamic cut based on the Artist's Tier, plus a **50 MWK flat fee** per transaction to cover fixed gateway costs.
*   **Standard Tier**: Smashify takes **20%** + 50 MWK.
*   **Elite / Platinum Tier**: Smashify takes **10%** + 50 MWK.
*   **Label Tier**: Smashify takes **5%** + 50 MWK.

### 2. Tips (`TIP`)
When a fan tips an artist:
*   Smashify takes **5%**.
*   Artist keeps **95%**.

### 3. Fan Subscriptions (`FAN_SUBSCRIPTION`)
When a fan subscribes directly to an artist monthly:
*   Smashify takes **10%**.
*   Artist keeps **90%**.

### 4. Platform Subscriptions & Placements
For standard Listener Subscriptions, Artist Subscriptions (paying for Pro tools), and Ad Campaigns:
*   Smashify takes **100%** (Platform Revenue).

### 5. Payouts (Withdrawals)
When an artist requests a payout:
*   **Minimum Withdrawal**: 10,000 MWK (Enforced in `server.ts`).
*   **Network Fee**: There is a **3%** fee deducted from the requested amount to cover Mobile Money/Bank transfer costs. The artist receives `Requested Amount * 0.97`.

---

## 🚀 How to make updates in the future

When you want to change something, frame your request based on the files above. Examples:

*   **To change fees**: *"I want to change the platform fee for Tips from 5% to 10% in server.ts"*
*   **To change UI colors**: *"I want to update the background color of the ArtistPortal.tsx dashboard."*
*   **To add a new feature**: *"I want to add a new 'Merch' tab in ArtistProfile.tsx and update the database to support it."*
