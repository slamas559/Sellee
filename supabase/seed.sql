-- Optional Phase 1 seed data
-- Replace password_hash with a real bcrypt hash if creating login test user directly via SQL.

insert into public.users (email, phone, password_hash, role)
values
  ('vendor-demo@sellee.app', '+2348000000000', '$2b$12$R7B3GfIiSivGi99ZTSdK6u5NfP8Y7f5QY0uXf0FozMW9M9xj7q0XK', 'vendor')
on conflict (email) do nothing;

insert into public.stores (vendor_id, name, slug, whatsapp_number, theme_color, is_active)
select id, 'Demo Vendor Store', 'demo-vendor-store', '+2348000000000', '#0ea5e9', true
from public.users
where email = 'vendor-demo@sellee.app'
on conflict (slug) do nothing;
