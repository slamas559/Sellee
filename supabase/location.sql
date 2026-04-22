-- Sellee location fields migration for existing projects.
-- Run this once in Supabase SQL editor.

alter table public.stores
  add column if not exists address_line1 text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists country text,
  add column if not exists latitude numeric(9,6),
  add column if not exists longitude numeric(9,6),
  add column if not exists location_source text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'stores_location_source_check'
      and conrelid = 'public.stores'::regclass
  ) then
    alter table public.stores
      add constraint stores_location_source_check
      check (location_source in ('manual', 'gps'));
  end if;
end
$$;

create index if not exists idx_stores_lat_lng on public.stores (latitude, longitude);
