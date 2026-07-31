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
- `SEARCH <product>`
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

## Sprint D: AI Intent Layer

### Status
- [x] D-lite: Alias intent mapping, greeting intro, `SEARCH`, `MY STATUS`, `BROADCAST STATUS` (deterministic, no AI)
- [x] D1. AI fallback classifier added (`lib/whatsapp-bot/ai-intent.ts`)
- [ ] D2. Set `GROQ_API_KEY` / `OPENROUTER_API_KEY` in deployed environment
- [ ] D3. Smoke-test free-text messages against a live vendor + customer number
- [ ] D4. Decide whether to persist `ai_assisted` on `whatsapp_message_logs` (currently only logged via `logServerInfo`, not the DB)

### How it works
1. `inferCommand(body)` (deterministic, `lib/whatsapp-bot/parse.ts`) always runs first — free, instant, zero external calls.
2. Only when that returns `UNKNOWN` does `classifyIntentWithAI(body)` get called. It asks an LLM to translate the message into ONE line of Sellee's existing canonical command syntax (e.g. `"when will my order get to me abc123"` → `"TRACK abc123"`).
3. The AI's output is re-validated through the same `inferCommand()` parser before anything happens — if it doesn't map to a real, non-ambiguous command, the AI's answer is discarded and the bot falls back to the normal HELP message.
4. If the AI's answer is used, the bot first replies with a one-line transparency notice ("🤖 Got it — reading that as: ...") before executing, so the person can see exactly what was inferred.
5. Provider order: Groq first (fast + generous free tier), OpenRouter's `openrouter/free` auto-router as fallback if Groq is unset/unavailable/errors. Both are skipped gracefully if no API key is set — bot behaves exactly as before (Sprint A-C) with no AI configured.

### New/changed files
- `lib/whatsapp-bot/ai-intent.ts` (new) — provider calls, prompt, JSON validation (zod), re-validation against `inferCommand`
- `lib/whatsapp-bot/router.ts` — AI fallback wired in right after the deterministic `inferCommand` call, only on `UNKNOWN`
- `lib/whatsapp-bot/types.ts` — `WebhookDebugResult.ai_interpreted_as?: string` added for debug visibility

### Env vars (new, optional — feature no-ops if unset)
- `GROQ_API_KEY`
- `GROQ_MODEL` (defaults to `llama-3.3-70b-versatile`)
- `OPENROUTER_API_KEY`
- `OPENROUTER_MODEL` (defaults to `openrouter/free`, the auto-router — avoids hardcoding a `:free` model id that could get delisted)

### Safety notes
- The AI never executes anything directly — it only proposes a canonical command string, which must pass the same deterministic parser as any human-typed command.
- Because vendor-only commands (e.g. `BROADCAST`) still require `resolveVendorStoreByPhone(from)` to resolve a real store, a customer's message can never accidentally trigger a vendor action even if the AI mis-guesses.
- 6s timeout per provider call so a slow/rate-limited model can't hang the webhook response.
- **Confirm-before-broadcast guard**: when the AI (not the deterministic parser) infers `BROADCAST` or `SCHEDULE BROADCAST`, the message is NOT sent immediately. It's parked in `bot_conversations` (state `awaiting_broadcast_confirm`, reusing the same table pagination already uses) and the vendor must reply YES/NO within 10 minutes. Explicitly-typed `BROADCAST <message>` from a vendor is unaffected — that's already a deliberate action and still sends immediately. New file: `lib/whatsapp-bot/broadcast-confirm.ts`.

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
