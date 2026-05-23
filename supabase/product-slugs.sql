-- Add/rebuild SEO-friendly product slugs and enforce uniqueness per store.
-- Safe to re-run in Supabase SQL editor.

alter table public.products
  add column if not exists slug text;

-- Rebuild slugs for all existing products from product names.
with ranked as (
  select
    p.id,
    p.store_id,
    regexp_replace(lower(trim(coalesce(p.name, 'product'))), '[^a-z0-9]+', '-', 'g') as base_slug
  from public.products p
),
normalized as (
  select
    id,
    store_id,
    trim(both '-' from regexp_replace(base_slug, '-{2,}', '-', 'g')) as base_slug
  from ranked
),
numbered as (
  select
    id,
    store_id,
    case
      when base_slug = '' then 'product'
      else base_slug
    end as base_slug,
    row_number() over (
      partition by store_id, case when base_slug = '' then 'product' else base_slug end
      order by id
    ) as rn
  from normalized
)
update public.products p
set slug = case
  when n.rn = 1 then n.base_slug
  else n.base_slug || '-' || n.rn::text
end
from numbered n
where p.id = n.id;

alter table public.products
  alter column slug set not null;

create unique index if not exists idx_products_store_slug_unique
  on public.products (store_id, slug);

create index if not exists idx_products_slug
  on public.products (slug);
