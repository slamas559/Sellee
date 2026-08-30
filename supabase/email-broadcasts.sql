-- Phase 4: admin email composer, sending to a segment of vendors/customers.
--
-- Modeled on the existing WhatsApp broadcast pattern (queue table + a cron
-- runner that processes a batch at a time) rather than sending everything
-- synchronously in one request, which risks a serverless timeout once an
-- audience gets large.

create table if not exists public.email_broadcasts (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.users(id) on delete set null,
  segment text not null check (segment in ('all_customers', 'all_vendors', 'verified_vendors', 'niche')),
  niche_id uuid references public.niches(id) on delete set null,
  subject text not null,
  body text not null,
  recipient_count integer not null default 0,
  sent_count integer not null default 0,
  failed_count integer not null default 0,
  status text not null check (status in ('sending', 'completed')) default 'sending',
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.email_broadcast_recipients (
  id uuid primary key default gen_random_uuid(),
  broadcast_id uuid not null references public.email_broadcasts(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  email text not null,
  full_name text,
  status text not null check (status in ('pending', 'sent', 'failed')) default 'pending',
  error text,
  sent_at timestamptz
);

create index if not exists idx_email_broadcast_recipients_pending
  on public.email_broadcast_recipients (broadcast_id)
  where status = 'pending';

create index if not exists idx_email_broadcasts_status on public.email_broadcasts (status);