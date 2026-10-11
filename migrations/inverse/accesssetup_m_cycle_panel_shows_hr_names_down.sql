-- chair-step: inverse of accesssetup_m — restores the one-argument person-name form in hr.hr_review_cycle_access_setup (profile names, not HR names).
-- lane: access-setup
-- lock: iam
-- based-on: hr.hr_review_cycle_access_setup(uuid) b8e81787cac58451c05df429a77e4ceccb87f1d2a288bfd7b1802fb28a5c25ef

CREATE OR REPLACE FUNCTION hr.hr_review_cycle_access_setup(p_cycle_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'hr', 'public'
AS $function$
declare
  v_uid uuid := auth.uid(); c hr.review_cycle%rowtype; v_hr uuid[]; v_upper uuid[]; v_fb uuid[];
  v_ids uuid[]; v_role text; v_knobs jsonb := '[]'::jsonb; v_k text;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'reason', 'no_caller'); end if;
  select * into c from hr.review_cycle where id = p_cycle_id and deleted_at is null;
  if c.id is null or not hr._rev_can_manage(v_uid, c.organization_id) then
    return jsonb_build_object('ok', false, 'reason', 'not_reachable');
  end if;
  v_hr := coalesce(hr._review_org_capable(c.organization_id, 'performance.manage'), '{}');
  v_upper := coalesce(hr._review_org_capable(c.organization_id, 'performance.read_all'), '{}');
  v_upper := coalesce((select array_agg(x) from unnest(v_upper) x where not x = any(v_hr)), '{}');
  if cardinality(v_hr) = 0 then
    v_fb := coalesce((select array_agg(distinct m.user_id) from iam.memberships m
                       where m.organization_id = c.organization_id and m.container_type = 'organization'
                         and m.role in ('owner', 'admin') and m.status = 'active' and m.deleted_at is null), '{}');
  else v_fb := '{}';
  end if;
  select coalesce(array_agg(r.id order by r.created_at), '{}') into v_ids
    from hr.review r where r.cycle_id = c.id and r.deleted_at is null;
  select m.role into v_role from iam.memberships m
   where m.organization_id = c.organization_id and m.user_id = v_uid and m.container_type = 'organization'
     and m.status = 'active' and m.deleted_at is null limit 1;
  foreach v_k in array array['standard_review_manager_sees_self', 'standard_review_calibration_required',
                             'standard_review_peers_enabled', 'standard_review_peer_anonymous',
                             'standard_review_ack_comment'] loop
    v_knobs := v_knobs || jsonb_build_object('key', v_k,
      'value', platform.knob_resolve('hr.performance', v_k, c.organization_id, null));
  end loop;
  return jsonb_build_object(
    'ok', true,
    'cycle', jsonb_build_object('id', c.id, 'name', c.name, 'status', c.status),
    'organization', (select jsonb_build_object('id', o.id, 'name', o.name) from iam.organizations o where o.id = c.organization_id),
    'my_org_role', v_role,
    'seats', jsonb_build_array(
      jsonb_build_object('key', 'hr', 'holders',
        (select coalesce(jsonb_agg(iam._access_setup_person(x) || jsonb_build_object('source', 'role')), '[]'::jsonb) from unnest(v_hr) x)
        || (select coalesce(jsonb_agg(iam._access_setup_person(x) || jsonb_build_object('source', 'fallback')), '[]'::jsonb) from unnest(v_fb) x),
        'fallback_only', cardinality(v_hr) = 0 and cardinality(v_fb) > 0),
      jsonb_build_object('key', 'upper_management', 'holders',
        (select coalesce(jsonb_agg(iam._access_setup_person(x) || jsonb_build_object('source', 'role')), '[]'::jsonb) from unnest(v_upper) x),
        'fallback_only', false)),
    'knobs', v_knobs,
    'reviews', (select coalesce(jsonb_agg(jsonb_build_object(
                  'review_id', r.id,
                  'employee_name', hr._rev_person_name(r.employment_id),
                  'manager_name', hr._rev_person_name(r.manager_employment_id),
                  'unusual', exists (select 1 from iam._seat_table('hr_review', r.id) t where t.source = 'fallback'))
                  order by r.created_at), '[]'::jsonb)
                  from hr.review r where r.cycle_id = c.id and r.deleted_at is null),
    'needs_confirm', iam._access_setup_needs_confirm('hr_review', c.organization_id, v_uid, v_ids));
end
$function$;
