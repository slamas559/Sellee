-- Vendor verification will move to being store-specific (the WhatsApp
-- number that actually receives orders), independent of the customer
-- account's phone. This column will be populated by a future phase
-- (vendor onboarding verification flow) — this migration only adds
-- the column. Do not backfill or set it from users.phone_verified_at;
-- vendor verification is being redesigned to be its own explicit step.

alter table public.stores add column if not exists whatsapp_verified_at timestamptz;
