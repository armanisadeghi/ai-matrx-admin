-- chair-step: inverse of accesssetup_store_k2 — restores the accesssetup_store_k bodies of the setup door, revert and preview.
-- lane: access-store
-- lock: custom
-- ground-standing-ok: b - runs BEFORE accesssetup_store_k's inverse, which drops these functions together.

CREATE OR REPLACE FUNCTION custom.table_access_setup_set(p_table_id uuid, p_setup jsonb, p_moves jsonb DEFAULT '{}'::jsonb, p_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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

CREATE OR REPLACE FUNCTION custom.table_access_setup_revert(p_table_id uuid, p_audit_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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

CREATE OR REPLACE FUNCTION custom.table_access_setup_preview(p_table_id uuid, p_setup jsonb, p_moves jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
