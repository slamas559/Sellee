# Sellee WhatsApp Bot Task Board

Last updated: 2026-04-26

## Goal
Expand WhatsApp from vendor-only command utility into a dual-role assistant for:
- Vendors (operations, analytics, marketing)
- Customers (tracking, discovery, follow/alerts)

## Architecture Map (Current Repo)
- Webhook entry: `app/api/whatsapp/webhook/route.ts`
- Link API: `app/api/whatsapp/link/route.ts`
- Cloud send util: `lib/whatsapp-cloud.ts`
- Message helpers: `lib/whatsapp.ts`
- New bot modules (Sprint A):
  - `lib/whatsapp-bot/types.ts`
  - `lib/whatsapp-bot/parse.ts`
  - `lib/whatsapp-bot/repository.ts`
  - `lib/whatsapp-bot/vendor-commands.ts`
  - `lib/whatsapp-bot/customer-commands.ts`
  - `lib/whatsapp-bot/router.ts`

---

## Sprint A: Foundation Refactor + Data Layer

### Status
- [x] A1. Create bot task board with exact files/endpoints/migrations
- [x] A2. Refactor webhook into modular router/command layers
- [x] A3. Reuse vendor link-code generation from shared command service
- [x] A4. Add Sprint A migration for new WhatsApp bot tables
- [ ] A5. Run migration in Supabase SQL editor
- [ ] A6. Smoke-test webhook + debug path in deployed environment

### Deliverables (Sprint A)
1. **Migration**
   - `supabase/whatsapp-bot-sprint-a.sql`
   - Tables:
     - `whatsapp_customer_links`
     - `customer_store_follows`
     - `restock_alerts`
     - `whatsapp_broadcasts`
     - `whatsapp_message_logs`
     - `bot_conversations`

2. **Webhook Router Refactor**
   - `app/api/whatsapp/webhook/route.ts` now routes through:
     - `lib/whatsapp-bot/router.ts`
     - `lib/whatsapp-bot/vendor-commands.ts`
     - `lib/whatsapp-bot/customer-commands.ts`
     - `lib/whatsapp-bot/repository.ts`
     - `lib/whatsapp-bot/parse.ts`

3. **Link API Cleanup**
   - `app/api/whatsapp/link/route.ts` now calls shared function:
     - `generateLinkCodeForVendor(...)` in `lib/whatsapp-bot/vendor-commands.ts`

### Endpoints touched in Sprint A
- `GET/POST /api/whatsapp/webhook`
- `GET/POST /api/whatsapp/link`

### Behavior preserved in Sprint A
- Vendor commands continue to work:
  - `LINK <CODE>`
  - `LIST ORDERS`
  - `SALES TODAY`
  - `LOW STOCK`
  - `CONFIRM <ORDER_REF>`
  - `REJECT <ORDER_REF>`
- `?debug=1` webhook response still supported as before.

---

## Sprint B: Customer Bot MVP

### Status
- [x] B1. Add customer command routing in bot router
- [x] B2. Implement command handlers: `MY ORDERS`, `TRACK`, `CANCEL`, `FOLLOW`, `UNFOLLOW`, `MY FOLLOWS`, `HELP`
- [x] B3. Auto-create `whatsapp_customer_links` on first customer command
- [x] B4. Add dashboard visibility/analytics for customer command usage
- [x] B5. End-to-end WhatsApp tests with real sender numbers

### Planned Commands
- `HELP`
- `MY ORDERS`
- `TRACK <ORDER_REF>`
- `CANCEL <ORDER_REF>` (pending only)
- `FOLLOW <STORE>`
- `UNFOLLOW <STORE>`
- `MY FOLLOWS`

### Planned Files
- `lib/whatsapp-bot/customer-commands.ts` (expand)
- `lib/whatsapp-bot/router.ts` (intent routing updates)
- `app/api/whatsapp/webhook/route.ts` (minimal, mostly pass-through)

### Planned DB usage
- `whatsapp_customer_links`
- `customer_store_follows`
- `whatsapp_message_logs`
- `bot_conversations`

---

## Sprint C: Vendor Marketing + Notification Engine

### Status
- [x] C1. Vendor `BROADCAST <message>` command (followers target) + delivery counters
- [x] C2. Store restock alert fan-out to subscribed customers
- [x] C3. Scheduled broadcast execution
- [x] C4. Outbound WhatsApp log persistence

### Planned Features
- Vendor command:
  - `BROADCAST <message>`
- Notification fan-out:
  - Order status update -> customer WhatsApp
  - Restock alerts -> interested customers

### Planned Files
- `lib/whatsapp-bot/vendor-commands.ts`
- `lib/whatsapp-bot/repository.ts`
- `lib/whatsapp-cloud.ts` (batch handling helpers if needed)

### Planned DB usage
- `whatsapp_broadcasts`
- `restock_alerts`
- `whatsapp_message_logs`

---

## Sprint D: AI Intent Layer (Optional)

### Planned Features
- Natural language mapping for both vendor and customer prompts
- Keep strict command fallback always available

### Planned Files
- `lib/whatsapp-bot/intent.ts` (new)
- `lib/whatsapp-bot/router.ts` (intent-first then fallback)

---

## Rollout Checklist
- [ ] Run `supabase/whatsapp-bot-sprint-a.sql`
- [ ] Set/confirm env vars:
  - `WHATSAPP_TOKEN`
  - `WHATSAPP_PHONE_NUMBER_ID`
  - `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
  - `WHATSAPP_API_VERSION`
  - optional: `WHATSAPP_WEBHOOK_DEBUG=true`
- [ ] Test webhook verify GET
- [ ] Test vendor commands with real WhatsApp sender
- [ ] Test `debug=1` payload behavior
