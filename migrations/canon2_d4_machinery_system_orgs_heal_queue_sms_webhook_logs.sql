-- Canonicalization wave 2, lane D, items 4 + 5 (Arman 2026-10-22: internal server-only plumbing
-- tables are classed as machinery). Registry rows only — no policy, grant or column changes, so
-- every reader and writer sees exactly what it saw before.
--
-- iam.system_orgs: the list of system organizations every access rule consults. anon and
--   authenticated already read it unconditionally (system_orgs_select / _select_anon) and 4 anon
--   policies + 26 invoker functions read it as the caller, so that read is DECLARED (data_class
--   public) and kept. Its remaining finding (machinery_no_client_grant: anon SELECT) cannot clear
--   without breaking those anon reads — left as is.
-- platform.mtx_media_heal_queue: the media heal worker's queue; authenticated already reads it
--   unconditionally (mtx_media_heal_read) — declared, kept.
-- communication.sms_webhook_logs: raw provider (Twilio) webhook receipts, written and claimed by
--   the server (service role) before any organization is known; no client policy admits a client
--   role (platform_admin_read stays). Classed as machinery, no longer a component of sms_message
--   (it never had the composition edge; message_id is set only after a receipt is matched).
set lock_timeout = '2s';

do $$ begin
  if exists (select 1 from communication.sms_webhook_logs where custom_fields is not null and custom_fields <> '{}'::jsonb) then
    raise exception 'sms_webhook_logs carries custom field values; custom fields cannot be switched off';
  end if;
end $$;

update platform.entity_types
   set audit_class = 'machinery', type = 'system',
       audit_class_reason = 'machinery: the system-organization list every access rule and policy consults (global_readable); written only by platform migrations, never a record a person works on',
       data_class = 'public',
       data_class_reason = 'Read unconditionally by anon and authenticated today (system_orgs_select, system_orgs_select_anon): access rules evaluated as the caller read it. Declared, not widened.'
 where token = 'system_orgs';

update platform.entity_types
   set audit_class = 'machinery', type = 'system',
       audit_class_reason = 'machinery: the media heal worker''s queue of signed-URL references to re-derive; written by the server (service role), read by the heal worker and its admin view',
       data_class = 'public',
       data_class_reason = 'Read unconditionally by authenticated today (mtx_media_heal_read); holds queue state, no record content. Declared, not widened.'
 where token = 'mtx_media_heal_queue';

update platform.entity_types
   set audit_class = 'machinery', type = 'system', rls_variant = 'system',
       is_component = false, custom_fields_enabled = false,
       audit_class_reason = 'machinery: raw SMS provider webhook receipts (Twilio), written, claimed and redriven by the server before any organization is known; no client role is admitted'
 where token = 'sms_webhook_logs';
