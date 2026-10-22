-- scripts/campaign-tests/_dashshare_body.sql — shared body of dashshare_green.sql and dashshare_red.sql.
-- LANE DASH-SHARE-COUNT (2026-10-22, chair ruling from doctrine): an explicit share LISTS the record for the person it
-- names even when it is set to "Only me", and a person OUTSIDE the organization who holds an in-force share reaches
-- the doors and sees exactly what was shared. Run as `authenticated`; rolls everything back.
-- Expect: the setting dashshare.red = 'on' (red twin: the inverse migration is applied first and the FIRST clause must fail).

do $suite$
declare
  c_admin  uuid := '87a6e699-3622-4869-8843-d0867456c0dd';
  c_dana   uuid := '4060701e-706a-4c76-b3ca-0bbc69fa5a14';
  c_admin_j text := '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated"}';
  c_dana_j  text := '{"sub":"4060701e-706a-4c76-b3ca-0bbc69fa5a14","role":"authenticated"}';
  v_boss   text := current_user;
  v_red    boolean := coalesce(current_setting('dashshare.red', true), '') = 'on';
  v_org    uuid := gen_random_uuid();
  v_other  uuid := gen_random_uuid();
  v_home   uuid; v_tbl uuid; v_dash uuid; v_id uuid; v_unshared uuid;
  v_out    jsonb; v_msg text; v_n integer; v_i integer; v_this jsonb;
begin
  begin
  -- ── FIXTURE, as the connected role. A seat is a PERSON, so both people exist. ──────────
  perform set_config('app.actor_system', 'campaign-test/dashshare_green.sql', true);

  insert into iam.organizations (id, name, slug, abbreviation, created_by)
  values (v_org, 'DASHSHARE suite', 'dashshare-' || replace(v_org::text,'-',''), 'DSS', c_admin),
         (v_other, 'DASHSHARE bystander', 'dashshare-other-' || replace(v_other::text,'-',''), 'DSB', c_admin);
  insert into iam.memberships (organization_id, container_type, container_id, user_id, role, status)
  values (v_org, 'organization', v_org, c_admin, 'owner',  'active'),
         (v_org, 'organization', v_org, c_dana,  'member', 'active');
  -- Without the switch every door refuses a person: it is off globally by design.
  insert into platform.knob_override (feature, key, scope_kind, scope_id, organization_id, value)
  values ('custom','system_enabled','organization', v_org, v_org, 'true');
  -- The retired member-visibility knob is NOT written (access ladder T-17, 2026-10-03: every member opens
  -- every Organization record, lists hide and never lock). The member's numbers are therefore the same
  -- rows as the admin's, which is the rule PART 6 now asserts.

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

  -- Twenty records: ten are Dana's (shared to her), ten are not.
  for v_i in 1..20 loop
    v_id := custom.record_write(v_org, v_tbl, jsonb_build_object(
      'title','Job ' || lpad(v_i::text,2,'0'),
      'stage',(array['New','Scheduled','In progress','Awaiting parts','Done'])[1 + (v_i % 5)],
      'owner',case when v_i % 2 = 0 then 'Dana' else 'Marcus' end,
      'amount', (100 * v_i)::text));
  end loop;

  v_this := jsonb_build_object(
    'from', to_char(date_trunc('month', now()), 'YYYY-MM-DD'),
    'to',   to_char(date_trunc('month', now()) + interval '1 month', 'YYYY-MM-DD'));
  v_dash := custom.dashboard_declare(v_org, v_tbl, 'Jobs this month',
    jsonb_build_array(jsonb_build_object('title','Opened this month','kind','number','filter',
                         jsonb_build_object('created_at', v_this),'span',3)),
    jsonb_build_object('question','How many jobs this month?'));

  -- Not a client door: every record is "Only me" (the owner's own setting) and ten are SHARED to Dana, as the
  -- Share dialog writes them. Stepping out of the seat is stated; NOTHING is asserted while out.
  perform set_config('role', v_boss, true);
  update custom.record set created_by = c_admin, visibility = 'personal'::platform.visibility
   where organization_id = v_org and table_id = v_tbl;
  update custom.record set created_by = c_admin where organization_id = v_org and id = v_tbl;
  insert into iam.permissions (resource_type, resource_id, granted_to_user_id, permission_level, status)
  select 'record', r.id, c_dana, 'viewer', 'active'
    from custom.record r
   where r.organization_id = v_org and r.table_id = v_tbl and r.data ->> 'owner' = 'Dana';
  select r.id into v_unshared from custom.record r
   where r.organization_id = v_org and r.table_id = v_tbl and r.data ->> 'owner' = 'Marcus' limit 1;
  perform set_config('role', 'authenticated', true);

  -- ══ CLAUSE 1 — A MEMBER IS TOLD, AND LISTED, EXACTLY WHAT WAS SHARED TO HER ═══════════════
  perform set_config('request.jwt.claims', c_dana_j, true);
  select count(*) into v_n from custom.query_visible_ids(v_org, v_tbl, 'viewer');
  if v_n <> 10 then raise exception 'DS-1a: ten Only-me records are shared to her and her list door lists % (the other ten stay hidden: 10 is the answer)', v_n; end if;
  select (measures ->> 'count')::integer into v_n
    from custom.record_aggregate(v_org, v_tbl, '[]'::jsonb, '[{"op":"count"}]'::jsonb, null, '{}'::jsonb, null, 'viewer') limit 1;
  if v_n <> 10 then raise exception 'DS-1b: the aggregate door counts % for her, not the 10 shared to her', v_n; end if;
  select (x.r ->> 'total')::integer into v_n from (select to_jsonb(p) r from custom.read_records_page(v_org, v_tbl) p limit 1) x;
  if v_n <> 10 then raise exception 'DS-1c: the page door totals % for her, not the 10 shared to her', v_n; end if;
  v_out := custom.dashboard_run(v_org, v_dash, '{}'::jsonb);
  select (e -> 'rows' -> 0 -> 'measures' ->> 'count')::integer into v_n
    from jsonb_array_elements(v_out -> 'blocks') e where e ->> 'title' = 'Opened this month';
  if v_n <> 10 then raise exception 'DS-1d: she was shared ten records and the dashboard tells her % — this is the whole product', v_n; end if;
  raise notice 'DS-1 PASSED — a shared member is listed, counted and told 10 on every door, the dashboard included';

  -- ══ CLAUSE 2 — "ONLY ME" STILL HIDES THE RECORD FROM AN UNSHARED MEMBER AND IS COUNTED FOR ITS OWNER ═══
  if exists (select 1 from custom.query_visible_ids(v_org, v_tbl, 'viewer') q where q = v_unshared) then
    raise exception 'DS-2a: an Only-me record nobody shared to her is in her list';
  end if;
  perform set_config('request.jwt.claims', c_admin_j, true);
  select count(*) into v_n from custom.query_visible_ids(v_org, v_tbl, 'viewer');
  if v_n <> 20 then raise exception 'DS-2b: the owner is listed % of her own 20 records', v_n; end if;
  raise notice 'DS-2 PASSED — Only me hides what was not shared (she: 10 of 20) and the owner still has all 20';

  -- ══ CLAUSE 3 — A SHARED OUTSIDER REACHES THE DOORS AND SEES EXACTLY HER TEN ═════════════════
  perform set_config('role', v_boss, true);
  delete from iam.memberships where organization_id = v_org and user_id = c_dana;
  insert into iam.permissions (resource_type, resource_id, granted_to_user_id, permission_level, status)
  values ('record', v_dash, c_dana, 'viewer', 'active');
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', c_dana_j, true);
  if iam.has_org_access(v_org) then raise exception 'DS-3: the fixture failed — she is still a member'; end if;
  select count(*) into v_n from custom.query_visible_ids(v_org, v_tbl, 'viewer');
  if v_n <> 10 then raise exception 'DS-3a: an outsider holding ten shares is listed % records', v_n; end if;
  select (measures ->> 'count')::integer into v_n
    from custom.record_aggregate(v_org, v_tbl, '[]'::jsonb, '[{"op":"count"}]'::jsonb, null, '{}'::jsonb, null, 'viewer') limit 1;
  if v_n <> 10 then raise exception 'DS-3b: the aggregate door counts % for the outsider, not her 10', v_n; end if;
  if exists (select 1 from custom.query_visible_ids(v_org, v_tbl, 'viewer') q where q = v_unshared) then
    raise exception 'DS-3c: the outsider is listed a record nobody shared to her';
  end if;
  begin
    perform custom.read_record(v_org, v_unshared, false);
    raise exception 'DS-3d: the outsider opened a record nobody shared to her';
  exception when others then
    get stacked diagnostics v_msg = message_text;
    if v_msg like 'DS-3d%' then raise; end if;
  end;
  v_out := custom.dashboard_run(v_org, v_dash, '{}'::jsonb);
  select (e -> 'rows' -> 0 -> 'measures' ->> 'count')::integer into v_n
    from jsonb_array_elements(v_out -> 'blocks') e where e ->> 'title' = 'Opened this month';
  if v_n is distinct from 10 then raise exception 'DS-3e: the shared outsider is told % on the dashboard shared to her, not her 10 — %', v_n, left(v_out::text, 400); end if;
  raise notice 'DS-3 PASSED — a shared outsider reaches the doors and sees exactly her ten, never a row nobody shared';

  -- ══ CLAUSE 4 — AN OUTSIDER WITH NO SHARE IS STILL REFUSED AT THE WALL ═════════════════════
  perform set_config('role', v_boss, true);
  delete from iam.permissions where granted_to_user_id = c_dana
     and resource_id in (select id from custom.record where organization_id = v_org);
  perform set_config('role', 'authenticated', true);
  begin
    perform 1 from custom.query_visible_ids(v_org, v_tbl, 'viewer');
    raise exception 'DS-4: an outsider with no share was let through the wall';
  exception when others then
    get stacked diagnostics v_msg = message_text;
    if v_msg like 'DS-4%' then raise; end if;
    if v_msg not like '%not a member%' then raise exception 'DS-4: refused, but not at the membership wall: %', v_msg; end if;
  end;
  raise notice 'DS-4 PASSED — no share, no way in';
  raise notice '=== DASHSHARE ALL CLAUSES PASSED ===';
  exception when others then
    get stacked diagnostics v_msg = message_text;
    if v_red then
      raise notice 'RED CONFIRMED — the pre-fix doors fail the clause: %', v_msg;
      return;
    end if;
    raise;
  end;
  if v_red then raise exception 'RED DID NOT GO RED: the pre-fix doors passed every clause'; end if;
end
$suite$;
