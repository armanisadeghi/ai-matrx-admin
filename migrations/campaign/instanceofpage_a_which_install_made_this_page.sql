-- additive: yes
-- guard: custom/system_enabled
-- GRANT NAMED: EXECUTE on custom.template_instance_of_page(uuid, uuid) to authenticated (declared in platform.client_callable_door in this file before the grant; it answers only the install row of a page the caller may read and writes nothing).
-- New door + one index; nothing replaced, so no based-on line.
-- lane: INSTANCE-OF-PAGE
-- lock: custom
-- Inverse: migrations/inverse/instanceofpage_a_which_install_made_this_page_down.sql
-- Spaces starts from a page: given a page, which template install made it. Answers the install row when the page is one of the pages the install
-- recorded (template_install_note kind 'page'); the first recorded page is the root. Otherwise null, the same for "not an install page", "page the
-- caller cannot read" and "page in another organization", so nothing leaks.
set local lock_timeout = '3s';

CREATE INDEX IF NOT EXISTS template_install_made_gin_idx ON custom.template_install USING gin (made jsonb_path_ops);

CREATE FUNCTION custom.template_instance_of_page(p_organization_id uuid, p_page_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_row jsonb;
begin
  if auth.uid() is null or p_organization_id is null or p_page_id is null then
    return null;
  end if;
  perform custom.assert_client_may_reach(p_organization_id, 'custom.template_instance_of_page');
  -- The page must be readable by the caller (the access ladder: iam.has_access at viewer) and live in this organization.
  if not iam.has_access('document', p_page_id, 'viewer'::public.permission_level)
     or not exists (select 1 from content.document d where d.id = p_page_id and d.organization_id = p_organization_id) then
    return null;
  end if;
  select jsonb_build_object(
           'id', i.id, 'catalogue_id', i.catalogue_id, 'status', i.state, 'template_version', i.template_version,
           'root_page_id', (select (m ->> 'id')::uuid from jsonb_array_elements(i.made) with ordinality as e(m, o)
                             where m ->> 'kind' = 'page' and nullif(m ->> 'id', '') is not null order by o limit 1))
    into v_row
    from custom.template_install i
   where i.organization_id = p_organization_id
     and i.made @> jsonb_build_array(jsonb_build_object('kind', 'page', 'id', p_page_id::text))
   order by (i.state = 'uninstalled'), i.started_at desc
   limit 1;
  return v_row;
end;
$function$;

INSERT INTO platform.client_callable_door
  (schema_name, function_name, identity_args, identity_argtypes, declared_by, reason, gate_predicate, anonymous_callers, signed_in_callers, argument_rules)
VALUES ('custom', 'template_instance_of_page', 'p_organization_id uuid, p_page_id uuid', ARRAY['uuid'::regtype, 'uuid'::regtype]::oid[],
  'instanceofpage_a_which_install_made_this_page.sql',
  'p_organization_id is checked through custom.assert_client_may_reach; p_page_id answers only while iam.has_access(''document'', p_page_id, viewer) holds for the signed-in caller and the page belongs to p_organization_id; anything else (no session, NULL, unreadable, foreign page, not an install page) answers null. Returns only the install row of that organization: id, catalogue_id, status, root_page_id, template_version.',
  null, false, true,
  '{"version": 1, "arguments": {"p_organization_id": {"type": "uuid", "position": 1, "optional": false, "foreign": {"bounded": true, "note": "custom.assert_client_may_reach gates the organization; the page must belong to it."}}, "p_page_id": {"type": "uuid", "position": 2, "optional": false, "foreign": {"bounded": true, "note": "iam.has_access(document, p_page_id, viewer) must hold before the install is read; otherwise null."}}}}'::jsonb);

GRANT EXECUTE ON FUNCTION custom.template_instance_of_page(uuid, uuid) TO authenticated;
