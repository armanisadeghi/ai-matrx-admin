-- AT-SWEEP-3: the shared ladder refusal (custom.assert_client_may_change) names the ACTION in plain words, never the door; every refusal that named a ladder level uses View / Comment / Edit / Full access. begin..rollback, fixture orgs, nothing persists.
-- RED before atsweep3_a (door name + "admin level" words in function text); GREEN after.
begin;
do $g$
declare
  c_admin constant uuid := '87a6e699-3622-4869-8843-d0867456c0dd';
  c_test  constant uuid := '4060701e-706a-4c76-b3ca-0bbc69fa5a14';
  c_admin_j constant text := '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated"}';
  c_test_j  constant text := '{"sub":"4060701e-706a-4c76-b3ca-0bbc69fa5a14","role":"authenticated"}';
  v_a uuid := gen_random_uuid(); v_b uuid := gen_random_uuid(); v_org uuid;
  v_home uuid; v_t1 uuid; v_r uuid; v_out jsonb; v_n integer; v_msg text; v_hint text;
begin
  perform set_config('app.actor_system', 'campaign.atreviewfix', true);
  perform set_config('request.jwt.claims', c_admin_j, true);
  foreach v_org in array array[v_a, v_b] loop
    insert into iam.organizations (id, name, slug, abbreviation, created_by) values (v_org, 'ATREVFIX Fixture', 'atrevfix-' || substr(v_org::text,1,8), 'ATR', c_admin);
    insert into iam.memberships (organization_id, container_type, container_id, user_id, role, status) values (v_org, 'organization', v_org, c_admin, 'owner', 'active');
    insert into platform.knob_override (feature, key, scope_kind, scope_id, organization_id, value, set_note) values ('custom','system_enabled','organization',v_org,v_org,'true'::jsonb,'ATREVFIX fixture');
  end loop;
  insert into iam.memberships (organization_id, container_type, container_id, user_id, role, status) values (v_a, 'organization', v_a, c_test, 'member', 'active');
  insert into custom.record (organization_id, table_id, data) values (v_a, null, jsonb_build_object('name','Move Home')) returning id into v_home;
  perform set_config('role','authenticated', true);
  v_t1 := custom.table_declare(v_a, jsonb_build_object('name','Jobs','slug','jobs','type','entity','display','list','label_singular','Job','label_plural','Jobs',
    'ordered',false,'weight','light','retention_days',365,'row_order','sorted','agent_writable',true,'parent_id',v_home::text,'title_field','title','default_sort','[]'::jsonb,
    'fields', jsonb_build_array(jsonb_build_object('name','title'))));
  v_r := custom.record_write(v_a, v_t1, jsonb_build_object('title','Job one'));
  perform custom.share_grant(v_a, v_t1, 'user', c_test, 'viewer');

  perform set_config('request.jwt.claims', c_test_j, true);
  begin
    perform custom.field_declare(v_a, v_t1, jsonb_build_object('label', 'Gate Code', 'key', 'gate_code', 'type', 'text'));
    raise exception 'RED: a viewer declared a column';
  exception when insufficient_privilege then
    v_msg := sqlerrm; get stacked diagnostics v_hint = pg_exception_hint;
  end;
  if v_msg ~* 'custom\.|_declare|(admin|viewer|editor|commenter) level' or v_hint ~* 'custom\.|_declare|(admin|viewer|editor|commenter) level|an admin of this|< admin|DOOR-1' then
    raise exception 'RED: the refusal still prints the door name or the raw level words: % | %', v_msg, v_hint;
  end if;
  if v_msg is distinct from 'Changing a column needs Full access; you have View access on this table.' or v_hint not like '%View < Comment < Edit < Full access%' or v_hint not like '%someone with Full access%' then
    raise exception 'RED: the refusal does not name the action in plain words: % | %', v_msg, v_hint;
  end if;
  v_n := 1;
  raise notice 'PART 1 GREEN: % | %', v_msg, v_hint;
end
$g$;

-- PART 2: no function in the live store still carries a raw level word in a sentence it can raise (comment lines excluded; self-tests excluded).
do $g$
declare v_bad text;
begin
  select string_agg(n.nspname || '.' || p.proname, ', ' order by n.nspname, p.proname) into v_bad
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname not in ('pg_catalog', 'information_schema', 'pg_toast')
     and p.prokind = 'f' and p.proname !~* 'selftest'
     and regexp_replace(p.prosrc, '(^|\n)[ \t]*--[^\n]*', '', 'g') ~* '(admin|viewer|editor|commenter) level|< commenter < editor < admin';
  if v_bad is not null then
    raise exception 'RED: raw level words still in: %', v_bad;
  end if;
  raise notice 'PART 2 GREEN: no function says "the admin level" / "viewer < commenter < editor < admin"';
end
$g$;

-- PART 3: every door literal handed to custom.assert_client_may_change is in the plain-words map (a new door without a label fails here, not in front of a person).
do $g$
declare v_map text; v_missing text;
begin
  select p.prosrc into v_map from pg_proc p where p.oid = 'custom.assert_client_may_change(uuid,uuid,text,public.permission_level,text)'::regprocedure;
  select string_agg(distinct m[1], ', ') into v_missing
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace,
         lateral regexp_matches(regexp_replace(p.prosrc, '(^|\n)[ \t]*--[^\n]*', '', 'g'), 'assert_client_may_change\s*\(\s*[^,]+,[^,]+,\s*''([^'']+)''', 'g') as m
   where n.nspname in ('custom', 'platform', 'public', 'iam')
     and position('when ''' || lower(m[1]) || ''' then' in v_map) = 0;
  if v_missing is not null then
    raise exception 'RED: doors with no plain-words label: %', v_missing;
  end if;
  if position('else ''Making this change'' end' in v_map) = 0 then
    raise exception 'RED: the map has no generic fallback';
  end if;
  raise notice 'PART 3 GREEN: every literal door has a plain label, and the fallback is generic';
end
$g$;
rollback;
