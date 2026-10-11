-- chair-step: inverse of accesssetup_store_f — restores iam._access_setup_of(text) and the 16 callers' bodies, the validate trigger and the one-column primary key; drops the scoped lookup, the store check and scope / scope_key. Store rows (scope not null) are DELETED first: the one-column key cannot hold them.
-- lane: access-store
-- lock: iam
-- ground-standing-ok: b - the restored bodies call iam._access_setup_stages, _access_setup_call_uuid and _access_setup_problems; this inverse runs BEFORE accesssetup_b_the_seat_and_part_answers_down (and every later accesssetup inverse), which drops those bodies and their callers together.

CREATE OR REPLACE FUNCTION iam._access_setup_of(p_type text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
  select s.setup from iam.access_setup s where s.entity_type = p_type;
$function$;
insert into platform.client_callable_door (reason, probe_args, declared_at, declared_by, schema_name, refusal_only, function_name, identity_args, argument_rules, contract_probe, gate_predicate, non_client_lane, anonymous_callers, anonymous_purpose, identity_argtypes, signed_in_callers) values ('ACCESS-SETUP: internal to the access-setup primitive; reads declarations and the records they name.', null, '2026-10-10T16:32:12.131212+00:00', 'migrations/campaign/accesssetup_b_the_seat_and_part_answers.sql (lane access-setup)', 'iam', false, '_access_setup_of', 'p_type text', null, null, null, 'server_only: reads one iam.access_setup row for the seat and part functions; it takes the person as an argument, so no client may call it (a client would name anyone)', false, null, array['text'::regtype::oid]::oid[], false) on conflict do nothing;

CREATE OR REPLACE FUNCTION iam._cells_for_now(p_person uuid, p_type text, p_id uuid, p_part text)
 RETURNS TABLE(seat text, level permission_level, rows_rule text, from_stage jsonb, names text, reached boolean, borrowed boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  s jsonb := iam._access_setup_of(p_type);
  v_seats text[]; v_blind text[]; v_stages text[]; v_head jsonb; v_admin text[]; r jsonb; v_lend text[];
  v_seat text; c jsonb; v_held text[];
begin
  if s is null or p_person is null then return; end if;
  v_seats := iam.seats_of(p_person, p_type, p_id);
  v_stages := iam._access_setup_stages(s, p_id);
  v_admin := coalesce((select array_agg(x) from jsonb_array_elements_text(s -> 'admin_seats') x), '{}');

  -- blind_wins: a person who also holds a listed seat keeps that seat's gate on this part — only when they
  -- hold it in their own right (resolver, grant, add), never when a fallback merely filled an empty seat
  v_blind := (select array_agg(x) from jsonb_array_elements_text(s -> 'blind_wins' -> p_part) x);
  if v_blind is not null and v_seats && v_blind then
    v_held := coalesce((select array_agg(distinct t.seat) from iam._seat_rows_of(p_person, p_type, p_id) t
                         where t.source <> 'fallback'), '{}');
    if v_held && v_blind then
      v_seats := (select array_agg(x) from unnest(v_seats) x where x = any(v_blind));
    end if;
  end if;

  foreach v_seat in array coalesce(v_seats, '{}') loop
    c := s -> 'grid' -> v_seat -> p_part;
    if c is not null then
      seat := v_seat; level := (c ->> 'level')::public.permission_level; rows_rule := coalesce(c ->> 'rows', 'all');
      from_stage := c -> 'from_stage'; names := coalesce(c ->> 'names', 'shown');
      reached := iam._access_setup_stage_reached(c -> 'from_stage', v_stages); borrowed := false;
      return next;
    end if;
  end loop;

  -- recorders: when a seat's holder has no login, the lend_to seats borrow that seat's editor cells
  -- (never the subject, never the holder themselves)
  if jsonb_array_length(coalesce(s -> 'recorders', '[]'::jsonb)) > 0
     and not (coalesce(iam.seats_of(p_person, p_type, p_id), '{}') @> array[s ->> 'subject_seat']) then
    v_head := iam._access_setup_facts(s, p_type, p_id);
    for r in select e from jsonb_array_elements(s -> 'recorders') e loop
      v_lend := case when r ->> 'lend_to' = 'admin_seats' then v_admin
                     else (select array_agg(x) from jsonb_array_elements_text(r -> 'lend_to') x) end;
      if coalesce(iam.seats_of(p_person, p_type, p_id), '{}') && coalesce(v_lend, '{}')
         and not (coalesce(iam.seats_of(p_person, p_type, p_id), '{}') @> array[r ->> 'for_seat'])
         and coalesce(v_head, '{}'::jsonb) @> coalesce(r -> 'when_fact', '{}'::jsonb) then
        c := s -> 'grid' -> (r ->> 'for_seat') -> p_part;
        if c is not null and c ->> 'level' = 'editor' then
          seat := r ->> 'for_seat'; level := 'editor'; rows_rule := coalesce(c ->> 'rows', 'all');
          from_stage := c -> 'from_stage'; names := coalesce(c ->> 'names', 'shown');
          reached := iam._access_setup_stage_reached(c -> 'from_stage', v_stages); borrowed := true;
          return next;
        end if;
      end if;
    end loop;
  end if;
end
$function$;

CREATE OR REPLACE FUNCTION iam._part_level_now(p_person uuid, p_type text, p_id uuid, p_part text, p_row_token text DEFAULT NULL::text, p_row_id uuid DEFAULT NULL::uuid)
 RETURNS permission_level
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  s jsonb := iam._access_setup_of(p_type);
  f jsonb; v_part text := p_part; v_lvl public.permission_level; c record; v_mine boolean; v_sub boolean;
begin
  if s is null or p_person is null or p_id is null then return null; end if;
  if p_row_token is not null then
    f := iam._access_setup_facts(s, p_row_token, p_row_id);
    if f is null or (f ->> 'head_id')::uuid is distinct from p_id then return null; end if;
    v_part := coalesce(v_part, f ->> 'part');
    if f ->> 'part' is not null and f ->> 'part' <> v_part then return null; end if;
    v_mine := (f ->> 'author')::uuid is not distinct from p_person and f ->> 'author' is not null;
    v_sub := f ->> 'status' = 'submitted';
    -- authorship always reads: the author holds viewer on their own live row at every stage
    if v_mine and coalesce((f ->> 'live')::boolean, true) then v_lvl := 'viewer'; end if;
  end if;
  for c in select * from iam._cells_for(p_person, p_type, p_id, v_part) loop
    if c.reached and (f is null or case c.rows_rule
                                      when 'all' then true
                                      when 'own' then coalesce(v_mine, false)
                                      when 'submitted' then coalesce(v_sub, false)
                                      when 'own_or_submitted' then coalesce(v_mine, false) or coalesce(v_sub, false)
                                      else false end) then
      v_lvl := greatest(v_lvl, c.level);
    end if;
  end loop;
  return v_lvl;
end
$function$;

CREATE OR REPLACE FUNCTION iam._seat_rows_of(p_person uuid, p_type text, p_id uuid)
 RETURNS TABLE(seat text, source text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
-- iam._seat_table_now's rows for ONE person (seat, source), asked from the person's side: a function resolver's
-- person-scoped form (resolver.has_fn) answers "is this person in the seat"; a seat's whole holder list is read only
-- when this person could fill it by fallback (an active owner/admin of the record's organization, the seat required,
-- its fallback fact met) and the seat would otherwise be empty. Same rules as iam._seat_table_now: excludes win,
-- an add counts only when the resolver did not already name the person, the subject seat's holders sit in no other
-- seat. Statement memo per (person, type, id, snapshot) while iam.kernel_batch_on(person).
declare
  s jsonb; v_key text; v_m text; v_j jsonb := '[]'::jsonb; v_chg jsonb; v_seat jsonb; v_k text; v_kind text;
  v_subject_key text; v_org uuid; v_in boolean; v_add boolean; v_excl boolean; v_src text; v_proc regprocedure;
  v_owner boolean; v_head jsonb; v_subject uuid[]; v_res uuid[]; v_adds uuid[]; v_excls uuid[]; v_sseat jsonb;
begin
  if p_person is null or p_id is null then return; end if;
  v_key := 'iam._seat_rows_of:' || p_person::text || ':' || coalesce(p_type, '') || ':' || p_id::text || ':'
        || pg_catalog.pg_current_snapshot()::text;
  v_m := platform.memo_k_get(v_key);
  if v_m is not null then
    return query select e ->> 0, e ->> 1 from jsonb_array_elements(v_m::jsonb) e;
    return;
  end if;
  s := iam._access_setup_of(p_type);
  if s is null then return; end if;
  v_org := iam._access_setup_head_org(p_type, p_id);
  if v_org is not null then
    v_subject_key := s ->> 'subject_seat';
    v_chg := coalesce((select jsonb_agg(jsonb_build_object('s', c.seat_key, 'u', c.user_id, 'c', c.change))
                         from iam.record_seat_change c
                        where c.entity_type = p_type and c.record_id = p_id and c.deleted_at is null
                          and c.change in ('add', 'exclude')), '[]'::jsonb);
    <<seats>>
    for v_seat in
      select e from jsonb_array_elements(s -> 'seats') e
       order by (e ->> 'key') is distinct from v_subject_key
    loop
      v_k := v_seat ->> 'key';
      v_kind := v_seat #>> '{resolver,kind}';
      v_excl := v_chg @> jsonb_build_array(jsonb_build_object('s', v_k, 'u', p_person, 'c', 'exclude'));
      v_add := v_chg @> jsonb_build_array(jsonb_build_object('s', v_k, 'u', p_person, 'c', 'add'));
      v_in := false; v_src := case when v_kind = 'grants' then 'grant' else 'resolver' end;
      if not v_excl then
        if v_kind = 'function' and v_seat #>> '{resolver,has_fn}' is not null then
          v_proc := to_regprocedure(v_seat #>> '{resolver,has_fn}');
          if v_proc is null then
            raise exception 'access setup: has_fn % does not exist', v_seat #>> '{resolver,has_fn}' using errcode = '42883';
          end if;
          execute format('select coalesce(%s($1, $2), false)', v_proc::regproc) into v_in using p_person, p_id;
        elsif v_kind = 'grants' then
          v_in := exists (select 1 from iam.permissions p
                           where p.resource_type = p_type and p.resource_id = p_id and p.granted_to_user_id = p_person
                             and coalesce(p.status, 'active') = 'active'
                             and (p.expires_at is null or p.expires_at > now()));
        elsif v_kind = 'function' then
          v_in := p_person = any(iam._seat_resolve_all(v_seat, p_type, p_id));
        end if;
      end if;
      if v_in then
        v_j := v_j || jsonb_build_array(jsonb_build_array(v_k, v_src));
      elsif v_add and not v_excl then
        v_j := v_j || jsonb_build_array(jsonb_build_array(v_k, 'added'));
      elsif v_k is distinct from v_subject_key and not v_excl
            and coalesce((v_seat ->> 'required')::boolean, false) and v_seat ->> 'fallback' = 'org_owners_admins' then
        if v_owner is null then
          v_owner := exists (select 1 from iam.memberships m
                              where m.organization_id = v_org and m.user_id = p_person and m.container_type = 'organization'
                                and m.role in ('owner', 'admin') and m.status = 'active' and m.deleted_at is null);
        end if;
        if v_owner then
          if v_seat ? 'fallback_when_fact' and v_head is null then
            v_head := coalesce(iam._access_setup_facts(s, p_type, p_id), '{}'::jsonb);
          end if;
          if not (v_seat ? 'fallback_when_fact') or v_head @> (v_seat -> 'fallback_when_fact') then
            -- is the seat otherwise empty? (the only place a whole holder list is read)
            if v_subject is null then
              v_sseat := (select e from jsonb_array_elements(s -> 'seats') e where e ->> 'key' = v_subject_key limit 1);
              v_excls := coalesce((select array_agg(distinct (e ->> 'u')::uuid) from jsonb_array_elements(v_chg) e
                                    where e ->> 's' = v_subject_key and e ->> 'c' = 'exclude'), '{}');
              v_subject := coalesce((select array_agg(x) from unnest(
                             case when v_sseat is null then '{}'::uuid[] else iam._seat_resolve_all(v_sseat, p_type, p_id) end
                             || coalesce((select array_agg(distinct (e ->> 'u')::uuid) from jsonb_array_elements(v_chg) e
                                           where e ->> 's' = v_subject_key and e ->> 'c' = 'add'), '{}')) x
                             where not x = any(v_excls)), '{}');
            end if;
            v_excls := coalesce((select array_agg(distinct (e ->> 'u')::uuid) from jsonb_array_elements(v_chg) e
                                  where e ->> 's' = v_k and e ->> 'c' = 'exclude'), '{}');
            v_res := iam._seat_resolve_all(v_seat, p_type, p_id);
            v_adds := coalesce((select array_agg(distinct (e ->> 'u')::uuid) from jsonb_array_elements(v_chg) e
                                 where e ->> 's' = v_k and e ->> 'c' = 'add'), '{}');
            if not exists (select 1 from unnest(v_res || v_adds) x
                            where not x = any(v_excls) and not x = any(v_subject)) then
              v_j := v_j || jsonb_build_array(jsonb_build_array(v_k, 'fallback'));
            end if;
          end if;
        end if;
      end if;
      -- the subject sits in no other seat
      exit seats when v_k = v_subject_key and jsonb_array_length(v_j) > 0;
    end loop;
  end if;
  if iam.kernel_batch_on(p_person) then perform platform.memo_k_put(v_key, v_j::text); end if;
  return query select e ->> 0, e ->> 1 from jsonb_array_elements(v_j) e;
end
$function$;

CREATE OR REPLACE FUNCTION iam._seat_table_now(p_type text, p_id uuid)
 RETURNS TABLE(seat text, user_id uuid, source text, removable boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  s jsonb := iam._access_setup_of(p_type);
  v_seat jsonb; v_key text; v_kind text; v_org uuid; v_required boolean;
  v_subject_key text; v_subject uuid[] := '{}';
  v_res uuid[]; v_src text; v_add uuid[]; v_excl uuid[]; v_fb uuid[]; v_n integer; v_head jsonb;
  v_chg jsonb;
begin
  if s is null or p_id is null then return; end if;
  v_subject_key := s ->> 'subject_seat';
  v_org := iam._access_setup_head_org(p_type, p_id);
  if v_org is null then return; end if;
  -- the record's live seat changes, read once (not twice per seat)
  v_chg := coalesce((select jsonb_agg(jsonb_build_object('s', c.seat_key, 'u', c.user_id, 'c', c.change))
                       from iam.record_seat_change c
                      where c.entity_type = p_type and c.record_id = p_id and c.deleted_at is null
                        and c.change in ('add', 'exclude')), '[]'::jsonb);

  -- the subject seat first, so every other seat can drop its holders
  for v_seat in
    select e from jsonb_array_elements(s -> 'seats') e
     order by (e ->> 'key') is distinct from v_subject_key
  loop
    v_key := v_seat ->> 'key';
    v_kind := v_seat #>> '{resolver,kind}';
    v_required := coalesce((v_seat ->> 'required')::boolean, false);
    v_res := '{}'; v_src := 'resolver'; v_fb := '{}';
    if v_kind = 'function' then
      v_res := coalesce((select array_agg(distinct x::uuid) from jsonb_array_elements_text(
                 coalesce(iam._access_setup_call_uuid(v_seat #>> '{resolver,fn}', p_id), '[]'::jsonb)) x
                 where x is not null), '{}');
    elsif v_kind = 'grants' then
      v_src := 'grant';
      v_res := coalesce((select array_agg(distinct p.granted_to_user_id) from iam.permissions p
                          where p.resource_type = p_type and p.resource_id = p_id and p.granted_to_user_id is not null
                            and coalesce(p.status, 'active') = 'active'
                            and (p.expires_at is null or p.expires_at > now())), '{}');
    end if;
    v_add := coalesce((select array_agg(distinct (e ->> 'u')::uuid) from jsonb_array_elements(v_chg) e
                        where e ->> 's' = v_key and e ->> 'c' = 'add'), '{}');
    v_excl := coalesce((select array_agg(distinct (e ->> 'u')::uuid) from jsonb_array_elements(v_chg) e
                         where e ->> 's' = v_key and e ->> 'c' = 'exclude'), '{}');
    v_res := coalesce((select array_agg(x) from unnest(v_res) x where not x = any(v_excl)), '{}');
    v_add := coalesce((select array_agg(x) from unnest(v_add) x where not x = any(v_excl) and not x = any(v_res)), '{}');
    if v_key = v_subject_key then
      v_subject := v_res || v_add;
    else
      -- the subject rule: other seats never resolve to the person the record is about
      v_res := coalesce((select array_agg(x) from unnest(v_res) x where not x = any(v_subject)), '{}');
      v_add := coalesce((select array_agg(x) from unnest(v_add) x where not x = any(v_subject)), '{}');
      -- the fallback: a required seat is never empty — unless the seat's fallback_when_fact says the record
      -- itself names the holder (a manager employment without a login is filled by the recorder rule)
      if v_required and cardinality(v_res) + cardinality(v_add) = 0
         and v_seat ->> 'fallback' = 'org_owners_admins' then
        if v_seat ? 'fallback_when_fact' and v_head is null then
          v_head := coalesce(iam._access_setup_facts(s, p_type, p_id), '{}'::jsonb);
        end if;
        if not (v_seat ? 'fallback_when_fact') or v_head @> (v_seat -> 'fallback_when_fact') then
          v_fb := coalesce((select array_agg(distinct m.user_id) from iam.memberships m
                             where m.organization_id = v_org and m.container_type = 'organization'
                               and m.role in ('owner', 'admin') and m.status = 'active' and m.deleted_at is null
                               and not (m.user_id = any(v_subject))
                               and not (m.user_id = any(v_excl))), '{}');
        end if;
      end if;
    end if;
    v_n := cardinality(v_res) + cardinality(v_add) + cardinality(v_fb);
    return query
      select v_key, x, v_src, not v_required or v_n > 1 from unnest(v_res) x
      union all
      select v_key, x, 'added', true from unnest(v_add) x
      union all
      select v_key, x, 'fallback', false from unnest(v_fb) x;
  end loop;
end
$function$;

CREATE OR REPLACE FUNCTION iam.access_setup_check(p_type text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare v_p text[] := iam._access_setup_problems(p_type, iam._access_setup_of(p_type));
begin
  return jsonb_build_object('ok', cardinality(v_p) = 0, 'entity_type', p_type, 'problems', to_jsonb(v_p));
end
$function$;

CREATE OR REPLACE FUNCTION iam.may_act_seat(p_person uuid, p_type text, p_id uuid, p_action text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  s jsonb := iam._access_setup_of(p_type);
  a jsonb; v_seats text[]; v_head jsonb; v_admin text[]; r jsonb; v_lend text[];
begin
  if s is null or p_person is null or p_id is null then return false; end if;
  a := s -> 'actions' -> p_action;
  if a is null then return false; end if;
  v_seats := coalesce(iam.seats_of(p_person, p_type, p_id), '{}');
  -- recorders lend the absent holder's actions too, unless the action says "recorders": false
  if coalesce((a ->> 'recorders')::boolean, true) and not (v_seats @> array[s ->> 'subject_seat']) then
    v_head := coalesce(iam._access_setup_facts(s, p_type, p_id), '{}'::jsonb);
    v_admin := coalesce((select array_agg(x) from jsonb_array_elements_text(s -> 'admin_seats') x), '{}');
    for r in select e from jsonb_array_elements(coalesce(s -> 'recorders', '[]'::jsonb)) e loop
      v_lend := case when r ->> 'lend_to' = 'admin_seats' then v_admin
                     else (select array_agg(x) from jsonb_array_elements_text(r -> 'lend_to') x) end;
      if v_seats && coalesce(v_lend, '{}') and not (v_seats @> array[r ->> 'for_seat'])
         and v_head @> coalesce(r -> 'when_fact', '{}'::jsonb) then
        v_seats := v_seats || (r ->> 'for_seat');
      end if;
    end loop;
  end if;
  return v_seats && coalesce((select array_agg(x) from jsonb_array_elements_text(a -> 'seats') x), '{}');
end
$function$;

CREATE OR REPLACE FUNCTION iam.may_act(p_person uuid, p_type text, p_id uuid, p_action text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  s jsonb := iam._access_setup_of(p_type);
  a jsonb; v_stages text[]; v_head jsonb;
begin
  if s is null or p_person is null or p_id is null then return false; end if;
  a := s -> 'actions' -> p_action;
  if a is null then return false; end if;
  if not iam.may_act_seat(p_person, p_type, p_id, p_action) then return false; end if;
  v_stages := iam._access_setup_stages(s, p_id);
  if a ? 'stages' and not (v_stages && (select array_agg(x) from jsonb_array_elements_text(a -> 'stages') x)) then
    return false;
  end if;
  if a ? 'not_stages' and v_stages && (select array_agg(x) from jsonb_array_elements_text(a -> 'not_stages') x) then
    return false;
  end if;
  if a ? 'when_fact' then
    v_head := coalesce(iam._access_setup_facts(s, p_type, p_id), '{}'::jsonb);
    if not (v_head @> (a -> 'when_fact')) then return false; end if;
  end if;
  return true;
end
$function$;

CREATE OR REPLACE FUNCTION iam.parts_for(p_person uuid, p_type text, p_id uuid)
 RETURNS TABLE(part text, level permission_level, rows_rule text, opens_at_stage jsonb, names text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare s jsonb := iam._access_setup_of(p_type); v_part text;
begin
  if s is null or p_person is null then return; end if;
  for v_part in select e ->> 'key' from jsonb_array_elements(s -> 'parts') e loop
    part := v_part;
    level := iam.part_level(p_person, p_type, p_id, v_part);
    select c.rows_rule, c.names into rows_rule, names
      from iam._cells_for(p_person, p_type, p_id, v_part) c
     where c.reached order by c.level desc limit 1;
    -- what is still to open: the earliest unreached cell's stage
    select c.from_stage into opens_at_stage
      from iam._cells_for(p_person, p_type, p_id, v_part) c
     where not c.reached order by c.level desc limit 1;
    if level is not null or opens_at_stage is not null then return next; end if;
    rows_rule := null; names := null; opens_at_stage := null;
  end loop;
end
$function$;

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

CREATE OR REPLACE FUNCTION iam.record_seat_clear(p_type text, p_id uuid, p_seat text, p_user uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_caller uuid := auth.uid(); s jsonb := iam._access_setup_of(p_type); v_seat jsonb; v_org uuid;
  v_mine text[]; v_may text[]; v_change text; v_audit uuid;
begin
  if v_caller is null then return jsonb_build_object('ok', false, 'reason', 'no_caller'); end if;
  if s is null then return jsonb_build_object('ok', false, 'reason', 'no_setup'); end if;
  select e into v_seat from jsonb_array_elements(s -> 'seats') e where e ->> 'key' = p_seat;
  if v_seat is null then return jsonb_build_object('ok', false, 'reason', 'validation', 'field', 'seat'); end if;
  v_org := iam._access_setup_head_org(p_type, p_id);
  if v_org is null then return jsonb_build_object('ok', false, 'reason', 'not_reachable'); end if;
  v_mine := coalesce(iam.seats_of(v_caller, p_type, p_id), '{}');
  if cardinality(v_mine) = 0 then return jsonb_build_object('ok', false, 'reason', 'not_reachable'); end if;
  v_may := coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(v_seat -> 'assignable_by', '[]'::jsonb)
                                                                        || coalesce(s -> 'admin_seats', '[]'::jsonb)) x), '{}');
  if not (v_mine && v_may) then return jsonb_build_object('ok', false, 'reason', 'not_permitted'); end if;
  update iam.record_seat_change c set deleted_at = now(), archived_by = v_caller
   where c.entity_type = p_type and c.record_id = p_id and c.seat_key = p_seat and c.user_id = p_user and c.deleted_at is null
  returning c.change into v_change;
  if v_change is null then return jsonb_build_object('ok', false, 'reason', 'nothing_to_undo'); end if;
  v_audit := iam._record_access_audit(
    p_organization_id => v_org, p_action => 'seat_change', p_target_token => p_type,
    p_data_class => coalesce(iam.class_gate_class(p_type), 'organization'), p_purpose => 'access_setup',
    p_basis => coalesce(v_seat #>> '{resolver,kind}', 'record_seat_change'), p_granted => true,
    p_target_ids => array[p_id], p_row_count => 1, p_subject_user_id => p_user,
    p_justification => format('undo %s %s seat', v_change, p_seat), p_is_emergency_door => false,
    p_actor_user_id => v_caller, p_granted_to_user_id => p_user);
  return jsonb_build_object('ok', true, 'undone', v_change, 'audit_id', v_audit);
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

CREATE OR REPLACE FUNCTION iam.record_setup_confirm(p_type text, p_ids uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_caller uuid := auth.uid(); s jsonb := iam._access_setup_of(p_type); v_org uuid; v_id uuid; v_o uuid; v_audit uuid;
  v_changers text[]; v_admin_seats text[]; v_is_admin boolean := true;
begin
  if v_caller is null then return jsonb_build_object('ok', false, 'reason', 'no_caller'); end if;
  if s is null then return jsonb_build_object('ok', false, 'reason', 'no_setup'); end if;
  if coalesce(cardinality(p_ids), 0) = 0 or cardinality(p_ids) > 500 then
    return jsonb_build_object('ok', false, 'reason', 'validation', 'field', 'ids');
  end if;
  -- only a person who may change the setup confirms it: the admin seats or a seat named in any assignable_by
  v_changers := coalesce((select array_agg(distinct x) from (
      select jsonb_array_elements_text(coalesce(s -> 'admin_seats', '[]'::jsonb)) x
      union select jsonb_array_elements_text(coalesce(e -> 'assignable_by', '[]'::jsonb)) from jsonb_array_elements(s -> 'seats') e) q), '{}');
  v_admin_seats := coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(s -> 'admin_seats', '[]'::jsonb)) x), '{}');
  foreach v_id in array p_ids loop
    v_o := iam._access_setup_head_org(p_type, v_id);
    if v_o is null or cardinality(coalesce(iam.seats_of(v_caller, p_type, v_id), '{}')) = 0 then
      return jsonb_build_object('ok', false, 'reason', 'not_reachable');
    end if;
    if not (coalesce(iam.seats_of(v_caller, p_type, v_id), '{}') && v_changers) then
      return jsonb_build_object('ok', false, 'reason', 'not_permitted');
    end if;
    if v_org is not null and v_o <> v_org then
      return jsonb_build_object('ok', false, 'reason', 'validation', 'field', 'ids');
    end if;
    v_org := v_o;
    -- the organization counts only a confirm by an admin-seat holder (HR) on every named record, or an organization owner/admin
    if not (coalesce(iam.seats_of(v_caller, p_type, v_id), '{}') && v_admin_seats) then v_is_admin := false; end if;
  end loop;
  if not v_is_admin and exists (select 1 from iam.memberships m where m.organization_id = v_org and m.user_id = v_caller
        and m.container_type = 'organization' and m.role in ('owner', 'admin') and m.status = 'active' and m.deleted_at is null) then
    v_is_admin := true;
  end if;
  v_audit := iam._record_access_audit(
    p_organization_id => v_org, p_action => 'seat_confirm', p_target_token => p_type,
    p_data_class => coalesce(iam.class_gate_class(p_type), 'organization'), p_purpose => 'access_setup',
    p_basis => case when v_is_admin then 'access_setup_admin' else 'access_setup_peer' end, p_granted => true, p_target_ids => p_ids, p_row_count => cardinality(p_ids),
    p_justification => 'people involved confirmed', p_is_emergency_door => false, p_actor_user_id => v_caller);
  return jsonb_build_object('ok', true, 'audit_id', v_audit);
end
$function$;

CREATE OR REPLACE FUNCTION iam.records_where_seated(p_person uuid, p_type text, p_org_filter uuid DEFAULT NULL::uuid)
 RETURNS SETOF uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  s jsonb := iam._access_setup_of(p_type);
  v_seat jsonb; v_proc regprocedure; v_rel regclass; v_cand uuid[] := '{}'; v_more uuid[];
begin
  if s is null or p_person is null then return; end if;
  select et.table_ref into v_rel from platform.entity_types et where et.token = p_type;
  -- candidates: each resolver's own set form
  for v_seat in select e from jsonb_array_elements(s -> 'seats') e loop
    if v_seat #>> '{resolver,set_fn}' is not null then
      v_proc := to_regprocedure(v_seat #>> '{resolver,set_fn}');
      if v_proc is null then
        raise exception 'access setup: set_fn % does not exist', v_seat #>> '{resolver,set_fn}' using errcode = '42883';
      end if;
      execute format('select coalesce(array_agg(x), ''{}'') from %s($1) x', v_proc::regproc) into v_more using p_person;
      v_cand := v_cand || v_more;
    end if;
  end loop;
  -- grants and adds
  v_cand := v_cand || coalesce((select array_agg(p.resource_id) from iam.permissions p
                                 where p.resource_type = p_type and p.granted_to_user_id = p_person
                                   and coalesce(p.status, 'active') = 'active'), '{}')
                   || coalesce((select array_agg(c.record_id) from iam.record_seat_change c
                                 where c.entity_type = p_type and c.user_id = p_person and c.change = 'add'
                                   and c.deleted_at is null), '{}');
  -- fallback seats: records in organizations the person owns or administers
  if exists (select 1 from jsonb_array_elements(s -> 'seats') e where e ->> 'fallback' is not null) and v_rel is not null then
    execute format('select coalesce(array_agg(t.id), ''{}'') from %s t where t.organization_id in (
                      select m.organization_id from iam.memberships m where m.user_id = $1
                         and m.container_type = ''organization'' and m.role in (''owner'',''admin'')
                         and m.status = ''active'' and m.deleted_at is null)', v_rel)
      into v_more using p_person;
    v_cand := v_cand || v_more;
  end if;
  -- the truth is seats_of; the candidates only bound the work
  return query
    select distinct x from unnest(v_cand) x
     where cardinality(coalesce(iam.seats_of(p_person, p_type, x), '{}')) > 0
       and (p_org_filter is null or iam._access_setup_head_org(p_type, x) = p_org_filter);
end
$function$;

CREATE OR REPLACE FUNCTION iam.redact_by_parts(p_type text, p_id uuid, p_person uuid, p_json jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  s jsonb := iam._access_setup_of(p_type);
  k text; spec jsonb; v_part text; v_min public.permission_level; v_lvl public.permission_level;
  v_col text; v_sub text; v_out jsonb := p_json; v_keep jsonb;
begin
  if s is null or p_json is null or jsonb_typeof(p_json) <> 'object' then return p_json; end if;
  for k, spec in select * from jsonb_each(coalesce(s -> 'columns', '{}'::jsonb)) loop
    v_part := case when jsonb_typeof(spec) = 'string' then spec #>> '{}' else spec ->> 'part' end;
    v_min := coalesce(case when jsonb_typeof(spec) = 'object' then spec ->> 'min_level' end, 'viewer')::public.permission_level;
    v_col := split_part(k, '.', 1);
    v_sub := nullif(split_part(k, '.', 2), '');
    continue when not (v_out ? v_col);
    v_lvl := iam.part_level(p_person, p_type, p_id, v_part);
    continue when v_lvl is not null and v_lvl >= v_min;
    v_keep := case when jsonb_typeof(spec) = 'object' then spec -> 'else_keep_keys' end;
    if v_keep is not null and jsonb_typeof(v_out -> v_col) = 'array' then
      v_out := jsonb_set(v_out, array[v_col], coalesce((
        select jsonb_agg((select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb)
                            from jsonb_each(el) e where e.key in (select jsonb_array_elements_text(v_keep))))
          from jsonb_array_elements(v_out -> v_col) el), '[]'::jsonb));
    elsif v_sub is not null and jsonb_typeof(v_out -> v_col) = 'array' then
      v_out := jsonb_set(v_out, array[v_col], coalesce((
        select jsonb_agg(el - v_sub) from jsonb_array_elements(v_out -> v_col) el), '[]'::jsonb));
    elsif v_sub is not null and jsonb_typeof(v_out -> v_col) = 'object' then
      v_out := jsonb_set(v_out, array[v_col], (v_out -> v_col) - v_sub);
    else
      v_out := jsonb_set(v_out, array[v_col], 'null'::jsonb);
    end if;
  end loop;
  return v_out;
end
$function$;

CREATE OR REPLACE FUNCTION iam.seats_of(p_person uuid, p_type text, p_id uuid)
 RETURNS text[]
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
-- the seats one person holds on one record, asked from the person's side (iam._seat_rows_of: each resolver's
-- person-scoped form; iam._seat_table stays the holder list for the panel and iam.seat_holders); asked once per
-- (person, type, id, snapshot) per statement while iam.kernel_batch_on(person) (a slot this statement holds answers first)
declare v_key text; v_m text; v_s text[];
begin
  if p_person is null then return null; end if;
  v_key := 'iam.seats_of:' || p_person::text || ':' || coalesce(p_type, '') || ':' || coalesce(p_id::text, '') || ':'
        || pg_catalog.pg_current_snapshot()::text;
  v_m := platform.memo_k_get(v_key);
  if v_m is not null then return v_m::text[]; end if;
  if iam._access_setup_of(p_type) is null then return null; end if;
  if not iam.kernel_batch_on(p_person) then v_key := null; end if;
  v_s := coalesce((select array_agg(distinct t.seat order by t.seat)
                     from iam._seat_rows_of(p_person, p_type, p_id) t), '{}'::text[]);
  if v_key is not null then perform platform.memo_k_put(v_key, v_s::text); end if;
  return v_s;
end
$function$;

CREATE OR REPLACE FUNCTION iam.seats_opening(p_person uuid, p_type text, p_id uuid)
 RETURNS text[]
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
  select case when iam._access_setup_of(p_type) is null or p_person is null then null
              else coalesce((select array_agg(x order by x) from unnest(iam.seats_of(p_person, p_type, p_id)) x
                              where coalesce((select (e ->> 'opens_record')::boolean
                                                from jsonb_array_elements(iam._access_setup_of(p_type) -> 'seats') e
                                               where e ->> 'key' = x), true)), '{}'::text[]) end;
$function$;

CREATE OR REPLACE FUNCTION iam._access_setup_validate()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog'
AS $function$
declare v_p text[] := iam._access_setup_problems(new.entity_type, new.setup);
begin
  if cardinality(v_p) > 0 then
    raise exception 'access setup for % refused: %', new.entity_type, array_to_string(v_p, '; ')
      using errcode = '23514';
  end if;
  new.updated_at := now();
  return new;
end
$function$;

delete from platform.client_callable_door where schema_name = 'iam'
   and function_name in ('_access_setup_of_table', '_access_setup_problems_store')
    or (schema_name = 'iam' and function_name = '_access_setup_of' and identity_args = 'p_type text, p_id uuid')
    or (schema_name = 'iam' and function_name = 'access_setup_check' and identity_args = 'p_type text, p_scope jsonb');
drop function if exists iam.access_setup_check(text, jsonb);
drop function if exists iam._access_setup_problems_store(jsonb, jsonb);
drop function if exists iam._access_setup_of_table(uuid);
drop function if exists iam._access_setup_of(text, uuid);
delete from iam.access_setup where scope is not null;
alter table iam.access_setup drop constraint access_setup_pkey;
alter table iam.access_setup drop constraint if exists access_setup_scope_check;
alter table iam.access_setup drop column scope_key;
alter table iam.access_setup drop column scope;
alter table iam.access_setup add constraint access_setup_pkey primary key (entity_type);
