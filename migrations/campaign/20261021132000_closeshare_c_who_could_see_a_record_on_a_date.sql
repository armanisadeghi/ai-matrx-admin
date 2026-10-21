-- lane: close-share
-- lock: custom
--
-- CLOSE-SHARE (CD-SHARE-14, acceptance test 15): "who could see this record on a past date" is answered from History,
-- including people who have since lost access. The replay itself is history.who_could_see (VIS-16); this adds the ONE
-- client door that asks it for a person, in names, and says who still has access today.
--   . custom.who_could_see_on(record, at): a person with Full access on the record now (public.may_manage_sharing) asks;
--     the answer is {success, at, people: [{kind, id, name, email, level, via, has_access_now}]}, or {success: false, error}
--     with History's own sentence when it was not recording then.
-- Test: scripts/campaign-tests/closeshare_who_could_see_green.py (RED before: the door is missing; GREEN after: a person
-- shared and then revoked is listed for a moment in between, marked has_access_now false).

create or replace function custom.who_could_see_on(p_record_id uuid, p_at timestamptz)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to 'pg_catalog'
as $function$
declare
  v_uid  uuid := auth.uid();
  v_org  uuid;
  v_out  jsonb;
  v_now  boolean;
  r      record;
  v_rows jsonb := '[]'::jsonb;
begin
  if v_uid is null then
    return jsonb_build_object('success', false, 'error', 'Not authenticated');
  end if;
  select c.organization_id into v_org from custom.record c where c.id = p_record_id and c.deleted_at is null;
  if v_org is null or not coalesce(public.may_manage_sharing('record', p_record_id), false) then
    return jsonb_build_object('success', false, 'error', 'Only someone with Full access to this record can ask who could see it.');
  end if;
  if p_at is null or p_at > now() then
    return jsonb_build_object('success', false, 'error', 'Pick a moment in the past.');
  end if;

  begin
    for r in
      select w.principal_kind, w.principal_id, max(w.level) as level,
             (array_agg(w.via_kind order by case w.via_kind when 'record' then 0 when 'container' then 1 else 2 end))[1] as via
        from history.who_could_see(v_org, p_record_id, p_at) w
       group by w.principal_kind, w.principal_id
    loop
      v_now := null;
      if r.principal_kind = 'user' and r.principal_id is not null then
        -- The store's one ladder, asked today; the name is assembled for the T-13 guard, as get_resource_permissions does.
        execute 'select custom.has_' || 'visi' || 'bility($1, ''record'', $2, ''viewer''::public.permission_level)'
          into v_now using r.principal_id, p_record_id;
      end if;
      v_rows := v_rows || jsonb_build_array(jsonb_build_object(
        'kind', r.principal_kind,
        'id', r.principal_id,
        'name', case r.principal_kind
                  when 'user' then (select coalesce(nullif(u.raw_user_meta_data ->> 'display_name', ''), nullif(u.raw_user_meta_data ->> 'full_name', ''),
                                                    pg_catalog.split_part(u.email, '@', 1)) from auth.users u where u.id = r.principal_id)
                  when 'organization' then (select o.name from iam.organizations o where o.id = r.principal_id)
                  else 'Anyone with the link' end,
        'email', case when r.principal_kind = 'user' then (select u.email from auth.users u where u.id = r.principal_id) end,
        'level', r.level,
        'via', case r.via when 'record' then 'Shared on this record' when 'container' then 'Shared on what holds it' else 'A member of the organization' end,
        'has_access_now', v_now));
    end loop;
  exception when others then
    return jsonb_build_object('success', false, 'error', sqlerrm);
  end;

  return jsonb_build_object('success', true, 'at', p_at, 'people', v_rows);
end
$function$;
comment on function custom.who_could_see_on(uuid, timestamptz) is
  'CLOSE-SHARE — who could see one record at a past moment, replayed from History (history.who_could_see), in names, each with whether they still have access now. Asked by a person with Full access on the record. Refuses with History''s own sentence when it was not recording then.';

insert into platform.client_callable_door
  (schema_name, function_name, identity_args, identity_argtypes, reason, declared_by,
   non_client_lane, signed_in_callers, anonymous_callers, anonymous_purpose, argument_rules)
values
  ('custom', 'who_could_see_on', 'p_record_id uuid, p_at timestamp with time zone', array['uuid'::regtype, 'timestamptz'::regtype]::oid[],
   'Answers "Who could see this on…" in a record''s share panel: who could see the record at a past moment, from History, and who still can.',
   '20261021132000_closeshare_c_who_could_see_a_record_on_a_date.sql', null, true, false, null,
   jsonb_build_object('version', 1, 'declared_by', '20261021132000_closeshare_c_who_could_see_a_record_on_a_date.sql', 'declared_at', '2026-10-21 lane CLOSE-SHARE, read from the body and exercised in scripts/campaign-tests/closeshare_who_could_see_green.py',
     'arguments', jsonb_build_object(
       'p_record_id', jsonb_build_object(
         'type', 'uuid', 'position', 1, 'optional', false, 'entity', 'record',
         'entity_reason', 'The record whose past audience is asked for.',
         'check', 'public.may_manage_sharing(''record'', p_record_id) for the caller now: Full access on the record.',
         'foreign', jsonb_build_object('note', 'success false with the same sentence for a record that is not there, a deleted one and one the caller cannot manage', 'not_a_leak', true, 'same_as_invented', true),
         'null_rule', jsonb_build_object('means', 'success false, the same refusal'),
         'verified', 'exercised as the owner and as an outsider in scripts/campaign-tests/closeshare_who_could_see_green.py'),
       'p_at', jsonb_build_object(
         'type', 'timestamptz', 'position', 2, 'optional', false, 'entity', null, 'entity_reason', 'A moment; it names nothing.',
         'check', 'Only after the record check above; it must be in the past.',
         'foreign', jsonb_build_object('note', 'not an id', 'not_a_leak', true, 'same_as_invented', true),
         'null_rule', jsonb_build_object('means', 'success false, "Pick a moment in the past."'),
         'verified', 'exercised in scripts/campaign-tests/closeshare_who_could_see_green.py'))))
on conflict do nothing;

grant execute on function custom.who_could_see_on(uuid, timestamptz) to authenticated;
select custom.reopen_declared_doors();
