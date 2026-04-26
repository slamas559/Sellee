-- Sellee WhatsApp Bot Sprint A migration
-- Run this once in Supabase SQL editor for existing projects.

create extension if not exists "pgcrypto";

create table if not exists public.whatsapp_customer_links (
  id uuid primary key default gen_random_uuid(),
  customer_phone text not null unique,
  user_id uuid references public.users(id) on delete set null,
  linked_at timestamptz not null default now(),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_whatsapp_customer_links_phone
  on public.whatsapp_customer_links (customer_phone);
create index if not exists idx_whatsapp_customer_links_user
  on public.whatsapp_customer_links (user_id);

create table if not exists public.customer_store_follows (
  id uuid primary key default gen_random_uuid(),
  customer_phone text not null,
  store_id uuid not null references public.stores(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (customer_phone, store_id)
);

create index if not exists idx_customer_store_follows_phone
  on public.customer_store_follows (customer_phone);
create index if not exists idx_customer_store_follows_store
  on public.customer_store_follows (store_id);

create table if not exists public.restock_alerts (
  id uuid primary key default gen_random_uuid(),
  customer_phone text not null,
  product_id uuid not null references public.products(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (customer_phone, product_id)
);

create index if not exists idx_restock_alerts_phone
  on public.restock_alerts (customer_phone);
create index if not exists idx_restock_alerts_store
  on public.restock_alerts (store_id, is_active);
create index if not exists idx_restock_alerts_product
  on public.restock_alerts (product_id);

create table if not exists public.whatsapp_broadcasts (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.users(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  message text not null,
  status text not null default 'queued' check (status in ('queued', 'scheduled', 'sending', 'sent', 'failed')),
  target_scope text not null default 'followers' check (target_scope in ('followers', 'customers', 'all')),
  scheduled_at timestamptz,
  sent_at timestamptz,
  sent_count integer not null default 0,
  failed_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_whatsapp_broadcasts_vendor
  on public.whatsapp_broadcasts (vendor_id, created_at desc);
create index if not exists idx_whatsapp_broadcasts_store
  on public.whatsapp_broadcasts (store_id, created_at desc);
create index if not exists idx_whatsapp_broadcasts_status
  on public.whatsapp_broadcasts (status, scheduled_at);

create table if not exists public.whatsapp_message_logs (
  id uuid primary key default gen_random_uuid(),
  direction text not null check (direction in ('inbound', 'outbound')),
  sender_phone text,
  recipient_phone text,
  message_text text,
  whatsapp_message_id text,
  command text,
  role text check (role in ('vendor', 'customer', 'system')),
  status text,
  provider_payload jsonb,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists idx_whatsapp_message_logs_direction_created
  on public.whatsapp_message_logs (direction, created_at desc);
create index if not exists idx_whatsapp_message_logs_sender
  on public.whatsapp_message_logs (sender_phone, created_at desc);
create index if not exists idx_whatsapp_message_logs_recipient
  on public.whatsapp_message_logs (recipient_phone, created_at desc);
create index if not exists idx_whatsapp_message_logs_command
  on public.whatsapp_message_logs (command, created_at desc);

create table if not exists public.bot_conversations (
  id uuid primary key default gen_random_uuid(),
  phone text not null unique,
  role text not null check (role in ('vendor', 'customer', 'unknown')),
  state text not null default 'idle',
  payload jsonb not null default '{}'::jsonb,
  last_message_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_bot_conversations_role_state
  on public.bot_conversations (role, state, updated_at desc);

-- RLS
alter table public.whatsapp_customer_links enable row level security;
alter table public.customer_store_follows enable row level security;
alter table public.restock_alerts enable row level security;
alter table public.whatsapp_broadcasts enable row level security;
alter table public.whatsapp_message_logs enable row level security;
alter table public.bot_conversations enable row level security;

-- Allow vendors to manage only their own broadcast rows.
drop policy if exists "whatsapp_broadcasts_vendor_all" on public.whatsapp_broadcasts;
create policy "whatsapp_broadcasts_vendor_all"
on public.whatsapp_broadcasts for all
using (vendor_id::text = auth.uid()::text)
with check (vendor_id::text = auth.uid()::text);

-- Keep message logs server-managed for now (Sprint B will add vendor-safe read projections).
drop policy if exists "whatsapp_message_logs_vendor_select" on public.whatsapp_message_logs;
create policy "whatsapp_message_logs_vendor_select"
on public.whatsapp_message_logs for select
using (
  false
);

-- Service-role/server-side flows currently own write operations for these tables.
