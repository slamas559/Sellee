-- Supabase Storage setup for Sellee
-- Run this after schema.sql in Supabase SQL editor.

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = excluded.public;

insert into storage.buckets (id, name, public)
values ('store-assets', 'store-assets', true)
on conflict (id) do update set public = excluded.public;

-- Public read access for product images
drop policy if exists "product_images_public_read" on storage.objects;
create policy "product_images_public_read"
on storage.objects
for select
using (bucket_id = 'product-images');

-- Strict authenticated writes: vendor uploads must be under folder auth.uid()/*
drop policy if exists "product_images_auth_insert" on storage.objects;
create policy "product_images_auth_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'product-images'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists "product_images_auth_update" on storage.objects;
create policy "product_images_auth_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'product-images'
  and split_part(name, '/', 1) = auth.uid()::text
)
with check (
  bucket_id = 'product-images'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists "product_images_auth_delete" on storage.objects;
create policy "product_images_auth_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'product-images'
  and split_part(name, '/', 1) = auth.uid()::text
);

-- Public read + authenticated writes for storefront assets
drop policy if exists "store_assets_public_read" on storage.objects;
create policy "store_assets_public_read"
on storage.objects
for select
using (bucket_id = 'store-assets');

drop policy if exists "store_assets_auth_insert" on storage.objects;
create policy "store_assets_auth_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'store-assets'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists "store_assets_auth_update" on storage.objects;
create policy "store_assets_auth_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'store-assets'
  and split_part(name, '/', 1) = auth.uid()::text
)
with check (
  bucket_id = 'store-assets'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists "store_assets_auth_delete" on storage.objects;
create policy "store_assets_auth_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'store-assets'
  and split_part(name, '/', 1) = auth.uid()::text
);
