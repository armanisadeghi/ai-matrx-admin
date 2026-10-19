-- AT-SWEEP-4: the organization wall's refusal (custom.assert_client_may_reach / custom._not_a_member_refusal) names the ACTION in plain words from the one shared map (custom._door_action_words), never the door. begin..rollback, fixture orgs, nothing persists.
-- RED before atsweep4_a (door name in the sentence; no helper); GREEN after.
begin;
do $g$
declare
  c_admin constant uuid := '87a6e699-3622-4869-8843-d0867456c0dd';
  c_test  constant uuid := '4060701e-706a-4c76-b3ca-0bbc69fa5a14';
  c_admin_j constant text := '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated"}';
  c_test_j  constant text := '{"sub":"4060701e-706a-4c76-b3ca-0bbc69fa5a14","role":"authenticated"}';
  v_a uuid := gen_random_uuid(); v_org uuid; v_msg text; v_hint text; v_n integer;
begin
  perform set_config('app.actor_system', 'campaign.atsweep4', true);
  perform set_config('request.jwt.claims', c_admin_j, true);
  insert into iam.organizations (id, name, slug, abbreviation, created_by) values (v_a, 'ATSWEEP4 Fixture', 'atsweep4-' || substr(v_a::text,1,8), 'ATF', c_admin);
  insert into iam.memberships (organization_id, container_type, container_id, user_id, role, status) values (v_a, 'organization', v_a, c_admin, 'owner', 'active');
  insert into platform.knob_override (feature, key, scope_kind, scope_id, organization_id, value, set_note) values ('custom','system_enabled','organization',v_a,v_a,'true'::jsonb,'ATSWEEP4 fixture');

  -- PART 1: a person who is not a member, through a mapped door.
  perform set_config('request.jwt.claims', c_test_j, true);
  perform set_config('role','authenticated', true);
  begin
    perform custom.field_declare(v_a, gen_random_uuid(), jsonb_build_object('label', 'Gate Code', 'key', 'gate_code', 'type', 'text'));
    raise exception 'RED: a non-member declared a column';
  exception when insufficient_privilege then
    v_msg := sqlerrm;
  end;
  perform set_config('role','none', true);
  if v_msg ~* 'custom\.|_declare|has nothing to do there' then
    raise exception 'RED: the wall refusal still prints the door name: %', v_msg;
  end if;
  if v_msg is distinct from 'You are not a member of that organization, so changing a column is not possible there.' then
    raise exception 'RED: the wall refusal does not name the action in plain words: %', v_msg;
  end if;
  raise notice 'PART 1 GREEN: %', v_msg;

  -- PART 2: an unmapped door says the generic words, never its own name (both forms of the refusal).
  begin perform custom._not_a_member_refusal('custom.some_unmapped_read_door'); exception when insufficient_privilege then v_msg := sqlerrm; end;
  if v_msg is distinct from 'You are not a member of that organization, so there is nothing for you to do there.' then
    raise exception 'RED: an unmapped door in the one-argument refusal said: %', v_msg;
  end if;
  begin perform custom._not_a_member_refusal('custom.some_unmapped_read_door', null); exception when insufficient_privilege then v_msg := sqlerrm; end;
  if v_msg is distinct from 'You are not a member of that organization, so there is nothing for you to do there.' then
    raise exception 'RED: an unmapped door in the two-argument refusal said: %', v_msg;
  end if;
  raise notice 'PART 2 GREEN: unmapped door says the generic words';

  -- PART 3: one home. The map lives in custom._door_action_words only; no refusal function carries the map or raises with the raw door.
  select count(*) into v_n from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'custom' and p.proname in ('assert_client_may_change','assert_client_may_reach','_not_a_member_refusal')
     and (p.prosrc like '%when ''custom.field_declare'' then%' or p.prosrc ~ 'coalesce\(nullif\(btrim\(p_door\)');
  if v_n <> 0 then
    raise exception 'RED: % refusal function(s) still carry the door map or raise with the raw door', v_n;
  end if;
  if not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'custom' and p.proname = '_door_action_words'
                  and p.prosrc like '%when ''custom.field_declare'' then ''Changing a column''%') then
    raise exception 'RED: custom._door_action_words does not hold the map';
  end if;
  if not (custom._door_action_words('custom.field_declare') = 'Changing a column' and custom._door_action_words('custom.nothing_here') is null) then
    raise exception 'RED: custom._door_action_words answers wrongly';
  end if;
  raise notice 'PART 3 GREEN: one map, one home';
end
$g$;
rollback;
