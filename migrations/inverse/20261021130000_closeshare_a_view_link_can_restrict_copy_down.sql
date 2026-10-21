-- chair-step: inverse of 20261021130000_closeshare_a_view_link_can_restrict_copy — restores custom.shared_view_read without restrict_copy, recreates custom.view_share_links(uuid) without the restrict_copy column, and drops the door custom.set_view_share_link_copy(uuid, boolean) with its door row. The metadata key restrict_copy on platform.share_links rows is left (nothing reads it after this).
-- lane: close-share
-- lock: custom,platform

delete from platform.client_callable_door where schema_name = 'custom' and function_name = 'set_view_share_link_copy';
drop function if exists custom.set_view_share_link_copy(uuid, boolean);

CREATE OR REPLACE FUNCTION custom.shared_view_read(p_token text, p_password text DEFAULT NULL::text, p_unlock text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  l      platform.share_links;
  v_view platform.saved_view;
  v_out  jsonb;
  v_hash text;
  v_fp   text;
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

  -- THE PASSWORD, asked here and nowhere else: a protected link opens for the right password or for the fingerprint
  -- of the right password (what the server's signed cookie carries). Anything else gets `locked` and not one word of the view.
  select p.password_hash into v_hash from platform.share_link_password p where p.link_id = l.id;
  if v_hash is not null then
    v_fp := pg_catalog.encode(extensions.digest(v_hash, 'sha256'), 'hex');
    if p_unlock is not null and p_unlock = v_fp then
      null;
    elsif p_password is not null and p_password <> '' and extensions.crypt(p_password, v_hash) = v_hash then
      null;
    else
      return jsonb_build_object('state', 'locked', 'wrong', coalesce(p_password, '') <> '');
    end if;
  end if;

  v_out := custom._saved_view_public_read(v_view.id, v_view.organization_id, null,
                                          'Shared by link. It shows only this view, and the owner can turn the link off at any time.');
  if v_out is not null then
    update platform.share_links set use_count = use_count + 1, last_used_at = now() where id = l.id;
    if v_fp is not null then
      v_out := v_out || jsonb_build_object('unlock', v_fp);
    end if;
  end if;
  return v_out;
end
$function$;

drop function if exists custom.view_share_links(uuid);
CREATE OR REPLACE FUNCTION custom.view_share_links(p_view_id uuid)
 RETURNS TABLE(id uuid, token text, permission_level text, label text, expires_at timestamp with time zone, use_count integer, last_used_at timestamp with time zone, created_at timestamp with time zone, created_by uuid, created_by_name text, made_by_me boolean, has_password boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or p_view_id is null then
    return;
  end if;
  if iam.may_grant_as(v_uid, 'platform_saved_view', p_view_id, 'viewer'::public.permission_level, 'anyone', null) is not null then
    return;
  end if;
  return query
  select l.id, l.token, l.permission_level::text, l.label, l.expires_at, l.use_count, l.last_used_at, l.created_at, l.created_by,
         coalesce(nullif(u.raw_user_meta_data ->> 'display_name', ''), nullif(u.raw_user_meta_data ->> 'full_name', ''),
                  pg_catalog.split_part(u.email, '@', 1)),
         l.created_by = v_uid,
         exists (select 1 from platform.share_link_password p where p.link_id = l.id)
    from platform.share_links l
    left join auth.users u on u.id = l.created_by
   where l.resource_type = 'platform_saved_view' and l.resource_id = p_view_id and l.is_active
     and (l.expires_at is null or l.expires_at > now())
   order by l.created_at desc, l.id;
end
$function$;

grant execute on function custom.view_share_links(uuid) to authenticated;
select custom.reopen_declared_doors();
grant execute on function custom.shared_view_read(text, text, text) to service_role;
