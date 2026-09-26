-- supabase/store-currency.sql
-- Currency is set once per vendor store (confirmed decision - not per
-- product). No conversion/exchange-rate math anywhere: a store's currency
-- is purely a display setting for however its products are priced.
-- Existing stores default to NGN so nothing changes for anyone until they
-- pick something else in Store settings.

alter table public.stores add column if not exists currency text not null default 'NGN';

alter table public.stores drop constraint if exists stores_currency_check;
alter table public.stores add constraint stores_currency_check
  check (currency in ('NGN', 'GHS', 'USD', 'GBP'));
