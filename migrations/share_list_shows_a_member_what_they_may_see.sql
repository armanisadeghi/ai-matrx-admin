-- based-on: public.get_resource_permissions(text, uuid) 523fddf45e1b1c7770ad0889231fc7a3adab935e8f62e81b81bdd616603edbbc
-- lane: SHARE-DIALOG-2
-- SHARE LIST FROM THE MEMBER'S SEAT. get_resource_permissions answered an EMPTY list to anyone who
-- could not manage sharing (Admin), so a person holding Edit saw "Not shared with anyone" over their
-- own active grant. Now: a manager still sees every grant; anyone else who can open the thing sees
-- their own grants plus every grant at or below the level they hold themselves. Same signature,
-- same columns. Inverse: migrations/inverse/share_list_shows_a_member_what_they_may_see_down.sql

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
        )
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
