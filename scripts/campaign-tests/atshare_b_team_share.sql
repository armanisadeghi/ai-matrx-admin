-- AT-SHARE-B / Airtable parity "Workspace roles and user groups" — SHARE A TABLE WITH A TEAM, end to end at the store.
-- The Share dialog's "Add everyone in an organization or team" reads a team's members through `team_members` and grants
-- each PERSON through the same door as a single share (`custom.share_grant`, SHARE-PEOPLE-ONLY: a team is never a
-- grantee). This walks exactly those doors: admin@admin.com makes a team with test@test.com on it, lists its members,
-- grants each at Edit, and test@test.com then holds Edit on the table (RED half: before the grant test@test.com held
-- less). Runs inside BEGIN … ROLLBACK: nothing it makes outlives the run.
begin;
do $green$
declare
  c_admin constant uuid := '87a6e699-3622-4869-8843-d0867456c0dd';
  c_test  constant uuid := '4060701e-706a-4c76-b3ca-0bbc69fa5a14';
  c_admin_j constant text := '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated"}';
  c_test_j  constant text := '{"sub":"4060701e-706a-4c76-b3ca-0bbc69fa5a14","role":"authenticated"}';
  v_org uuid := gen_random_uuid(); v_home uuid; v_t uuid; v_team uuid; v_before text; v_after text; v_n integer; m record;
begin
  if (select email from auth.users where id = c_test) <> 'test@test.com' then raise exception 'the test seat is not test@test.com'; end if;
  perform set_config('app.actor_system', 'campaign.atshare_b.team', true);
  perform set_config('request.jwt.claims', c_admin_j, true);
  insert into iam.organizations (id, name, slug, abbreviation, created_by) values (v_org, 'AT-SHARE-B Team Fixture', 'atb-team-' || substr(v_org::text,1,8), 'ATT', c_admin);
  insert into iam.memberships (organization_id, container_type, container_id, user_id, role, status) values (v_org, 'organization', v_org, c_admin, 'owner', 'active');
  insert into iam.memberships (organization_id, container_type, container_id, user_id, role, status) values (v_org, 'organization', v_org, c_test, 'member', 'active');
  insert into platform.knob_override (feature, key, scope_kind, scope_id, organization_id, value, set_note) values ('custom','system_enabled','organization',v_org,v_org,'true'::jsonb,'AT-SHARE-B fixture');
  insert into custom.record (organization_id, table_id, data) values (v_org, null, jsonb_build_object('name','ATT Home')) returning id into v_home;
  perform set_config('role','authenticated', true);
  v_t := custom.table_declare(v_org, jsonb_build_object('name','Jobs','slug','jobs','type','entity','display','list','label_singular','Job','label_plural','Jobs',
    'ordered',false,'weight','light','retention_days',365,'row_order','sorted','agent_writable',true,'parent_id',v_home::text,'title_field','title','default_sort','[]'::jsonb,
    'fields', jsonb_build_array(jsonb_build_object('name','title'))));

  -- The team, through the same doors the Teams page uses.
  v_team := public.team_create(v_org, 'Field crew', null, null);
  perform public.team_member_add(v_team, c_test, 'member');

  -- CLAUSE 1 (RED half) — test@test.com's level on the table before any share.
  perform set_config('request.jwt.claims', c_test_j, true);
  v_before := custom.my_level(v_org, v_t, 'table');
  if v_before in ('editor', 'admin') then raise exception 'CLAUSE 1 FAILED: test@test.com already held % before the team share', v_before; end if;
  raise notice 'CLAUSE 1 OK: before the team share test@test.com holds %', coalesce(v_before, 'nothing');

  -- CLAUSE 2 — the dialog's path: list the team's members, grant each person at Edit.
  perform set_config('request.jwt.claims', c_admin_j, true);
  v_n := 0;
  for m in select * from public.team_members(v_team) loop
    if m.user_id = c_admin then continue; end if;
    perform custom.share_grant(v_org, v_t, 'person', m.user_id, 'editor'::public.permission_level);
    v_n := v_n + 1;
  end loop;
  if v_n < 1 then raise exception 'CLAUSE 2 FAILED: the team listed nobody to share with'; end if;
  raise notice 'CLAUSE 2 OK: granted % team member(s) at Edit', v_n;

  -- CLAUSE 3 — the team member now holds what the team was given.
  perform set_config('request.jwt.claims', c_test_j, true);
  v_after := custom.my_level(v_org, v_t, 'table');
  if v_after is distinct from 'editor' then raise exception 'CLAUSE 3 FAILED: test@test.com holds % after the team share (expected editor)', v_after; end if;
  raise notice 'CLAUSE 3 OK: test@test.com holds % on the table', v_after;
  raise notice 'AT-SHARE-B team share GREEN';
end;
$green$;
rollback;
