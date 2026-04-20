-- WhatsApp vendor linking tables
-- Run after supabase/schema.sql

create table if not exists public.whatsapp_vendor_links (
  vendor_id uuid primary key references public.users(id) on delete cascade,
  whatsapp_number text not null unique,
  linked_at timestamptz not null default now(),
  last_verified_at timestamptz not null default now(),
  is_active boolean not null default true
);

create table if not exists public.whatsapp_link_codes (
  vendor_id uuid primary key references public.users(id) on delete cascade,
  code text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  used_whatsapp_number text,
  created_at timestamptz not null default now()
);

create index if not exists idx_whatsapp_vendor_links_number
  on public.whatsapp_vendor_links (whatsapp_number);

create index if not exists idx_whatsapp_link_codes_code
  on public.whatsapp_link_codes (code);

create index if not exists idx_whatsapp_link_codes_expires_at
  on public.whatsapp_link_codes (expires_at);
