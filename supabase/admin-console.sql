-- Foundation for the Atlas admin console: a dedicated 'admin' role,
-- invite-based admin account creation (no public signup for this role),
-- and an audit trail for admin actions.

-- Allow 'admin' alongside the existing 'vendor' / 'customer' roles.
-- The constraint name matches Postgres's default naming for an unnamed
-- inline check on the `role` column of `public.users`.
alter table public.users drop constraint if exists users_role_check;
alter table public.users add constraint users_role_check
  check (role in ('vendor', 'customer', 'admin'));

-- Pending invitations to become an admin. An invite is created by an
-- existing admin and consumed exactly once by the invitee, who does not
-- have an account yet (or may already have a vendor/customer account tied
-- to the same email - accepting promotes that account to role='admin').
create table if not exists public.admin_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  token_hash text not null unique,
  invited_by uuid not null references public.users(id) on delete cascade,
  status text not null check (status in ('pending', 'accepted', 'revoked')) default 'pending',
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_invites_email on public.admin_invites (email);
create index if not exists idx_admin_invites_status on public.admin_invites (status);

-- One row per meaningful admin action. Written by the app on every
-- destructive or sensitive mutation - not enforced by triggers, since the
-- set of admin actions will keep growing as new modules ship.
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.users(id) on delete set null,
  action text not null,
  target_type text,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_log_created_at on public.audit_log (created_at desc);
create index if not exists idx_audit_log_admin on public.audit_log (admin_id);
