-- Phase 2 of the vendor verification redesign: ID submissions.
--
-- Vendors upload a photo of a government ID plus a selfie. Files go to a
-- PRIVATE bucket (never public, never readable with the anon key) and are
-- reviewed by an admin in Phase 3. Each submission is a row; a rejected
-- vendor resubmits and gets a new row, so history is kept.
--
-- Run this in the Supabase SQL editor (after vendor-payout-accounts.sql).

-- Private bucket: images only, 5 MB each.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vendor-verification-docs',
  'vendor-verification-docs',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- No storage.objects policies are created for this bucket on purpose:
-- only the service-role client (API routes, admin console) can read or
-- write it.

create table if not exists public.vendor_verifications (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  vendor_id uuid not null references public.users(id) on delete cascade,
  type text not null check (type in ('id', 'bank')),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  -- ID submissions (type = 'id')
  document_type text
    check (document_type in ('nin', 'drivers_license', 'voters_card', 'intl_passport')),
  id_full_name text,
  document_path text,
  selfie_path text,
  -- Review outcome (filled by an admin in Phase 3)
  rejection_reason text,
  reviewer_id uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_vendor_verifications_store
  on public.vendor_verifications (store_id, type, created_at desc);

create index if not exists idx_vendor_verifications_queue
  on public.vendor_verifications (status, created_at)
  where status = 'pending';

-- At most one pending submission per store and type, so a vendor can't
-- flood the review queue.
create unique index if not exists uniq_vendor_verifications_one_pending
  on public.vendor_verifications (store_id, type)
  where status = 'pending';

alter table public.vendor_verifications enable row level security;
