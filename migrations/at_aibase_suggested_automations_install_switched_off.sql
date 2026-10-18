-- based-on: custom._template_doors() e2f24df45b59a42b946d65e5dc71fdc622974fca16c2d4eddc024a8fdbf5d9ae
--
-- It REPLACES one function body, `custom._template_doors()`, adding one door name (`automation_set_enabled`).
-- Inverse: migrations/inverse/at_aibase_suggested_automations_install_switched_off_down.sql.
--
-- AT-AIBASE (Airtable parity "Create base with AI (Omni)") — A DESCRIBED BASE GETS SUGGESTED AUTOMATIONS, SWITCHED OFF.
-- The /make describe box now adds a starter dashboard and suggested automations to the base it builds
-- (@ai-matrx/records templates/describe/starter.ts, worked out from the designed tables, no model). A suggested
-- automation must be saved switched off (no blind automations), but custom.automation_declare saves a notify
-- reminder switched on. plan.ts follows each suggested automation's automation_declare with
-- custom.automation_set_enabled(false); this lets the install door run that step. The door is the store's own
-- (admin on the automation's table, organization-walled), unchanged.

CREATE OR REPLACE FUNCTION custom._template_doors()
 RETURNS text[]
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'pg_catalog'
AS $function$
  select array['person_kernel_id', 'file_kernel_id', 'record_write', 'record_write_many', 'record_change_many',
               'table_from_example', 'table_declare', 'field_declare', 'applicable_fields',
               'table_dimensions_set', 'view_declare', 'form_declare', 'anon_publish', 'booking_declare',
               'dashboard_declare', 'pipeline_declare', 'doc_template_save', 'action_declare',
               'subscription_declare', 'rule_declare', 'checklist_declare', 'portal_declare',
               'query_table_homes', 'automation_declare', 'row_template_declare', 'automation_set_enabled']::text[]
$function$;
