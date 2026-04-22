-- Sellee store templates migration for existing projects.
-- Run this once in Supabase SQL editor.

alter table public.stores
  add column if not exists store_template text not null default 'classic';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'stores_store_template_check'
      and conrelid = 'public.stores'::regclass
  ) then
    alter table public.stores
      add constraint stores_store_template_check
      check (store_template in ('classic', 'bold', 'minimal'));
  end if;
end
$$;
