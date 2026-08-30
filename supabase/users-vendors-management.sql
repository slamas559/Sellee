-- Phase 2: user & vendor management (suspend / reactivate / hard delete).

-- Bug fix from the foundation phase: deleted_users.role only allowed
-- 'vendor'/'customer', but the trigger below fires on every delete from
-- public.users regardless of role — including admin accounts revoked via
-- the Atlas admins page. Without this, revoking an admin fails outright
-- (the trigger's insert violates this constraint and rolls back the
-- delete). Extend it the same way users_role_check was extended.
--
-- Guarded with IF EXISTS: if you haven't run supabase/deleted-users.sql
-- against this database yet, that table doesn't exist and there's nothing
-- to fix here - this just skips it instead of failing the whole script.
-- Run supabase/deleted-users.sql separately if you want that protection
-- (it blocks a deleted account's email from silently recreating itself
-- via Google sign-in).
alter table if exists public.deleted_users drop constraint if exists deleted_users_role_check;
alter table if exists public.deleted_users add constraint deleted_users_role_check
  check (role in ('vendor', 'customer', 'admin'));

-- Soft-suspend state for vendor/customer accounts. Suspending a vendor
-- also hides their store (stores.is_active = false, already wired through
-- search/storefront/sitemap/WhatsApp bot); suspending a customer blocks
-- login and checkout. Admin accounts are never suspended — they're
-- revoked outright via the invite/revoke flow instead.
alter table public.users add column if not exists status text not null default 'active'
  check (status in ('active', 'suspended'));

create index if not exists idx_users_status on public.users (status);