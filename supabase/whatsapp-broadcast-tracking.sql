-- supabase/whatsapp-broadcast-tracking.sql
--
-- Extends the existing whatsapp_message_logs table (which already records
-- every outbound send with recipient, status, and error detail) rather than
-- creating a parallel table. What was missing: a way to tie a log row back
-- to a specific broadcast, and a classified failure reason instead of just
-- a raw error string. This is what the email-fallback feature needs — to
-- know exactly which recipients a given broadcast didn't reach, and
-- roughly why, so email can cover that specific gap.

alter table public.whatsapp_message_logs
  add column if not exists broadcast_id uuid references public.whatsapp_broadcasts(id) on delete set null;

alter table public.whatsapp_message_logs
  add column if not exists failure_reason text
  check (failure_reason in ('window_closed', 'undeliverable', 'error'));
  -- 'window_closed'  = Meta error 131047, more than 24h since customer last messaged
  -- 'undeliverable'  = Meta error 131026, number not reachable on WhatsApp
  -- 'error'          = anything else (rate limit, invalid number, network, etc.)

create index if not exists idx_whatsapp_message_logs_broadcast
  on public.whatsapp_message_logs (broadcast_id)
  where broadcast_id is not null;