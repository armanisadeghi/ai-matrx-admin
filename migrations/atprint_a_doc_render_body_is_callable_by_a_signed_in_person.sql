-- why: AT-WALK-E4 (Print with layout, live): "Print with layout…" drew every page as "You do not have access to this." for admin on admin's own table.
--   The client door docRenderBody calls custom.doc_render_body(org, template, record), but that function was never granted to authenticated
--   ("permission denied for function doc_render_body", sqlstate 42501), so every layout print and every layout preview was refused.
--   The function is SECURITY INVOKER and reads only custom.record, so row security still decides what the caller sees (a record they cannot read renders nothing).
-- Proof: scripts/campaign-tests/atprint_doc_render_body_grant.sql. Inverse: migrations/inverse/atprint_a_doc_render_body_is_callable_by_a_signed_in_person_down.sql

-- The closed `custom` schema takes the grant back unless a door row names the signed-in caller (database FEATURE.md §6d-4).
insert into platform.client_callable_door (schema_name, function_name, identity_args, identity_argtypes, reason,
  declared_by, non_client_lane, signed_in_callers, anonymous_callers)
select n.nspname, p.proname, pg_catalog.pg_get_function_identity_arguments(p.oid), array(select unnest(p.proargtypes))::oid[],
       'Called by the signed-in records client (docRenderBody: the Print with layout dialog and the layout preview in @ai-matrx/records-ui). SECURITY INVOKER: it reads template and record only through row security, so a record the caller cannot read renders nothing; the organization argument is the caller''s active organization.',
       'atprint_a_doc_render_body_is_callable_by_a_signed_in_person', null, true, false
  from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'custom' and p.proname = 'doc_render_body'
   and not exists (select 1 from platform.client_callable_door d where d.schema_name = n.nspname and d.function_name = p.proname
                     and d.identity_args = pg_catalog.pg_get_function_identity_arguments(p.oid));
grant execute on function custom.doc_render_body(uuid, uuid, uuid) to authenticated, service_role;
