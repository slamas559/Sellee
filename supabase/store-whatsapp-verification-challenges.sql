-- Allow store-specific WhatsApp verification challenges alongside the
-- existing registration and account-phone-change purposes.

alter table public.phone_verification_challenges
  drop constraint if exists phone_verification_challenges_purpose_check;

alter table public.phone_verification_challenges
  add constraint phone_verification_challenges_purpose_check
  check (purpose in ('register', 'account_phone_change', 'store_whatsapp_number'));
