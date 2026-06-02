-- Track deleted accounts so OAuth sign-ins cannot silently recreate them.
-- Run this once in Supabase SQL editor.

create extension if not exists "pgcrypto";

create table if not exists public.deleted_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  email text unique not null,
  full_name text,
  role text check (role in ('vendor', 'customer')),
  deleted_at timestamptz not null default now()
);

create index if not exists idx_deleted_users_email
  on public.deleted_users (email);

create or replace function public.remember_deleted_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.deleted_users (user_id, email, full_name, role, deleted_at)
  values (old.id, lower(old.email), old.full_name, old.role, now())
  on conflict (email) do update
    set user_id = excluded.user_id,
        full_name = excluded.full_name,
        role = excluded.role,
        deleted_at = excluded.deleted_at;

  return old;
end;
$$;

drop trigger if exists trg_remember_deleted_user on public.users;
create trigger trg_remember_deleted_user
before delete on public.users
for each row
execute function public.remember_deleted_user();

alter table public.deleted_users enable row level security;

drop policy if exists "deleted_users_no_client_access" on public.deleted_users;
create policy "deleted_users_no_client_access"
on public.deleted_users for all
using (false)
with check (false);
