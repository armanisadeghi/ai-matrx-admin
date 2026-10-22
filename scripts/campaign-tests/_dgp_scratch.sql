-- scripts/campaign-tests/dash_green.sql — LANE DASHBOARDS, PRODUCTS row 3.
--
-- EVERY ASSERTED CLAUSE RUNS AS `authenticated`, THROUGH THE DOORS A SIGNED-IN PERSON
-- REACHES. PART 0 proves the seat is real before anything is claimed. The suite makes its own
-- organization, its own Table, its own records and its own share, and ROLLS THE WHOLE THING
-- BACK — it leaves nothing behind and asserts nothing about anybody else's data.
--
-- Run: <scratchpad>/p.sh -f scripts/campaign-tests/dash_green.sql
--
-- The red twin is scripts/campaign-tests/dash_red.sql.

\set ON_ERROR_STOP on

-- TARGET AND DEPENDENCIES — the one shared preamble. It accepts the MAIN database or the
-- rehearsal branch named in common-docs/.../plan/BRANCH-REF, refuses anything else by name,
-- says which database this is, and SKIPS (never fake-passes) when a declared dependency is
-- absent here. Declare dependencies with `\set requires` above the include; see the preamble.
\set suite 'dash_green.sql'
\i scripts/campaign-tests/_preamble.sql
\if :matrx_skip
\quit
\endif
begin;

do $suite$
declare
  c_admin  uuid := '87a6e699-3622-4869-8843-d0867456c0dd';   -- admin@admin.com
  c_dana   uuid := '4060701e-706a-4c76-b3ca-0bbc69fa5a14';   -- test@test.com
  c_admin_j text := '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated"}';
  c_dana_j  text := '{"sub":"4060701e-706a-4c76-b3ca-0bbc69fa5a14","role":"authenticated"}';
  v_boss   text := current_user;
  v_org    uuid := gen_random_uuid();
  v_other  uuid := gen_random_uuid();
  v_home   uuid;
  v_tbl    uuid;
  v_dash   uuid;
  v_id     uuid;
  v_out    jsonb;
  v_b      jsonb;
  v_msg    text;
  v_n      integer;
  v_i      integer;
  v_this   jsonb;
begin
  -- ── FIXTURE, as the connected role. A seat is a PERSON, so both people exist. ──────────
  perform set_config('app.actor_system', 'campaign-test/dash_green.sql', true);

  insert into iam.organizations (id, name, slug, abbreviation, created_by)
  values (v_org, 'DASH green suite', 'dash-green-' || replace(v_org::text,'-',''), 'DGS', c_admin),
         (v_other, 'DASH green bystander', 'dash-other-' || replace(v_other::text,'-',''), 'DGB', c_admin);
  insert into iam.memberships (organization_id, container_type, container_id, user_id, role, status)
  values (v_org, 'organization', v_org, c_admin, 'owner',  'active'),
         (v_org, 'organization', v_org, c_dana,  'member', 'active');
  -- Without the switch every door refuses a person: it is off globally by design.
  insert into platform.knob_override (feature, key, scope_kind, scope_id, organization_id, value)
  values ('custom','system_enabled','organization', v_org, v_org, 'true');

  insert into custom.record (organization_id, table_id, data_class, data, created_by)
  values (v_org, custom.organization_kernel_id(), 'record',
          jsonb_build_object('name','Workspace'), c_admin)
  returning id into v_home;

  perform set_config('request.jwt.claims', c_admin_j, true);

  -- ══ PART 0 — TAKE THE SEAT AND PROVE IT ════════════════════════════════════════════════
  perform set_config('role', 'authenticated', true);
  if current_user <> 'authenticated' then
    raise exception '0: this suite did not take the seat — current_user is %', current_user;
  end if;
  if pg_has_role(current_user,
                 (select c.relowner from pg_class c where c.oid = 'custom.record'::regclass),
                 'member') then
    raise exception '0: this seat is a member of the role that owns custom.record, so every wall would open on its first line';
  end if;
  begin
    perform 1 from custom.record limit 1;
    raise exception '0: this seat can SELECT custom.record directly, so it is not a client seat';
  exception when insufficient_privilege then null;
  end;
  raise notice 'PART 0 PASSED — the seat is authenticated and cannot read custom.record directly';

  -- ── The Table and its Fields, through the doors a person reaches. ──────────────────────
  v_tbl := custom.table_declare(v_org, jsonb_build_object(
    'name','Jobs','slug','jobs','description','','type','entity','display','list',
    'ordered', false, 'weight','light','retention_days',30,'row_order','sorted',
    'default_sort', jsonb_build_array(jsonb_build_object('field','title','direction','asc')),
    'agent_writable', true, 'label_singular','Job','label_plural','Jobs','title_field','title',
    'fields', jsonb_build_array(jsonb_build_object('name','title'), jsonb_build_object('name','stage'),
                                jsonb_build_object('name','owner'), jsonb_build_object('name','amount')),
    'parent_id', v_home));
  perform custom.field_declare(v_org, v_tbl, jsonb_build_object('label','title','name','title','field_type','text'));
  perform custom.field_declare(v_org, v_tbl, jsonb_build_object('label','stage','name','stage','field_type','text'));
  perform custom.field_declare(v_org, v_tbl, jsonb_build_object('label','owner','name','owner','field_type','text'));
  perform custom.field_declare(v_org, v_tbl, jsonb_build_object('label','amount','name','amount','field_type','currency'));

  -- Twenty records: five stages, two owners. Ten are Dana's.
  for v_i in 1..20 loop
    v_id := custom.record_write(v_org, v_tbl, jsonb_build_object(
      'title','Job ' || lpad(v_i::text,2,'0'),
      'stage',(array['New','Scheduled','In progress','Awaiting parts','Done'])[1 + (v_i % 5)],
      'owner',case when v_i % 2 = 0 then 'Dana' else 'Marcus' end,
      'amount', (100 * v_i)::text));
  end loop;

  -- A step no client door covers: the records default to the store's `internal` visibility
  -- and the share is what narrows them. Stepping out is stated, and NOTHING is asserted while
  -- out — the shape of the fixture is not a claim about the product.
  perform set_config('role', v_boss, true);
  update custom.record set created_by = c_admin, visibility = 'personal'::platform.visibility
   where organization_id = v_org and table_id = v_tbl;
  update custom.record set created_by = c_admin where organization_id = v_org and id = v_tbl;
  insert into iam.permissions (resource_type, resource_id, granted_to_user_id, permission_level, status)
  select 'record', r.id, c_dana, 'viewer', 'active'
    from custom.record r
   where r.organization_id = v_org and r.table_id = v_tbl and r.data ->> 'owner' = 'Dana';
  perform set_config('role', 'authenticated', true);

  v_this := jsonb_build_object(
    'from', to_char(date_trunc('month', now()), 'YYYY-MM-DD'),
    'to',   to_char(date_trunc('month', now()) + interval '1 month', 'YYYY-MM-DD'));

  perform set_config('role', v_boss, true);
  raise notice 'PROBE perms rows: % ; in force: %', (select count(*) from iam.permissions p where p.granted_to_user_id=c_dana and p.resource_type='record' and p.resource_id in (select id from custom.record where organization_id=v_org)),
     (select count(*) from iam.permissions p where p.granted_to_user_id=c_dana and iam.grant_in_force(p.status,p.expires_at) and p.resource_id in (select id from custom.record where organization_id=v_org));
  raise notice 'PROBE granted_ids: %', (select coalesce(array_length(custom.read_door_granted_ids(v_org, v_tbl),1),0));
  raise notice 'PROBE visible_set: %', (select to_jsonb(s) - 'o_note' from custom.visible_set(c_dana, v_org, v_tbl, 'viewer') s);
  raise notice 'PROBE has_visibility one: %', (select custom.has_visibility(c_dana,'record',(select resource_id from iam.permissions where granted_to_user_id=c_dana and resource_id in (select id from custom.record where organization_id=v_org) limit 1),'viewer'));
  raise notice 'PROBE sample perm: %', (select to_jsonb(p) from iam.permissions p where granted_to_user_id=c_dana and resource_id in (select id from custom.record where organization_id=v_org) limit 1);
  raise notice 'PROBE sample rec: %', (select to_jsonb(r)-'data' from custom.record r where organization_id=v_org and table_id=v_tbl limit 1);
end $suite$;
rollback;
