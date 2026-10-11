-- chair-step: a review cycle's refusal reaches HR (access ladder: the request reaches whoever can grant it without naming the owner): the cycle opens by its door's own rule (hr.review_cycle_door_access, asked by platform.detail_parent_access_for), its ask goes to the holders of performance.manage and else the organization's owners/admins (hr.review_cycle_request_recipients, asked by iam.access_request_recipients), the refusal names its owner by the HR/profile name and never an account handle, and one open standard review per person holds across every open cycle (hr.hr_review_start_candidates open_review_id, hr.hr_review_start).
-- lane: access-setup
-- lock: hr,iam,platform,public
-- based-on: iam.access_request_recipients(text, uuid) 579c9947cdb1c28f74420156f318af851809374db80ccdea873b88620a512095
-- based-on: platform.detail_parent_access_for(uuid, text, uuid, permission_level) b478e792919cda6953e6a67253b66361397b8e3793ea5a1bcf62c4d672afa2bf
-- based-on: public.access_denied_context(text, uuid) 5a808f17d75ff036f898c67177fa894463d9f3f7febb4da0abc2bf48086787ea
-- based-on: hr.hr_review_start_candidates(uuid) beacbe3bd6ae0beef9e5b65941a9245556397b7c2b269a5f9a8f89c6b63de09b
-- based-on: hr.hr_review_start(uuid, uuid) b9592247c78f494d41305190cdcfbe703e4c56cc1354079ee8d15f637c5b2fa5
--
-- Plan: common-docs/systems/platform/access/projects/access-setup/PLAN.md §7, §5a.
-- Inverse: migrations/inverse/accesssetup_p_a_cycle_refusal_reaches_hr_down.sql


-- ── the cycle's own door rule, asked for one person and one level ──
create or replace function hr.review_cycle_door_access(p_user uuid, p_cycle_id uuid, p_required public.permission_level)
 returns boolean
 language sql
 stable
 security definer
 set search_path to 'public', 'hr'
as $function$
  -- the rule hr.hr_review_cycle_get reads by: HR (performance.manage) manages; upper management (performance.read_all) reads
  select coalesce((select hr._rev_can_manage(p_user, c.organization_id)
                          or (p_required <= 'viewer'::public.permission_level
                              and hr.review_seat_upper_in_org(p_user, c.organization_id))
                     from hr.review_cycle c where c.id = p_cycle_id and c.deleted_at is null), false);
$function$;

-- ── who a refused person's ask reaches: the organization's HR, else its owners and admins ──
create or replace function hr.review_cycle_request_recipients(p_cycle_id uuid)
 returns table(user_id uuid, reason text)
 language plpgsql
 stable
 security definer
 set search_path to 'public', 'hr'
as $function$
declare v_org uuid;
begin
  select c.organization_id into v_org from hr.review_cycle c where c.id = p_cycle_id and c.deleted_at is null;
  if v_org is null then return; end if;
  return query
  select u.uid, 'hr_manage'::text
    from (select e.login_user_id as uid from hr.employee e
           where e.organization_id = v_org and e.login_user_id is not null and e.deleted_at is null
          union
          select om.user_id from iam.organization_member om where om.organization_id = v_org) u
   where hr._rev_can_manage(u.uid, v_org);
  if found then return; end if;
  return query
  select distinct om.user_id, 'org_admin'::text
    from iam.organization_member om
   where om.organization_id = v_org and om.role in ('owner', 'admin');
end
$function$;

CREATE OR REPLACE FUNCTION iam.access_request_recipients(p_type text, p_id uuid)
 RETURNS TABLE(user_id uuid, reason text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'platform', 'iam'
AS $function$
declare
  v_cur_type    text := p_type;
  v_cur_id      uuid := p_id;
  v_meta        record;
  v_relid       oid;
  v_owner_col   text;
  v_org_col     text;
  v_owner       uuid;
  v_org         uuid;
  v_exists      boolean;
  v_is_container     boolean;
  v_is_pure_container boolean;
  v_hops        int  := 0;
  v_via         text := '';
  v_ids         uuid[] := '{}';
  v_reasons     text[] := '{}';
  v_lane_ids    uuid[];
  v_parent_type text;
  v_fk          text;
  v_parent_id   uuid;
begin
  if p_type is null or p_id is null then
    return;
  end if;

  -- A review cycle is decided by the organization's HR, not by whoever created it: the ask reaches the people who
  -- can open it (holders of performance.manage) and, when nobody holds that, the organization's owners and admins.
  if p_type = 'hr_review_cycle' then
    return query select q.user_id, q.reason from hr.review_cycle_request_recipients(p_id) q;
    return;
  end if;

  <<walk>>
  while v_hops <= 6 loop
    select et.schema_name, et.table_name into v_meta
    from platform.entity_types et
    where et.token = v_cur_type and coalesce(et.is_active, true)
    limit 1;
    exit walk when v_meta.schema_name is null;

    begin
      v_relid := format('%I.%I', v_meta.schema_name, v_meta.table_name)::regclass;
    exception when others then
      exit walk;
    end;

    begin
      execute format('select true from %I.%I where id = $1',
                     v_meta.schema_name, v_meta.table_name)
        into v_exists using v_cur_id;
    exception when others then
      v_exists := null;
    end;
    exit walk when not coalesce(v_exists, false);

    -- Resolve the shape from the catalog rather than guessing a fixed tuple.
    select case when bool_or(a.attname = 'created_by') then 'created_by'
                when bool_or(a.attname = 'owner_id')   then 'owner_id' end,
           case when bool_or(a.attname = 'organization_id') then 'organization_id' end
      into v_owner_col, v_org_col
    from pg_attribute a
    where a.attrelid = v_relid and a.attnum > 0 and not a.attisdropped;

    v_owner := null;
    v_org   := null;
    if v_owner_col is not null or v_org_col is not null then
      begin
        execute format('select %s, %s from %I.%I where id = $1',
                       coalesce(v_owner_col, 'null::uuid'),
                       coalesce(v_org_col,   'null::uuid'),
                       v_meta.schema_name, v_meta.table_name)
          into v_owner, v_org using v_cur_id;
      exception when others then
        v_owner := null; v_org := null;
      end;
    end if;

    -- A membership container: the same question iam.has_access_for_base's
    -- membership lane asks, so the ask lands on the people access already admits.
    v_is_container := exists (
      select 1 from iam.memberships m
      where m.container_type = v_cur_type and m.deleted_at is null
    );

    -- A PURE container is one whose access model is membership INSTEAD of
    -- ownership -- a container that is not a shareable resource. Live: only
    -- `organization`. Its created_by is not authority (transfer_organization_
    -- ownership moves the membership and never touches that column), so the owner
    -- lane is suppressed for it and ONLY for it.
    v_is_pure_container := v_is_container and not exists (
      select 1 from platform.shareable_resource_registry sr
      where sr.resource_type = v_cur_type
    );

    -- Lane A -- container admins.
    if v_is_container then
      select array_agg(distinct m.user_id) into v_lane_ids
      from iam.memberships m
      join iam.membership_grant g
        on g.member_role = m.role and g.container_type in (v_cur_type, '*')
      where m.container_type = v_cur_type
        and m.container_id   = v_cur_id
        and m.deleted_at is null
        and coalesce(m.status, 'active') = 'active'
        and g.confers >= 'admin'::public.permission_level;
      if v_lane_ids is not null then
        v_ids     := v_ids     || v_lane_ids;
        v_reasons := v_reasons || array_fill(v_via || 'container_admin',
                                             array[cardinality(v_lane_ids)]);
      end if;
    end if;

    -- Lane B -- the row's own owner (every token except a pure container).
    if not v_is_pure_container and v_owner is not null then
      v_ids     := v_ids     || array[v_owner];
      v_reasons := v_reasons || array[v_via || 'owner'];
    end if;

    -- Lane C -- the owning organization's admins.
    if v_org is not null then
      select array_agg(distinct om.user_id) into v_lane_ids
      from iam.organization_member om
      join iam.organizations o on o.id = om.organization_id
      where om.organization_id = v_org
        and om.role in ('owner', 'admin');
      if v_lane_ids is not null then
        v_ids     := v_ids     || v_lane_ids;
        v_reasons := v_reasons || array_fill(v_via || 'org_admin',
                                             array[cardinality(v_lane_ids)]);
      end if;
    end if;

    -- Lane D -- explicit admin-level grantees (they can already decide).
    select array_agg(distinct u) into v_lane_ids
    from (
      select p.granted_to_user_id as u
      from iam.permissions p
      where p.resource_type = v_cur_type and p.resource_id = v_cur_id
        and p.permission_level = 'admin'::public.permission_level
        and p.status <> 'rejected'
        and (p.expires_at is null or p.expires_at > now())
        and p.granted_to_user_id is not null
      union
      select om.user_id
      from iam.permissions p
      join iam.organization_member om on om.organization_id = p.granted_to_organization_id
      join iam.organizations o on o.id = om.organization_id
      where p.resource_type = v_cur_type and p.resource_id = v_cur_id
        and p.permission_level = 'admin'::public.permission_level
        and p.status <> 'rejected'
        and (p.expires_at is null or p.expires_at > now())
        and p.granted_to_organization_id is not null
        and om.role in ('owner', 'admin')
    ) s;
    if v_lane_ids is not null then
      v_ids     := v_ids     || v_lane_ids;
      v_reasons := v_reasons || array_fill(v_via || 'admin_grant',
                                           array[cardinality(v_lane_ids)]);
    end if;

    exit walk when cardinality(v_ids) > 0;

    -- Lane E -- nobody on this row. Delegate to the composition parent.
    select er.parent_type, er.fk_column into v_parent_type, v_fk
    from platform.entity_relationships er
    where er.child_type = v_cur_type
      and er.kind in ('composition', 'containment')
    order by (er.kind = 'composition') desc, er.parent_type
    limit 1;
    exit walk when v_parent_type is null or v_fk is null;

    begin
      execute format('select %I from %I.%I where id = $1',
                     v_fk, v_meta.schema_name, v_meta.table_name)
        into v_parent_id using v_cur_id;
    exception when others then
      v_parent_id := null;
    end;
    exit walk when v_parent_id is null;
    exit walk when (v_parent_type, v_parent_id) is not distinct from (v_cur_type, v_cur_id);

    v_via      := 'via_' || v_parent_type || ':';
    v_cur_type := v_parent_type;
    v_cur_id   := v_parent_id;
    v_hops     := v_hops + 1;
  end loop;

  return query
  select t.uid, min(t.rsn)
  from unnest(v_ids, v_reasons) as t(uid, rsn)
  where t.uid is not null
  group by t.uid;
end;
$function$;

CREATE OR REPLACE FUNCTION platform.detail_parent_access_for(p_user uuid, p_type text, p_id uuid, p_required permission_level DEFAULT 'viewer'::permission_level)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
begin
  -- RC-A2h: THE ONE RULE a comment (any detail) asks about the record it is on. A Data Tables
  -- record answers by the store's own grant model — the kernel plus the store's carrying (a shared
  -- Table, a portal, a scope) and NEVER the "may know this Table" arm of custom.has_visibility,
  -- which is for a Table's name and columns, not its content. Every other record type answers by
  -- the kernel. Invoker rights: its callers are the kernel, the comment doors and
  -- platform.detail_parent_access, all SECURITY DEFINER.
  if p_user is null or p_type is null or p_id is null then return false; end if;
  if p_type = 'record' then
    return custom.reaches_directly(p_user, 'record', p_id, p_required);
  end if;
  -- A review cycle opens by its door's own rule (hr.hr_review_cycle_get): HR manages it, upper management reads it.
  -- Belonging to the organization opens nothing here, so a refused person is told so and may ask HR.
  if p_type = 'hr_review_cycle' then
    return hr.review_cycle_door_access(p_user, p_id, p_required);
  end if;
  return iam.has_access_for(p_user, p_type, p_id, p_required);
end;
$function$;

CREATE OR REPLACE FUNCTION public.access_denied_context(p_type text, p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'platform', 'iam', 'pg_temp'
AS $function$
declare
  v_uid            uuid := (select auth.uid());
  v_meta           record;
  v_attrs          record;
  v_deleted        boolean := false;
  v_level          text := 'none';
  v_is_owner       boolean := false;
  v_disclosure     text;
  v_owner_json     jsonb := null;
  v_org_json       jsonb := null;
  v_entity_json    jsonb;
  v_ancestor_json  jsonb := null;
  v_request_json   jsonb := null;
  v_can_request    boolean := false;
  v_parent_type    text;
  v_parent_id      uuid;
  v_fk             text;
  v_hops           int := 0;
  v_cur_type       text;
  v_cur_id         uuid;
  v_cur_schema     text;
  v_cur_table      text;
  v_permissive     text;
  v_restrictive    text;
  v_rls_readable   boolean := false;
  v_read_role      text;
  v_row_security   boolean := false;
  v_door_level     boolean := false;  -- RC-A8 L2: the level came from the one rule
begin
  if p_type is null or p_id is null then
    return jsonb_build_object('exists', false, 'deleted', false,
                              'level', 'none', 'disclosure', 'none',
                              'unresolvable', true);
  end if;

  select et.token, et.label, et.schema_name, et.table_name,
         coalesce(et.allow_preview, true)    as allow_preview,
         coalesce(et.has_soft_delete, false) as has_soft_delete
    into v_meta
  from platform.entity_types et
  where et.token = p_type
    and coalesce(et.is_active, true)
  limit 1;

  if v_meta.token is null then
    return jsonb_build_object('exists', false, 'deleted', false,
                              'level', 'none', 'disclosure', 'none',
                              'unresolvable', true);
  end if;

  select * into v_attrs
  from platform.entity_row_access_attrs(v_meta.schema_name, v_meta.table_name, p_id);

  if v_uid is null and coalesce(v_attrs.o_vis, 'personal'::platform.visibility)
       <> 'public'::platform.visibility then
    return jsonb_build_object(
      'exists', null, 'deleted', null, 'level', 'none',
      'is_owner', false, 'disclosure', 'anonymous', 'can_request', false,
      'entity', jsonb_build_object('token', v_meta.token, 'label', v_meta.label)
    );
  end if;

  if not coalesce(v_attrs.o_found, false) then
    return jsonb_build_object(
      'exists', false, 'deleted', false, 'level', 'none', 'disclosure', 'none',
      'entity', jsonb_build_object('token', v_meta.token, 'label', v_meta.label)
    );
  end if;

  -- 🚨 RC-A2d (R2): A DETAIL IS ANSWERED AS ITS RECORD. A comment's access only ever comes from
  -- the record it is on, so its author, its organization and a "Request access" on the comment
  -- itself would each be a false or leaking answer. The caller gets exactly the answer the record
  -- gets under the platform's no-enumeration rule, marked `via` the detail token.
  if platform.token_is_detail(v_meta.token) then
    -- RC-A2e: the parent is read through the declaration (an undeclared detail answers "missing").
    v_parent_type := null; v_parent_id := null;
    if platform.detail_parent_columns(v_meta.token) is not null then
      execute format('select coalesce(to_jsonb(t) ->> $2, $3), (to_jsonb(t) ->> $4)::uuid from %I.%I t where t.id = $1',
                     v_meta.schema_name, v_meta.table_name)
        into v_parent_type, v_parent_id
        using p_id, (platform.detail_parent_columns(v_meta.token))[1],
              (platform.detail_parent_columns(v_meta.token))[3],
              (platform.detail_parent_columns(v_meta.token))[2];
    end if;
    if v_parent_type is null or v_parent_id is null then
      return jsonb_build_object(
        'exists', false, 'deleted', false, 'level', 'none', 'disclosure', 'none',
        'entity', jsonb_build_object('token', v_meta.token, 'label', v_meta.label));
    end if;
    v_entity_json := public.access_denied_context(v_parent_type, v_parent_id);
    -- RC-A2j: a detail on a record the caller may not know of is a random id — its own token, no
    -- `via` (which would say "a comment with this id exists on something").
    if v_entity_json ->> 'exists' = 'false' then
      return jsonb_build_object(
        'exists', false, 'deleted', false, 'level', 'none', 'disclosure', 'none',
        'entity', jsonb_build_object('token', v_meta.token, 'label', v_meta.label));
    end if;
    return v_entity_json || jsonb_build_object('via', jsonb_build_object('token', v_meta.token));
  end if;

  if v_meta.has_soft_delete then
    begin
      execute format('select (deleted_at is not null) from %I.%I where id = $1',
                     v_meta.schema_name, v_meta.table_name)
        into v_deleted using p_id;
    exception when others then
      v_deleted := false;
    end;
  end if;

  if v_uid is not null then
    -- RC-A8 L2: the ONE RULE the doors use (platform.detail_parent_access: custom.reaches_directly
    -- for a Data Tables record — the Table shared with you opens its rows — iam.has_access otherwise).
    if platform.detail_parent_access(v_meta.token, p_id, 'admin'::public.permission_level) then
      v_level := 'admin';
    elsif platform.detail_parent_access(v_meta.token, p_id, 'editor'::public.permission_level) then
      v_level := 'edit';
    elsif platform.detail_parent_access(v_meta.token, p_id, 'viewer'::public.permission_level) then
      v_level := 'view';
    end if;
    v_door_level := v_level <> 'none';

    -- ACCESS SETUP (PLAN §5a; until the head is Confidential the kernel arm answers nothing): a type that declares
    -- its seats is described from them, so a person its doors refuse (not_reachable) is told the denial and offered
    -- the ask, never "you have access". Nothing here grants anything; it only chooses the sentence.
    if v_meta.token <> 'record' and exists (select 1 from iam.access_setup s where s.entity_type = v_meta.token) then
      v_level := case
        when cardinality(coalesce(iam.seats_opening(v_uid, v_meta.token, p_id), '{}')) = 0 then 'none'
        when iam.seats_opening(v_uid, v_meta.token, p_id) && coalesce((
               select array_agg(x) from iam.access_setup s, jsonb_array_elements_text(coalesce(s.setup -> 'admin_seats', '[]'::jsonb)) x
                where s.entity_type = v_meta.token), '{}') then 'admin'
        else 'view' end;
      v_door_level := v_level <> 'none';
    end if;

    -- `iam.has_access` has no platform-staff lane; that lane lives only in RLS
    -- and is NOT uniform (private tokens carry none; many `platform_admin_all`
    -- policies admit only `visibility >= 'internal'`). So a platform admin with
    -- no grant is only a CANDIDATE for `admin` — the real-read check below
    -- settles it, exactly as it settles every other level.
    if v_level = 'none' and public.is_platform_admin_for(v_uid) then
      v_level := 'admin';
    end if;

    v_is_owner := (v_attrs.o_owner is not null and v_attrs.o_owner = v_uid);
  else
    v_level := 'view';
  end if;

  -- EVERY LEVEL IS A REAL READ — THE ONE CHECK, FOR EVERY PATH ABOVE.
  -- A level survives only when the caller's role could actually read THIS row:
  -- the role holds SELECT on the `id` column, and the row passes the table's live
  -- SELECT policies for that role — evaluated here with the caller's own JWT
  -- claims, the same way `public.std_select_count_as` evaluates a policy. A
  -- table without row security needs only the privilege. Only the SENTENCE
  -- changes: nothing here grants anything. A policy that cannot be evaluated
  -- raises; the client then renders an honest resolver error, never a guess.
  -- RC-A8 L2: a table no client role may SELECT at all (the Data Tables store, read only through
  -- its doors) has no policy to evaluate — the one rule that granted the level IS its real read.
  if v_level <> 'none'
     and not (v_door_level
              and not has_column_privilege(case when v_uid is null then 'anon' else 'authenticated' end,
                                           format('%I.%I', v_meta.schema_name, v_meta.table_name), 'id', 'select')) then
    v_read_role := case when v_uid is null then 'anon' else 'authenticated' end;
    v_rls_readable := false;

    select c.relrowsecurity
      into v_row_security
    from pg_class c
    where c.oid = format('%I.%I', v_meta.schema_name, v_meta.table_name)::regclass;

    -- The privilege the real read needs: SELECT on `id`. Governed tables grant
    -- column by column, so a TABLE-level check would refuse rows the caller
    -- really reads (files.files, docproc.processed_documents, 2026-09-15).
    if has_column_privilege(v_read_role,
                            format('%I.%I', v_meta.schema_name, v_meta.table_name),
                            'id', 'select') then
      if not v_row_security then
        v_rls_readable := true;
      else
        select string_agg('(' || pg_get_expr(po.polqual, po.polrelid) || ')', ' or ')
                 filter (where po.polpermissive),
               string_agg('(' || pg_get_expr(po.polqual, po.polrelid) || ')', ' and ')
                 filter (where not po.polpermissive)
          into v_permissive, v_restrictive
        from pg_policy po
        where po.polrelid = format('%I.%I', v_meta.schema_name, v_meta.table_name)::regclass
          and po.polcmd in ('r', '*')
          and po.polqual is not null
          and (0::oid = any (po.polroles)
               or v_read_role::regrole::oid = any (po.polroles));

        if v_permissive is not null then
          execute format(
            'select exists (select 1 from %I.%I where id = $1 and (%s) and (%s))',
            v_meta.schema_name, v_meta.table_name,
            v_permissive, coalesce(v_restrictive, 'true'))
            into v_rls_readable using p_id;
        end if;
      end if;
    end if;

    if not v_rls_readable then
      v_level := 'none';
    end if;
  end if;

  if v_uid is null then
    v_disclosure := 'anonymous';
  elsif not v_meta.allow_preview then
    v_disclosure := 'kind_only';
  else
    v_disclosure := 'full';
  end if;

  -- 🚨 RC-A2d (R2): a row that points at a record (platform.reference_gate_columns — a War Room
  -- thread or room, which copies the project's name as its title) is answered at kind_only when
  -- the caller cannot open that record: no title, no owner, no organization.
  if v_disclosure = 'full' and v_uid is not null then
    select g[1], g[2] into v_cur_type, v_fk
      from (select platform.reference_gate_columns(v_meta.token) as g) x;
    if v_fk is not null then
      execute format('select %I::text, %I from %I.%I where id = $1',
                     v_cur_type, v_fk, v_meta.schema_name, v_meta.table_name)
        into v_parent_type, v_parent_id using p_id;
      if v_parent_type is not null and v_parent_id is not null
         and not iam.has_access(v_parent_type, v_parent_id, 'viewer'::public.permission_level) then
        v_disclosure := 'kind_only';
      end if;
    end if;
    v_cur_type := null; v_fk := null; v_parent_type := null; v_parent_id := null;
  end if;

  v_entity_json := jsonb_build_object('token', v_meta.token, 'label', v_meta.label);

  if v_disclosure = 'full' then
    v_entity_json := v_entity_json
      || jsonb_build_object('title', platform.entity_title(v_meta.token, p_id));

    if v_attrs.o_owner is not null then
      select jsonb_build_object(
               'user_id', pr.id,
               -- the person's name the platform way (the HR record in this organization, else the profile name);
               -- never the account email, which a handle-named profile would otherwise leave on screen
               'display_name', coalesce(
                 (select nullif(pp ->> 'name', pp ->> 'email')
                    from (select iam._access_setup_person(pr.id, v_attrs.o_org) as pp) x
                   where v_attrs.o_org is not null),
                 nullif(pr.display_name, '')),
               'avatar_url', nullif(pr.avatar_url, ''),
               'creator_handle', case when coalesce(pr.creator_public, false)
                                      then nullif(pr.creator_handle, '') end
             )
        into v_owner_json
      from users.profiles pr
      where pr.id = v_attrs.o_owner;

      v_owner_json := coalesce(
        v_owner_json,
        jsonb_build_object('user_id', v_attrs.o_owner, 'display_name', null,
                           'avatar_url', null, 'creator_handle', null)
      );
    end if;

    if v_attrs.o_org is not null then
      select jsonb_build_object(
               'id', o.id, 'name', o.name,
               'viewer_is_member', v_uid is not null
                                   and iam.has_org_access_for(v_uid, o.id)
             )
        into v_org_json
      from iam.organizations o
      where o.id = v_attrs.o_org;
    end if;

    if v_uid is not null then
      v_cur_type   := v_meta.token;
      v_cur_id     := p_id;
      v_cur_schema := v_meta.schema_name;
      v_cur_table  := v_meta.table_name;

      while v_hops < 6 and v_ancestor_json is null loop
        v_hops := v_hops + 1;

        select er.parent_type, er.fk_column
          into v_parent_type, v_fk
        from platform.entity_relationships er
        where er.child_type = v_cur_type
          and er.kind in ('composition', 'containment')
        order by (er.kind = 'composition') desc
        limit 1;

        exit when v_parent_type is null or v_fk is null;

        begin
          execute format('select %I from %I.%I where id = $1',
                         v_fk, v_cur_schema, v_cur_table)
            into v_parent_id using v_cur_id;
        exception when others then
          v_parent_id := null;
        end;

        exit when v_parent_id is null;

        if iam.has_access(v_parent_type, v_parent_id,
                          'viewer'::public.permission_level) then
          v_ancestor_json := jsonb_build_object(
            'token', v_parent_type,
            'id',    v_parent_id,
            'label', (select label from platform.entity_types
                       where token = v_parent_type),
            'title', platform.entity_title(v_parent_type, v_parent_id)
          );
          exit;
        end if;

        select et.schema_name, et.table_name
          into v_cur_schema, v_cur_table
        from platform.entity_types et
        where et.token = v_parent_type;

        exit when v_cur_schema is null;

        v_cur_type := v_parent_type;
        v_cur_id   := v_parent_id;
      end loop;
    end if;
  end if;

  if v_uid is not null then
    select jsonb_build_object(
             'id', ar.id, 'status', ar.status,
             'level', ar.requested_level, 'created_at', ar.created_at,
             'decision_note', ar.decision_note
           )
      into v_request_json
    from iam.access_requests ar
    where ar.resource_type = v_meta.token
      and ar.resource_id = p_id
      and ar.created_by = v_uid
      and ar.deleted_at is null
    order by ar.created_at desc
    limit 1;
  end if;

  v_can_request :=
        v_uid is not null
    and v_level = 'none'
    and not v_deleted
    and exists (select 1 from iam.access_request_recipients(v_meta.token, p_id))
    and coalesce(v_request_json ->> 'status', '') not in ('pending', 'reported');

  -- THE STRANGER'S ANSWER IS THE MISSING ANSWER (lane V24-TAILS, chair ruling 2026-09-25,
  -- VERIFIER-24 item 10). A signed-in person with no level on this row, who does not own it, is
  -- not in the organization that holds it and reads no ancestor of it, is told exactly what a
  -- random id tells her: no existence, no owner, no organization, no deletion, no prior request.
  -- She may still ask (`public.access_request_blind`), which reaches the owner without naming them.
  -- A member of the object's organization keeps the full answer (the org admin's transfer offer,
  -- the roster's "no access" cells).
  -- RC-A2k (chair ruling 2026-09-26): A PLAIN MEMBER OF THE RECORD'S ORGANIZATION WHO CANNOT OPEN
  -- IT GETS THE STRANGER'S ANSWER. The full answer stays for the owner, anyone holding a level,
  -- anyone reading an ancestor, and the owners/admins of the organization that holds it.
  if v_uid is not null
     and v_level = 'none'
     and not v_is_owner
     and v_ancestor_json is null
     -- RC-A2m (chair refinement): the organization's owners/admins keep the full answer only for
     -- records the ORGANIZATION holds — never a member's PERSONAL record (access is personal).
     -- A review cycle's refusal is the full one for the organization's own members: they know their employer's
     -- cycles exist, and the ask must reach HR with the organization named (never a stranger's blind ask).
     and not (v_meta.token = 'hr_review_cycle' and v_attrs.o_org is not null and iam.has_org_access_for(v_uid, v_attrs.o_org))
     and not (v_attrs.o_org is not null
              -- RC-A8 L1: the container's visibility wins (a row of a personal Table is personal)
              and platform.held_by_its_organization(v_meta.token, p_id)
              and public.is_org_admin_for(v_uid, v_attrs.o_org)) then
    return jsonb_build_object(
      'exists', false, 'deleted', false, 'level', 'none', 'disclosure', 'none',
      'entity', jsonb_build_object('token', v_meta.token, 'label', v_meta.label)
    );
  end if;

  return jsonb_build_object(
    'exists', true,
    'deleted', v_deleted,
    'level', v_level,
    'is_owner', v_is_owner,
    'disclosure', v_disclosure,
    'entity', v_entity_json,
    'owner', v_owner_json,
    'organization', v_org_json,
    'ancestor', v_ancestor_json,
    'request', v_request_json,
    'can_request', v_can_request
  );
end;
$function$;

CREATE OR REPLACE FUNCTION hr.hr_review_start_candidates(p_organization_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'hr'
AS $function$
declare v_uid uuid := auth.uid(); v_hr boolean; v_rows jsonb;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'reason', 'no_caller'); end if;
  v_hr := hr._rev_can_manage(v_uid, p_organization_id);
  with mine as (
    select m.id from hr.employment m join hr.employee me on me.id = m.employee_id
     where me.login_user_id = v_uid and m.organization_id = p_organization_id and m.deleted_at is null
  ), people as (
    select em.id, em.employee_id, e.login_user_id, hr.manager_as_of(em.id, current_date) as mgr
      from hr.employment em join hr.employee e on e.id = em.employee_id
     where em.organization_id = p_organization_id and em.deleted_at is null and em.status = 'active'
  ), picked as (
    select p.id, p.employee_id, (p.mgr in (select id from mine)) as is_report
      from people p
     where p.login_user_id is distinct from v_uid
       and (v_hr or p.mgr in (select id from mine))
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'employment_id', pk.id,
           'employee_id', pk.employee_id,
           'name', hr._rev_person_name(pk.id),
           'relation', case when pk.is_report then 'report' else 'employee' end,
           'open_review_id', (select r.id from hr.review r join hr.review_cycle c on c.id = r.cycle_id
                               where r.employment_id = pk.id and r.deleted_at is null
                                 and c.deleted_at is null and c.status <> 'closed'
                                 and r.status not in ('shared', 'acknowledged', 'cancelled')
                               limit 1))
         order by pk.is_report desc, hr._rev_person_name(pk.id)), '[]'::jsonb)
    into v_rows
    from picked pk;
  return jsonb_build_object('ok', true, 'is_hr', v_hr, 'people', v_rows);
end
$function$;

CREATE OR REPLACE FUNCTION hr.hr_review_start(p_employment_id uuid, p_organization_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'hr'
AS $function$
declare
  v_uid uuid := auth.uid(); em record; v_mgr uuid; v_mgr_login uuid; v_mgr_status text;
  c hr.review_cycle%rowtype; v_open uuid; v_entry jsonb; v_rid uuid; v_self date; v_manager date;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'reason', 'no_caller'); end if;
  select em2.id, em2.organization_id, em2.status, em2.employee_id, e.login_user_id
    into em
    from hr.employment em2 join hr.employee e on e.id = em2.employee_id
   where em2.id = p_employment_id and em2.deleted_at is null;
  -- a foreign, invented or not-yours employment answers the same refusal
  if em.id is null or em.organization_id is distinct from p_organization_id
     or not hr.review_may_start(v_uid, p_employment_id) then
    return jsonb_build_object('ok', false, 'reason', 'not_permitted');
  end if;
  if em.status <> 'active' then
    return jsonb_build_object('ok', false,
      'reason', case when em.status in ('terminated','separated') then 'terminated' else 'not_active' end,
      'employment_status', em.status);
  end if;
  v_mgr := hr.manager_as_of(em.id, current_date);
  if v_mgr is null then
    return jsonb_build_object('ok', false, 'reason', 'no_manager');
  end if;
  select em3.status, e3.login_user_id into v_mgr_status, v_mgr_login
    from hr.employment em3 join hr.employee e3 on e3.id = em3.employee_id
   where em3.id = v_mgr and em3.deleted_at is null;
  if v_mgr_status is distinct from 'active' then
    return jsonb_build_object('ok', false, 'reason', 'manager_not_active');
  end if;

  -- one open standard review per person, in ANY cycle that is still open (the individual cycle or an annual one)
  select r.id into v_open from hr.review r join hr.review_cycle oc on oc.id = r.cycle_id
   where r.employment_id = em.id and r.deleted_at is null
     and oc.deleted_at is null and oc.status <> 'closed'
     and r.status not in ('shared', 'acknowledged', 'cancelled')
   limit 1;
  if v_open is not null then
    return jsonb_build_object('ok', false, 'reason', 'already_open', 'review_id', v_open);
  end if;
  c := hr._review_individual_cycle(em.organization_id, v_uid);

  perform hr._rev_ensure_cadence(em.organization_id);
  v_self := current_date + (hr._rev_knob(em.organization_id, 'standard_review_self_days', '14'::jsonb) #>> '{}')::integer;
  v_manager := current_date + (hr._rev_knob(em.organization_id, 'standard_review_manager_days', '21'::jsonb) #>> '{}')::integer;
  v_entry := hr._review_create_one(c.id, em.organization_id, em.id, em.employee_id, em.login_user_id,
                                   v_mgr, v_mgr_login, v_self, v_manager);
  v_rid := (v_entry ->> 'review_id')::uuid;

  -- access-setup §5b: a single creation opens the panel for that review
  return jsonb_build_object('ok', true, 'review_id', v_rid, 'cycle_id', c.id, 'created', v_entry,
    'self_due_on', v_self, 'manager_due_on', v_manager,
    'access_setup', jsonb_build_object('head_type', 'hr_review', 'ids', jsonb_build_array(v_rid),
        'needs_confirm', iam._access_setup_needs_confirm('hr_review', em.organization_id, v_uid, array[v_rid])));
end
$function$;
