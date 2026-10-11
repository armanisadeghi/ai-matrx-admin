-- draft: access-setup verifier fixes — not yet rehearsed on the clone
-- chair-step: verifier fixes on the standard review's access setup. (1) Upper management READS the review cycles list and a cycle (hr_review_cycle_list / hr_review_cycle_get admit hr.review_seat_upper_in_org, the same organization-level seat form hr_review_calibration already answers; the answer carries read_only: true for them; launch, close, template and calibrate doors are unchanged). (2) A seat may declare add_via {fn, action}: iam.record_seat_set refuses a direct add on it (reason add_via) and the new door iam.record_seat_add_via runs the type's own flow as the caller; the hr_review peer seat declares hr.review_seat_add_peer (hr_review_peer_nominate: employee -> pending, manager -> approved). Exclude through record_seat_set is held by admin-seat holders and organization owners/admins only. (3) A setup may declare stage_meaning_fn; iam.record_access_setup returns opens_at per cell (hr.review_stage_meaning resolves manager_may_see_self through the organization's standard_review_manager_sees_self knob) plus may_add / may_exclude / add_via per seat and may_confirm. (4) public.hr_role_assign refuses a scope that does not fit its kind by name (scope_kind_unknown / scope_shape_invalid) instead of a raw check violation. (5) hr_review_start_candidates adds employee_id to each person. The setup check validates add_via and stage_meaning_fn. No review door's answer changes for anyone who reached it before.
-- lane: access-setup
-- lock: hr
-- based-on: iam._access_setup_problems(text, jsonb) abe4ae0546aafdc7cebfb6aff57d10057fe254f88371cbb63e5e34466e63c348
-- based-on: hr.hr_review_cycle_list(uuid) 29e379a52941d7ca50a0849e9aa546fb417ce481f2f726ab363034434e09b64d
-- based-on: hr.hr_review_cycle_get(uuid) 28547c7c960725937647d382c99c924fb7f7135e48ec8147e6c9672592dae190
-- based-on: iam.record_access_setup(text, uuid) 5e7ab437beb8377a3a918a3c2e9ac1d3846b46fad5a4c19733429e5354b7d458
-- based-on: iam.record_seat_set(text, uuid, text, uuid, text, text) 47455727cd9f8e3509b1f56ef72534a33e2e3b68a05d3cafaaf1ef9894c144c8
-- based-on: public.hr_role_assign(uuid, text, text, uuid, uuid[], date, date, text) 0f8a2107f6de41dea4dca78872e033b110ba9fb89ec178b50150cde5085f1ce7
-- based-on: hr.hr_review_start_candidates(uuid) c3f147cd58e61118cf7812254ff3aa45633748d2fc7875ba5d4c7bc5363df235
--
-- Plan: common-docs/systems/platform/access/projects/access-setup/PLAN.md §3, §5b, §7.
-- Inverse: migrations/inverse/accesssetup_o_people_involved_adds_through_the_types_flow_down.sql

-- ── the check: add_via and stage_meaning_fn are validated like every other declared function ──
CREATE OR REPLACE FUNCTION iam._access_setup_problems(p_type text, s jsonb)
 RETURNS text[]
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  p text[] := '{}';
  v_seats text[]; v_parts text[]; v_stages text[]; v_admin text[]; v_rel regclass; v_tok text;
  v_seat jsonb; v_key text; c record; m jsonb; a record; r jsonb; x text; v_live uuid; v_got text[];
  v_levels text[] := array['viewer','commenter','edit_content','editor','admin'];
begin
  if s is null then return array['no_setup']; end if;
  if not exists (select 1 from platform.entity_types et where et.token = p_type and et.is_active) then
    p := p || ('head_token_unregistered: ' || p_type);
  end if;
  select et.table_ref into v_rel from platform.entity_types et where et.token = p_type;
  v_seats := coalesce((select array_agg(e ->> 'key') from jsonb_array_elements(s -> 'seats') e), '{}');
  v_parts := coalesce((select array_agg(e ->> 'key') from jsonb_array_elements(s -> 'parts') e), '{}');
  v_stages := coalesce((select array_agg(e) from jsonb_array_elements_text(s -> 'stages') e), '{}');
  v_admin := coalesce((select array_agg(e) from jsonb_array_elements_text(s -> 'admin_seats') e), '{}');

  if cardinality(v_seats) <> (select count(distinct u.k) from unnest(v_seats) u(k)) then p := p || 'seat_declared_twice'::text; end if;
  if cardinality(v_parts) <> (select count(distinct u.k) from unnest(v_parts) u(k)) then p := p || 'part_declared_twice'::text; end if;
  if cardinality(v_stages) = 0 then p := p || 'no_stage_vocabulary'::text; end if;
  if cardinality(v_admin) = 0 then p := p || 'no_admin_seats'::text; end if;
  foreach x in array v_admin loop
    if not x = any(v_seats) then p := p || ('admin_seat_undeclared: ' || x); end if;
  end loop;
  if s ->> 'subject_seat' is null or not (s ->> 'subject_seat') = any(v_seats) then
    p := p || 'subject_seat_undeclared'::text;
  end if;
  if s ->> 'share_seat' is not null and not (s ->> 'share_seat') = any(v_seats) then
    p := p || ('share_seat_undeclared: ' || (s ->> 'share_seat'));
  end if;
  if s ->> 'attached_part' is not null and not (s ->> 'attached_part') = any(v_parts) then
    p := p || ('attached_part_undeclared: ' || (s ->> 'attached_part'));
  end if;
  if to_regprocedure(coalesce(s ->> 'stages_fn', '')) is null then p := p || ('stages_fn_missing: ' || coalesce(s ->> 'stages_fn', '(none)')); end if;
  if to_regprocedure(coalesce(s ->> 'rows_fn', '')) is null then p := p || ('rows_fn_missing: ' || coalesce(s ->> 'rows_fn', '(none)')); end if;

  -- seats
  for v_seat in select e from jsonb_array_elements(s -> 'seats') e loop
    v_key := v_seat ->> 'key';
    if v_seat #>> '{resolver,kind}' = 'function' then
      if to_regprocedure(coalesce(v_seat #>> '{resolver,fn}', '')) is null then
        p := p || ('resolver_missing: ' || v_key || ' -> ' || coalesce(v_seat #>> '{resolver,fn}', '(none)'));
      elsif (select pr.prorettype from pg_proc pr where pr.oid = to_regprocedure(v_seat #>> '{resolver,fn}')) <> 'uuid[]'::regtype then
        p := p || ('resolver_not_uuid_array: ' || v_key);
      end if;
      if v_seat #>> '{resolver,set_fn}' is null or to_regprocedure(v_seat #>> '{resolver,set_fn}') is null then
        p := p || ('resolver_set_form_missing: ' || v_key);
      end if;
      -- the person-scoped form: "is THIS person in the seat", so iam.seats_of never enumerates every holder
      if v_seat #>> '{resolver,has_fn}' is null or to_regprocedure(v_seat #>> '{resolver,has_fn}') is null then
        p := p || ('resolver_person_form_missing: ' || v_key);
      elsif (select pr.prorettype from pg_proc pr where pr.oid = to_regprocedure(v_seat #>> '{resolver,has_fn}')) <> 'boolean'::regtype
         or not (select pr.pronargs = 2 and pr.proargtypes[0] = 'uuid'::regtype and pr.proargtypes[1] = 'uuid'::regtype
                   from pg_proc pr where pr.oid = to_regprocedure(v_seat #>> '{resolver,has_fn}')) then
        p := p || ('resolver_person_form_not_uuid_uuid_boolean: ' || v_key);
      end if;
    elsif coalesce(v_seat #>> '{resolver,kind}', '') <> 'grants' then
      p := p || ('resolver_kind_unknown: ' || v_key);
    end if;
    if coalesce((v_seat ->> 'required')::boolean, false) and v_key is distinct from s ->> 'subject_seat'
       and coalesce(v_seat ->> 'fallback', '') <> 'org_owners_admins' then
      p := p || ('required_seat_without_fallback: ' || v_key);
    end if;
    for x in select jsonb_array_elements_text(coalesce(v_seat -> 'assignable_by', '[]'::jsonb)) loop
      if not x = any(v_seats) then p := p || ('assignable_by_undeclared: ' || v_key || ' <- ' || x); end if;
    end loop;
  end loop;

  -- grid
  for c in select g.key seat, e.key part, e.value cell
             from jsonb_each(coalesce(s -> 'grid', '{}'::jsonb)) g, jsonb_each(g.value) e loop
    if not c.seat = any(v_seats) then p := p || ('grid_seat_undeclared: ' || c.seat); end if;
    if not c.part = any(v_parts) then p := p || ('grid_part_undeclared: ' || c.seat || '.' || c.part); end if;
    if not coalesce(c.cell ->> 'level', '') = any(v_levels) then p := p || ('grid_level_invalid: ' || c.seat || '.' || c.part); end if;
    if coalesce(c.cell ->> 'rows', 'all') not in ('all','own','submitted','own_or_submitted') then
      p := p || ('grid_rows_invalid: ' || c.seat || '.' || c.part);
    end if;
    if not (coalesce(c.cell ->> 'names', 'shown') in ('shown','hidden') or c.cell ->> 'names' like 'knob:%/%') then
      p := p || ('grid_names_invalid: ' || c.seat || '.' || c.part);
    end if;
    for x in select jsonb_array_elements_text(case when jsonb_typeof(c.cell -> 'from_stage') = 'array' then c.cell -> 'from_stage'
                                                   when c.cell -> 'from_stage' is null or jsonb_typeof(c.cell -> 'from_stage') = 'null' then '[]'::jsonb
                                                   else jsonb_build_array(c.cell -> 'from_stage') end) loop
      if x is not null and not x = any(v_stages) then
        p := p || ('from_stage_undeclared: ' || c.seat || '.' || c.part || ' -> ' || x);
      end if;
    end loop;
  end loop;

  -- the subject seat reads and writes its own part
  if not exists (select 1 from jsonb_each(coalesce(s -> 'grid' -> (s ->> 'subject_seat'), '{}'::jsonb)) e
                  where e.value ->> 'level' in ('editor','admin')) then
    p := p || 'subject_seat_cannot_write_its_own_part'::text;
  end if;
  -- a writable part some admin seat can read from the stage it is written
  for c in select g.key seat, e.key part, e.value cell
             from jsonb_each(coalesce(s -> 'grid', '{}'::jsonb)) g, jsonb_each(g.value) e
            where e.value ->> 'level' in ('editor','admin') loop
    if not exists (select 1 from unnest(v_admin) ad
                    where s -> 'grid' -> ad -> c.part is not null
                      and ((s -> 'grid' -> ad -> c.part -> 'from_stage') is null
                           or (s -> 'grid' -> ad -> c.part -> 'from_stage') = (c.cell -> 'from_stage'))) then
      p := p || ('writable_part_unreadable_at_its_write_stage: ' || c.part || ' (written by ' || c.seat || ')');
    end if;
  end loop;

  -- columns
  for c in select e.key col, e.value spec from jsonb_each(coalesce(s -> 'columns', '{}'::jsonb)) e loop
    x := case when jsonb_typeof(c.spec) = 'string' then c.spec #>> '{}' else c.spec ->> 'part' end;
    if x is null or not x = any(v_parts) then p := p || ('column_part_undeclared: ' || c.col); end if;
    if v_rel is not null and not exists (select 1 from pg_attribute pa where pa.attrelid = v_rel
                                           and pa.attname = split_part(c.col, '.', 1) and not pa.attisdropped) then
      p := p || ('column_missing_on_head: ' || c.col);
    end if;
  end loop;

  -- members: registered, head_column present, a part, never listed twice (here or in another setup)
  for m in select e from jsonb_array_elements(coalesce(s -> 'members', '[]'::jsonb)) e loop
    v_tok := m ->> 'token';
    if not exists (select 1 from platform.entity_types et where et.token = v_tok and et.is_active) then
      p := p || ('member_token_unregistered: ' || coalesce(v_tok, '(none)'));
    end if;
    if m ->> 'head_column' is null then
      p := p || ('member_without_head_column: ' || coalesce(v_tok, '(none)'));
    elsif not exists (select 1 from platform.entity_types et join pg_attribute pa on pa.attrelid = et.table_ref
                       where et.token = v_tok and pa.attname = m ->> 'head_column' and not pa.attisdropped) then
      p := p || ('member_head_column_missing: ' || v_tok || '.' || (m ->> 'head_column'));
    end if;
    if m ->> 'part' is null and m -> 'part_from' is null then p := p || ('member_without_part: ' || v_tok); end if;
    if m ->> 'part' is not null and not (m ->> 'part') = any(v_parts) then p := p || ('member_part_undeclared: ' || v_tok); end if;
    if exists (select 1 from jsonb_each_text(coalesce(m -> 'part_from' -> 'map', '{}'::jsonb)) e where not e.value = any(v_parts)) then
      p := p || ('member_part_map_undeclared: ' || v_tok);
    end if;
  end loop;
  for x in
    select t from (select s0.entity_type t from iam.access_setup s0 where s0.entity_type <> p_type
                   union all
                   select e ->> 'token' from iam.access_setup s0, jsonb_array_elements(coalesce(s0.setup -> 'members', '[]'::jsonb)) e
                    where s0.entity_type <> p_type) o
     where t = p_type or t in (select e ->> 'token' from jsonb_array_elements(coalesce(s -> 'members', '[]'::jsonb)) e)
  loop
    p := p || ('token_listed_twice: ' || x);
  end loop;
  if (select count(*) from jsonb_array_elements(coalesce(s -> 'members', '[]'::jsonb)) e)
     <> (select count(distinct e ->> 'token') from jsonb_array_elements(coalesce(s -> 'members', '[]'::jsonb)) e)
     or exists (select 1 from jsonb_array_elements(coalesce(s -> 'members', '[]'::jsonb)) e where e ->> 'token' = p_type) then
    p := p || 'token_listed_twice: within this setup'::text;
  end if;

  -- actions
  for a in select e.key act, e.value def from jsonb_each(coalesce(s -> 'actions', '{}'::jsonb)) e loop
    if jsonb_array_length(coalesce(a.def -> 'seats', '[]'::jsonb)) = 0 then p := p || ('action_without_seats: ' || a.act); end if;
    for x in select jsonb_array_elements_text(coalesce(a.def -> 'seats', '[]'::jsonb)) loop
      if not x = any(v_seats) then p := p || ('action_seat_undeclared: ' || a.act || ' -> ' || x); end if;
    end loop;
    for x in select jsonb_array_elements_text(coalesce(a.def -> 'stages', '[]'::jsonb) || coalesce(a.def -> 'not_stages', '[]'::jsonb)) loop
      if not x = any(v_stages) then p := p || ('action_stage_undeclared: ' || a.act || ' -> ' || x); end if;
    end loop;
  end loop;

  -- add_via: a seat filled through its type's own flow names a (record uuid, person uuid) -> jsonb door and the action gating it
  for v_seat in select e from jsonb_array_elements(s -> 'seats') e where e ? 'add_via' loop
    if to_regprocedure(coalesce(v_seat #>> '{add_via,fn}', '')) is null then
      p := p || ('add_via_fn_missing: ' || (v_seat ->> 'key'));
    elsif (select pr.prorettype from pg_proc pr where pr.oid = to_regprocedure(v_seat #>> '{add_via,fn}')) <> 'jsonb'::regtype
       or (select pr.proargtypes::oid[] from pg_proc pr where pr.oid = to_regprocedure(v_seat #>> '{add_via,fn}'))
          <> array['uuid'::regtype::oid, 'uuid'::regtype::oid] then
      p := p || ('add_via_not_uuid_uuid_jsonb: ' || (v_seat ->> 'key'));
    end if;
    if v_seat #>> '{add_via,action}' is not null and not coalesce(s -> 'actions', '{}'::jsonb) ? (v_seat #>> '{add_via,action}') then
      p := p || ('add_via_action_undeclared: ' || (v_seat ->> 'key') || ' -> ' || (v_seat #>> '{add_via,action}'));
    end if;
  end loop;
  -- stage_meaning_fn: (record uuid, stage text) -> text, the stage a derived stage equals under the record's knobs
  if s ? 'stage_meaning_fn' and to_regprocedure(coalesce(s ->> 'stage_meaning_fn', '')) is null then
    p := p || ('stage_meaning_fn_missing: ' || (s ->> 'stage_meaning_fn'));
  end if;

  -- recorders and blind_wins
  for r in select e from jsonb_array_elements(coalesce(s -> 'recorders', '[]'::jsonb)) e loop
    if not coalesce(r ->> 'for_seat', '') = any(v_seats) then p := p || ('recorder_seat_undeclared: ' || coalesce(r ->> 'for_seat', '(none)')); end if;
    if r ->> 'lend_to' is distinct from 'admin_seats' and jsonb_typeof(r -> 'lend_to') <> 'array' then
      p := p || ('recorder_lend_to_invalid: ' || coalesce(r ->> 'for_seat', '(none)'));
    end if;
  end loop;
  for c in select e.key part, e.value seats from jsonb_each(coalesce(s -> 'blind_wins', '{}'::jsonb)) e loop
    if not c.part = any(v_parts) then p := p || ('blind_wins_part_undeclared: ' || c.part); end if;
    for x in select jsonb_array_elements_text(c.seats) loop
      if not x = any(v_seats) then p := p || ('blind_wins_seat_undeclared: ' || c.part || ' -> ' || x); end if;
    end loop;
  end loop;

  -- stages_fn answers only declared stages on every live record of the head
  if cardinality(p) = 0 and v_rel is not null then
    for v_live in execute format('select id from %s', v_rel) loop
      v_got := iam._access_setup_stages(s, v_live);
      for x in select unnest(v_got) loop
        if not x = any(v_stages) then p := p || ('stage_outside_vocabulary: ' || x || ' on ' || v_live); end if;
      end loop;
    end loop;
  end if;
  return p;
end
$function$;

-- ── a derived stage said as the stage it equals for this record (the panel's label; never a gate) ──
create or replace function hr.review_stage_meaning(p_review_id uuid, p_stage text)
 returns text
 language sql
 stable
 set search_path to 'hr', 'public'
as $function$
  -- manager_may_see_self (hr.review_stages): after the employee submits, or after both submit (the org's knob)
  select case when p_stage = 'manager_may_see_self' then coalesce((
           select case when coalesce(hr._hr_knob('hr.performance', 'standard_review_manager_sees_self', r.organization_id,
                                                  '"after_both_submit"'::jsonb), '"after_both_submit"'::jsonb) #>> '{}'
                            = 'after_employee_submits'
                       then 'self_submitted' else 'both_submitted' end
             from hr.review r where r.id = p_review_id), p_stage)
         else p_stage end;
$function$;
revoke all on function hr.review_stage_meaning(uuid, text) from public, anon, authenticated;

-- ── iam: map a cell's from_stage through the setup's stage_meaning_fn (absent = unchanged) ──
create or replace function iam._access_setup_stage_meaning(p_setup jsonb, p_id uuid, p_from jsonb)
 returns jsonb
 language plpgsql
 stable
 set search_path to 'pg_catalog'
as $function$
declare v_proc regprocedure := to_regprocedure(coalesce(p_setup ->> 'stage_meaning_fn', '')); v_out jsonb := '[]'::jsonb;
        x text; v text;
begin
  if p_from is null or jsonb_typeof(p_from) = 'null' then return null; end if;
  for x in select case when jsonb_typeof(p_from) = 'string' then p_from #>> '{}' end
           union all select jsonb_array_elements_text(case when jsonb_typeof(p_from) = 'array' then p_from else '[]'::jsonb end) loop
    continue when x is null;
    v := x;
    if v_proc is not null and p_id is not null then
      execute format('select %s($1, $2)', v_proc::regproc) into v using p_id, x;
    end if;
    if not v_out ? coalesce(v, x) then v_out := v_out || to_jsonb(coalesce(v, x)); end if;
  end loop;
  return v_out;
end
$function$;
revoke all on function iam._access_setup_stage_meaning(jsonb, uuid, jsonb) from public, anon, authenticated;

-- ── the peer seat's own flow: one person, by login, through hr_review_peer_nominate (employee -> pending, manager -> approved) ──
create or replace function hr.review_seat_add_peer(p_review_id uuid, p_user uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'hr', 'public'
as $function$
declare v_org uuid; v_emp uuid; v jsonb;
begin
  select r.organization_id into v_org from hr.review r where r.id = p_review_id and r.deleted_at is null;
  if v_org is null then return jsonb_build_object('ok', false, 'reason', 'not_reachable'); end if;
  select em.id into v_emp from hr.employment em join hr.employee e on e.id = em.employee_id
   where e.login_user_id = p_user and em.organization_id = v_org and em.deleted_at is null
   order by (em.status = 'active') desc limit 1;
  if v_emp is null then return jsonb_build_object('ok', false, 'reason', 'not_in_organization'); end if;
  v := hr.hr_review_peer_nominate(p_review_id, array[v_emp]);
  if coalesce((v ->> 'ok')::boolean, false) is not true then return v; end if;
  if jsonb_array_length(coalesce(v -> 'refused', '[]'::jsonb)) > 0 then
    return jsonb_build_object('ok', false, 'reason', v #>> '{refused,0,reason}');
  end if;
  return jsonb_build_object('ok', true, 'status', v #>> '{nominations,0,status}',
                            'nomination_id', v #>> '{nominations,0,nomination_id}');
end
$function$;
revoke all on function hr.review_seat_add_peer(uuid, uuid) from public, anon, authenticated;

-- ── the panel's add for a seat that declares add_via: runs the type's own flow as the caller ──
create or replace function iam.record_seat_add_via(p_type text, p_id uuid, p_seat text, p_user uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'pg_catalog'
as $function$
declare v_caller uuid := auth.uid(); s jsonb := iam._access_setup_of(p_type); v_seat jsonb; v_org uuid;
        v_proc regprocedure; v_out jsonb;
begin
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
$function$;

insert into platform.client_callable_door
  (schema_name, function_name, identity_args, identity_argtypes, declared_by, reason,
   non_client_lane, signed_in_callers, anonymous_callers)
values
  ('hr', 'review_seat_add_peer', 'p_review_id uuid, p_user uuid', array['uuid'::regtype::oid, 'uuid'::regtype::oid],
   'migrations/campaign/accesssetup_o_people_involved_adds_through_the_types_flow.sql (lane access-setup)',
   'ACCESS-SETUP §3: the peer seat''s add_via; nominates one person through hr.hr_review_peer_nominate as the caller.',
   'server_only: only iam.record_seat_add_via calls it, after its seat and action gates; hr_review_peer_nominate gates again', false, false)
on conflict (schema_name, function_name, identity_argtypes) do update
  set non_client_lane = excluded.non_client_lane, reason = excluded.reason, declared_by = excluded.declared_by,
      signed_in_callers = false, anonymous_callers = false;

insert into platform.client_callable_door
  (schema_name, function_name, identity_args, identity_argtypes, declared_by, reason,
   anonymous_callers, signed_in_callers, argument_rules)
values
  ('iam', 'record_seat_add_via', 'p_type text, p_id uuid, p_seat text, p_user uuid',
   array['text'::regtype::oid, 'uuid'::regtype::oid, 'text'::regtype::oid, 'uuid'::regtype::oid],
   'migrations/campaign/accesssetup_o_people_involved_adds_through_the_types_flow.sql (lane access-setup)',
   'ACCESS-SETUP §3: SECURITY DEFINER. For a seat whose setup declares add_via, runs that type''s own flow (e.g. hr peer nomination: employee -> pending, manager -> approved) as the caller. Refuses not_reachable without a seat on the record, not_permitted when the declared action is not the caller''s, validation for a person outside the record''s organization.',
   false, true,
   jsonb_build_object('version', 1, 'arguments', jsonb_build_object(
     'p_type', jsonb_build_object('type', 'text', 'position', 1, 'optional', false),
     'p_id', jsonb_build_object('type', 'uuid', 'position', 2, 'optional', false, 'foreign', jsonb_build_object('bounded', true, 'note', 'A record the caller holds no seat on answers not_reachable.')),
     'p_seat', jsonb_build_object('type', 'text', 'position', 3, 'optional', false),
     'p_user', jsonb_build_object('type', 'uuid', 'position', 4, 'optional', false, 'foreign', jsonb_build_object('bounded', true, 'note', 'Must be an active member of the record''s organization.')))))
on conflict (schema_name, function_name, identity_argtypes) do update
  set argument_rules = excluded.argument_rules, signed_in_callers = excluded.signed_in_callers, anonymous_callers = excluded.anonymous_callers,
      non_client_lane = null, reason = excluded.reason, declared_by = excluded.declared_by;

grant execute on function iam.record_seat_add_via(text, uuid, text, uuid) to authenticated;

-- ── the panel's read (needs iam._access_setup_stage_meaning) ──
CREATE OR REPLACE FUNCTION iam.record_access_setup(p_type text, p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_caller uuid := auth.uid(); s jsonb := iam._access_setup_of(p_type); v_org uuid; v_mine text[];
  v_admin text[]; v_stages text[]; v_seats jsonb := '[]'::jsonb; v_seat jsonb; v_key text; v_may boolean;
  v_any_may boolean := false; v_holders jsonb; v_excluded jsonb; v_cells jsonb; v_role text; v_confirm jsonb;
  v_add_via jsonb; v_may_add boolean; v_may_excl boolean; v_admin_holder boolean;
begin
  if v_caller is null then return jsonb_build_object('ok', false, 'reason', 'no_caller'); end if;
  if s is null then return jsonb_build_object('ok', false, 'reason', 'no_setup'); end if;
  v_org := iam._access_setup_head_org(p_type, p_id);
  if v_org is null then return jsonb_build_object('ok', false, 'reason', 'not_reachable'); end if;
  v_mine := coalesce(iam.seats_of(v_caller, p_type, p_id), '{}');
  if cardinality(v_mine) = 0 then return jsonb_build_object('ok', false, 'reason', 'not_reachable'); end if;
  v_admin := coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(s -> 'admin_seats', '[]'::jsonb)) x), '{}');
  v_stages := coalesce(iam._access_setup_stages(s, p_id), '{}');
  select m.role into v_role from iam.memberships m
   where m.organization_id = v_org and m.user_id = v_caller and m.container_type = 'organization'
     and m.status = 'active' and m.deleted_at is null limit 1;

  -- exclude and confirm belong to the admin seats and the organization's owners/admins
  v_admin_holder := (v_mine && v_admin) or coalesce(v_role in ('owner', 'admin'), false);

  for v_seat in select e from jsonb_array_elements(s -> 'seats') e loop
    v_key := v_seat ->> 'key';
    if coalesce((v_seat ->> 'opens_record')::boolean, true) = false then continue; end if;
    v_may := v_key is distinct from (s ->> 'subject_seat')
             and coalesce(v_seat #>> '{resolver,kind}', '') <> 'grants'
             and v_mine && (coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(v_seat -> 'assignable_by', '[]'::jsonb)) x), '{}') || v_admin);
    v_any_may := v_any_may or v_may;
    -- a seat that declares add_via is filled through its type's own flow (e.g. peer nomination), never directly
    v_add_via := v_seat -> 'add_via';
    v_may_add := v_may and (v_add_via is null or v_add_via ->> 'action' is null
                            or iam.may_act_seat(v_caller, p_type, p_id, v_add_via ->> 'action'));
    v_may_excl := v_may and v_admin_holder;
    select coalesce(jsonb_agg(iam._access_setup_person(t.user_id, v_org)
                              || jsonb_build_object('source', t.source, 'removable', t.removable)
                              order by t.source, t.user_id), '[]'::jsonb)
      into v_holders from iam._seat_table(p_type, p_id) t where t.seat = v_key;
    select coalesce(jsonb_agg(iam._access_setup_person(c.user_id, v_org)
                              || jsonb_build_object('changed_at', c.changed_at, 'reason', c.reason)
                              order by c.changed_at desc), '[]'::jsonb)
      into v_excluded from iam.record_seat_change c
     where c.entity_type = p_type and c.record_id = p_id and c.seat_key = v_key
       and c.change = 'exclude' and c.deleted_at is null;
    select coalesce(jsonb_agg(jsonb_build_object(
             'part', pe ->> 'key',
             'level', s #>> array['grid', v_key, pe ->> 'key', 'level'],
             'rows', s #>> array['grid', v_key, pe ->> 'key', 'rows'],
             'from_stage', s #> array['grid', v_key, pe ->> 'key', 'from_stage'],
             'opens_at', iam._access_setup_stage_meaning(s, p_id, s #> array['grid', v_key, pe ->> 'key', 'from_stage']),
             'reached', case when s #> array['grid', v_key, pe ->> 'key', 'from_stage'] is null then true
                             else iam._access_setup_stage_reached(s #> array['grid', v_key, pe ->> 'key', 'from_stage'], v_stages) end)
             order by pe_ord), '[]'::jsonb)
      into v_cells
      from jsonb_array_elements(s -> 'parts') with ordinality p(pe, pe_ord)
     where s #> array['grid', v_key, pe ->> 'key'] is not null;
    v_seats := v_seats || jsonb_build_object(
      'key', v_key,
      'required', coalesce((v_seat ->> 'required')::boolean, false),
      'many', coalesce((v_seat ->> 'many')::boolean, false),
      'resolver', v_seat #>> '{resolver,kind}',
      'may_change', v_may_add or v_may_excl,
      'may_add', v_may_add,
      'may_exclude', v_may_excl,
      'add_via', v_add_via ->> 'action',
      'fallback_only', jsonb_array_length(v_holders) > 0
                       and not exists (select 1 from jsonb_array_elements(v_holders) h where h ->> 'source' <> 'fallback'),
      'holders', v_holders,
      'excluded', v_excluded,
      'cells', v_cells);
  end loop;

  select jsonb_build_object('at', a.occurred_at) || coalesce(jsonb_build_object('by', iam._access_setup_person(a.actor_user_id, v_org)), '{}'::jsonb)
    into v_confirm from iam.access_audit a
   where a.organization_id = v_org and a.target_token = p_type and a.action = 'seat_confirm'
     and p_id = any(a.target_ids) and a.deleted_at is null
   order by a.occurred_at desc limit 1;

  return jsonb_build_object(
    'ok', true,
    'entity_type', p_type,
    'record_id', p_id,
    'organization', (select jsonb_build_object('id', o.id, 'name', o.name) from iam.organizations o where o.id = v_org),
    'my_seats', to_jsonb(v_mine),
    'my_org_role', v_role,
    'stages_reached', to_jsonb(v_stages),
    'seats', v_seats,
    'confirmed', v_confirm,
    'may_confirm', v_admin_holder and v_any_may,
    'needs_confirm', iam._access_setup_needs_confirm(p_type, v_org, v_caller, array[p_id]),
    'candidates', case when v_any_may then (
        select coalesce(jsonb_agg(iam._access_setup_person(m.user_id, v_org)), '[]'::jsonb)
          from (select distinct m2.user_id from iam.memberships m2
                 where m2.organization_id = v_org and m2.container_type = 'organization'
                   and m2.status = 'active' and m2.deleted_at is null limit 500) m)
      else '[]'::jsonb end);
end
$function$;

-- ── hr.hr_review_cycle_list ──
CREATE OR REPLACE FUNCTION hr.hr_review_cycle_list(p_organization_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'hr'
AS $function$
declare v_uid uuid := auth.uid(); v_manage boolean;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'reason', 'no_caller'); end if;
  v_manage := hr._rev_can_manage(v_uid, p_organization_id);
  -- upper management reads the cycles the calibration board already answers them for; never manages them
  if not (v_manage or hr.review_seat_upper_in_org(v_uid, p_organization_id)) then
    return jsonb_build_object('ok', false, 'reason', 'not_permitted');
  end if;
  return jsonb_build_object('ok', true)
         || case when v_manage then '{}'::jsonb else jsonb_build_object('read_only', true) end
         || jsonb_build_object('cycles', coalesce((
    select jsonb_agg(jsonb_build_object(
      'cycle_id', c.id, 'name', c.name, 'status', c.status,
      'period_start', c.period_start, 'period_end', c.period_end,
      'self_due_on', c.self_due_on, 'manager_due_on', c.manager_due_on, 'share_due_on', c.share_due_on,
      'launched_at', c.launched_at, 'closed_at', c.closed_at,
      'review_count', (select count(*) from hr.review r where r.cycle_id = c.id and r.deleted_at is null),
      'acknowledged_count', (select count(*) from hr.review r where r.cycle_id = c.id and r.deleted_at is null
                               and r.status = 'acknowledged'),
      'outstanding_count', (select count(*) from hr.review r where r.cycle_id = c.id and r.deleted_at is null
                               and r.status not in ('acknowledged','cancelled')))
      order by c.period_end desc, c.created_at desc)
      from hr.review_cycle c
     where c.organization_id = p_organization_id and c.deleted_at is null), '[]'::jsonb));
end
$function$;

-- ── hr.hr_review_cycle_get ──
CREATE OR REPLACE FUNCTION hr.hr_review_cycle_get(p_cycle_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'hr'
AS $function$
declare v_uid uuid := auth.uid(); c hr.review_cycle%rowtype; v_rows jsonb; v_manage boolean;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'reason', 'no_caller'); end if;
  select * into c from hr.review_cycle where id = p_cycle_id and deleted_at is null;
  v_manage := c.id is not null and hr._rev_can_manage(v_uid, c.organization_id);
  -- upper management reads the cycle (as hr_review_calibration answers them); launch/close/calibrate stay HR's
  if c.id is null or not (v_manage or hr.review_seat_upper_in_org(v_uid, c.organization_id)) then
    return jsonb_build_object('ok', false, 'reason', 'not_reachable');
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
           'review_id', r.id, 'employment_id', r.employment_id,
           'employee_name', hr._rev_person_name(r.employment_id),
           'manager_employment_id', r.manager_employment_id,
           'manager_name', hr._rev_person_name(r.manager_employment_id),
           'status', r.status, 'overall_rating', r.overall_rating,
           'self_submitted_at', r.self_submitted_at, 'manager_submitted_at', r.manager_submitted_at,
           'shared_at', r.shared_at, 'acknowledged_at', r.acknowledged_at,
           'outstanding', case when r.status in ('cancelled','acknowledged') then '[]'::jsonb else
             (select coalesce(jsonb_agg(o), '[]'::jsonb) from unnest(array[
                case when r.self_submitted_at is null then 'self' end,
                case when not exists (select 1 from hr.review_response x where x.review_id = r.id
                                        and x.role = 'manager' and x.status = 'submitted' and x.deleted_at is null)
                     then 'manager' end,
                case when r.status = 'both_submitted' then 'share' end,
                case when r.status = 'shared' then 'acknowledge' end]) o where o is not null) end)
         order by hr._rev_person_name(r.employment_id)), '[]'::jsonb)
    into v_rows
    from hr.review r where r.cycle_id = c.id and r.deleted_at is null;
  return case when v_manage then '{}'::jsonb else jsonb_build_object('read_only', true) end
         || jsonb_build_object('ok', true,
    'cycle', jsonb_build_object('cycle_id', c.id, 'organization_id', c.organization_id, 'name', c.name,
      'status', c.status, 'period_start', c.period_start, 'period_end', c.period_end,
      'self_due_on', c.self_due_on, 'manager_due_on', c.manager_due_on, 'share_due_on', c.share_due_on,
      'template_id', c.template_id, 'template_snapshot', c.template_snapshot,
      'launched_at', c.launched_at, 'closed_at', c.closed_at),
    'counts', jsonb_build_object(
      'total', jsonb_array_length(v_rows),
      'by_status', coalesce((select jsonb_object_agg(s, n) from (
        select r.status s, count(*) n from hr.review r where r.cycle_id = c.id and r.deleted_at is null
         group by r.status) q), '{}'::jsonb)),
    'reviews', v_rows);
end
$function$;

-- ── iam.record_seat_set ──
CREATE OR REPLACE FUNCTION iam.record_seat_set(p_type text, p_id uuid, p_seat text, p_user uuid, p_change text, p_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_caller uuid := auth.uid(); s jsonb := iam._access_setup_of(p_type); v_seat jsonb; v_org uuid;
  v_mine text[]; v_may text[]; v_id uuid; v_left integer; v_audit uuid;
begin
  if v_caller is null then return jsonb_build_object('ok', false, 'reason', 'no_caller'); end if;
  if s is null then return jsonb_build_object('ok', false, 'reason', 'no_setup'); end if;
  if p_change not in ('add', 'exclude') then return jsonb_build_object('ok', false, 'reason', 'validation', 'field', 'change'); end if;
  select e into v_seat from jsonb_array_elements(s -> 'seats') e where e ->> 'key' = p_seat;
  if v_seat is null then return jsonb_build_object('ok', false, 'reason', 'validation', 'field', 'seat'); end if;
  if p_seat = s ->> 'subject_seat' then return jsonb_build_object('ok', false, 'reason', 'subject_seat_is_the_record'); end if;
  v_org := iam._access_setup_head_org(p_type, p_id);
  if v_org is null then return jsonb_build_object('ok', false, 'reason', 'not_reachable'); end if;
  v_mine := coalesce(iam.seats_of(v_caller, p_type, p_id), '{}');
  if cardinality(v_mine) = 0 then return jsonb_build_object('ok', false, 'reason', 'not_reachable'); end if;
  v_may := coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(v_seat -> 'assignable_by', '[]'::jsonb)
                                                                          || coalesce(s -> 'admin_seats', '[]'::jsonb)) x), '{}');
  if not (v_mine && v_may) then return jsonb_build_object('ok', false, 'reason', 'not_permitted'); end if;
  if p_change = 'add' and v_seat ? 'add_via' then
    return jsonb_build_object('ok', false, 'reason', 'add_via', 'action', v_seat #>> '{add_via,action}');
  end if;
  if p_change = 'exclude' and not (
       v_mine && coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(s -> 'admin_seats', '[]'::jsonb)) x), '{}')
       or exists (select 1 from iam.memberships m where m.organization_id = v_org and m.user_id = v_caller
                    and m.container_type = 'organization' and m.role in ('owner', 'admin')
                    and m.status = 'active' and m.deleted_at is null)) then
    return jsonb_build_object('ok', false, 'reason', 'not_permitted');
  end if;
  if p_user is null or not exists (select 1 from iam.memberships m where m.organization_id = v_org and m.user_id = p_user
                                     and m.container_type = 'organization' and m.status = 'active' and m.deleted_at is null) then
    return jsonb_build_object('ok', false, 'reason', 'validation', 'field', 'user');
  end if;
  if p_change = 'exclude' and coalesce((v_seat ->> 'required')::boolean, false) then
    select count(*) into v_left from iam._seat_table(p_type, p_id) t where t.seat = p_seat and t.user_id <> p_user and t.source <> 'fallback';
    if v_left = 0 then return jsonb_build_object('ok', false, 'reason', 'last_holder_of_required_seat'); end if;
  end if;
  update iam.record_seat_change c set deleted_at = now(), archived_by = v_caller
   where c.entity_type = p_type and c.record_id = p_id and c.seat_key = p_seat and c.user_id = p_user and c.deleted_at is null;
  insert into iam.record_seat_change (organization_id, entity_type, record_id, seat_key, user_id, change, reason, changed_by)
  values (v_org, p_type, p_id, p_seat, p_user, p_change, nullif(btrim(coalesce(p_reason, '')), ''), v_caller)
  returning id into v_id;
  -- §5c: every seat change is written to the access log; basis = the seat's resolver kind
  v_audit := iam._record_access_audit(
    p_organization_id   => v_org,
    p_action            => 'seat_change',
    p_target_token      => p_type,
    p_data_class        => coalesce(iam.class_gate_class(p_type), 'organization'),
    p_purpose           => 'access_setup',
    p_basis             => coalesce(v_seat #>> '{resolver,kind}', 'record_seat_change'),
    p_granted           => true,
    p_target_ids        => array[p_id],
    p_row_count         => 1,
    p_subject_user_id   => p_user,
    p_justification     => format('%s %s seat%s', p_change, p_seat,
                                  coalesce(': ' || nullif(btrim(coalesce(p_reason, '')), ''), '')),
    p_is_emergency_door => false,
    p_actor_user_id     => v_caller,
    p_granted_to_user_id => p_user);
  return jsonb_build_object('ok', true, 'change_id', v_id, 'audit_id', v_audit, 'seats', (
    select coalesce(jsonb_agg(jsonb_build_object('seat', t.seat, 'user_id', t.user_id, 'source', t.source, 'removable', t.removable)), '[]'::jsonb)
      from iam._seat_table(p_type, p_id) t));
end
$function$;

-- ── public.hr_role_assign ──
CREATE OR REPLACE FUNCTION public.hr_role_assign(p_employment_id uuid, p_role_key text, p_scope_kind text DEFAULT 'org'::text, p_scope_id uuid DEFAULT NULL::uuid, p_scope_employment_ids uuid[] DEFAULT '{}'::uuid[], p_effective_from date DEFAULT CURRENT_DATE, p_effective_to date DEFAULT NULL::date, p_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'hr', 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_org uuid;
  v_id  uuid;
  v_audit uuid;
  v_assignable boolean;
  v_actor_emp uuid;
begin
  if v_uid is null then
    raise exception 'hr_role_assign: no authenticated caller' using errcode = '42501';
  end if;

  select em.organization_id into v_org from hr.employment em
   where em.id = p_employment_id and em.deleted_at is null;
  if v_org is null then
    perform platform.refuse_not_found(format('hr_role_assign: no hr.employment with id %s', p_employment_id));
  end if;

  select ar.is_assignable into v_assignable from hr.access_role ar
   where ar.role_key = p_role_key and ar.deleted_at is null and ar.is_active
     and ar.organization_id in (v_org, '39c38960-d30c-4840-b0c1-c9960de95582'::uuid)
   order by (ar.organization_id = v_org) desc limit 1;
  if v_assignable is null then
    raise exception 'hr_role_assign: % is not a registered hr.access_role', p_role_key using errcode = '22023';
  end if;
  if not v_assignable then
    -- `manager` and `employee` are DERIVED, never assigned (§1.4). Refusing by name is what stops
    -- someone "granting" a lane that is computed.
    return hr._governance_refusal(v_org, 'hr_role_assignment', 'role_not_assignable',
      format('%s is a derived role and is never assigned; it is resolved from the reporting line or the login on the person row (SPEC-ACCESS §1.4)', p_role_key),
      p_employment_id);
  end if;

  -- §1.2's gate: the role.assign capability, or org owner
  if not (hr.capability(v_uid, 'role.assign', p_employment_id)
          or exists (select 1 from iam.organization_member om
                      where om.organization_id = v_org and om.user_id = v_uid and om.role = 'owner')) then
    return hr._governance_refusal(v_org, 'hr_role_assignment', 'no_capability',
      'the caller holds neither the role.assign capability over this population nor org ownership',
      p_employment_id);
  end if;

  select em.id into v_actor_emp from hr.employment em
    join hr.employee e on e.id = em.employee_id
   where e.login_user_id = v_uid and em.organization_id = v_org and em.deleted_at is null limit 1;

  -- ARGS-RULED (2026-09-21). THE SCOPE OF A ROLE IS INSIDE THE ORGANIZATION THAT GRANTS IT.
  -- `p_employment_id` is checked (its organization becomes `v_org`, and the caller is gated
  -- against it). `p_scope_id` and `p_scope_employment_ids` were written into hr.role_assignment
  -- raw — so a grant made in one organization could be SCOPED to another organization's
  -- department, location, pay group, crew or people, which is a reach across the wall written by
  -- the very row that is supposed to bound one.
  if p_scope_id is not null then
    if not (case p_scope_kind
              when 'org'        then p_scope_id = v_org
              when 'department' then exists (select 1 from hr.department x where x.id = p_scope_id and x.organization_id = v_org)
              when 'location'   then exists (select 1 from hr.location   x where x.id = p_scope_id and x.organization_id = v_org)
              when 'pay_group'  then exists (select 1 from hr.pay_group  x where x.id = p_scope_id and x.organization_id = v_org)
              when 'crew'       then exists (select 1 from hr.crew       x where x.id = p_scope_id and x.organization_id = v_org)
              else true
            end) then
      return hr._governance_refusal(v_org, 'hr_role_assignment', 'scope_not_in_this_organization',
        format('a %s scope on a role granted here has to be one of this organization''s', p_scope_kind),
        p_employment_id);
    end if;
  end if;
  if coalesce(array_length(p_scope_employment_ids, 1), 0) > 0
     and exists (select 1 from unnest(p_scope_employment_ids) s(id)
                  where not exists (select 1 from hr.employment em
                                     where em.id = s.id and em.organization_id = v_org
                                       and em.deleted_at is null)) then
    return hr._governance_refusal(v_org, 'hr_role_assignment', 'scope_people_not_in_this_organization',
      'every person a role is scoped over is employed by the organization granting it',
      p_employment_id);
  end if;

  -- the scope's shape (hr.role_assignment_scope_shaped), refused by name instead of a raw check violation
  if p_scope_kind is null or p_scope_kind not in ('org', 'department', 'location', 'pay_group', 'crew',
                                                  'direct_reports', 'position_subtree', 'employment_set') then
    return hr._governance_refusal(v_org, 'hr_role_assignment', 'scope_kind_unknown',
      format('%s is not a scope a role can be granted over', coalesce(p_scope_kind, '(none)')), p_employment_id);
  end if;
  if not (case p_scope_kind
            when 'org'            then p_scope_id is null and coalesce(cardinality(p_scope_employment_ids), 0) = 0
            when 'direct_reports' then p_scope_id is null and coalesce(cardinality(p_scope_employment_ids), 0) = 0
            when 'employment_set' then p_scope_id is null and coalesce(cardinality(p_scope_employment_ids), 0) > 0
            else p_scope_id is not null and coalesce(cardinality(p_scope_employment_ids), 0) = 0
          end) then
    return hr._governance_refusal(v_org, 'hr_role_assignment', 'scope_shape_invalid',
      case p_scope_kind
        when 'org'            then 'an org-wide role covers the whole organization granting it, so it takes no scope id and no people'
        when 'direct_reports' then 'a direct-reports role covers the holder''s own reports, so it takes no scope id and no people'
        when 'employment_set' then 'an employment-set role names its people and takes no scope id'
        else format('a %s scope names one %s of this organization and no people', p_scope_kind, replace(p_scope_kind, '_', ' '))
      end, p_employment_id);
  end if;

  perform hr.arm_write();
  insert into hr.role_assignment
    (organization_id, employment_id, role_key, scope_kind, scope_id, scope_employment_ids,
     effective_from, effective_to, granted_by_employment_id, granted_by_user_id, reason)
  values (v_org, p_employment_id, p_role_key, p_scope_kind, p_scope_id, coalesce(p_scope_employment_ids,'{}'),
          p_effective_from, p_effective_to, v_actor_emp, v_uid, p_reason)
  returning id into v_id;

  v_audit := hr._record_access_audit(
    p_organization_id => v_org, p_action => 'write', p_target_token => 'hr_role_assignment',
    p_purpose => 'governance', p_basis => 'role', p_granted => true,
    p_target_ids => ARRAY[v_id], p_sensitivity_tier => 'directory',
    p_subject_employment_id => p_employment_id, p_access_role_key => p_role_key,
    p_justification => p_reason, p_actor_employment_id => v_actor_emp,
    p_request_context => jsonb_build_object('scope_kind', p_scope_kind, 'scope_id', p_scope_id));

  -- the derivation trigger on hr.role_assignment does the grant work synchronously (§2.4)
  return jsonb_build_object('granted', true, 'assignment_id', v_id, 'audit_id', v_audit);
end
$function$;

-- ── hr.hr_review_start_candidates ──
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
                                 and c.metadata ->> 'standing_cycle' = 'individual' and c.deleted_at is null
                                 and r.status not in ('shared', 'acknowledged', 'cancelled')
                               limit 1))
         order by pk.is_report desc, hr._rev_person_name(pk.id)), '[]'::jsonb)
    into v_rows
    from picked pk;
  return jsonb_build_object('ok', true, 'is_hr', v_hr, 'people', v_rows);
end
$function$;

-- ── the declaration: peers are added through peer nomination; manager_may_see_self says what it means ──
update iam.access_setup
   set setup = jsonb_set(setup, '{seats}',
         (select jsonb_agg(case when e ->> 'key' = 'peer'
                                then e || jsonb_build_object('add_via', jsonb_build_object(
                                       'fn', 'hr.review_seat_add_peer(uuid,uuid)', 'action', 'peer_nominate'))
                                else e end order by o)
            from jsonb_array_elements(setup -> 'seats') with ordinality t(e, o)))
       || jsonb_build_object('stage_meaning_fn', 'hr.review_stage_meaning(uuid,text)'),
       declared_by = 'migrations/campaign/accesssetup_o_people_involved_adds_through_the_types_flow.sql'
 where entity_type = 'hr_review';
