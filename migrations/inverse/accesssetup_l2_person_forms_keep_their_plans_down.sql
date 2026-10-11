-- chair-step: inverse of accesssetup_l2 — restores accesssetup_l's SQL bodies of the eight person-scoped seat forms (same answers, planned per call).
-- lane: access-setup
-- lock: iam
-- based-on: hr._review_login_holds_employment(uuid, uuid) ef64e19ced7d9a81845d64b4c5f6477f38214ec353c0a44bb756c901caa72514
-- based-on: hr.review_seat_employee_has(uuid, uuid) 6401646c384c112e92b82c4d23fafbe881e98305608c6dcb59b224dd93ca1b0a
-- based-on: hr.review_seat_manager_has(uuid, uuid) 16479304af9e5feb35580611f1eea201f37a7573ad4fc0207a026900766060d4
-- based-on: hr._review_org_capable_has(uuid, uuid, text) 20c3bd22be51da09edb7faf1048eaab603d91b1b97fbbd8e3f2c2634cb256b17
-- based-on: hr.review_seat_hr_has(uuid, uuid) 7c325fcbc8aa605b1db26742f12bc4509ffc09942b6776f0bc3ad419f28cda57
-- based-on: hr.review_seat_upper_has(uuid, uuid) 4d74091716b2b57932304d92243effbd1ac6c30ce3ae8aeacf498fdaebe0a239
-- based-on: hr.review_seat_skip_level_has(uuid, uuid) cc8079842da7e060489b992d92a350a03ac2baee303705157291a680ea3df960
-- based-on: hr.review_seat_peers_has(uuid, uuid) 85dcf2ab3f0a28fe9532e8ffba084164d53f001e0941d797f3d0fd865c2a9c0a

CREATE OR REPLACE FUNCTION hr._review_login_holds_employment(p_person uuid, p_employment_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'hr', 'public'
AS $function$
  -- p_person = any(hr._review_logins_of_employment(p_employment_id)), from the person's side
  select p_person is not null and p_employment_id is not null and exists (
    select 1 from hr.employment em
      join hr.employee e on e.id = em.employee_id and e.deleted_at is null
     where em.id = p_employment_id and em.deleted_at is null and e.login_user_id = p_person
       and em.hire_date <= current_date
       and (em.termination_date is null or em.termination_date >= current_date));
$function$
;

CREATE OR REPLACE FUNCTION hr.review_seat_employee_has(p_person uuid, p_review_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'hr', 'public'
AS $function$
  select p_person is not null and exists (
    select 1 from hr.review r where r.id = p_review_id and r.deleted_at is null
       and (r.employee_user_id = p_person or hr._review_login_holds_employment(p_person, r.employment_id)));
$function$
;

CREATE OR REPLACE FUNCTION hr.review_seat_manager_has(p_person uuid, p_review_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'hr', 'public'
AS $function$
  select p_person is not null and exists (
    select 1 from hr.review r where r.id = p_review_id and r.deleted_at is null
       and (r.manager_user_id = p_person or hr._review_login_holds_employment(p_person, r.manager_employment_id)));
$function$
;

CREATE OR REPLACE FUNCTION hr._review_org_capable_has(p_person uuid, p_org uuid, p_capability text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'hr', 'public'
AS $function$
  -- p_person = any(hr._review_org_capable(p_org, p_capability)), from the person's side
  select p_person is not null and p_org is not null
     and exists (select 1 from hr.employee e
                   join hr.employment em on em.employee_id = e.id and em.deleted_at is null
                   join hr.role_assignment ra on ra.employment_id = em.id
                  where e.login_user_id = p_person and e.deleted_at is null
                    and ra.organization_id = p_org and ra.is_active and ra.revoked_at is null)
     and coalesce(hr.capability(p_person, p_capability, null, current_date, p_org), false);
$function$
;

CREATE OR REPLACE FUNCTION hr.review_seat_hr_has(p_person uuid, p_review_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'hr', 'public'
AS $function$
  select coalesce((select hr._review_org_capable_has(p_person, r.organization_id, 'performance.manage')
                     from hr.review r where r.id = p_review_id and r.deleted_at is null), false);
$function$
;

CREATE OR REPLACE FUNCTION hr.review_seat_upper_has(p_person uuid, p_review_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'hr', 'public'
AS $function$
  select coalesce((select hr._review_org_capable_has(p_person, r.organization_id, 'performance.read_all')
                     from hr.review r where r.id = p_review_id and r.deleted_at is null), false);
$function$
;

CREATE OR REPLACE FUNCTION hr.review_seat_skip_level_has(p_person uuid, p_review_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'hr', 'public'
AS $function$
  select coalesce((select r.manager_employment_id is not null and hr._review_skip_level_on(r.organization_id)
                          and hr._review_login_holds_employment(p_person, hr.manager_as_of(r.manager_employment_id, current_date))
                     from hr.review r where r.id = p_review_id and r.deleted_at is null), false);
$function$
;

CREATE OR REPLACE FUNCTION hr.review_seat_peers_has(p_person uuid, p_review_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'hr', 'public'
AS $function$
  select p_person is not null and exists (
    select 1 from hr.review_peer_nomination n join hr.review r on r.id = n.review_id and r.deleted_at is null
     where n.review_id = p_review_id and n.status = 'approved' and n.deleted_at is null and n.peer_user_id = p_person);
$function$
;
