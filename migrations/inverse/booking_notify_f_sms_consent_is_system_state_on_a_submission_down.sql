-- chair-step: the inverse of booking_notify_f — unregisters the anon_submission sms_consent metadata key (the consent door then cannot stamp it).
-- lane: BOOKING-NOTIFY
-- lock: custom

set local lock_timeout = '2s';
set local statement_timeout = '60s';

delete from platform.metadata_reserved_keys where table_token = 'anon_submission' and key = 'sms_consent';
