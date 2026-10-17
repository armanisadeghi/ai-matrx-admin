-- Inverse of migrations/campaign/template_gaps_a_row_templates_install_with_a_template.sql:
-- the closed door list without row_template_declare.
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
               'query_table_homes', 'automation_declare']::text[]
$function$;
