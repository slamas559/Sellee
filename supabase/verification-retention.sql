-- Retention for vendor ID submissions.
--
-- Goal: keep enough on file to identify a vendor who later does something
-- wrong, without keeping government ID photos forever.
--
--   * Approved ID    -> photos kept while the account exists.
--   * Rejected ID    -> photos deleted 30 days after the rejection.
--   * Account deleted -> the record SURVIVES (it used to be cascade-deleted
--                       with the user/store) and the photos are kept for a
--                       further 24 months, then deleted.
--   * Admin hold     -> an admin can freeze deletion for a specific record
--                       (investigation, dispute, legal request).
--
-- The row itself (name on ID, ID type, dates, reviewer, store/vendor
-- snapshot) is kept as an audit record even after the photos are purged.
-- The day counts live in lib/verification-constants.ts.
--
-- Run after vendor-verifications.sql.

-- ---- Records must outlive the account ------------------------------------

alter table public.vendor_verifications alter column store_id drop not null;
alter table public.vendor_verifications alter column vendor_id drop not null;

alter table public.vendor_verifications drop constraint if exists vendor_verifications_store_id_fkey;
alter table public.vendor_verifications
  add constraint vendor_verifications_store_id_fkey
  foreign key (store_id) references public.stores(id) on delete set null;

alter table public.vendor_verifications drop constraint if exists vendor_verifications_vendor_id_fkey;
alter table public.vendor_verifications
  add constraint vendor_verifications_vendor_id_fkey
  foreign key (vendor_id) references public.users(id) on delete set null;

-- Snapshots so a record stays identifiable after the store/user rows are gone.
alter table public.vendor_verifications add column if not exists store_name text;
alter table public.vendor_verifications add column if not exists vendor_email text;
alter table public.vendor_verifications add column if not exists vendor_full_name text;

update public.vendor_verifications vv
set store_name = s.name
from public.stores s
where vv.store_id = s.id and vv.store_name is null;

update public.vendor_verifications vv
set vendor_email = u.email,
    vendor_full_name = u.full_name
from public.users u
where vv.vendor_id = u.id and vv.vendor_email is null;

-- ---- Photo lifecycle ------------------------------------------------------

alter table public.vendor_verifications add column if not exists photos_purge_at timestamptz;
alter table public.vendor_verifications add column if not exists photos_purged_at timestamptz;
alter table public.vendor_verifications add column if not exists account_deleted_at timestamptz;
alter table public.vendor_verifications add column if not exists retention_hold boolean not null default false;
alter table public.vendor_verifications add column if not exists retention_hold_reason text;

-- Already-rejected submissions: photos go 30 days after the rejection.
update public.vendor_verifications
set photos_purge_at = reviewed_at + interval '30 days'
where status = 'rejected'
  and photos_purge_at is null
  and reviewed_at is not null;

create index if not exists idx_vendor_verifications_photos_due
  on public.vendor_verifications (photos_purge_at)
  where photos_purged_at is null and photos_purge_at is not null;
