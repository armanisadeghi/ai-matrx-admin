-- chair-step: it ADDS the manager-started standard review (Arman 2026-10-10: "as long as it's a normal review, yes"): door hr.hr_review_start(employment, organization) — the employee's current manager by position (hr.manager_as_of) or HR in the organization starts ONE review in the organization's standing "Individual reviews" cycle (created on first use, open, the default template) and gets access_setup {head_type, ids, needs_confirm} back like launch; read door hr.hr_review_start_candidates(organization) — the people the caller may start one for, with any open individual review; helpers hr.review_may_start (the setup's `start` action at organization level, no record yet), hr._review_individual_cycle and hr._review_create_one — the per-review insert + workflow + due dates, extracted from hr.hr_review_cycle_launch, which now calls it (its answer unchanged). Each door declared in platform.client_callable_door before its GRANT. No seat, part, kernel or existing door answer changes.
-- lane: access-setup
-- lock: hr
-- based-on: hr.hr_review_cycle_launch(uuid, jsonb) 2635147acbc589c3d2ba3258f1ab50ac8cbef8d052470d3d7899c789d068cc26
--
-- Plan: common-docs/systems/platform/access/projects/access-setup/PLAN.md §7 (Manager-started review), §5b.
-- Inverse: migrations/inverse/accesssetup_n_a_manager_starts_one_review_down.sql

-- ── one review, created the way a cycle launch creates each of its reviews ──
-- The caller has already decided who, under which manager, in which cycle. Inserts the review, asks
-- the performance_review workflow for it, and sets the self and manager due dates on its steps.
-- Returns the launch answer's `created` entry for that review.
create or replace function hr._review_create_one(
  p_cycle_id uuid, p_organization_id uuid, p_employment_id uuid, p_employee_id uuid, p_employee_login uuid,
  p_manager_employment_id uuid, p_manager_login uuid, p_self_due date, p_manager_due date)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public', 'hr'
as $function$
declare v_rid uuid; v_wf jsonb; v_inst uuid;
begin
  insert into hr.review (cycle_id, employment_id, employee_id, employee_user_id, manager_employment_id,
                         manager_user_id, status, organization_id)
  values (p_cycle_id, p_employment_id, p_employee_id, p_employee_login, p_manager_employment_id,
          p_manager_login, 'not_started', p_organization_id)
  returning id into v_rid;

  v_wf := hr.wf_request('performance_review', 'hr_review', v_rid, p_organization_id,
                        jsonb_build_object('cycle_id', p_cycle_id, 'reopened', false),
                        p_employment_id, false, 'performance_review:' || v_rid::text);
  v_inst := nullif(v_wf ->> 'instance_id', '')::uuid;
  if v_inst is not null then
    update hr.review set workflow_instance_id = v_inst where id = v_rid;
    perform hr._rev_set_due(v_inst, 'self', p_self_due);
    perform hr._rev_set_due(v_inst, 'manager', p_manager_due);
  end if;
  return jsonb_build_object('review_id', v_rid, 'employment_id', p_employment_id,
    'employee_name', hr._rev_person_name(p_employment_id),
    'manager_name', hr._rev_person_name(p_manager_employment_id),
    'employee_has_login', p_employee_login is not null,
    'workflow_instance_id', v_inst,
    'workflow', jsonb_build_object('launched', v_inst is not null,
                                   'reason', case when v_inst is null then coalesce(v_wf ->> 'reason', 'wf_request_failed') end));
end
$function$;

-- ── launch keeps its answer; each review now comes from hr._review_create_one ──
CREATE OR REPLACE FUNCTION hr.hr_review_cycle_launch(p_cycle_id uuid, p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'hr'
AS $function$
declare
  v_uid uuid := auth.uid(); c hr.review_cycle%rowtype; t hr.review_template%rowtype;
  v_targets uuid[]; v_emp uuid; em record; v_entry jsonb;
  v_created jsonb := '[]'::jsonb; v_cad jsonb; v_refused jsonb := '[]'::jsonb; v_mgr_login uuid; v_mgr_status text;
  v_ids uuid[] := '{}';
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'reason', 'no_caller'); end if;
  select * into c from hr.review_cycle where id = p_cycle_id and deleted_at is null;
  if c.id is null or not hr._rev_can_manage(v_uid, c.organization_id) then
    return jsonb_build_object('ok', false, 'reason', 'not_reachable');
  end if;
  if c.status not in ('draft', 'open') then
    return jsonb_build_object('ok', false, 'reason', 'cycle_not_open', 'cycle_status', c.status);
  end if;

  if nullif(p_payload ->> 'manager_employment_id', '') is not null then
    select coalesce(array_agg(em2.id), '{}') into v_targets from hr.employment em2
     where em2.current_manager_employment_id = (p_payload ->> 'manager_employment_id')::uuid
       and em2.organization_id = c.organization_id and em2.deleted_at is null;
  elsif nullif(p_payload ->> 'department_id', '') is not null then
    select coalesce(array_agg(em2.id), '{}') into v_targets from hr.employment em2
     where em2.organization_id = c.organization_id and em2.deleted_at is null and em2.status = 'active'
       and (hr.primary_position_as_of(em2.id, current_date)).department_id
           = (p_payload ->> 'department_id')::uuid;
  elsif jsonb_typeof(p_payload -> 'employment_ids') = 'array' then
    select coalesce(array_agg(distinct (x #>> '{}')::uuid), '{}') into v_targets
      from jsonb_array_elements(p_payload -> 'employment_ids') x;
  else
    return jsonb_build_object('ok', false, 'reason', 'validation', 'field', 'population',
      'detail', 'Name a manager_employment_id, a department_id or employment_ids.');
  end if;
  if cardinality(v_targets) = 0 then
    return jsonb_build_object('ok', false, 'reason', 'nobody_to_review');
  end if;

  -- the first launch freezes the template as it reads now
  if c.status = 'draft' then
    select * into t from hr.review_template where id = c.template_id and deleted_at is null;
    if t.id is not null then
      update hr.review_cycle
         set template_snapshot = jsonb_build_object('__kind', 'performance_review_template_snapshot',
               'template_id', t.id, 'name', t.name, 'sections', t.sections,
               'rating_scale', t.rating_scale, 'frozen_at', now())
       where id = c.id;
    end if;
  end if;

  -- the organization's reminder cadence (knob) is carried by the definition the engine reads at tick
  v_cad := hr._rev_ensure_cadence(c.organization_id);

  foreach v_emp in array v_targets loop
    select em2.id, em2.organization_id, em2.status, em2.employee_id, em2.current_manager_employment_id,
           e.login_user_id
      into em
      from hr.employment em2 join hr.employee e on e.id = em2.employee_id
     where em2.id = v_emp and em2.deleted_at is null;
    if em.id is null or em.organization_id <> c.organization_id then
      v_refused := v_refused || jsonb_build_object('employment_id', v_emp, 'reason', 'not_in_organization');
      continue;
    end if;
    if em.status <> 'active' then
      v_refused := v_refused || jsonb_build_object('employment_id', v_emp,
        'employee_name', hr._rev_person_name(v_emp),
        'reason', case when em.status in ('terminated','separated') then 'terminated' else 'not_active' end,
        'employment_status', em.status);
      continue;
    end if;
    if em.current_manager_employment_id is null then
      v_refused := v_refused || jsonb_build_object('employment_id', v_emp,
        'employee_name', hr._rev_person_name(v_emp), 'reason', 'no_manager');
      continue;
    end if;
    select em3.status, e3.login_user_id into v_mgr_status, v_mgr_login
      from hr.employment em3 join hr.employee e3 on e3.id = em3.employee_id
     where em3.id = em.current_manager_employment_id and em3.deleted_at is null;
    if v_mgr_status is distinct from 'active' then
      v_refused := v_refused || jsonb_build_object('employment_id', v_emp,
        'employee_name', hr._rev_person_name(v_emp), 'reason', 'manager_not_active');
      continue;
    end if;
    if exists (select 1 from hr.review where cycle_id = c.id and employment_id = v_emp and deleted_at is null) then
      v_refused := v_refused || jsonb_build_object('employment_id', v_emp,
        'employee_name', hr._rev_person_name(v_emp), 'reason', 'already_in_cycle');
      continue;
    end if;

    v_entry := hr._review_create_one(c.id, c.organization_id, v_emp, em.employee_id, em.login_user_id,
                                     em.current_manager_employment_id, v_mgr_login, c.self_due_on, c.manager_due_on);
    v_ids := v_ids || (v_entry ->> 'review_id')::uuid;
    v_created := v_created || v_entry;
  end loop;

  update hr.review_cycle
     set status = 'open', launched_at = coalesce(launched_at, now()), launched_by = coalesce(launched_by, v_uid)
   where id = c.id and jsonb_array_length(v_created) > 0;

  -- access-setup §5b: a bulk creation opens ONE panel for the cycle (null when nothing was created)
  return jsonb_build_object('ok', true, 'cycle_id', c.id,
    'cycle_status', (select status from hr.review_cycle where id = c.id),
    'reminder_cadence_hours', (v_cad ->> 'reminder_cadence_hours')::integer,
    'created', v_created, 'refused', v_refused,
    'access_setup', case when cardinality(v_ids) > 0 then jsonb_build_object(
        'head_type', 'hr_review', 'ids', to_jsonb(v_ids), 'cycle_id', c.id,
        'needs_confirm', iam._access_setup_needs_confirm('hr_review', c.organization_id, v_uid, v_ids)) end);
end
$function$;

-- ── the setup's `start` action at organization level (there is no record yet) ──
-- iam.access_setup('hr_review').actions.start = seats [manager, hr]. Before a review exists, those
-- seats are: the employee's current manager by position (hr.manager_as_of, today) and HR in the
-- employment's organization (hr._rev_can_manage). The subject seat never starts their own review.
create or replace function hr.review_may_start(p_user uuid, p_employment_id uuid)
 returns boolean
 language sql
 stable security definer
 set search_path to 'hr', 'public'
as $function$
  select p_user is not null and exists (
    select 1 from hr.employment em join hr.employee e on e.id = em.employee_id
     where em.id = p_employment_id and em.deleted_at is null
       and e.login_user_id is distinct from p_user
       and (hr._rev_can_manage(p_user, em.organization_id)
            or exists (select 1 from hr.employment m join hr.employee me on me.id = m.employee_id
                        where m.id = hr.manager_as_of(em.id, current_date) and m.deleted_at is null
                          and me.login_user_id = p_user)));
$function$;

-- ── the organization's standing cycle for reviews a manager or HR starts one at a time ──
-- metadata.standing_cycle = 'individual' (a reserved key, registered below); one per organization (advisory lock on the organization); open from
-- creation, with the organization's default template frozen in like a launched cycle. Due dates live
-- on each review's workflow steps, so the cycle carries none.
create or replace function hr._review_individual_cycle(p_organization_id uuid, p_actor uuid)
 returns hr.review_cycle
 language plpgsql
 security definer
 set search_path to 'public', 'hr'
as $function$
declare c hr.review_cycle%rowtype; t hr.review_template%rowtype;
begin
  perform pg_advisory_xact_lock(hashtextextended('hr.review_cycle.individual:' || p_organization_id::text, 0));
  select * into c from hr.review_cycle
   where organization_id = p_organization_id and deleted_at is null and metadata ->> 'standing_cycle' = 'individual'
   order by created_at limit 1;
  if c.id is not null then return c; end if;

  select * into t from hr.review_template
   where organization_id = p_organization_id and is_default and deleted_at is null limit 1;
  if t.id is null then
    insert into hr.review_template (name, description, sections, rating_scale, is_default, organization_id)
    values ('Standard review',
            'Responsibilities, accomplishments, strengths, opportunities, ratings, goals and comments.',
            hr._rev_default_sections(), hr._rev_default_rating_scale(), true, p_organization_id)
    returning * into t;
  end if;

  insert into hr.review_cycle (name, period_start, period_end, template_id, template_snapshot, status,
                               launched_at, launched_by, organization_id, created_by, metadata)
  values ('Individual reviews', current_date, (current_date + interval '1 year')::date, t.id,
          jsonb_build_object('__kind', 'performance_review_template_snapshot', 'template_id', t.id,
                             'name', t.name, 'sections', t.sections, 'rating_scale', t.rating_scale,
                             'frozen_at', now()),
          'open', now(), p_actor, p_organization_id, p_actor, jsonb_build_object('standing_cycle', 'individual'))
  returning * into c;
  return c;
end
$function$;

insert into platform.metadata_reserved_keys (table_token, key, reason)
values ('hr_review_cycle', 'standing_cycle',
        'System state written only by hr._review_individual_cycle: ''individual'' marks the organization''s standing Individual reviews cycle that hr_review_start files manager-started reviews into.')
on conflict do nothing;

-- ── THE DOOR: a manager (or HR) starts one standard review ──
create or replace function hr.hr_review_start(p_employment_id uuid, p_organization_id uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public', 'hr'
as $function$
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

  c := hr._review_individual_cycle(em.organization_id, v_uid);
  select r.id into v_open from hr.review r
   where r.cycle_id = c.id and r.employment_id = em.id and r.deleted_at is null
     and r.status not in ('shared', 'acknowledged', 'cancelled')
   limit 1;
  if v_open is not null then
    return jsonb_build_object('ok', false, 'reason', 'already_open', 'review_id', v_open);
  end if;

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

-- ── who the caller may start a review for: their direct reports by position, and every active
-- employee when they are HR in the organization; each with the open individual review, if any ──
create or replace function hr.hr_review_start_candidates(p_organization_id uuid)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to 'public', 'hr'
as $function$
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

revoke all on function hr._review_create_one(uuid, uuid, uuid, uuid, uuid, uuid, uuid, date, date) from public, anon, authenticated;
revoke all on function hr._review_individual_cycle(uuid, uuid) from public, anon, authenticated;
revoke all on function hr.review_may_start(uuid, uuid) from public, anon, authenticated;

-- ── every SECURITY DEFINER function declares its access decision in data ──
insert into platform.client_callable_door
  (schema_name, function_name, identity_args, identity_argtypes, declared_by, reason,
   non_client_lane, signed_in_callers, anonymous_callers)
values
  ('hr', '_review_create_one',
   'p_cycle_id uuid, p_organization_id uuid, p_employment_id uuid, p_employee_id uuid, p_employee_login uuid, p_manager_employment_id uuid, p_manager_login uuid, p_self_due date, p_manager_due date',
   array['uuid'::regtype::oid, 'uuid'::regtype::oid, 'uuid'::regtype::oid, 'uuid'::regtype::oid, 'uuid'::regtype::oid,
         'uuid'::regtype::oid, 'uuid'::regtype::oid, 'date'::regtype::oid, 'date'::regtype::oid],
   'migrations/campaign/accesssetup_n_a_manager_starts_one_review.sql (lane access-setup)',
   'ACCESS-SETUP §7: internal; inserts one review and starts its workflow.',
   'server_only: writes a review for any employment named; only hr_review_cycle_launch and hr_review_start call it, after their own gates', false, false),
  ('hr', '_review_individual_cycle', 'p_organization_id uuid, p_actor uuid', array['uuid'::regtype::oid, 'uuid'::regtype::oid],
   'migrations/campaign/accesssetup_n_a_manager_starts_one_review.sql (lane access-setup)',
   'ACCESS-SETUP §7: internal; finds or creates the organization''s Individual reviews cycle.',
   'server_only: creates a cycle in any organization named; only hr_review_start calls it, after its gate', false, false),
  ('hr', 'review_may_start', 'p_user uuid, p_employment_id uuid', array['uuid'::regtype::oid, 'uuid'::regtype::oid],
   'migrations/campaign/accesssetup_n_a_manager_starts_one_review.sql (lane access-setup)',
   'ACCESS-SETUP §7: internal; the setup''s start action before a review exists.',
   'server_only: answers for any person named; only the start doors call it with auth.uid()', false, false)
on conflict (schema_name, function_name, identity_argtypes) do update
  set non_client_lane = excluded.non_client_lane, reason = excluded.reason, declared_by = excluded.declared_by,
      signed_in_callers = false, anonymous_callers = false;

insert into platform.client_callable_door
  (schema_name, function_name, identity_args, identity_argtypes, declared_by, reason,
   anonymous_callers, signed_in_callers, argument_rules)
values
  ('hr', 'hr_review_start', 'p_employment_id uuid, p_organization_id uuid', array['uuid'::regtype::oid, 'uuid'::regtype::oid],
   'migrations/campaign/accesssetup_n_a_manager_starts_one_review.sql (lane access-setup)',
   'ACCESS-SETUP §7: SECURITY DEFINER. Gated by hr.review_may_start (the setup''s start action: the employee''s current manager by position, or HR in the employment''s organization; never the employee). Refuses not_permitted for a foreign, invented or not-yours employment or a different organization, then not_active / terminated, no_manager, manager_not_active, already_open (with review_id). Creates one review in the organization''s Individual reviews cycle with the same workflow wiring as hr_review_cycle_launch and returns access_setup {head_type, ids, needs_confirm}.',
   false, true,
   jsonb_build_object('version', 1, 'arguments', jsonb_build_object(
     'p_employment_id', jsonb_build_object('type', 'uuid', 'position', 1, 'optional', false, 'foreign', jsonb_build_object('bounded', true, 'note', 'An employment the caller does not manage by position and is not HR for answers not_permitted, the same as a missing one.')),
     'p_organization_id', jsonb_build_object('type', 'uuid', 'position', 2, 'optional', false, 'foreign', jsonb_build_object('bounded', true, 'note', 'Must be the employment''s own organization; any other answers not_permitted before any write.'))))),
  ('hr', 'hr_review_start_candidates', 'p_organization_id uuid', array['uuid'::regtype::oid],
   'migrations/campaign/accesssetup_n_a_manager_starts_one_review.sql (lane access-setup)',
   'ACCESS-SETUP §7: SECURITY DEFINER. Lists only the caller''s direct reports by position in that organization, plus every active employee when the caller is HR there (hr._rev_can_manage); never the caller. An organization where the caller is neither answers an empty list.',
   false, true,
   jsonb_build_object('version', 1, 'arguments', jsonb_build_object(
     'p_organization_id', jsonb_build_object('type', 'uuid', 'position', 1, 'optional', false, 'foreign', jsonb_build_object('bounded', true, 'note', 'An organization where the caller manages nobody and is not HR answers an empty list.')))))
on conflict (schema_name, function_name, identity_argtypes) do update
  set argument_rules = excluded.argument_rules, signed_in_callers = excluded.signed_in_callers, anonymous_callers = excluded.anonymous_callers,
      non_client_lane = null, reason = excluded.reason, declared_by = excluded.declared_by;

grant execute on function hr.hr_review_start(uuid, uuid) to authenticated;
grant execute on function hr.hr_review_start_candidates(uuid) to authenticated;
