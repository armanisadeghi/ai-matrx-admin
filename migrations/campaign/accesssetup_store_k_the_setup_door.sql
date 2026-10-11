-- chair-step: THE SETUP DOOR (access-setup PLAN §12.1 "Declaration and lookup", "Changes are reversible and visible"). ADDS custom.table_access_setup (the panel's read: setup, columns with parts, may_change, versions), custom.table_access_setup_preview (who loses or gains sight per column under a proposed setup and column moves; writes nothing), custom.table_access_setup_set (table admins only, never an agent — refused in the body, and no agent door exists; moves columns through custom.field_update; check-gated; one iam.access_audit setup_change row with before/after = the archived version; the Table's other admins are notified when the writer widened their own sight) and custom.table_access_setup_revert (one-click restore of an archived version), the helpers custom._store_cells_in / custom._store_reach, and the notification event custom.table_access.admin_widened. Each door is declared in platform.client_callable_door before its GRANT.
-- lane: access-store
-- lock: custom,iam
--
-- Plan: common-docs/systems/platform/access/projects/access-setup/PLAN.md §12.1.
-- Inverse: migrations/inverse/accesssetup_store_k_the_setup_door_down.sql

-- ── the event a widening admin's peers hear ────────────────────────────────────────────────────
insert into communication.notification_event_type (event_key, label, description, default_channels, config, enabled, organization_id)
select 'custom.table_access.admin_widened', 'A table admin gave themselves more access',
       'Another admin of a Table changed who can see its columns in a way that lets them see more.',
       '{"in_app": true}'::jsonb, '{"bucket": "fyi"}'::jsonb, true, '39c38960-d30c-4840-b0c1-c9960de95582'
 where not exists (select 1 from communication.notification_event_type where event_key = 'custom.table_access.admin_widened');

-- a part's cells under a GIVEN setup (or the preset when the setup's grid does not name it)
create or replace function custom._store_cells_in(s jsonb, p_org uuid, p_part text, p_word text)
 returns jsonb
 language sql
 stable security definer
 set search_path to ''
as $function$
  select case
    when s is not null and exists (select 1 from jsonb_each(coalesce(s -> 'grid', '{}'::jsonb)) g where g.value ? p_part) then
      (select coalesce(jsonb_agg(jsonb_build_object('seat', st -> 'resolver' -> 'seat', 'seat_key', st ->> 'key',
                'level', g.value -> p_part ->> 'level') order by st ->> 'key'), '[]'::jsonb)
         from jsonb_array_elements(coalesce(s -> 'seats', '[]'::jsonb)) st
         join jsonb_each(s -> 'grid') g on g.key = st ->> 'key'
        where g.value ? p_part)
    else jsonb_build_array(
           jsonb_build_object('seat', jsonb_build_object('kind', 'row_level', 'min',
             custom._store_rung(iam.field_sensitivity_level(coalesce(p_word, 'internal'), 'read', p_org))), 'level', 'viewer'),
           jsonb_build_object('seat', jsonb_build_object('kind', 'row_level', 'min',
             custom._store_rung(iam.field_sensitivity_level(coalesce(p_word, 'internal'), 'edit', p_org))), 'level', 'editor'))
  end;
$function$;

-- how one person reaches one part at their Table level: 'all' (every row), 'own_rows' (only rows naming them), 'none'
create or replace function custom._store_reach(p_cells jsonb, p_person uuid, p_org uuid, p_level public.permission_level, p_action text)
 returns text
 language sql
 stable security definer
 set search_path to ''
as $function$
  select case
    when exists (select 1 from jsonb_array_elements(p_cells) c
                  where (c ->> 'level')::public.permission_level >= case when p_action = 'read' then 'viewer' else 'editor' end::public.permission_level
                    and (p_action = 'read' or p_level >= 'editor')
                    and ((c #>> '{seat,kind}' = 'row_level' and p_level >= (c #>> '{seat,min}')::public.permission_level)
                         or (c #>> '{seat,kind}' = 'org_role' and exists (select 1 from iam.memberships m
                               where m.organization_id = p_org and m.container_type = 'organization' and m.user_id = p_person
                                 and m.role = c #>> '{seat,role}' and m.status = 'active' and m.deleted_at is null)))) then 'all'
    when exists (select 1 from jsonb_array_elements(p_cells) c
                  where (c ->> 'level')::public.permission_level >= case when p_action = 'read' then 'viewer' else 'editor' end::public.permission_level
                    and c #>> '{seat,kind}' in ('row_field', 'row_creator')) then 'own_rows'
    else 'none' end;
$function$;

-- ── the panel's read: the Table's setup, its parts and columns, who can change it, its versions ──────
create or replace function custom.table_access_setup(p_table_id uuid)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to ''
as $function$
declare
  v_me uuid := auth.uid();
  v_org uuid;
  v_lvl public.permission_level;
begin
  if v_me is null then return jsonb_build_object('ok', false, 'reason', 'no_caller'); end if;
  select t.organization_id into v_org from custom.record t
   where t.id = p_table_id and t.table_id = custom.table_kernel_id() and t.deleted_at is null;
  if v_org is null then return jsonb_build_object('ok', false, 'reason', 'not_reachable'); end if;
  v_lvl := custom.effective_level(v_me, v_org, p_table_id, 'record');
  if v_lvl is null then return jsonb_build_object('ok', false, 'reason', 'not_reachable'); end if;
  return jsonb_build_object('ok', true, 'table_id', p_table_id,
    'setup', iam._access_setup_of_table(p_table_id),
    'may_change', v_lvl = 'admin' and platform.declared_actor_tier() is distinct from 'agent',
    'columns', (select coalesce(jsonb_agg(jsonb_build_object('id', f.id, 'key', f.data ->> 'key',
                  'label', coalesce(nullif(f.data ->> 'label', ''), f.data ->> 'key'), 'part', nullif(btrim(f.data ->> 'part'), ''),
                  'part_key', custom.store_field_part(f.data), 'word', coalesce(f.data ->> 'sensitivity', 'internal'),
                  'person', coalesce(f.data ->> 'parity_type', '') = 'member', 'worked_out', coalesce(f.data ->> 'type', '') = 'formula')
                  order by (f.data ->> 'sort')::numeric nulls last), '[]'::jsonb)
                  from custom.record f where f.organization_id = v_org and f.table_id = custom.field_kernel_id() and f.deleted_at is null
                   and (f.data ->> 'entity_definition_id')::uuid = p_table_id),
    'versions', case when v_lvl = 'admin' then (select coalesce(jsonb_agg(jsonb_build_object('audit_id', a.id, 'at', a.occurred_at,
                  'by', a.actor_user_id, 'note', a.justification) order by a.occurred_at desc), '[]'::jsonb)
                  from (select * from iam.access_audit a where a.organization_id = v_org and a.action = 'setup_change'
                          and p_table_id = any (a.target_ids) order by a.occurred_at desc limit 20) a) else '[]'::jsonb end);
end $function$;

-- ── who loses (or gains) sight of each part under a proposed setup + column moves, before anything is saved ──
create or replace function custom.table_access_setup_preview(p_table_id uuid, p_setup jsonb, p_moves jsonb default '{}'::jsonb)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to ''
as $function$
declare
  v_me uuid := auth.uid();
  v_org uuid;
  v_now jsonb;
  v_out jsonb;
begin
  if v_me is null then return jsonb_build_object('ok', false, 'reason', 'no_caller'); end if;
  select t.organization_id into v_org from custom.record t
   where t.id = p_table_id and t.table_id = custom.table_kernel_id() and t.deleted_at is null;
  if v_org is null or custom.effective_level(v_me, v_org, p_table_id, 'record') is distinct from 'admin' then
    return jsonb_build_object('ok', false, 'reason', 'not_reachable');
  end if;
  v_now := iam._access_setup_of_table(p_table_id);
  with cols as (
    select f.id, f.data ->> 'key' k, f.data ->> 'sensitivity' w, custom.store_field_part(f.data) p_now,
           case when coalesce(p_moves, '{}'::jsonb) ? f.id::text
                then custom.store_field_part(f.data - 'part' || case when nullif(btrim(coalesce(p_moves ->> f.id::text, '')), '') is null
                       then '{}'::jsonb else jsonb_build_object('part', btrim(p_moves ->> f.id::text)) end)
                else custom.store_field_part(f.data) end p_next
      from custom.record f where f.organization_id = v_org and f.table_id = custom.field_kernel_id() and f.deleted_at is null
       and (f.data ->> 'entity_definition_id')::uuid = p_table_id and coalesce(f.data ->> 'type', '') <> 'formula'),
  cand as (
    select m.user_id u from iam.memberships m where m.organization_id = v_org and m.container_type = 'organization'
       and m.status = 'active' and m.deleted_at is null and m.user_id is not null
    union select p.granted_to_user_id from iam.permissions p where p.resource_type = 'record' and p.resource_id = p_table_id
       and p.granted_to_user_id is not null and p.status <> 'rejected' and (p.expires_at is null or p.expires_at > now())),
  lv as (select u, custom.effective_level(u, v_org, p_table_id, 'record') l from cand),
  ans as (
    select lv.u, lv.l, cols.k,
           custom._store_reach(custom._store_cells_in(v_now, v_org, cols.p_now, cols.w), lv.u, v_org, lv.l, 'read') r_now,
           custom._store_reach(custom._store_cells_in(p_setup, v_org, cols.p_next, cols.w), lv.u, v_org, lv.l, 'read') r_next,
           custom._store_reach(custom._store_cells_in(v_now, v_org, cols.p_now, cols.w), lv.u, v_org, lv.l, 'edit') e_now,
           custom._store_reach(custom._store_cells_in(p_setup, v_org, cols.p_next, cols.w), lv.u, v_org, lv.l, 'edit') e_next
      from lv cross join cols where lv.l is not null)
  select jsonb_build_object(
    'ok', true,
    'problems', to_jsonb(iam._access_setup_problems_store(jsonb_build_object('table_id', p_table_id::text), p_setup)),
    'people', (select coalesce(jsonb_agg(x order by x ->> 'name'), '[]'::jsonb) from (
       select custom._store_person_card(a.u) || jsonb_build_object('level', min(a.l::text),
              'columns', jsonb_object_agg(a.k, jsonb_build_object('sees', a.r_now, 'sees_next', a.r_next, 'edits', a.e_now, 'edits_next', a.e_next))) x
         from ans a group by a.u) y),
    'loses_sight', (select count(distinct u) from ans where r_now <> 'none' and (r_next = 'none' or (r_now = 'all' and r_next = 'own_rows'))),
    'loses_edit', (select count(distinct u) from ans where e_now <> 'none' and (e_next = 'none' or (e_now = 'all' and e_next = 'own_rows'))),
    'gains_sight', (select count(distinct u) from ans where (r_now = 'none' and r_next <> 'none') or (r_now = 'own_rows' and r_next = 'all')))
    into v_out;
  return v_out;
end $function$;

-- ── THE SETUP DOOR: a table admin writes the Table's scoped setup (and moves columns between parts) ────
create or replace function custom.table_access_setup_set(p_table_id uuid, p_setup jsonb, p_moves jsonb default '{}'::jsonb, p_reason text default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
-- Table admins only, never an agent (refused here AND there is no agent door). Column moves go through
-- custom.field_update's part arm (same refusals); the setup is check-gated (iam._access_setup_problems_store,
-- also enforced by the table's validate trigger); p_setup null removes the setup (every part back to its
-- preset). One iam.access_audit setup_change row keeps before and after (the archived version a revert restores).
-- When the writing admin can read a part afterwards that they could not before, the Table's other admins are told.
declare
  v_me uuid := auth.uid();
  v_org uuid;
  v_scope jsonb := jsonb_build_object('table_id', p_table_id::text);
  v_before jsonb;
  v_moves_before jsonb;
  v_p text[];
  v_audit uuid;
  v_fid text;
  v_widened text[];
  v_admin uuid;
  v_sent integer := 0;
begin
  if v_me is null then return jsonb_build_object('ok', false, 'reason', 'no_caller'); end if;
  if platform.declared_actor_tier() is not distinct from 'agent' then
    raise exception 'An agent never decides who sees a Table''s columns. A table admin does that in "Who can see and edit".'
      using errcode = '42501', hint = 'ACCESS-SETUP §12 (d). Nothing was changed.';
  end if;
  select t.organization_id into v_org from custom.record t
   where t.id = p_table_id and t.table_id = custom.table_kernel_id() and t.deleted_at is null;
  if v_org is null then return jsonb_build_object('ok', false, 'reason', 'not_reachable'); end if;
  if custom.effective_level(v_me, v_org, p_table_id, 'record') is distinct from 'admin' then
    raise exception 'Only a table admin decides who sees this Table''s columns.'
      using errcode = '42501', hint = 'ACCESS-SETUP §12 (d). Nothing was changed.';
  end if;
  v_before := iam._access_setup_of_table(p_table_id);
  select coalesce(jsonb_object_agg(f.id::text, f.data -> 'part'), '{}'::jsonb) into v_moves_before
    from custom.record f where f.organization_id = v_org and f.table_id = custom.field_kernel_id()
     and coalesce(p_moves, '{}'::jsonb) ? f.id::text;

  -- the moves first, so the check sees the parts the columns will carry
  for v_fid in select k from jsonb_object_keys(coalesce(p_moves, '{}'::jsonb)) k loop
    if not exists (select 1 from custom.record f where f.id::text = v_fid and f.table_id = custom.field_kernel_id()
                     and f.deleted_at is null and (f.data ->> 'entity_definition_id')::uuid = p_table_id) then
      raise exception 'That column is not on this Table.' using errcode = '22023', hint = 'Nothing was changed.';
    end if;
    perform custom.field_update(v_org, v_fid::uuid, jsonb_build_object('part', p_moves -> v_fid));
  end loop;

  if p_setup is null or coalesce(p_setup -> 'grid', '{}'::jsonb) = '{}'::jsonb then
    delete from iam.access_setup where entity_type = 'record' and scope_key = v_scope;
  else
    v_p := iam._access_setup_problems_store(v_scope, p_setup);
    if cardinality(v_p) > 0 then
      raise exception 'That setup cannot be saved: %.', array_to_string(v_p, '; ')
        using errcode = '23514', hint = 'ACCESS-SETUP §12.1: the store check refused it. Nothing was changed.';
    end if;
    insert into iam.access_setup (entity_type, scope, setup, declared_by)
    values ('record', v_scope, p_setup, 'custom.table_access_setup_set by ' || v_me::text)
    on conflict (entity_type, scope_key) do update set setup = excluded.setup, declared_by = excluded.declared_by;
  end if;

  v_audit := iam._record_access_audit(
    p_organization_id => v_org, p_action => 'setup_change', p_target_token => 'record', p_data_class => 'organization',
    p_purpose => 'access_setup', p_basis => 'table_access_setup', p_granted => true, p_target_ids => array[p_table_id],
    p_row_count => 1, p_justification => coalesce(nullif(btrim(coalesce(p_reason, '')), ''), 'Who can see and edit: Table setup changed'),
    p_is_emergency_door => false, p_actor_user_id => v_me);
  update iam.access_audit set metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
           'before', jsonb_build_object('setup', v_before, 'moves', v_moves_before),
           'after', jsonb_build_object('setup', p_setup, 'moves', coalesce(p_moves, '{}'::jsonb)))
   where id = v_audit;

  -- did the writing admin widen their own sight?
  select coalesce(array_agg(distinct x.k), '{}') into v_widened from (
    select f.data ->> 'key' k,
           custom._store_reach(custom._store_cells_in(v_before, v_org, custom.store_field_part(case when not (v_moves_before ? f.id::text) then f.data
               when jsonb_typeof(v_moves_before -> f.id::text) = 'null' then f.data - 'part'
               else f.data - 'part' || jsonb_build_object('part', v_moves_before -> f.id::text) end), f.data ->> 'sensitivity'),
             v_me, v_org, 'admin', 'read') r0,
           custom._store_reach(custom._store_cells_in(p_setup, v_org, custom.store_field_part(f.data), f.data ->> 'sensitivity'),
             v_me, v_org, 'admin', 'read') r1
      from custom.record f where f.organization_id = v_org and f.table_id = custom.field_kernel_id() and f.deleted_at is null
       and (f.data ->> 'entity_definition_id')::uuid = p_table_id and coalesce(f.data ->> 'type', '') <> 'formula') x
   where (x.r0 = 'none' and x.r1 <> 'none') or (x.r0 = 'own_rows' and x.r1 = 'all');
  if cardinality(v_widened) > 0 then
    for v_admin in
      select m.user_id from iam.memberships m
       where m.organization_id = v_org and m.container_type = 'organization' and m.status = 'active' and m.deleted_at is null
         and m.user_id is not null and m.user_id <> v_me
         and custom.effective_level(m.user_id, v_org, p_table_id, 'record') = 'admin'
    loop
      perform communication.notify_from_sql(v_org, 'custom.table_access.admin_widened', v_admin, null, null,
        jsonb_build_object('table_id', p_table_id, 'actor_user_id', v_me, 'columns', to_jsonb(v_widened), 'audit_id', v_audit),
        '/data/' || p_table_id::text, 'record', p_table_id, 'setup_widened:' || v_audit::text);
      v_sent := v_sent + 1;
    end loop;
  end if;
  return jsonb_build_object('ok', true, 'table_id', p_table_id, 'audit_id', v_audit, 'widened', to_jsonb(v_widened), 'notified', v_sent);
end $function$;

-- ── one-click revert: puts back the version an earlier change replaced ───────────────────────────────
create or replace function custom.table_access_setup_revert(p_table_id uuid, p_audit_id uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare v_meta jsonb; v_org uuid; v_moves jsonb;
begin
  select a.metadata, a.organization_id into v_meta, v_org from iam.access_audit a
   where a.id = p_audit_id and a.action = 'setup_change' and p_table_id = any (a.target_ids);
  if v_meta is null or not v_meta ? 'before' then return jsonb_build_object('ok', false, 'reason', 'no_such_version'); end if;
  v_moves := coalesce(v_meta #> '{before,moves}', '{}'::jsonb);
  return custom.table_access_setup_set(p_table_id, v_meta #> '{before,setup}',
           (select coalesce(jsonb_object_agg(k, case when jsonb_typeof(v) = 'null' then 'null'::jsonb else v end), '{}'::jsonb)
              from jsonb_each(v_moves) e(k, v)),
           'Reverted to the version before ' || p_audit_id::text);
end $function$;

insert into platform.client_callable_door
  (schema_name, function_name, identity_args, identity_argtypes, declared_by, reason, non_client_lane, signed_in_callers, anonymous_callers)
select n.nspname, p.proname, pg_get_function_identity_arguments(p.oid), string_to_array(nullif(p.proargtypes::text, ''), ' ')::oid[],
       'migrations/campaign/accesssetup_store_k_the_setup_door.sql (lane access-store)', 'ACCESS-SETUP §12.1: a parts cells under a given setup.',
       'server_only: an internal Store Tables answer, called only by other store functions and the equivalence proof; takes any person id, so never a client door', false, false
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace where p.oid = 'custom._store_cells_in(jsonb,uuid,text,text)'::regprocedure
on conflict (schema_name, function_name, identity_argtypes) do update
  set non_client_lane = excluded.non_client_lane, reason = excluded.reason, declared_by = excluded.declared_by,
      signed_in_callers = false, anonymous_callers = false;
revoke all on function custom._store_cells_in(jsonb,uuid,text,text) from public, anon, authenticated;
insert into platform.client_callable_door
  (schema_name, function_name, identity_args, identity_argtypes, declared_by, reason, non_client_lane, signed_in_callers, anonymous_callers)
select n.nspname, p.proname, pg_get_function_identity_arguments(p.oid), string_to_array(nullif(p.proargtypes::text, ''), ' ')::oid[],
       'migrations/campaign/accesssetup_store_k_the_setup_door.sql (lane access-store)', 'ACCESS-SETUP §12.1: how one person reaches one part at a level.',
       'server_only: an internal Store Tables answer, called only by other store functions and the equivalence proof; takes any person id, so never a client door', false, false
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace where p.oid = 'custom._store_reach(jsonb,uuid,uuid,permission_level,text)'::regprocedure
on conflict (schema_name, function_name, identity_argtypes) do update
  set non_client_lane = excluded.non_client_lane, reason = excluded.reason, declared_by = excluded.declared_by,
      signed_in_callers = false, anonymous_callers = false;
revoke all on function custom._store_reach(jsonb,uuid,uuid,permission_level,text) from public, anon, authenticated;
insert into platform.client_callable_door
  (schema_name, function_name, identity_args, identity_argtypes, declared_by, reason, non_client_lane, signed_in_callers, anonymous_callers, argument_rules)
select n.nspname, p.proname, pg_get_function_identity_arguments(p.oid), string_to_array(nullif(p.proargtypes::text, ''), ' ')::oid[],
       'migrations/campaign/accesssetup_store_k_the_setup_door.sql (lane access-store)', 'ACCESS-SETUP §12.1: SECURITY DEFINER. not_reachable unless auth.uid() reaches the Table; returns its scoped setup, columns with parts, may_change (admin, never an agent) and, for admins, the last 20 setup versions.', null, true, false, '{"version": 1, "arguments": {"p_table_id": {"type": "uuid", "position": 1, "optional": false, "foreign": {"bounded": true, "note": "A Table the caller does not reach (or is not admin of, for writes) answers not_reachable or is refused before anything is read or written."}}}}'::jsonb
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace where p.oid = 'custom.table_access_setup(uuid)'::regprocedure
on conflict (schema_name, function_name, identity_argtypes) do update
  set reason = excluded.reason, declared_by = excluded.declared_by, non_client_lane = null, signed_in_callers = true,
      anonymous_callers = false, argument_rules = excluded.argument_rules;
grant execute on function custom.table_access_setup(uuid) to authenticated;
insert into platform.client_callable_door
  (schema_name, function_name, identity_args, identity_argtypes, declared_by, reason, non_client_lane, signed_in_callers, anonymous_callers, argument_rules)
select n.nspname, p.proname, pg_get_function_identity_arguments(p.oid), string_to_array(nullif(p.proargtypes::text, ''), ' ')::oid[],
       'migrations/campaign/accesssetup_store_k_the_setup_door.sql (lane access-store)', 'ACCESS-SETUP §12.1: SECURITY DEFINER. Table admins only (not_reachable otherwise); answers the store check problems and, per person and column, who sees and edits now vs under the proposed setup and moves; writes nothing.', null, true, false, '{"version": 1, "arguments": {"p_table_id": {"type": "uuid", "position": 1, "optional": false, "foreign": {"bounded": true, "note": "A Table the caller does not reach (or is not admin of, for writes) answers not_reachable or is refused before anything is read or written."}}, "p_setup": {"type": "jsonb", "position": 2, "optional": false, "foreign": {"not_an_id": true}}, "p_moves": {"type": "jsonb", "position": 3, "optional": true, "foreign": {"not_an_id": true}}}}'::jsonb
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace where p.oid = 'custom.table_access_setup_preview(uuid,jsonb,jsonb)'::regprocedure
on conflict (schema_name, function_name, identity_argtypes) do update
  set reason = excluded.reason, declared_by = excluded.declared_by, non_client_lane = null, signed_in_callers = true,
      anonymous_callers = false, argument_rules = excluded.argument_rules;
grant execute on function custom.table_access_setup_preview(uuid,jsonb,jsonb) to authenticated;
insert into platform.client_callable_door
  (schema_name, function_name, identity_args, identity_argtypes, declared_by, reason, non_client_lane, signed_in_callers, anonymous_callers, argument_rules)
select n.nspname, p.proname, pg_get_function_identity_arguments(p.oid), string_to_array(nullif(p.proargtypes::text, ''), ' ')::oid[],
       'migrations/campaign/accesssetup_store_k_the_setup_door.sql (lane access-store)', 'ACCESS-SETUP §12.1: SECURITY DEFINER. Table admins only; refuses an agent (no agent door exists); moves columns through custom.field_update, writes the check-gated scoped setup, one iam.access_audit setup_change row with before/after, notifies the other table admins when the writer widened their own sight.', null, true, false, '{"version": 1, "arguments": {"p_table_id": {"type": "uuid", "position": 1, "optional": false, "foreign": {"bounded": true, "note": "A Table the caller does not reach (or is not admin of, for writes) answers not_reachable or is refused before anything is read or written."}}, "p_setup": {"type": "jsonb", "position": 2, "optional": false, "foreign": {"not_an_id": true}}, "p_moves": {"type": "jsonb", "position": 3, "optional": true, "foreign": {"not_an_id": true}}, "p_reason": {"type": "text", "position": 4, "optional": true, "foreign": {"not_an_id": true}}}}'::jsonb
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace where p.oid = 'custom.table_access_setup_set(uuid,jsonb,jsonb,text)'::regprocedure
on conflict (schema_name, function_name, identity_argtypes) do update
  set reason = excluded.reason, declared_by = excluded.declared_by, non_client_lane = null, signed_in_callers = true,
      anonymous_callers = false, argument_rules = excluded.argument_rules;
grant execute on function custom.table_access_setup_set(uuid,jsonb,jsonb,text) to authenticated;
insert into platform.client_callable_door
  (schema_name, function_name, identity_args, identity_argtypes, declared_by, reason, non_client_lane, signed_in_callers, anonymous_callers, argument_rules)
select n.nspname, p.proname, pg_get_function_identity_arguments(p.oid), string_to_array(nullif(p.proargtypes::text, ''), ' ')::oid[],
       'migrations/campaign/accesssetup_store_k_the_setup_door.sql (lane access-store)', 'ACCESS-SETUP §12.1: SECURITY DEFINER. Restores the setup and column parts an earlier setup_change replaced, through custom.table_access_setup_set (same gates).', null, true, false, '{"version": 1, "arguments": {"p_table_id": {"type": "uuid", "position": 1, "optional": false, "foreign": {"bounded": true, "note": "A Table the caller does not reach (or is not admin of, for writes) answers not_reachable or is refused before anything is read or written."}}, "p_audit_id": {"type": "uuid", "position": 2, "optional": false, "foreign": {"bounded": true, "note": "Only a setup_change audit row naming this Table is read; the revert then passes through custom.table_access_setup_set (admin only)."}}}}'::jsonb
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace where p.oid = 'custom.table_access_setup_revert(uuid,uuid)'::regprocedure
on conflict (schema_name, function_name, identity_argtypes) do update
  set reason = excluded.reason, declared_by = excluded.declared_by, non_client_lane = null, signed_in_callers = true,
      anonymous_callers = false, argument_rules = excluded.argument_rules;
grant execute on function custom.table_access_setup_revert(uuid,uuid) to authenticated;
