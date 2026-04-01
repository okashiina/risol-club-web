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

## How Data Is Stored Right Now

This project currently uses a local JSON store at `data/store.json`.

That means:

- app data is persisted locally on disk
- uploaded payment proofs are currently stored as `data URL` base64 strings
- previews work nicely in the UI, but this is not yet an external file storage setup like S3, Cloudinary, or Vercel Blob

If you want to productionize uploads later, the next good step is moving payment proof files to object storage and keeping only references in the store.

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
- configurable seller WhatsApp from admin settings UI
- richer order notifications
- delivery zone or mileage-based pricing

## In Short

Risol Club Web is a small commerce app with handmade vibes:
soft branding, simple ordering, practical seller tools, and a friendlier delivery flow than the usual “flat fee and good luck.”
