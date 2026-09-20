-- supabase/vendor-email-broadcasts.sql
--
-- IMPORTANT: this is deliberately named differently from the existing
-- public.email_broadcasts / public.email_broadcast_recipients tables in
-- supabase/email-broadcasts.sql. Those belong to the ADMIN broadcast system
-- (admin_id, segment-based targeting like 'all_vendors'/'niche') — a
-- completely different feature that already uses those exact table names.
-- Naming this "vendor_email_broadcasts" avoids what would otherwise be a
-- silent collision: a second `create table if not exists` with the same
-- name but different columns does nothing (table already exists), and
-- every insert here would then fail against the admin table's real schema.
--
-- Structurally this mirrors that admin system closely on purpose — same
-- queue-table + cron-batch-runner shape, for the same reason documented
-- there: sending a large audience synchronously in one request risks a
-- serverless timeout.

create table if not exists public.vendor_email_broadcasts (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.users(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  subject text not null,
  body text not null,
  target_scope text not null default 'followers' check (target_scope in ('followers', 'customers', 'all')),
  -- Set only when this broadcast was auto-generated as a fallback for a
  -- WhatsApp broadcast's unreached recipients, rather than sent as its own
  -- deliberate campaign. Makes "was this a fallback" a stored fact.
  source_whatsapp_broadcast_id uuid references public.whatsapp_broadcasts(id) on delete set null,
  recipient_count integer not null default 0,
  sent_count integer not null default 0,
  failed_count integer not null default 0,
  status text not null check (status in ('sending', 'completed')) default 'sending',
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.vendor_email_broadcast_recipients (
  id uuid primary key default gen_random_uuid(),
  broadcast_id uuid not null references public.vendor_email_broadcasts(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  email text not null,
  full_name text,
  status text not null check (status in ('pending', 'sent', 'failed')) default 'pending',
  error text,
  sent_at timestamptz
);

create index if not exists idx_vendor_email_broadcast_recipients_pending
  on public.vendor_email_broadcast_recipients (broadcast_id)
  where status = 'pending';

create index if not exists idx_vendor_email_broadcasts_vendor
  on public.vendor_email_broadcasts (vendor_id, created_at desc);

create index if not exists idx_vendor_email_broadcasts_source_whatsapp
  on public.vendor_email_broadcasts (source_whatsapp_broadcast_id)
  where source_whatsapp_broadcast_id is not null;