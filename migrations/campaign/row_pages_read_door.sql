-- lane: ROW-PAGE-READ
-- purpose: whoever may READ a row (View, Comment or Edit share) may resolve and open the row's page: the row_body association is invisible to a reader outside the row's organization (assoc_select = organization access), so the record page fell back to the old Notes body. content.row_page_for(row) answers at the row's own level; the page itself already follows (row_body conveys the row's level, capped at editor, through iam.has_access).
-- Plan: common-docs/systems/data/custom-data/projects/row-pages/PLAN.md (section 4, access: the page inherits the row's access, never wider)
-- New function only: nothing replaced, so no based-on lines.

create or replace function content.row_page_for(p_record_id uuid)
 returns uuid
 language plpgsql
 stable security definer
 set search_path to 'pg_catalog'
as $function$
declare
  v_page uuid;
begin
  -- The page of a row the caller may read. No session, NULL, or no read access on the row = null (no
  -- hint a row exists). The page id is returned only while the caller may also open that page at viewer,
  -- which is the row's level conveyed through row_body: this door adds no access, it only finds the edge
  -- the caller's row security hides from people outside the row's organization.
  if auth.uid() is null or p_record_id is null
     or not iam.has_access('record', p_record_id, 'viewer'::public.permission_level) then
    return null;
  end if;
  select a.target_id into v_page
    from platform.associations a
   where a.source_type = 'record' and a.source_id = p_record_id
     and a.target_type = 'document' and a.label = 'row_body' and a.deleted_at is null
   limit 1;
  if v_page is null or not iam.has_access('document', v_page, 'viewer'::public.permission_level) then
    return null;
  end if;
  return v_page;
end;
$function$;

insert into platform.client_callable_door
  (schema_name, function_name, identity_args, identity_argtypes, declared_by, reason, gate_predicate, anonymous_callers, signed_in_callers, argument_rules)
values ('content', 'row_page_for', 'p_record_id uuid',
  array['uuid'::regtype::oid], 'row_pages_read_door.sql',
  'p_record_id: answers only when iam.has_access(''record'', p_record_id, viewer) holds for the signed-in caller (no session, NULL or no access = null), and only with a page the caller may open (iam.has_access(''document'', page, viewer)). Returns the id of the row''s row_body page, nothing else. Definer only to read the edge across organizations; it adds no access.',
  null, false, true, '{"version": 1, "arguments": {"p_record_id": {"type": "uuid", "position": 1, "optional": false, "foreign": {"bounded": true, "note": "iam.has_access(''record'', arg1, viewer) must hold before the edge is read; otherwise null."}}}}'::jsonb);

grant execute on function content.row_page_for(uuid) to authenticated;
NOTIFY pgrst, 'reload schema';
