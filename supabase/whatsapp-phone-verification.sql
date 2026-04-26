-- WhatsApp-based phone verification for registration and account phone changes.
-- Run this once in Supabase SQL editor.

create extension if not exists "pgcrypto";

alter table public.users
  add column if not exists phone_verified_at timestamptz;

create table if not exists public.pending_registrations (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  password_hash text not null,
  role text not null default 'customer' check (role in ('vendor', 'customer')),
  target_phone text not null,
  status text not null default 'pending' check (status in ('pending', 'completed', 'expired', 'cancelled')),
  completed_user_id uuid references public.users(id) on delete set null,
  expires_at timestamptz not null default (now() + interval '10 minutes'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_pending_registrations_email_status
  on public.pending_registrations (email, status, created_at desc);
create index if not exists idx_pending_registrations_phone_status
  on public.pending_registrations (target_phone, status, created_at desc);

create table if not exists public.phone_verification_challenges (
  id uuid primary key default gen_random_uuid(),
  purpose text not null check (purpose in ('register', 'account_phone_change')),
  user_id uuid references public.users(id) on delete cascade,
  pending_registration_id uuid references public.pending_registrations(id) on delete cascade,
  target_phone text not null,
  verify_code text not null,
  otp_code text not null,
  status text not null default 'pending' check (status in ('pending', 'completed', 'expired', 'cancelled')),
  completed_via text check (completed_via in ('verify_command', 'otp')),
  expires_at timestamptz not null default (now() + interval '10 minutes'),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_phone_verification_challenges_verify_code
  on public.phone_verification_challenges (verify_code, status, expires_at);
create index if not exists idx_phone_verification_challenges_phone_status
  on public.phone_verification_challenges (target_phone, status, expires_at);
create index if not exists idx_phone_verification_challenges_user_status
  on public.phone_verification_challenges (user_id, status, created_at desc);

alter table public.pending_registrations enable row level security;
alter table public.phone_verification_challenges enable row level security;

drop policy if exists "pending_registrations_no_client_access" on public.pending_registrations;
create policy "pending_registrations_no_client_access"
on public.pending_registrations for all
using (false)
with check (false);

drop policy if exists "phone_verification_challenges_no_client_access" on public.phone_verification_challenges;
create policy "phone_verification_challenges_no_client_access"
on public.phone_verification_challenges for all
using (false)
with check (false);
