--
-- hr_directory_export_audit_door.sql
--
-- WHY. SPEC-EMPLOYEES §2.2 makes an export of the people list an AUDITED action
-- (hr.access_audit action = 'export'): who took the people out of the product, and how many, is
-- itself a record. A browser cannot write that row, and hr_directory_list is STABLE, so until
-- now the directory's Export was a coming-soon entry. This is the door: the client reads the
-- rows it already holds (every one was read through hr_directory_list), asks THIS door to record
-- the export, and only builds the file when the door answers.
--
-- WHAT. hr.directory_export_log(p_organization_id uuid, p_employee_ids uuid[], p_columns text[])
--   - SECURITY DEFINER, signed-in only. Standing first: a caller with an HR capability that
--     reads the working record (working_record.read), or writes identity (identity.write), or
--     who is an owner/admin of the employer. Anyone else: 42501 with a sentence.
--   - Every id must be a live person of THIS employer (no organization is chosen for the
--     caller; the employer is the explicit argument and the rows are checked against it).
--   - At most 5000 people per call. One hr.access_audit row (action export, target_token
--     hr_employee, the ids, row_count, the column list in request_context) through the
--     privileged writer hr._record_access_audit — exactly the shape hr.leave_balances_export
--     writes. Answers {ok, audit_id, row_count}.
-- Declared in platform.client_callable_door before its GRANT.

CREATE FUNCTION hr.directory_export_log(
  p_organization_id uuid,
  p_employee_ids uuid[],
  p_columns text[] DEFAULT '{}'::text[]
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'hr', 'public'
AS $function$
declare
  v_uid     uuid := auth.uid();
  v_today   date := current_date;
  v_caps    text[];
  v_role    text;
  v_ids     uuid[];
  v_n       integer;
  v_found   integer;
  v_me      uuid;
  v_audit   uuid;
begin
  if v_uid is null then
    raise exception 'directory_export_log: no authenticated caller' using errcode = '42501';
  end if;
  if p_organization_id is null then
    raise exception 'directory_export_log: p_organization_id is required' using errcode = '22023';
  end if;

  v_caps := hr._l1_capabilities(v_uid, p_organization_id, v_today);
  v_role := hr._l1_org_role(v_uid, p_organization_id, false);
  if not ('working_record.read' = any(v_caps)
          or 'identity.write' = any(v_caps)
          or coalesce(v_role, '') in ('owner', 'admin')) then
    raise exception 'Exporting the people list is not yours in this employer.'
      using errcode = '42501';
  end if;

  select coalesce(array_agg(distinct i), '{}'::uuid[]) into v_ids
    from unnest(coalesce(p_employee_ids, '{}'::uuid[])) i;
  v_n := cardinality(v_ids);
  if v_n = 0 then
    raise exception 'Pick at least one person to export.' using errcode = '22023';
  end if;
  if v_n > 5000 then
    raise exception 'An export takes at most 5000 people at a time; this one has %.', v_n
      using errcode = '22023';
  end if;

  select count(*) into v_found
    from hr.employee e
   where e.organization_id = p_organization_id
     and e.deleted_at is null
     and e.id = any(v_ids);
  if v_found <> v_n then
    raise exception 'Some of these people are not in this employer, so nothing was exported.'
      using errcode = 'P0002';
  end if;

  select em.id into v_me
    from hr.employment em
    join hr.employee e on e.id = em.employee_id
   where e.login_user_id = v_uid and em.organization_id = p_organization_id
     and em.deleted_at is null
   limit 1;

  v_audit := hr._record_access_audit(
    p_organization_id => p_organization_id, p_action => 'export',
    p_target_token => 'hr_employee', p_purpose => 'reporting', p_basis => 'role',
    p_granted => true, p_target_ids => v_ids, p_row_count => v_n,
    p_sensitivity_tier => 'directory',
    p_actor_type => 'hr_admin', p_actor_employment_id => v_me, p_actor_user_id => v_uid,
    p_request_context => jsonb_build_object('surface', 'hr_directory',
                                            'columns', to_jsonb(coalesce(p_columns, '{}'::text[]))));

  return jsonb_build_object('ok', true, 'audit_id', v_audit, 'row_count', v_n);
end
$function$;

insert into platform.client_callable_door
  (schema_name, function_name, identity_args, identity_argtypes, declared_by, reason, gate_predicate, signed_in_callers, anonymous_callers, argument_rules)
values
  ('hr', 'directory_export_log', 'p_organization_id uuid, p_employee_ids uuid[], p_columns text[]',
   array['uuid'::regtype::oid, 'uuid[]'::regtype::oid, 'text[]'::regtype::oid],
   'hr_directory_export_audit_door.sql',
   'WRITE. Records the audited export of the HR people list (hr.access_audit action export) before the client builds the file from rows it already read through hr_directory_list. Gated by an HR capability (working_record.read / identity.write) or employer owner/admin, checked before any read; every id must be a live person of the named employer; one audit row per call.',
   'hr._l1_capabilities / hr._l1_org_role', true, false,
   jsonb_build_object('version', 1, 'arguments', jsonb_build_object(
     'p_organization_id', jsonb_build_object('type','uuid','position',1,'optional',false,'entity','organization',
        'check','the employer; the caller''s HR capability or owner/admin standing in it is resolved before any other use, so a foreign or invented id is refused alike.',
        'foreign', jsonb_build_object('sqlstate','42501','same_as_invented',true)),
     'p_employee_ids', jsonb_build_object('type','uuid[]','position',2,'optional',false,'entity',null,
        'check','people of that employer; every id is counted against hr.employee for the named employer after the standing check, and a mismatch raises P0002 without naming which.',
        'foreign', jsonb_build_object('sqlstate','P0002','same_as_invented',true),
        'bounded', 5000),
     'p_columns', jsonb_build_object('type','text[]','position',3,'optional',true,
        'check','column keys only; recorded in the audit row, never used as an identity.'))));

GRANT EXECUTE ON FUNCTION hr.directory_export_log(uuid, uuid[], text[]) TO authenticated;
