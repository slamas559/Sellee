-- Sellee storefront templates v2 migration for existing projects.
-- Run this once in Supabase SQL editor.

alter table public.stores
  add column if not exists store_template text not null default 'grocery_promo',
  add column if not exists store_theme_preset text not null default 'emerald_fresh',
  add column if not exists storefront_config jsonb not null default '{}'::jsonb;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'stores_store_template_check'
      and conrelid = 'public.stores'::regclass
  ) then
    alter table public.stores
      drop constraint stores_store_template_check;
  end if;
end
$$;

alter table public.stores
  add constraint stores_store_template_check
  check (
    store_template in (
      'grocery_promo',
      'fashion_editorial',
      'lifestyle_showcase',
      'modern_grid',
      'classic',
      'bold',
      'minimal'
    )
  );

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'stores_store_theme_preset_check'
      and conrelid = 'public.stores'::regclass
  ) then
    alter table public.stores
      drop constraint stores_store_theme_preset_check;
  end if;
end
$$;

alter table public.stores
  add constraint stores_store_theme_preset_check
  check (
    store_theme_preset in (
      'emerald_fresh',
      'sunlit_market',
      'midnight_luxe',
      'ocean_breeze',
      'rose_boutique'
    )
  );

update public.stores
set store_template = case
  when store_template = 'classic' then 'grocery_promo'
  when store_template = 'bold' then 'modern_grid'
  when store_template = 'minimal' then 'fashion_editorial'
  else store_template
end
where store_template in ('classic', 'bold', 'minimal');

update public.stores
set storefront_config = coalesce(storefront_config, '{}'::jsonb) || jsonb_build_object(
  'hero_title', 'Discover trusted products near you',
  'hero_subtitle', 'Shop from local vendors with fast WhatsApp ordering and live availability.',
  'hero_cta_text', 'Shop now',
  'hero_image_url', '',
  'promo_text', 'Fresh picks this week',
  'secondary_banner_url', ''
)
where storefront_config is null
   or storefront_config = '{}'::jsonb;
