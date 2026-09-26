-- supabase/staff-accounts.sql
-- Vendor staff accounts: a staff member is a row in public.users with
-- role='staff', linked back to the vendor who added them via
-- parent_vendor_id. They log in through the exact same NextAuth Credentials
-- flow as a vendor - what differs is which data they can see/act on
-- (resolved via parent_vendor_id, not their own id) and which dashboard
-- sections they can reach (staff_permissions below).
--
-- Follows the same "extend users_role_check" pattern used for admin in
-- supabase/admin-console.sql.

alter table public.users drop constraint if exists users_role_check;
alter table public.users add constraint users_role_check
  check (role in ('vendor', 'customer', 'admin', 'staff'));

alter table public.users add column if not exists parent_vendor_id uuid
  references public.users(id) on delete cascade;

-- Exactly staff rows have a parent_vendor_id set; nobody else does.
alter table public.users drop constraint if exists users_staff_parent_check;
alter table public.users add constraint users_staff_parent_check
  check ((role = 'staff') = (parent_vendor_id is not null));

create index if not exists idx_users_parent_vendor_id
  on public.users (parent_vendor_id)
  where parent_vendor_id is not null;

-- Same fix as admin-console.sql applied for 'admin': the deleted_users
-- trigger fires on every delete from public.users regardless of role, so
-- deleting a staff account would fail without this. Guarded with IF EXISTS
-- the same way, in case deleted-users.sql hasn't been run yet.
alter table if exists public.deleted_users drop constraint if exists deleted_users_role_check;
alter table if exists public.deleted_users add constraint deleted_users_role_check
  check (role in ('vendor', 'customer', 'admin', 'staff'));

-- Per-staff permission checkboxes. One row per (staff, area) - absence of a
-- row for a given permission_key is treated as false by the app, same as
-- plan_features treats a missing row as "not enabled" rather than seeding
-- every key explicitly.
create table if not exists public.staff_permissions (
  id uuid primary key default gen_random_uuid(),
  staff_user_id uuid not null references public.users(id) on delete cascade,
  permission_key text not null check (
    permission_key in ('products', 'orders', 'broadcasts', 'analytics', 'store_settings')
  ),
  enabled boolean not null default false,
  unique (staff_user_id, permission_key)
);

create index if not exists idx_staff_permissions_staff_user_id
  on public.staff_permissions (staff_user_id);
