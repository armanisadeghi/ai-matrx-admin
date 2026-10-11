-- chair-step: inverse of accesssetup_o — restores iam._access_setup_problems, iam.record_access_setup, iam.record_seat_set, hr.hr_review_cycle_list, hr.hr_review_cycle_get, public.hr_role_assign and hr.hr_review_start_candidates to their bodies before it; removes add_via from the peer seat and stage_meaning_fn from the hr_review setup; drops iam.record_seat_add_via, hr.review_seat_add_peer, iam._access_setup_stage_meaning and hr.review_stage_meaning with their platform.client_callable_door rows. Peer nominations made through the panel stay (they are ordinary nominations).
-- lane: access-setup
-- lock: hr
-- ground-standing-ok: b - the restored bodies (iam._access_setup_problems, iam.record_access_setup) call iam._access_setup_stages, which accesssetup_b_the_seat_and_part_answers_down.sql drops; that sibling runs AFTER this inverse (inverses run in reverse order: o, n, m ... b), so the callee still stands when this one runs.
-- based-on: iam.record_access_setup(text, uuid) 2def879394eb48b4c3c41168c1d7c368649cdcd155a682ab9fe1578bc1aa1046
-- based-on: iam._access_setup_problems(text, jsonb) d63857728f4cd1bf17ad7ea6279196ed38c6c050acb4475f469cf618e238833c
-- based-on: hr.hr_review_cycle_list(uuid) 84e06ddb5d912af2f24f305d7e07fb2557b75b8c38ceff0495e29c50355314b5
-- based-on: hr.hr_review_cycle_get(uuid) 83735b5ecea5b2598dc8e2b710e6427f563566a311057e4cad67608be500570a
-- based-on: iam.record_seat_set(text, uuid, text, uuid, text, text) 354d8ffa2be58820be9f448967485b18db87bf2e153b63a9f3815c5aeb8ba17d
-- based-on: public.hr_role_assign(uuid, text, text, uuid, uuid[], date, date, text) c937e911b6e541e21cc49882af6a9120187592442436263341d0476770ef34ba
-- based-on: hr.hr_review_start_candidates(uuid) beacbe3bd6ae0beef9e5b65941a9245556397b7c2b269a5f9a8f89c6b63de09b

update iam.access_setup
   set setup = jsonb_set(setup, '{seats}',
         (select jsonb_agg(e - 'add_via' order by o) from jsonb_array_elements(setup -> 'seats') with ordinality t(e, o)))
       - 'stage_meaning_fn',
       declared_by = 'migrations/campaign/accesssetup_l_seats_of_asks_from_the_persons_side.sql'
 where entity_type = 'hr_review';

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

  for v_seat in select e from jsonb_array_elements(s -> 'seats') e loop
    v_key := v_seat ->> 'key';
    if coalesce((v_seat ->> 'opens_record')::boolean, true) = false then continue; end if;
    v_may := v_key is distinct from (s ->> 'subject_seat')
             and coalesce(v_seat #>> '{resolver,kind}', '') <> 'grants'
             and v_mine && (coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(v_seat -> 'assignable_by', '[]'::jsonb)) x), '{}') || v_admin);
    v_any_may := v_any_may or v_may;
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
      'may_change', v_may,
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
    'needs_confirm', iam._access_setup_needs_confirm(p_type, v_org, v_caller, array[p_id]),
    'candidates', case when v_any_may then (
        select coalesce(jsonb_agg(iam._access_setup_person(m.user_id, v_org)), '[]'::jsonb)
          from (select distinct m2.user_id from iam.memberships m2
                 where m2.organization_id = v_org and m2.container_type = 'organization'
                   and m2.status = 'active' and m2.deleted_at is null limit 500) m)
      else '[]'::jsonb end);
end
$function$;

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

CREATE OR REPLACE FUNCTION hr.hr_review_cycle_list(p_organization_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'hr'
AS $function$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'reason', 'no_caller'); end if;
  if not hr._rev_can_manage(v_uid, p_organization_id) then
    return jsonb_build_object('ok', false, 'reason', 'not_permitted');
  end if;
  return jsonb_build_object('ok', true, 'cycles', coalesce((
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

CREATE OR REPLACE FUNCTION hr.hr_review_cycle_get(p_cycle_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'hr'
AS $function$
declare v_uid uuid := auth.uid(); c hr.review_cycle%rowtype; v_rows jsonb;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'reason', 'no_caller'); end if;
  select * into c from hr.review_cycle where id = p_cycle_id and deleted_at is null;
  if c.id is null or not hr._rev_can_manage(v_uid, c.organization_id) then
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
  return jsonb_build_object('ok', true,
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
    select em.id, e.login_user_id, hr.manager_as_of(em.id, current_date) as mgr
      from hr.employment em join hr.employee e on e.id = em.employee_id
     where em.organization_id = p_organization_id and em.deleted_at is null and em.status = 'active'
  ), picked as (
    select p.id, (p.mgr in (select id from mine)) as is_report
      from people p
     where p.login_user_id is distinct from v_uid
       and (v_hr or p.mgr in (select id from mine))
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'employment_id', pk.id,
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

revoke execute on function iam.record_seat_add_via(text, uuid, text, uuid) from authenticated;
delete from platform.client_callable_door where (schema_name, function_name) in (('iam', 'record_seat_add_via'), ('hr', 'review_seat_add_peer'));
drop function iam.record_seat_add_via(text, uuid, text, uuid);
drop function hr.review_seat_add_peer(uuid, uuid);
drop function iam._access_setup_stage_meaning(jsonb, uuid, jsonb);
drop function hr.review_stage_meaning(uuid, text);
