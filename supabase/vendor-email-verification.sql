-- Vendor "Verified" badge is being split into two independent checks
-- that must BOTH pass: the store's WhatsApp number (existing,
-- whatsapp_verified_at) and the vendor account's email address (new,
-- users.email_verified_at). `stores.is_verified` is the single combined
-- flag the rest of the app should read for the public badge - it's a
-- generated column so it's always correct without extra app-side logic.

alter table public.users add column if not exists email_verified_at timestamptz;

create table if not exists public.email_verification_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_email_verification_tokens_user
  on public.email_verification_tokens (user_id);

-- Denormalized copy of the vendor's email verification status, kept in
-- sync via triggers below, so store reads never need to join `users`
-- (matches how whatsapp_verified_at already lives directly on stores).
alter table public.stores add column if not exists vendor_email_verified_at timestamptz;

alter table public.stores add column if not exists is_verified boolean
  generated always as (whatsapp_verified_at is not null and vendor_email_verified_at is not null) stored;

-- Keep every store belonging to a vendor in sync when their account
-- email gets verified (or, in principle, un-verified).
create or replace function public.sync_store_vendor_email_verified_at()
returns trigger as $$
begin
  if new.email_verified_at is distinct from old.email_verified_at then
    update public.stores
    set vendor_email_verified_at = new.email_verified_at
    where vendor_id = new.id;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_sync_store_vendor_email_verified_at on public.users;
create trigger trg_sync_store_vendor_email_verified_at
after update of email_verified_at on public.users
for each row execute function public.sync_store_vendor_email_verified_at();

-- Populate it on store creation too, in case the vendor's email was
-- already verified before they set up their store.
create or replace function public.set_store_vendor_email_verified_at()
returns trigger as $$
begin
  if new.vendor_email_verified_at is null then
    select email_verified_at into new.vendor_email_verified_at
    from public.users where id = new.vendor_id;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_set_store_vendor_email_verified_at on public.stores;
create trigger trg_set_store_vendor_email_verified_at
before insert on public.stores
for each row execute function public.set_store_vendor_email_verified_at();

-- One-time backfill for stores that already exist.
update public.stores s
set vendor_email_verified_at = u.email_verified_at
from public.users u
where s.vendor_id = u.id
  and u.email_verified_at is not null
  and s.vendor_email_verified_at is null;
