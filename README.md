# Sellee - Phase 1 + Phase 2 + Phase 3 (WhatsApp)

This repository now includes:

- Next.js App Router project with Tailwind
- `shadcn/ui` initialized
- NextAuth authentication (Credentials + Google OAuth)
- Supabase helpers and starter schema
- Protected dashboard via `proxy.ts`
- Phase 2 dashboard setup + products CRUD
- Public store pages with WhatsApp order button
- Phase 3 Week 6 order-attempt logging to `orders` + `order_items`
- Phase 3 Week 7 webhook scaffold for Meta WhatsApp Cloud API

## 1) Install

```bash
npm install
```

## 2) Configure Environment

Copy `.env.example` to `.env.local` and fill values:

```bash
cp .env.example .env.local
```

Required keys:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`

Optional for Google login:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

Required for Meta WhatsApp Cloud API:

- `WHATSAPP_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
- `WHATSAPP_API_VERSION` (default `v20.0`)
- `OBSERVABILITY_LOGS` (optional, default `true`)

## 3) Configure Supabase

Run SQL files in Supabase SQL editor in this order:

1. `supabase/schema.sql`
2. `supabase/location.sql` (for existing projects only)
3. `supabase/marketplace.sql` (for existing projects only)
4. `supabase/product-media-ratings.sql` (for existing projects only)
5. `supabase/store-templates.sql` (for existing projects only)
6. `supabase/storage.sql`
7. `supabase/whatsapp-linking.sql`
8. `supabase/seed.sql` (optional)

## 4) Run Development Server

```bash
npm run dev
```

## Main Routes

- `/register`
- `/login`
- `/dashboard`
- `/dashboard/products`
- `/dashboard/orders`
- `/dashboard/analytics`
- `/marketplace`
- `/store/[slug]`
- `/store/[slug]/[productId]`

## API Routes

- `GET /api/health`
- `GET /api/debug/store`
- `GET/POST /api/stores`
- `GET/POST /api/products`
- `GET /api/products/search`
- `PATCH/DELETE /api/products/:id`
- `POST /api/orders`
- `GET /api/vendors/nearby`
- `GET/POST /api/reviews/product`
- `GET/POST /api/reviews/vendor`
- `GET/POST /api/whatsapp/webhook`
- `GET/POST /api/whatsapp/link`

## Notes

- Register API has basic in-memory rate limiting.
- Product images upload to Supabase Storage bucket `product-images`.
- Storage policies enforce `auth.uid()/...` scoped writes.
- WhatsApp order button now logs a `pending_whatsapp` order before opening `wa.me`.
- Webhook supports vendor bot commands: `LIST ORDERS`, `SALES TODAY`, `LOW STOCK`, `CONFIRM <ORDER_REF>`, `REJECT <ORDER_REF>`.
- Vendors can now generate a link code in dashboard and connect their WhatsApp by sending `LINK <CODE>` to the business number.
- `GET /api/health` now checks both Supabase DB connectivity and WhatsApp config sanity.
- `POST /api/whatsapp/webhook?debug=1` debug response is available in development, or in production when `WHATSAPP_WEBHOOK_DEBUG=true`.
- Vendors can choose storefront template styles: `classic`, `bold`, `minimal`.

## WhatsApp Ops (Live)

Use this checklist whenever WhatsApp delivery or bot commands stop working.

1. Validate WABA -> phone number mapping with your live token:

```powershell
$TOKEN="YOUR_SYSTEM_USER_TOKEN"
$WABA_ID="YOUR_WABA_ID"

Invoke-RestMethod -Method Get `
  -Uri "https://graph.facebook.com/v20.0/$WABA_ID/phone_numbers?fields=id,display_phone_number,verified_name,status" `
  -Headers @{ Authorization = "Bearer $TOKEN" } | ConvertTo-Json -Depth 10
```

2. Set `WHATSAPP_PHONE_NUMBER_ID` to `data[0].id` from the response above.
3. Verify direct send before debugging webhook logic:

```powershell
$TOKEN="YOUR_SYSTEM_USER_TOKEN"
$PHONE_NUMBER_ID="YOUR_PHONE_NUMBER_ID"
$TO="234XXXXXXXXXX"

$body = @{
  messaging_product = "whatsapp"
  to = $TO
  type = "text"
  text = @{ body = "Sellee live send test" }
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Method Post `
  -Uri "https://graph.facebook.com/v20.0/$PHONE_NUMBER_ID/messages" `
  -Headers @{ Authorization = "Bearer $TOKEN" } `
  -ContentType "application/json" `
  -Body $body | ConvertTo-Json -Depth 10
```

4. Sync exact same working values to Vercel env:
   - `WHATSAPP_TOKEN`
   - `WHATSAPP_PHONE_NUMBER_ID`
   - `WHATSAPP_API_VERSION=v20.0`
   - optional debugging: `WHATSAPP_WEBHOOK_DEBUG=true`
5. Redeploy and test from WhatsApp chat using commands:
   - `LIST ORDERS`
   - `SALES TODAY`
   - `LOW STOCK`
   - `CONFIRM <ORDER_REF>`
   - `REJECT <ORDER_REF>`
6. Check Vercel logs for:
   - `whatsapp.webhook.message.ok`
   - `whatsapp.send.success`
   - `whatsapp.send.error`

Important:
- Use two different WhatsApp accounts for testing.
- The business number cannot chat with itself.
- Keep tokens out of git, screenshots, and chat logs.

