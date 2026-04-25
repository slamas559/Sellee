-- Sellee user profile migration for existing projects.
-- Run this once in Supabase SQL editor.

alter table public.users
  add column if not exists full_name text;
