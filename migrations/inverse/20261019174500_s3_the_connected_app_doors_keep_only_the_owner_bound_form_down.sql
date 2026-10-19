-- chair-step: undo FIX-S3: recreate the three pre-ADV-3 connected-app door forms (each hands the owner-bound door whoever owns the automation now) and their client_callable_door rows, byte-equal to 20261019051500
-- inverse of 20261019174500_s3_the_connected_app_doors_keep_only_the_owner_bound_form.sql
-- lane: FIX-S3
-- lock: custom,platform
-- Run this BEFORE migrations/inverse/20261019051500_adv3_owner_bound_app_doors_dig_markers_formula_rounds_down.sql: its
-- based-on lines (a2a68086…, f2719535…, 09fe486b…) are the bodies recreated here, so it refuses until this has run.

set local lock_timeout = '2s';
set local statement_timeout = '60s';

CREATE FUNCTION custom.automation_app_event(p_automation_id uuid, p_items jsonb, p_cursor jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
begin
  -- ADV-3 N1: the owner-bound door is custom.automation_app_event(…, p_expected_owner); this form hands it whoever
  -- owns the automation now (a server deployed before ADV-3). One body, one rule.
  return custom.automation_app_event(p_automation_id, p_items, p_cursor,
                                     custom.automation_app_watch(p_automation_id) ->> 'owner');
end
$function$;

CREATE FUNCTION custom.automation_app_note(p_automation_id uuid, p_says text, p_cursor jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
begin
  -- ADV-3 N1: see custom.automation_app_note(…, p_expected_owner); this form hands it whoever owns it now.
  return custom.automation_app_note(p_automation_id, p_says, p_cursor,
                                    custom.automation_app_watch(p_automation_id) ->> 'owner');
end
$function$;

CREATE FUNCTION custom.automation_app_stop(p_automation_id uuid, p_says text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
begin
  -- ADV-3 N1: see custom.automation_app_stop(…, p_expected_owner); this form hands it whoever owns it now.
  return custom.automation_app_stop(p_automation_id, p_says, custom.automation_app_watch(p_automation_id) ->> 'owner');
end
$function$;

REVOKE ALL ON FUNCTION custom.automation_app_event(uuid, jsonb, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION custom.automation_app_note(uuid, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION custom.automation_app_stop(uuid, text) FROM PUBLIC, anon, authenticated;

INSERT INTO platform.client_callable_door (schema_name, function_name, identity_args, identity_argtypes, reason, declared_by, non_client_lane, signed_in_callers, anonymous_callers) VALUES
 ('custom', 'automation_app_event', 'p_automation_id uuid, p_items jsonb, p_cursor jsonb', ARRAY['uuid'::regtype, 'jsonb'::regtype, 'jsonb'::regtype]::oid[],
  'p_automation_id is checked through custom.automation_app_watch (trusted backend only) and must carry a connected-app trigger; runs act as the automation''s own creator.',
  '20261017120000_w2e_a_connected_app_triggers_and_github_issue_step.sql',
  'server_only: aidream''s connected-app trigger check starts one run per new Gmail / Calendar / Slack item; a browser never calls it.', false, false),
 ('custom', 'automation_app_note', 'p_automation_id uuid, p_says text, p_cursor jsonb', ARRAY['uuid'::regtype, 'text'::regtype, 'jsonb'::regtype]::oid[],
  'p_automation_id is checked through custom.automation_app_watch (trusted backend only, unknown id answers ok=false).',
  '20261017120000_w2e_a_connected_app_triggers_and_github_issue_step.sql',
  'server_only: aidream''s connected-app trigger check writes why it could not read the owner''s account; a browser never calls it.', false, false),
 ('custom', 'automation_app_stop', 'p_automation_id uuid, p_says text', ARRAY['uuid'::regtype, 'text'::regtype]::oid[],
  'p_automation_id is checked through custom.automation_app_watch (trusted backend only, unknown id answers ok=false).',
  '20261018150000_adv_fix_a_one_email_one_run_owner_bound_recorder_never_raises.sql',
  'server_only: aidream''s connected-app trigger check switches an automation off when its owner''s connection is gone; a browser never calls it.', false, false);
