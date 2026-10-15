-- lane: VIEW-LINK-2
-- chair-step: retires password-protected view links and puts the VIEW-LINK door shapes back
drop function if exists custom.set_view_share_link_protection(uuid, text, boolean, timestamptz);
delete from platform.client_callable_door where schema_name = 'custom' and function_name in ('set_view_share_link_protection', 'shared_view_read');
drop function if exists custom.shared_view_read(text, text, text);
drop function if exists custom.view_share_links(uuid);
create or replace function custom.view_share_links(p_view_id uuid)
 returns table(id uuid, token text, permission_level text, label text, expires_at timestamptz, use_count integer,
               last_used_at timestamptz, created_at timestamptz, created_by uuid, created_by_name text, made_by_me boolean)
 language plpgsql
 stable
 security definer
 set search_path to 'pg_catalog'
as $function$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or p_view_id is null then
    return;
  end if;
  -- the token is the credential: only a person who may make a link on this view lists them
  if iam.may_grant_as(v_uid, 'platform_saved_view', p_view_id, 'viewer'::public.permission_level, 'anyone', null) is not null then
    return;
  end if;
  return query
  select l.id, l.token, l.permission_level::text, l.label, l.expires_at, l.use_count, l.last_used_at, l.created_at, l.created_by,
         coalesce(nullif(u.raw_user_meta_data ->> 'display_name', ''), nullif(u.raw_user_meta_data ->> 'full_name', ''),
                  pg_catalog.split_part(u.email, '@', 1)),
         l.created_by = v_uid
    from platform.share_links l
    left join auth.users u on u.id = l.created_by
   where l.resource_type = 'platform_saved_view' and l.resource_id = p_view_id and l.is_active
     and (l.expires_at is null or l.expires_at > now())
   order by l.created_at desc, l.id;
end
$function$;

create or replace function custom.shared_view_read(p_token text)
 returns jsonb
 language plpgsql
 volatile
 security definer
 set search_path to 'pg_catalog'
as $function$
declare
  l      platform.share_links;
  v_view platform.saved_view;
  v_out  jsonb;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then
    return null;
  end if;
  select * into l from platform.share_links s where s.token = p_token and s.resource_type = 'platform_saved_view';
  if l.id is null or not l.is_active then
    return null;
  end if;
  if l.expires_at is not null and l.expires_at < now() then
    return null;
  end if;
  if l.max_uses is not null and l.use_count >= l.max_uses then
    return null;
  end if;
  if platform.share_target_in_closed_org(l.resource_type, l.resource_id) then
    return null;
  end if;
  select * into v_view from platform.saved_view sv where sv.id = l.resource_id and sv.deleted_at is null;
  if v_view.id is null then
    return null;
  end if;
  v_out := custom._saved_view_public_read(v_view.id, v_view.organization_id, null,
                                          'Shared by link. It shows only this view, and the owner can turn the link off at any time.');
  if v_out is not null then
    update platform.share_links set use_count = use_count + 1, last_used_at = now() where id = l.id;
  end if;
  return v_out;
end
$function$;

insert into platform.client_callable_door
  (schema_name, function_name, identity_args, identity_argtypes, reason, declared_by, non_client_lane, signed_in_callers, anonymous_callers, anonymous_purpose, argument_rules)
values ('custom', 'shared_view_read', 'p_token text', array['text'::regtype]::oid[], 'Reads one saved view for the shared-view page (VIEW-LINK).', 'viewlink_a_a_view_is_shared_by_link.sql',
  'server_only: called only by the /v/<token> route with the service role.', false, false, null, null) on conflict do nothing;
grant execute on function custom.view_share_links(uuid) to authenticated;
grant execute on function custom.shared_view_read(text) to service_role;

CREATE OR REPLACE FUNCTION public.resolve_share_token(p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_link record; v_resolved record; v_full jsonb; v_allowed text[]; v_row jsonb; v_newcount integer; v_shareable boolean; v_children jsonb;
BEGIN
  SELECT * INTO v_link FROM platform.share_links WHERE token = p_token;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'not_found', 'message', 'This link is invalid.'); END IF;
  IF NOT v_link.is_active THEN RETURN jsonb_build_object('success', false, 'error', 'revoked', 'message', 'This link has been turned off by its owner.'); END IF;
  IF v_link.expires_at IS NOT NULL AND v_link.expires_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'expired', 'message', 'This link has expired.'); END IF;
  BEGIN SELECT * INTO STRICT v_resolved FROM public.resolve_shareable_resource(v_link.resource_type);
  EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', false, 'error', 'unknown_type', 'message', 'This item type can no longer be shared.'); END;
  SELECT COALESCE(is_link_shareable, false), COALESCE(public_columns, '{}') INTO v_shareable, v_allowed
    FROM platform.shareable_resource_registry WHERE resource_type = v_link.resource_type;
  IF NOT v_shareable THEN RETURN jsonb_build_object('success', false, 'error', 'disabled', 'message', 'Public sharing is turned off for this item type.'); END IF;
  EXECUTE format('SELECT to_jsonb(t) FROM %I.%I t WHERE t.%I = $1', v_resolved.schema_name, v_resolved.table_name, v_resolved.id_column) INTO v_full USING v_link.resource_id;
  IF v_full IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'gone', 'message', 'The shared item no longer exists.'); END IF;
  IF (v_full ? 'deleted_at') AND (v_full->>'deleted_at') IS NOT NULL THEN RETURN jsonb_build_object('success', false, 'error', 'gone', 'message', 'The shared item was deleted.'); END IF;
  -- An archived organization is closed (access ladder T-33/T-40): no link opens anything inside it.
  IF platform.share_target_in_closed_org(v_link.resource_type, v_link.resource_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'closed', 'message', 'This link is closed while its organization is archived.'); END IF;
  v_allowed := array_append(v_allowed, v_resolved.id_column);
  SELECT COALESCE(jsonb_object_agg(e.key, e.value), '{}'::jsonb) INTO v_row FROM jsonb_each(v_full) e WHERE e.key = ANY(v_allowed);
  UPDATE platform.share_links SET use_count = use_count + 1, last_used_at = now()
   WHERE id = v_link.id AND (max_uses IS NULL OR use_count < max_uses) RETURNING use_count INTO v_newcount;
  IF v_newcount IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'exhausted', 'message', 'This link has reached its view limit.'); END IF;
  -- Children inherit their parent (access ladder T-19): only after every check above passed.
  v_children := platform.share_link_children(v_link.resource_type, v_link.resource_id);
  RETURN jsonb_build_object('success', true, 'resource_type', v_link.resource_type, 'resource_id', v_link.resource_id,
    'permission_level', v_link.permission_level, 'display_label', v_resolved.display_label,
    'url_path_template', v_resolved.url_path_template, 'resource', v_row, 'children', v_children);
END; $function$
;
drop table if exists platform.share_link_password;
