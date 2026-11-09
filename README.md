# Loyalkard — Digital Stamp Card Loyalty App

Replace paper stamp cards with a digital loyalty system for cafés, restaurants, and retail.

## Architecture — server-trusted
All loyalty mutations (stamps, reward redemptions, counter codes, verification approvals, reviews) run **server-side** in Next.js API routes (`src/app/api/*`) backed by the Firebase Admin SDK or a local JSON store. The browser holds **no** trusted data: it talks only to `/api/*` through `src/lib/db`.

- **All writes server-side** — forged DevTools calls cannot mint stamps, codes or approvals.
- **Card privacy**: card data is only readable by the device that holds the httpOnly **possession cookie** (granted on join or after staff verification) or the authenticated owner. Knowing a customer's phone number alone reveals nothing (it only creates a staff-verification request).
- **Security rules**: `firestore.rules` denies every client read/write except reading public business profiles.

## Stack
- **Next.js 16 (App Router) + TypeScript + Tailwind CSS v4**
- **Framer Motion** (stamp landing animations, reward overlay)
- **React Hook Form + Zod** (validation)
- **qrcode.react** (QR generation)
- **Firebase**: Auth (production) + Firestore/Admin SDK
- **jose**: server-side verification of owner Firebase ID tokens (public JWKs — no service account needed for auth)

## Quick start (zero extra config)
```bash
npm install
npm run dev
```
Open http://localhost:3000

With Firebase env keys set (`.env.local`) but **no service account**, the app runs the full secure server flow with data in `.data/db.json` (local file store — same API routes, same rules as production; for development only).

## Production setup (Firebase)
1. Create a project at https://console.firebase.google.com
2. Enable **Authentication → Email/Password** and **Firestore Database**.
3. Register a **Web App**, copy the config values into `.env.local`:
   `NEXT_PUBLIC_FIREBASE_API_KEY, AUTH_DOMAIN, PROJECT_ID, STORAGE_BUCKET, MESSAGING_SENDER_ID, APP_ID`
4. **Service account for server data access** (required for Firestore-backed data): Firebase console → Project settings → **Service accounts** → *Generate new private key*, then set:
   ```
   FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-...@<project>.iam.gserviceaccount.com
   FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   ```
5. Publish `firestore.rules` (Firebase console → Firestore → Rules).

## SEO, trust and legal pages
- Marketing/trust pages: `/about`, `/contact`, `/security`, `/privacy`, `/terms`, `/cookies`.
- Generated `sitemap.xml`, `robots.txt`, Open Graph image and Twitter image (`src/app/sitemap.ts`, `robots.ts`, `opengraph-image.tsx`, `twitter-image.tsx`).
- Canonical URLs, Open Graph/Twitter metadata, Organization/WebPage/Breadcrumb/FAQ JSON-LD.
- Set `NEXT_PUBLIC_SITE_URL` in production (defaults to `https://stamp.v4stay.com`). Update the support/privacy emails in `src/lib/site.ts` before launch.

## Folder layout
```
src/
  app/
    page.tsx                     Landing
    login/page.tsx               Business auth
    b/[businessId]/page.tsx      Customer join + collect (via ?collect=CODE)
    card/[cardId]/page.tsx       Customer stamp card + reward QR
    dashboard/[businessId]/      Owner dashboard (overview/station/verify/redeem/reviews/rules)
    api/
      collect/                   Customer join/collect (identity + token validation + stamp)
      card/[cardId]/             Card read (possession cookie or owner)
      card/claim/                Grant possession cookie after staff approval
      verify/[verificationId]/   Verification status poll
      review/                    Review submit (rate limits + bonus-stamp guard)
      owner/                     Owner gateway (all dashboard reads/writes, auth-verified)
      health/                    Health check
  components/StampGrid.tsx       Animated stamp grid (Framer Motion)
  lib/
    firebase.ts                  Firebase client init (env-gated)
    auth.ts                      Owner auth + demo seeding
    schemas.ts                   Zod schemas
    types.ts                     Data models
    db/
      index.ts                   Impl selector (server API vs localStorage demo)
      server.ts                  Client shim → /api/* routes
      local.ts                   localStorage impl (no-config demo)
      firebase.ts                Legacy direct-Firestore impl (unused in server mode)
    server/
      store.ts                   Store interface + shared guards (cooldown, stamp rules)
      store-file.ts              Local file store (.data/db.json) — dev only
      store-firestore.ts         Firebase Admin store — production
      select.ts                  Picks the store backend
      collect.ts                 Collect-flow business logic
      cards-cookie.ts            Possession-cookie helpers
firestore.rules                  Firestore security rules (client access locked down)
```

## Data models
- **Business**: `id, name, logoUrl, loyaltyRule{requiredStamps, rewardDescription, expiresAt, minSpend}, profile{phone, address, openingHours, websiteUrl, menuUrl, googleReviewUrl, reservationsEnabled}, createdAt`
- **Customer**: `id, phoneNumber, email, createdAt, lastVisitedAt`
- **StampCard**: `id, customerId, businessId, currentStamps, totalRedemptions, updatedAt`
- **VisitLog**: `id, customerId, businessId, timestamp, type(stamp_added|reward_redeemed)`
- **StampToken**: `code, businessId, expiresAt, used, usedByCustomerId`
- **Review**: `id, businessId, customerId, customerContact, rating(1-5), comment, autoReply, createdAt`
- **Reservation**: `id, businessId, customerId, name, phone, partySize, scheduledFor, notes, status(pending|confirmed|cancelled), createdAt`

## Restaurant features
- **Google reviews with automated feedback**: customers rate their visit (1–5 stars) from their stamp card. Feedback auto-sent per rating; 4–5★ customers get a bonus stamp + a "post it on Google" button (if the owner set their Google review link in Settings). Lower ratings get an apology / escalation note and are kept private for the owner.
- Owner sees every review + the auto-reply that was sent in the dashboard **Reviews** tab, with average rating.
- **Table reservations**: customers request a table (name, phone, party size, date/time, notes); owners confirm or decline in the **Reservations** tab.
- **Restaurant services on the card**: opening hours, call button, Google Maps directions, menu link, website link — all configurable in dashboard **Settings**.

## Anti-fraud (server-enforced)
- Stamp tokens rotate, expire in 5 minutes, and are single-use — validated **and consumed inside one server-side transaction together with the stamp**, so a failed stamp never burns a code.
- First visit: the customer registers with **name + phone/email** and collects their first stamp via the counter QR code.
- **Returning visits require staff verification**: the customer enters their name again, an approval request (expires in 5 minutes) appears **only in the owner dashboard's Verify tab** — never on the customer's screen. When the owner confirms the person is physically present and accepts, the stamp is added and card access is granted to that device. This blocks screenshot/photo re-scanning: scanning the QR again cannot add stamps without staff approval.
- Per customer/business, stamps are rate-limited to one per 60 seconds (enforced in transactions via `lastStampAt`).
- Reward resets the card; redemptions logged in VisitLog.
- **Review bonus-stamp guard**: the 4–5★ bonus stamp can be earned at most once per customer per 7 days and never on a full card; reviews are limited to one per customer per hour.
- **Owner actions** (`/api/owner`) verify a Firebase ID token server-side (signature + issuer + audience via public JWKs) and re-check business ownership on every call.

## Useful scripts
```bash
npm run dev      # dev server
npm run build    # production build
npm start        # serve production build
```
