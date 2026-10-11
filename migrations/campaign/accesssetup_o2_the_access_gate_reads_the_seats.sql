-- chair-step: access-gate truth for records that declare an access setup: public.access_denied_context answers a type with an iam.access_setup row from its seats (iam.seats_opening; admin seats -> admin, any opening seat -> view, none -> none), so a person the review doors refuse with not_reachable sees the platform denial with Request access instead of the organization lane's "edit" (the kernel arm stays inactive until Confidential, PLAN §5a). Nothing is granted; only the sentence and the ask change. iam.record_seat_add_via reads the setup through whichever form of iam._access_setup_of the database carries (the store lane's scoped form or today's), so it keeps working when that lane lands.
-- lane: access-setup
-- lock: hr
-- based-on: public.access_denied_context(text, uuid) 3067141aebd08b12200ce3aeb9a38ada8f4a0ad5a9d22a15ea7e2ad93da71b12
-- based-on: iam.record_seat_add_via(text, uuid, text, uuid) ff414fa5af32b64a9d9f79c19af26cb6a3c80f2a527f8642a8616df8c255a358
--
-- Plan: common-docs/systems/platform/access/projects/access-setup/PLAN.md §5a, §9.
-- Inverse: migrations/inverse/accesssetup_o2_the_access_gate_reads_the_seats_down.sql

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
               'display_name', nullif(pr.display_name, ''),
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
$function$;;

CREATE OR REPLACE FUNCTION iam.record_seat_add_via(p_type text, p_id uuid, p_seat text, p_user uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare v_caller uuid := auth.uid(); s jsonb; v_seat jsonb; v_org uuid;
        v_proc regprocedure; v_out jsonb;
begin
  -- the setup through whichever form of iam._access_setup_of this database carries (the store lane scopes it per record)
  if to_regprocedure('iam._access_setup_of(text,uuid)') is not null then
    execute 'select iam._access_setup_of($1, $2)' into s using p_type, p_id;
  else
    execute 'select iam._access_setup_of($1)' into s using p_type;
  end if;
  if v_caller is null then return jsonb_build_object('ok', false, 'reason', 'no_caller'); end if;
  if s is null then return jsonb_build_object('ok', false, 'reason', 'no_setup'); end if;
  select e into v_seat from jsonb_array_elements(s -> 'seats') e where e ->> 'key' = p_seat;
  if v_seat is null then return jsonb_build_object('ok', false, 'reason', 'validation', 'field', 'seat'); end if;
  v_proc := to_regprocedure(coalesce(v_seat #>> '{add_via,fn}', ''));
  if v_proc is null then return jsonb_build_object('ok', false, 'reason', 'no_add_via'); end if;
  v_org := iam._access_setup_head_org(p_type, p_id);
  if v_org is null or cardinality(coalesce(iam.seats_of(v_caller, p_type, p_id), '{}')) = 0 then
    return jsonb_build_object('ok', false, 'reason', 'not_reachable');
  end if;
  if v_seat #>> '{add_via,action}' is not null
     and not iam.may_act_seat(v_caller, p_type, p_id, v_seat #>> '{add_via,action}') then
    return jsonb_build_object('ok', false, 'reason', 'not_permitted');
  end if;
  if p_user is null or not exists (select 1 from iam.memberships m where m.organization_id = v_org and m.user_id = p_user
                                     and m.container_type = 'organization' and m.status = 'active' and m.deleted_at is null) then
    return jsonb_build_object('ok', false, 'reason', 'validation', 'field', 'user');
  end if;
  execute format('select %s($1, $2)', v_proc::regproc) into v_out using p_id, p_user;
  return coalesce(v_out, jsonb_build_object('ok', false, 'reason', 'refused'));
end
$function$;;
