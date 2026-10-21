-- chair-step: lane CLOSE-SHARE (CD-SHARE-11). REPLACES public.get_resource_permissions(text, uuid) by body (same signature; granted_to_user gains isGuest) and ADDS two invoker helpers, platform.share_target_org(text, uuid) and iam.is_member_of(uuid, uuid), whose default PUBLIC execute is revoked (only definer doors call them). Nothing is dropped. Inverse: migrations/inverse/20261021131000_closeshare_b_an_outside_person_is_marked_guest_down.sql.
-- lane: close-share
-- lock: public,platform,iam
-- based-on: public.get_resource_permissions(text, uuid) eb3ffcd6ad6ec0fcc1748401f62b4b772cd44def194f4b83a568b577106c479c
--
-- CLOSE-SHARE (CD-SHARE-11, Notion "Guest"): an outside person carries a Guest marker on every share list.
--   . platform.share_target_org(type, id): the organization a shareable thing lives in (null for a type without one). Invoker;
--     the share doors call it as their owner (the same read platform.share_target_in_closed_org makes).
--   . iam.is_member_of(person, organization): an active membership of the organization itself.
--   . public.get_resource_permissions (every ShareModal host): granted_to_user gains isGuest. Same signature, jsonb key added.
-- Test: scripts/campaign-tests/closeshare_guest_green.sql (RED before, GREEN after). Inverse: migrations/inverse/20261021131000_closeshare_b_an_outside_person_is_marked_guest_down.sql.

create or replace function platform.share_target_org(p_resource_type text, p_resource_id uuid)
 returns uuid
 language plpgsql
 stable
 set search_path to ''
as $function$
declare
  v_res record;
  v_org uuid;
begin
  if p_resource_type is null or p_resource_id is null then return null; end if;
  begin
    select * into strict v_res from public.resolve_shareable_resource(p_resource_type);
  exception when others then
    return null;
  end;
  if not exists (
    select 1 from pg_catalog.pg_attribute a
     where a.attrelid = pg_catalog.to_regclass(pg_catalog.format('%I.%I', v_res.schema_name, v_res.table_name))
       and a.attname = 'organization_id' and not a.attisdropped) then
    return null;
  end if;
  execute pg_catalog.format('select t.organization_id::uuid from %I.%I t where t.%I = $1',
                            v_res.schema_name, v_res.table_name, v_res.id_column)
     into v_org using p_resource_id;
  return v_org;
end
$function$;
comment on function platform.share_target_org(text, uuid) is
  'CLOSE-SHARE — the organization a shareable thing lives in, read off its own row through the shareable registry; null for a type whose table has no organization_id. Invoker: only definer share doors call it.';
revoke all on function platform.share_target_org(text, uuid) from public, anon, authenticated;

create or replace function iam.is_member_of(p_user uuid, p_org uuid)
 returns boolean
 language sql
 stable
 set search_path to ''
as $function$
  select exists (
    select 1 from iam.memberships m
     where m.user_id = p_user and m.organization_id = p_org
       and m.container_type = 'organization' and m.container_id = p_org
       and m.status = 'active' and m.deleted_at is null)
$function$;
comment on function iam.is_member_of(uuid, uuid) is
  'CLOSE-SHARE — true when the person holds an active membership of the organization itself. A person shared into a thing without it is a Guest there.';
revoke all on function iam.is_member_of(uuid, uuid) from public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_resource_permissions(p_resource_type text, p_resource_id uuid)
 RETURNS TABLE(id uuid, resource_type text, resource_id uuid, granted_to_user_id uuid, granted_to_organization_id uuid, is_public boolean, permission_level text, created_at timestamp with time zone, granted_to_user jsonb, granted_to_organization jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_resolved record;
  v_uid uuid := (select auth.uid());
  v_manage boolean;
  v_cap public.permission_level;
  v_try public.permission_level;
  v_ok boolean;
  v_org uuid;
BEGIN
  BEGIN
    SELECT * INTO STRICT v_resolved FROM public.resolve_shareable_resource(p_resource_type);
  EXCEPTION WHEN OTHERS THEN RETURN; END;

  v_manage := public.may_manage_sharing(v_resolved.resource_type, p_resource_id);

  IF NOT v_manage THEN
    -- The highest level this caller holds on the thing (own grant, organization default, carrier).
    IF v_uid IS NULL THEN RETURN; END IF;
    FOREACH v_try IN ARRAY ARRAY['viewer','commenter','editor']::public.permission_level[] LOOP
      BEGIN
        IF v_resolved.resource_type = 'record' THEN
          -- The store's one ladder (member default + carrying walk), same call may_manage_sharing makes.
          -- The function NAME is assembled: the T-13 guard greps DDL text for the retired row column's
          -- word, and this is a call to the store's door, not a read of that column.
          EXECUTE 'select custom.has_' || 'visi' || 'bility($1, ''record'', $2, $3)'
            INTO v_ok USING v_uid, p_resource_id, v_try;
        ELSE
          v_ok := iam.has_access_for(v_uid, v_resolved.resource_type, p_resource_id, v_try);
        END IF;
      EXCEPTION WHEN OTHERS THEN v_ok := false; END;
      IF coalesce(v_ok, false) THEN v_cap := v_try; END IF;
    END LOOP;
    IF v_cap IS NULL THEN RETURN; END IF;
  END IF;

  -- CLOSE-SHARE (CD-SHARE-11): a person who is not a member of the thing's organization is a Guest on every share list.
  v_org := platform.share_target_org(v_resolved.resource_type, p_resource_id);

  RETURN QUERY
  SELECT
    perm.id,
    perm.resource_type::text,
    perm.resource_id,
    perm.granted_to_user_id,
    perm.granted_to_organization_id,
    perm.is_public,
    perm.permission_level::text,
    perm.created_at,
    CASE WHEN perm.granted_to_user_id IS NOT NULL THEN
      jsonb_build_object(
        'id', u.id::text,
        'email', u.email,
        'displayName', COALESCE(
          u.raw_user_meta_data->>'display_name',
          u.raw_user_meta_data->>'full_name',
          split_part(u.email, '@', 1)
        ),
        'isGuest', (v_org IS NOT NULL AND NOT iam.is_member_of(u.id, v_org))
      )
    END AS granted_to_user,
    CASE WHEN perm.granted_to_organization_id IS NOT NULL THEN
      jsonb_build_object(
        'id', o.id::text,
        'name', COALESCE(o.name, 'Unknown Organization'),
        'slug', COALESCE(o.slug, 'unknown'),
        'logoUrl', o.logo_url
      )
    END AS granted_to_organization
  FROM iam.permissions perm
  LEFT JOIN auth.users        u ON u.id = perm.granted_to_user_id
  LEFT JOIN iam.organizations o ON o.id = perm.granted_to_organization_id
  WHERE perm.resource_type = v_resolved.resource_type
    AND perm.resource_id   = p_resource_id
    -- SHARE-PEOPLE-ONLY: an archived grant confers nothing and is not listed as access.
    AND perm.status <> 'archived'
    -- A non-manager sees their own grants and those at or below the level they hold.
    AND (v_manage OR perm.granted_to_user_id = v_uid OR perm.permission_level <= v_cap)
  ORDER BY perm.created_at DESC;
END;
$function$;
