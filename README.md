# Risol Club Web

A playful little storefront for a handmade risol brand, built with Next.js App Router.

This app covers the cozy customer side and the practical seller side:

- customer menu browsing and checkout
- bank transfer flow with payment proof upload
- direct payment proof preview on the order tracking page
- pickup and delivery flow
- delivery follow-up redirected to WhatsApp with the order code prefilled
- seller dashboard for orders, menu, inventory, costing, and reports

## What Makes It Special

Risol Club is designed to feel a bit warm, a bit artsy, and a little quirky instead of looking like a generic admin-heavy food app.

Some highlights:

- customer-facing branding uses the risol logo asset in `public/brand/logo-red-transparent.png`
- delivery is not auto-marked up with a flat fee
- customers are prompted to discuss delivery pricing fairly via WhatsApp
- uploaded payment proofs now render as real previews instead of raw `data:image/...` text

## Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Playwright

## Local Setup

Install dependencies:

```bash
npm install
```

Optional: copy environment variables first.

```bash
cp .env.example .env.local
```

Run the app in development:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Useful Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run test:e2e
npm run test:e2e:headed
```

## Seller Login

By default, the seller login uses these development credentials:

```text
Email: owner@risolclub.local
Password: risolclub123
```

You can override them with environment variables:

```bash
SELLER_EMAIL=you@example.com
SELLER_PASSWORD=your-password
SELLER_SESSION_SECRET=replace-this-in-production
```

On Vercel deployments, those environment variables should always be set so the app never falls back to development credentials.

## Data Storage Modes

This app now supports two storage modes:

- local development fallback using `data/store.json`
- production-ready persistence using PostgreSQL via `DATABASE_URL` (ideal for Neon)

If `DATABASE_URL` is present:

- the app persists the full `StoreData` payload inside PostgreSQL as `jsonb`
- this is the recommended setup for Vercel deployments
- the database is bootstrapped automatically on first use

If `DATABASE_URL` is not present:

- the app falls back to the local JSON file at `data/store.json`
- this is fine for local development, but not reliable for Vercel production usage

Payment proofs are still stored as embedded `data URL` strings inside the store payload for now, so previews work, but long-term object storage is still the better upgrade.

If you want to productionize uploads later, the next good step is moving payment proof files to object storage and keeping only references in the store.

## Database Setup For Neon

Create a Neon Postgres database, then set:

```bash
DATABASE_URL=postgres://USER:PASSWORD@HOST/DATABASE?sslmode=require
```

Useful commands:

```bash
npm run db:push
npm run db:studio
```

The current implementation uses Drizzle ORM with a lightweight JSONB-backed state table so the existing app can move to persistent storage safely without rewriting all features first.

## Vercel Checklist

For this repository, make sure the Vercel project is tracking the `master` branch for production if that is your repo default branch.

Set these environment variables in Vercel:

```bash
DATABASE_URL=postgres://USER:PASSWORD@HOST/DATABASE?sslmode=require
SELLER_EMAIL=owner@example.com
SELLER_PASSWORD=replace-with-a-strong-password
SELLER_SESSION_SECRET=replace-with-a-strong-random-secret
RESEND_API_KEY=re_xxxxx
ORDER_ALERT_EMAIL_TO=owner@example.com
ORDER_ALERT_EMAIL_FROM=Risol Club <onboarding@resend.dev>
```

## Seller Email Alerts

The app can now email the seller automatically whenever a new customer order is submitted from the storefront.

Current email flow:

- order is saved to the database first
- seller dashboard notification is created as usual
- seller email alert is attempted after the write succeeds
- if the email provider fails, the order still stays safely saved

Required environment variables:

```bash
RESEND_API_KEY=re_xxxxx
ORDER_ALERT_EMAIL_TO=owner@example.com
ORDER_ALERT_EMAIL_FROM=Risol Club <onboarding@resend.dev>
```

Notes:

- if `ORDER_ALERT_EMAIL_TO` is omitted, the app falls back to `SELLER_EMAIL`
- `onboarding@resend.dev` works for early testing
- for production sending, it is better to verify your own sending domain in Resend

## Delivery Flow

For delivery orders, the app intentionally does **not** auto-add a fixed shipping fee.

Instead:

- checkout shows an alert that delivery cost depends on distance
- the order total excludes delivery by default
- the order detail page gives the customer a WhatsApp button
- clicking it opens a message to the seller with the order number already filled in

Current WhatsApp target:

```text
085159134699
```

## Testing

This repo includes Playwright coverage for the public flow, including:

- storefront branding
- seller login path
- customer checkout flow

Run:

```bash
npm run test:e2e
```

## Project Shape

Main areas:

- `src/app` for routes and server actions
- `src/components` for shared UI pieces
- `src/lib` for auth, data store, types, reports, and seed data
- `public/brand` for logo assets
- `tests` for Playwright tests

## Notes

- `data/store.json` is treated as local runtime data and should not be committed as source of truth
- the customer UI and the seller UI intentionally have different visual tones
- seller paths live under `/seller`

## Future Nice-to-Haves

- move payment proof uploads to real object storage
- normalize the current JSONB app store into dedicated relational tables
- configurable seller WhatsApp from admin settings UI
- richer order notifications
- delivery zone or mileage-based pricing

## In Short

Risol Club Web is a small commerce app with handmade vibes:
soft branding, simple ordering, practical seller tools, and a friendlier delivery flow than the usual “flat fee and good luck.”
