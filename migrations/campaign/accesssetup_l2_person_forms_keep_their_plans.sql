-- draft: access-setup lane — clone rehearsal pending
-- chair-step: REPLACES the eight person-scoped seat forms of accesssetup_l (hr._review_login_holds_employment, hr._review_org_capable_has, hr.review_seat_{employee,manager,hr,upper,skip_level,peers}_has) with plpgsql bodies: a SECURITY DEFINER SQL function is never inlined and plans its query again on every call, a plpgsql one keeps its plans for the session. The skip-level form asks first whether the person has any current employment (a person with none holds no employment's login). Every answer is unchanged.
-- lane: access-setup
-- lock: iam
-- based-on: hr._review_login_holds_employment(uuid, uuid) d4f23ca4599e955ddce8bac144c6c8f319f209cdcb79d86174622904850e9693
-- based-on: hr.review_seat_employee_has(uuid, uuid) 90d1ee7fa283bf5bfdde8c6e62d90645bbcdbee97771867b362754b684f3644f
-- based-on: hr.review_seat_manager_has(uuid, uuid) 614c48351ab185db1915ab13e53d371a702160ce0956e1619c29d8cd9bc0dbfe
-- based-on: hr._review_org_capable_has(uuid, uuid, text) 45aa5ff7021f23a016501ed469af7ae9505d3620dabed950cae59ab02b78822f
-- based-on: hr.review_seat_hr_has(uuid, uuid) cce4b254aa4f3cb71ce124c8aa51263b9e1f48c84aec2a5ad59498d4f0509192
-- based-on: hr.review_seat_upper_has(uuid, uuid) c210984fccab0eb8ec8e2c04af03ef25cd5c773bbc15968b260ca3b5a7aeceae
-- based-on: hr.review_seat_skip_level_has(uuid, uuid) 1b6673ab5efe4bfcba40f8d85c488cc1ed03d6be3c65c09e5264358f49334579
-- based-on: hr.review_seat_peers_has(uuid, uuid) af41260dfb97cd42a7bf7f68a95923120e006e75ec7a2ede2346856fc4578a48
--
-- Plan: common-docs/systems/platform/access/projects/access-setup/PLAN.md §4 (owner ruling 2, performance).
-- Inverse: migrations/inverse/accesssetup_l2_person_forms_keep_their_plans_down.sql

-- plpgsql (plans kept per session) instead of SQL (planned again on every call when, as SECURITY DEFINER, it cannot be
-- inlined); same answers as accesssetup_l's bodies.

CREATE OR REPLACE FUNCTION hr._review_login_holds_employment(p_person uuid, p_employment_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'hr', 'public'
AS $function$
-- p_person = any(hr._review_logins_of_employment(p_employment_id)), from the person's side
begin
  if p_person is null or p_employment_id is null then return false; end if;
  return exists (
    select 1 from hr.employment em
      join hr.employee e on e.id = em.employee_id and e.deleted_at is null
     where em.id = p_employment_id and em.deleted_at is null and e.login_user_id = p_person
       and em.hire_date <= current_date
       and (em.termination_date is null or em.termination_date >= current_date));
end
$function$;

CREATE OR REPLACE FUNCTION hr.review_seat_employee_has(p_person uuid, p_review_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'hr', 'public'
AS $function$
declare v_user uuid; v_emp uuid;
begin
  if p_person is null then return false; end if;
  select r.employee_user_id, r.employment_id into v_user, v_emp from hr.review r where r.id = p_review_id and r.deleted_at is null;
  if not found then return false; end if;
  return coalesce(v_user = p_person, false) or hr._review_login_holds_employment(p_person, v_emp);
end
$function$;

CREATE OR REPLACE FUNCTION hr.review_seat_manager_has(p_person uuid, p_review_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'hr', 'public'
AS $function$
declare v_user uuid; v_emp uuid;
begin
  if p_person is null then return false; end if;
  select r.manager_user_id, r.manager_employment_id into v_user, v_emp from hr.review r where r.id = p_review_id and r.deleted_at is null;
  if not found then return false; end if;
  return coalesce(v_user = p_person, false) or hr._review_login_holds_employment(p_person, v_emp);
end
$function$;

CREATE OR REPLACE FUNCTION hr._review_org_capable_has(p_person uuid, p_org uuid, p_capability text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'hr', 'public'
AS $function$
-- p_person = any(hr._review_org_capable(p_org, p_capability)), from the person's side
begin
  if p_person is null or p_org is null then return false; end if;
  if not exists (select 1 from hr.employee e
                   join hr.employment em on em.employee_id = e.id and em.deleted_at is null
                   join hr.role_assignment ra on ra.employment_id = em.id
                  where e.login_user_id = p_person and e.deleted_at is null
                    and ra.organization_id = p_org and ra.is_active and ra.revoked_at is null) then
    return false;
  end if;
  return coalesce(hr.capability(p_person, p_capability, null, current_date, p_org), false);
end
$function$;

CREATE OR REPLACE FUNCTION hr.review_seat_hr_has(p_person uuid, p_review_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'hr', 'public'
AS $function$
declare v_org uuid;
begin
  select r.organization_id into v_org from hr.review r where r.id = p_review_id and r.deleted_at is null;
  return found and hr._review_org_capable_has(p_person, v_org, 'performance.manage');
end
$function$;

CREATE OR REPLACE FUNCTION hr.review_seat_upper_has(p_person uuid, p_review_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'hr', 'public'
AS $function$
declare v_org uuid;
begin
  select r.organization_id into v_org from hr.review r where r.id = p_review_id and r.deleted_at is null;
  return found and hr._review_org_capable_has(p_person, v_org, 'performance.read_all');
end
$function$;

CREATE OR REPLACE FUNCTION hr.review_seat_skip_level_has(p_person uuid, p_review_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'hr', 'public'
AS $function$
-- the person's own current employments first: a person with none is nobody's skip-level manager
declare v_emp uuid; v_org uuid;
begin
  if p_person is null then return false; end if;
  select r.manager_employment_id, r.organization_id into v_emp, v_org from hr.review r
   where r.id = p_review_id and r.deleted_at is null;
  if v_emp is null then return false; end if;
  if not exists (select 1 from hr.employee e join hr.employment em on em.employee_id = e.id and em.deleted_at is null
                  where e.login_user_id = p_person and e.deleted_at is null and em.hire_date <= current_date
                    and (em.termination_date is null or em.termination_date >= current_date)) then
    return false;
  end if;
  return hr._review_skip_level_on(v_org)
     and hr._review_login_holds_employment(p_person, hr.manager_as_of(v_emp, current_date));
end
$function$;

CREATE OR REPLACE FUNCTION hr.review_seat_peers_has(p_person uuid, p_review_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'hr', 'public'
AS $function$
begin
  if p_person is null then return false; end if;
  return exists (
    select 1 from hr.review_peer_nomination n join hr.review r on r.id = n.review_id and r.deleted_at is null
     where n.review_id = p_review_id and n.status = 'approved' and n.deleted_at is null and n.peer_user_id = p_person);
end
$function$;
