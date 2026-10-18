-- lane: BOOKING-NOTIFY
-- lock: custom
--
-- BOOKING-NOTIFY part f — custom.booking_sms_consent stamps the booker's recorded text consent
-- ({phone, text_shown, at, origin}) on custom.anon_submission.metadata. That is system state written
-- only by that SECURITY DEFINER door, never user content (DD-060), so the key is registered.
set local lock_timeout = '2s';
set local statement_timeout = '60s';

insert into platform.metadata_reserved_keys (table_token, key, reason)
values ('anon_submission', 'sms_consent', 'System state: custom.booking_sms_consent stamps the booker''s recorded consent to text reminders {phone, text_shown, at, origin} on the booking''s submission; written only by that door.')
on conflict do nothing;
