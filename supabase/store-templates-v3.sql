-- Sellee storefront templates v3: adds Streetwear, Beauty, Home & Living,
-- Noir Gallery and Lookbook. Run once in the Supabase SQL editor.
-- Safe to re-run: it drops and recreates the check constraint.

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
      'street_drop',
      'soft_beauty',
      'home_living',
      'noir_gallery',
      'lookbook',
      'classic',
      'bold',
      'minimal'
    )
  );
