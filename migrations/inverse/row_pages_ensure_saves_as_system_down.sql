-- Inverse of row_pages_ensure_saves_as_system.sql: the body as it was.
CREATE OR REPLACE FUNCTION content.row_page_ensure(p_organization_id uuid, p_record_id uuid, p_title text, p_snapshot jsonb)
 RETURNS TABLE(space_id uuid, created boolean)
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_have uuid;
  v_made uuid;
begin
  -- A row's page: the one it has, untouched; else a new Space made from p_snapshot (the row's notes and
  -- its table's default template, built by the caller) and linked as the row's body. SECURITY INVOKER:
  -- the reads and writes run under the caller's row security and the existing doors
  -- (content.space_upsert_external -> space_save, assoc_link). It never overwrites a page.
  if (select auth.uid()) is null then
    raise exception using errcode = '42501', message = 'Sign in to open this page.';
  end if;
  if p_organization_id is null or p_record_id is null then
    raise exception using errcode = '23502', message = 'Name the row and its organization.';
  end if;
  if not iam.has_access('record', p_record_id, 'editor'::public.permission_level) then
    raise exception using errcode = '42501', message = 'Only someone who can edit this row can start its page.';
  end if;
  -- Two people opening a new row at once get the same page.
  perform pg_advisory_xact_lock(hashtextextended('row_page:' || p_record_id::text, 0));
  select a.target_id into v_have
    from platform.associations a
   where a.source_type = 'record' and a.source_id = p_record_id
     and a.target_type = 'document' and a.label = 'row_body' and a.deleted_at is null;
  if v_have is not null then
    return query select v_have, false;
    return;
  end if;
  select u.space_id into v_made
    from content.space_upsert_external(
      p_organization_id, 'row:' || p_record_id::text || ':' || gen_random_uuid()::text, coalesce(p_title, ''),
      null, null, null, null, null, coalesce(p_snapshot, '{"v": 1, "blocks": []}'::jsonb), p_record_id, 'row_page') u;
  return query select v_made, true;
end;
$function$;

NOTIFY pgrst, 'reload schema';
