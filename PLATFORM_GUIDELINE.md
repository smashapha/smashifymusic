# Smashify Platform Operating Guidelines

This document outlines the core business logic, artist lifecycle, and economic principles driving Smashify. It serves as a unified reference for the platform's fair, living-catalog model.

---

## 1. Core Philosophy: The Living Catalog
Smashify operates on a fundamentally different principle than traditional streaming platforms. Instead of artists paying to host an ever-expanding library of dead tracks, **artists only pay for their active, living catalog**. 

*   **Fairness:** Artists do not pay for tracks that are no longer generating streams.
*   **Relevance:** The platform stays clean and relevant, surfacing only the best and most active music.
*   **Artist Control:** The artist is in charge of curating their active slots, while the system automates the archiving of retired tracks.

---

## 2. Subscription Tiers & Billing

Artists subscribe to tiers that offer a set number of **Active Track Slots**.

### Tier Structure
| Tier | Monthly Price | 6-Month Price (Savings) | Active Slots Allowed | Features |
| :--- | :--- | :--- | :--- | :--- |
| **Free** | MK 0 | MK 0 | 3 | Max 8MB uploads, 128kbps quality, basic analytics. |
| **Rising Star** | MK 1,500 / mo | MK 8,000 (Save MK 1k) | 10 | Lossless uploads, standard monetization. |
| **Standard** | MK 3,000 / mo | MK 16,000 (Save MK 2k)| 15 | Enhanced analytics, premium visibility. |
| **Elite** | MK 5,000 / mo | MK 27,000 (Save MK 3k)| 25 | Priority support, max track slots. |

### Add-on
*   **Slot Booster Pack:** MK 1,500/month for +10 extra active slots on top of any paid tier.

---

## 3. The Song Lifecycle
Tracks are no longer universally treated as just "active" or "vaulted". Songs transition between states based on their performance.

*   🔥 **Hot:** 1,000+ plays this month. Fully promoted.
*   ✅ **Active:** 100-999 plays this month. Standard visibility.
*   🧊 **Cold:** <100 plays this month. Still active, but consuming a slot.
*   📦 **Archive:** 0 plays for 90+ days. **FREE to keep, consumes no slots.** Stripped to basic playback. If searched, fans can play it, but it isn't actively pushed.

*Only Hot, Active, and Cold songs count against an artist's slot limit.*

---

## 4. Platform Mechanics & Automations

### A. The Nightly Slot Reclassification
Every night, a background job reviews track performance:
*   Moves dead songs (`< 100 plays` generally, but `0 plays for 90 days` go directly to Archive).
*   Upgrades songs to **Hot** or **Active** based on rolling 30-day play counts.
*   If an **Archive** song goes viral, it automatically upgrades to **Hot**. If the artist is out of slots, the system automatically finds the worst-performing **Cold** song, archives it, and places the viral song in the freed slot.

### B. Renewals & Grace Periods
*   **7-Day Grace Period:** When a paid subscription expires, the artist isn't immediately punished. Their songs stay live for 7 days with warning banners.
*   **Vaulting (Post-Grace Period):** If still unpaid after 7 days, the account demotes to Free. The top 3 most played trending songs stay live. The rest are "vaulted" (hidden). Note: Archive songs are left untouched (they are already free).

### C. Tier Downgrade Protection (30 Days)
If an artist downgrades (e.g., Elite with 20 songs downgrades to Rising Star with 10 slots), their excess 10 songs are NOT vaulted immediately.
*   They receive a **30-day grace window**. 
*   They are prompted in the Artist Hub to choose which 10 songs to keep. 
*   If they do nothing after 30 days, the lowest-played tracks are vaulted automatically.

---

## 5. Handling Edge Cases Systematically

**1. "I upload heavily, but then I stop producing music."**
If all an artist's songs eventually die and enter Archive mode (consuming 0 slots), the Artist Hub displays an honest efficiency metric: *"You are paying for 25 Elite slots but using 0. Recommend downgrading to Rising Star."*

**2. "What if a song gets an unexpected copyright strike?"**
The song's status changes to `suspended`. Suspended songs **do not count** toward the slot limit. The artist immediately gets that slot back to use for something else, while a 14-day appeal window begins.

**3. "I collaborated with another artist on a song. What happens if they churn?"**
To protect joint work, the `featured_artist_id` acts as a sponsor. If the primary artist stops paying, but the featured artist has an active paid subscription, the song becomes `collab_protected` and is NOT vaulted.

**4. "I'm a Label with multiple artists."**
For label accounts, rather than buying separate Elite plans, a label buys a bulk slot tier (e.g., 150 slots). The label admin can dynamically allocate those slots between their roster heavily toward the trending artists, maximizing efficiency.

---

## 6. End-to-End Upload Flow

1.  **Artist selects Upload Form:** Chooses Single or Album.
2.  **Upload Guard check:** Before allowing the selection, the system counts the artist's total active slots (excluding Archive) and checks file size limits (8MB on Free tier).
3.  **Submission:** If slots are available, upload proceeds.
4.  **Live State:** Song goes live as `Cold` initially, entering the performance lifecycle tracking.
5.  **Analytics & Earnings:** Fan interactions (plays, tips, direct purchases) are tracked in real time. 

---

## 7. The End Goal / Value Proposition
**For Artists:** "You pay for your active, living catalog. When a song retires naturally, it moves to Archive automatically and stops counting against your slots. You never pay for dead inventory. You only pay for the music that's actually working."

**For the Platform:** The site remains fast, storage costs scale cleanly with revenue, the catalog remains aggressively curated ensuring a high-quality listener experience, and artists build long-term trust through honest, transparent metrics and downgrading options.
