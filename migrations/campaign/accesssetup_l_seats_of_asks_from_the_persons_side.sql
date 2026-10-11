-- chair-step: iam.seats_of answers from the PERSON's side. Each function resolver of a declared setup gets a person-scoped form (resolver.has_fn, (person uuid, record uuid) -> boolean; the setup check now requires it), and the new iam._seat_rows_of (one person's (seat, source) rows of iam._seat_table_now, statement-memoised) asks those forms instead of listing every holder of every seat; a seat's full holder list is read only when this person could fill it by fallback and it would otherwise be empty. iam.seats_of and iam._cells_for_now's blind_wins check read it; iam._seat_table / iam.seat_holders stay the holder list for the panel. Seven hr.review_seat_*_has forms added and declared on the hr_review setup. Every answer is unchanged (old vs new seats_of and rows agree on the live reviews; the six-configuration fixture proof on the clone).
-- lane: access-setup
-- lock: iam
-- based-on: iam.seats_of(uuid, text, uuid) 74b821ec66c76da61a738f0e58ecc7d426dce06792ffa00f6c41521efa3f6991
-- based-on: iam._cells_for_now(uuid, text, uuid, text) d125aeb0be14e312d540cc48f1017a5f1e382ef5b53da7779c043668e774f8f4
-- based-on: iam._access_setup_problems(text, jsonb) 42c6d0c81425103f5a8bf6d4b7e438e98681b52018ed6a51a5c6779da90f3a8f
--
-- Plan: common-docs/systems/platform/access/projects/access-setup/PLAN.md §4 (owner ruling 2, performance: a person-scoped seats_of).
-- Inverse: migrations/inverse/accesssetup_l_seats_of_asks_from_the_persons_side_down.sql

-- ── the person-scoped resolver forms: "is THIS person in the seat on this review" ──────────────────────
-- Each answers exactly `p_person = any(hr.review_seat_<x>(p_review_id))` without listing the seat's holders.

create or replace function hr._review_login_holds_employment(p_person uuid, p_employment_id uuid)
 returns boolean
 language sql
 stable security definer
 set search_path to 'hr', 'public'
as $function$
  -- p_person = any(hr._review_logins_of_employment(p_employment_id)), from the person's side
  select p_person is not null and p_employment_id is not null and exists (
    select 1 from hr.employment em
      join hr.employee e on e.id = em.employee_id and e.deleted_at is null
     where em.id = p_employment_id and em.deleted_at is null and e.login_user_id = p_person
       and em.hire_date <= current_date
       and (em.termination_date is null or em.termination_date >= current_date));
$function$;

create or replace function hr.review_seat_employee_has(p_person uuid, p_review_id uuid)
 returns boolean
 language sql
 stable security definer
 set search_path to 'hr', 'public'
as $function$
  select p_person is not null and exists (
    select 1 from hr.review r where r.id = p_review_id and r.deleted_at is null
       and (r.employee_user_id = p_person or hr._review_login_holds_employment(p_person, r.employment_id)));
$function$;

create or replace function hr.review_seat_manager_has(p_person uuid, p_review_id uuid)
 returns boolean
 language sql
 stable security definer
 set search_path to 'hr', 'public'
as $function$
  select p_person is not null and exists (
    select 1 from hr.review r where r.id = p_review_id and r.deleted_at is null
       and (r.manager_user_id = p_person or hr._review_login_holds_employment(p_person, r.manager_employment_id)));
$function$;

create or replace function hr._review_org_capable_has(p_person uuid, p_org uuid, p_capability text)
 returns boolean
 language sql
 stable security definer
 set search_path to 'hr', 'public'
as $function$
  -- p_person = any(hr._review_org_capable(p_org, p_capability)), from the person's side
  select p_person is not null and p_org is not null
     and exists (select 1 from hr.employee e
                   join hr.employment em on em.employee_id = e.id and em.deleted_at is null
                   join hr.role_assignment ra on ra.employment_id = em.id
                  where e.login_user_id = p_person and e.deleted_at is null
                    and ra.organization_id = p_org and ra.is_active and ra.revoked_at is null)
     and coalesce(hr.capability(p_person, p_capability, null, current_date, p_org), false);
$function$;

create or replace function hr.review_seat_hr_has(p_person uuid, p_review_id uuid)
 returns boolean
 language sql
 stable security definer
 set search_path to 'hr', 'public'
as $function$
  select coalesce((select hr._review_org_capable_has(p_person, r.organization_id, 'performance.manage')
                     from hr.review r where r.id = p_review_id and r.deleted_at is null), false);
$function$;

create or replace function hr.review_seat_upper_has(p_person uuid, p_review_id uuid)
 returns boolean
 language sql
 stable security definer
 set search_path to 'hr', 'public'
as $function$
  select coalesce((select hr._review_org_capable_has(p_person, r.organization_id, 'performance.read_all')
                     from hr.review r where r.id = p_review_id and r.deleted_at is null), false);
$function$;

create or replace function hr.review_seat_skip_level_has(p_person uuid, p_review_id uuid)
 returns boolean
 language sql
 stable security definer
 set search_path to 'hr', 'public'
as $function$
  select coalesce((select r.manager_employment_id is not null and hr._review_skip_level_on(r.organization_id)
                          and hr._review_login_holds_employment(p_person, hr.manager_as_of(r.manager_employment_id, current_date))
                     from hr.review r where r.id = p_review_id and r.deleted_at is null), false);
$function$;

create or replace function hr.review_seat_peers_has(p_person uuid, p_review_id uuid)
 returns boolean
 language sql
 stable security definer
 set search_path to 'hr', 'public'
as $function$
  select p_person is not null and exists (
    select 1 from hr.review_peer_nomination n join hr.review r on r.id = n.review_id and r.deleted_at is null
     where n.review_id = p_review_id and n.status = 'approved' and n.deleted_at is null and n.peer_user_id = p_person);
$function$;

create or replace function hr.review_seat_line_manager_has(p_person uuid, p_review_id uuid)
 returns boolean
 language plpgsql
 stable security definer
 set search_path to 'hr', 'public'
as $function$
-- p_person = any(hr.review_seat_line_manager(p_review_id)): the person's own current employments first (a person
-- with none manages nobody), then the review's chain and the managers of every review of the same employment
declare v_mine uuid[]; r hr.review%rowtype;
begin
  if p_person is null then return false; end if;
  select coalesce(array_agg(em.id), '{}') into v_mine
    from hr.employee e join hr.employment em on em.employee_id = e.id and em.deleted_at is null
   where e.login_user_id = p_person and e.deleted_at is null
     and em.hire_date <= current_date and (em.termination_date is null or em.termination_date >= current_date);
  if cardinality(v_mine) = 0 then return false; end if;
  select * into r from hr.review where id = p_review_id and deleted_at is null;
  if r.id is null then return false; end if;
  return exists (select 1 from hr.review r2
                  where r2.employment_id = r.employment_id and r2.deleted_at is null
                    and r2.manager_employment_id = any(v_mine))
      or exists (select 1 from hr.manager_chain(r.employment_id, current_date) mc
                  where mc.manager_employment_id = any(v_mine)
                    and (mc.depth = 1 or (mc.depth = 2 and hr._review_skip_level_on(r.organization_id))));
end
$function$;

-- ── one person's rows of the seat table, asked from the person's side ───────────────────────────────

create or replace function iam._seat_resolve_all(p_seat jsonb, p_type text, p_id uuid)
 returns uuid[]
 language plpgsql
 stable security definer
 set search_path to 'pg_catalog'
as $function$
-- every holder one seat's resolver names on one record (iam._seat_table_now's v_res before excludes)
begin
  if p_seat #>> '{resolver,kind}' = 'function' then
    return coalesce((select array_agg(distinct x::uuid) from jsonb_array_elements_text(
             coalesce(iam._access_setup_call_uuid(p_seat #>> '{resolver,fn}', p_id), '[]'::jsonb)) x
             where x is not null), '{}');
  elsif p_seat #>> '{resolver,kind}' = 'grants' then
    return coalesce((select array_agg(distinct p.granted_to_user_id) from iam.permissions p
                      where p.resource_type = p_type and p.resource_id = p_id and p.granted_to_user_id is not null
                        and coalesce(p.status, 'active') = 'active'
                        and (p.expires_at is null or p.expires_at > now())), '{}');
  end if;
  return '{}';
end
$function$;

create or replace function iam._seat_rows_of(p_person uuid, p_type text, p_id uuid)
 returns table(seat text, source text)
 language plpgsql
 stable security definer
 set search_path to 'pg_catalog'
as $function$
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

revoke all on function hr._review_login_holds_employment(uuid, uuid) from public, anon, authenticated;
revoke all on function hr.review_seat_employee_has(uuid, uuid) from public, anon, authenticated;
revoke all on function hr.review_seat_manager_has(uuid, uuid) from public, anon, authenticated;
revoke all on function hr._review_org_capable_has(uuid, uuid, text) from public, anon, authenticated;
revoke all on function hr.review_seat_hr_has(uuid, uuid) from public, anon, authenticated;
revoke all on function hr.review_seat_upper_has(uuid, uuid) from public, anon, authenticated;
revoke all on function hr.review_seat_skip_level_has(uuid, uuid) from public, anon, authenticated;
revoke all on function hr.review_seat_peers_has(uuid, uuid) from public, anon, authenticated;
revoke all on function hr.review_seat_line_manager_has(uuid, uuid) from public, anon, authenticated;
revoke all on function iam._seat_resolve_all(jsonb, text, uuid) from public, anon, authenticated;
revoke all on function iam._seat_rows_of(uuid, text, uuid) from public, anon, authenticated;

insert into platform.client_callable_door
  (schema_name, function_name, identity_args, identity_argtypes, declared_by, reason,
   non_client_lane, signed_in_callers, anonymous_callers)
values
  ('hr', '_review_login_holds_employment', 'p_person uuid, p_employment_id uuid', array['uuid'::regtype::oid, 'uuid'::regtype::oid],
   'migrations/campaign/accesssetup_l_seats_of_asks_from_the_persons_side.sql (lane access-setup)',
   'ACCESS-SETUP §7: part of the standard review''s access setup; answers who sits where on a review and what stage it reached.',
   'server_only: called by the iam access-setup functions (iam._seat_rows_of through the hr_review declaration''s has_fn); it takes a person as an argument, so no client calls it directly', false, false),
  ('hr', 'review_seat_employee_has', 'p_person uuid, p_review_id uuid', array['uuid'::regtype::oid, 'uuid'::regtype::oid],
   'migrations/campaign/accesssetup_l_seats_of_asks_from_the_persons_side.sql (lane access-setup)',
   'ACCESS-SETUP §7: part of the standard review''s access setup; answers who sits where on a review and what stage it reached.',
   'server_only: called by the iam access-setup functions (iam._seat_rows_of through the hr_review declaration''s has_fn); it takes a person as an argument, so no client calls it directly', false, false),
  ('hr', 'review_seat_manager_has', 'p_person uuid, p_review_id uuid', array['uuid'::regtype::oid, 'uuid'::regtype::oid],
   'migrations/campaign/accesssetup_l_seats_of_asks_from_the_persons_side.sql (lane access-setup)',
   'ACCESS-SETUP §7: part of the standard review''s access setup; answers who sits where on a review and what stage it reached.',
   'server_only: called by the iam access-setup functions (iam._seat_rows_of through the hr_review declaration''s has_fn); it takes a person as an argument, so no client calls it directly', false, false),
  ('hr', '_review_org_capable_has', 'p_person uuid, p_org uuid, p_capability text', array['uuid'::regtype::oid, 'uuid'::regtype::oid, 'text'::regtype::oid],
   'migrations/campaign/accesssetup_l_seats_of_asks_from_the_persons_side.sql (lane access-setup)',
   'ACCESS-SETUP §7: part of the standard review''s access setup; answers who sits where on a review and what stage it reached.',
   'server_only: called by the iam access-setup functions (iam._seat_rows_of through the hr_review declaration''s has_fn); it takes a person as an argument, so no client calls it directly', false, false),
  ('hr', 'review_seat_hr_has', 'p_person uuid, p_review_id uuid', array['uuid'::regtype::oid, 'uuid'::regtype::oid],
   'migrations/campaign/accesssetup_l_seats_of_asks_from_the_persons_side.sql (lane access-setup)',
   'ACCESS-SETUP §7: part of the standard review''s access setup; answers who sits where on a review and what stage it reached.',
   'server_only: called by the iam access-setup functions (iam._seat_rows_of through the hr_review declaration''s has_fn); it takes a person as an argument, so no client calls it directly', false, false),
  ('hr', 'review_seat_upper_has', 'p_person uuid, p_review_id uuid', array['uuid'::regtype::oid, 'uuid'::regtype::oid],
   'migrations/campaign/accesssetup_l_seats_of_asks_from_the_persons_side.sql (lane access-setup)',
   'ACCESS-SETUP §7: part of the standard review''s access setup; answers who sits where on a review and what stage it reached.',
   'server_only: called by the iam access-setup functions (iam._seat_rows_of through the hr_review declaration''s has_fn); it takes a person as an argument, so no client calls it directly', false, false),
  ('hr', 'review_seat_skip_level_has', 'p_person uuid, p_review_id uuid', array['uuid'::regtype::oid, 'uuid'::regtype::oid],
   'migrations/campaign/accesssetup_l_seats_of_asks_from_the_persons_side.sql (lane access-setup)',
   'ACCESS-SETUP §7: part of the standard review''s access setup; answers who sits where on a review and what stage it reached.',
   'server_only: called by the iam access-setup functions (iam._seat_rows_of through the hr_review declaration''s has_fn); it takes a person as an argument, so no client calls it directly', false, false),
  ('hr', 'review_seat_peers_has', 'p_person uuid, p_review_id uuid', array['uuid'::regtype::oid, 'uuid'::regtype::oid],
   'migrations/campaign/accesssetup_l_seats_of_asks_from_the_persons_side.sql (lane access-setup)',
   'ACCESS-SETUP §7: part of the standard review''s access setup; answers who sits where on a review and what stage it reached.',
   'server_only: called by the iam access-setup functions (iam._seat_rows_of through the hr_review declaration''s has_fn); it takes a person as an argument, so no client calls it directly', false, false),
  ('hr', 'review_seat_line_manager_has', 'p_person uuid, p_review_id uuid', array['uuid'::regtype::oid, 'uuid'::regtype::oid],
   'migrations/campaign/accesssetup_l_seats_of_asks_from_the_persons_side.sql (lane access-setup)',
   'ACCESS-SETUP §7: part of the standard review''s access setup; answers who sits where on a review and what stage it reached.',
   'server_only: called by the iam access-setup functions (iam._seat_rows_of through the hr_review declaration''s has_fn); it takes a person as an argument, so no client calls it directly', false, false),
  ('iam', '_seat_resolve_all', 'p_seat jsonb, p_type text, p_id uuid', array['jsonb'::regtype::oid, 'text'::regtype::oid, 'uuid'::regtype::oid],
   'migrations/campaign/accesssetup_l_seats_of_asks_from_the_persons_side.sql (lane access-setup)',
   'ACCESS-SETUP: internal to the access-setup primitive; reads declarations and the records they name.',
   'server_only: asked by iam.seats_of / iam._cells_for_now inside SECURITY DEFINER doors with the caller they already resolved; it takes the person as an argument, so no client may call it', false, false),
  ('iam', '_seat_rows_of', 'p_person uuid, p_type text, p_id uuid', array['uuid'::regtype::oid, 'text'::regtype::oid, 'uuid'::regtype::oid],
   'migrations/campaign/accesssetup_l_seats_of_asks_from_the_persons_side.sql (lane access-setup)',
   'ACCESS-SETUP: internal to the access-setup primitive; reads declarations and the records they name.',
   'server_only: asked by iam.seats_of / iam._cells_for_now inside SECURITY DEFINER doors with the caller they already resolved; it takes the person as an argument, so no client may call it', false, false)
on conflict (schema_name, function_name, identity_argtypes) do update
  set non_client_lane = excluded.non_client_lane, signed_in_callers = false, anonymous_callers = false,
      reason = excluded.reason, declared_by = excluded.declared_by;

-- ── blind_wins reads the person's own rows (held in their own right = source <> fallback) ──

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

-- ── the setup check requires the person-scoped form ──

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

-- ── the declaration: every function resolver names its person-scoped form (re-validated by the update trigger) ──
update iam.access_setup
   set setup = jsonb_set(setup, '{seats}',
         (select jsonb_agg(case when e #>> '{resolver,kind}' = 'function'
                                then jsonb_set(e, '{resolver,has_fn}', to_jsonb(
                                       replace(e #>> '{resolver,fn}', '(uuid)', '_has(uuid,uuid)')))
                                else e end
                           order by o)
            from jsonb_array_elements(setup -> 'seats') with ordinality t(e, o))),
       declared_by = 'migrations/campaign/accesssetup_l_seats_of_asks_from_the_persons_side.sql'
 where entity_type = 'hr_review';
