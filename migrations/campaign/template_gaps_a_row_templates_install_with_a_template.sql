-- additive: yes
--
-- It REPLACES one function body, `custom._template_doors()`, adding one door name (`row_template_declare`).
-- Inverse: migrations/inverse/template_gaps_a_row_templates_install_with_a_template_down.sql.
--
-- TEMPLATE-GAPS (a) — A TEMPLATE PACK CAN SHIP ROW TEMPLATES.
-- The Spaces lead rebuilt ~85 Notion templates; every tracker in Notion opens each row as a page that
-- starts from a template body ("New meeting" with Agenda / Notes / Action items). The store has had row
-- templates with a page body since ROW-PAGE-VIEWS (`custom.row_template_declare`, `row_template_default`,
-- read by the Spaces row page), but the install door's closed list did not name it, so a template could
-- not declare one. @ai-matrx/records plan.ts now compiles `tables[].rowTemplates` into
-- row_template_declare steps; this lets the door run them.
--
-- based-on: custom._template_doors() e58462daf379e9d46eff6747e4c0523c4faf8116d32085a7cc5c3728e749f7ff

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
               'query_table_homes', 'automation_declare', 'row_template_declare']::text[]
$function$;
