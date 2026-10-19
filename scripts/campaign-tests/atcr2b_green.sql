-- LANE CHART-READ-2 (b) - a chart counts each part of a many-value column (Airtable); the grid group-by keeps the exact combination;
-- an outsider's chart filter on a masked column (or a formula over it) is refused. RED before atcr2_b, GREEN after (viewlink_run.py).

do $t$
declare
  c_admin constant uuid := '87a6e699-3622-4869-8843-d0867456c0dd';
  c_out   constant uuid := '000eaa28-cf5d-402a-8f01-5e2c24191323';
  c_admin_j constant text := '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated"}';
  c_out_j   constant text := '{"sub":"000eaa28-cf5d-402a-8f01-5e2c24191323","role":"authenticated"}';
  c_test_j  constant text := '{"sub":"4060701e-706a-4c76-b3ca-0bbc69fa5a14","role":"authenticated"}';
  v_org uuid := gen_random_uuid(); v_home uuid; v_tbl uuid; v_row jsonb; v_if uuid; v_out jsonb; v_keys text[];
  v_pages jsonb; v_northwind uuid; v_res jsonb; v_expr jsonb; v_m jsonb; v_ref jsonb; v_tg uuid; v_t1 uuid; v_t2 uuid; v_n int; v_dash uuid; v_g jsonb; v_rows jsonb;
begin
  perform set_config('app.actor_system', 'campaign-test/atcr2b', true);
  perform set_config('request.jwt.claims', c_admin_j, true);
  insert into iam.organizations (id, name, slug, abbreviation, created_by)
  values (v_org, 'Harbor & Pine Creative ' || substr(v_org::text, 1, 8), 'harbor-pine-' || substr(v_org::text, 1, 8), 'HPC', c_admin);
  insert into iam.memberships (organization_id, container_type, container_id, user_id, role, status)
  values (v_org, 'organization', v_org, c_admin, 'owner', 'active');
  insert into platform.knob_override (feature, key, scope_kind, scope_id, organization_id, value, set_note)
  values ('custom', 'system_enabled', 'organization', v_org, v_org, 'true'::jsonb, 'atcr2 fixture');
  insert into custom.record (organization_id, table_id, data) values (v_org, null, jsonb_build_object('name', 'Home')) returning id into v_home;

  v_tbl := custom.table_declare(v_org, jsonb_build_object('name', 'Content', 'slug', 'content', 'type', 'entity',
    'label_singular', 'Post', 'label_plural', 'Posts', 'title_field', 'title', 'display', 'list', 'weight', 'light',
    'ordered', true, 'row_order', 'sorted', 'default_sort', jsonb_build_array(jsonb_build_object('field', 'title', 'direction', 'asc')),
    'agent_writable', true, 'retention_days', 3650, 'parent_id', v_home::text, 'fields', jsonb_build_array(jsonb_build_object('name', 'title'))));
  perform custom.field_declare(v_org, v_tbl, jsonb_build_object('key', 'title', 'label', 'Post', 'type', 'text', 'sort', 10, 'required', true));
  perform custom.field_declare(v_org, v_tbl, jsonb_build_object('key', 'client', 'label', 'Client', 'type', 'text', 'sort', 20));
  perform custom.field_declare(v_org, v_tbl, jsonb_build_object('key', 'client_contact', 'label', 'Client contact', 'type', 'email', 'sort', 25));
  perform custom.field_declare(v_org, v_tbl, jsonb_build_object('key', 'status', 'label', 'Status', 'type', 'select', 'sort', 40,
    'options', jsonb_build_array('Draft', 'Ready for approval', 'Approved')));
  perform custom.field_declare(v_org, v_tbl, jsonb_build_object('key', 'amount', 'label', 'Amount', 'type', 'number', 'sort', 50));
  perform custom.field_declare(v_org, v_tbl, jsonb_build_object('key', 'margin', 'label', 'Agency margin', 'type', 'number', 'sort', 60, 'sensitivity', 'confidential'));
  perform custom.field_declare(v_org, v_tbl, jsonb_build_object('key', 'internal_notes', 'label', 'Agency notes', 'type', 'long_text', 'sort', 70, 'sensitivity', 'confidential'));
  v_expr := custom.formula_parse(v_org, v_tbl, 'IF({Amount} >= 200, "Big", "Small")') -> 'expr';
  perform custom.field_declare(v_org, v_tbl, jsonb_build_object('label','Size','key','size','type','formula','source','formula','compute_on','read','parity_type','formula','sort',80,
    'config', jsonb_build_object('expr', v_expr, 'formula_text','IF({Amount} >= 200, "Big", "Small")')));
  v_expr := custom.formula_parse(v_org, v_tbl, '{Amount} * 2') -> 'expr';
  perform custom.field_declare(v_org, v_tbl, jsonb_build_object('label','Double','key','double','type','formula','source','formula','compute_on','read','parity_type','formula','sort',81,
    'config', jsonb_build_object('expr', v_expr, 'formula_text','{Amount} * 2')));
  v_expr := custom.formula_parse(v_org, v_tbl, '{Double} + 1') -> 'expr';
  perform custom.field_declare(v_org, v_tbl, jsonb_build_object('label','Plus one','key','plus_one','type','formula','source','formula','compute_on','read','parity_type','formula','sort',82,
    'config', jsonb_build_object('expr', v_expr, 'formula_text','{Double} + 1')));
  v_expr := custom.formula_parse(v_org, v_tbl, '{Amount} + {Agency margin}') -> 'expr';
  perform custom.field_declare(v_org, v_tbl, jsonb_build_object('label','Take','key','take','type','formula','source','formula','compute_on','read','parity_type','formula','sort',83,
    'config', jsonb_build_object('expr', v_expr, 'formula_text','{Amount} + {Agency margin}')));
  v_expr := custom.formula_parse(v_org, v_tbl, 'IF({Take} > 0, "Paid", "Unpaid")') -> 'expr';
  perform custom.field_declare(v_org, v_tbl, jsonb_build_object('label','Paid state','key','paid_state','type','formula','source','formula','compute_on','read','parity_type','formula','sort',84,
    'config', jsonb_build_object('expr', v_expr, 'formula_text','IF({Take} > 0, "Paid", "Unpaid")')));
  v_tg := custom.table_declare(v_org, jsonb_build_object('name', 'Targets', 'slug', 'targets', 'type', 'entity', 'label_singular', 'Target', 'label_plural', 'Targets',
    'title_field', 'name', 'default_sort', jsonb_build_array(jsonb_build_object('field', 'name', 'direction', 'asc')), 'display', 'list', 'weight', 'light', 'ordered', true, 'row_order', 'sorted', 'agent_writable', true, 'retention_days', 3650,
    'parent_id', v_home::text, 'fields', jsonb_build_array(jsonb_build_object('name', 'name'))));
  perform custom.field_declare(v_org, v_tg, jsonb_build_object('key', 'name', 'label', 'Name', 'type', 'text', 'sort', 10, 'required', true));
  v_t1 := custom.record_write(v_org, v_tg, jsonb_build_object('name', 'Spring launch'));
  v_t2 := custom.record_write(v_org, v_tg, jsonb_build_object('name', 'Fall launch'));
  perform custom.field_declare(v_org, v_tbl, jsonb_build_object('key', 'topics', 'label', 'Topics', 'type', 'multi_select', 'sort', 90, 'options', jsonb_build_array('A', 'B', 'C')));
  perform custom.field_declare(v_org, v_tbl, jsonb_build_object('key', 'targets', 'label', 'Targets', 'type', 'relation', 'multi', true, 'relation_target', v_tg, 'relation_max', 10, 'on_target_delete', 'restrict', 'sort', 91));
  if (select count(*) from custom.field fl where fl.entity_definition_id = v_tbl and fl.key in ('margin', 'internal_notes') and fl.sensitivity = 'confidential') <> 2 then
    raise exception 'setup: the confidential columns did not take their sensitivity';
  end if;
  for v_row in select e from jsonb_array_elements(jsonb_build_array(
    jsonb_build_object('title','p1','client','Comtech','client_contact','keith.watanabe@comtech.com','status','Draft','amount',100,'margin',7771,'topics',jsonb_build_array('A','B'),'targets',jsonb_build_array(v_t1, v_t2)),
    jsonb_build_object('title','p2','client','Comtech','client_contact','keith.watanabe@comtech.com','status','Draft','amount',200,'margin',7772,'topics',jsonb_build_array('A'),'targets',jsonb_build_array(v_t1)),
    jsonb_build_object('title','p3','client','Comtech','client_contact','keith.watanabe@comtech.com','status','Draft','amount',300,'margin',7773,'topics',jsonb_build_array('B','C')),
    jsonb_build_object('title','p4','client','Northwind Outfitters','client_contact','dana@northwind.example.com','status','Draft','amount',1000,'margin',7774,'topics',jsonb_build_array('A')))) e loop
    perform custom.record_write(v_org, v_tbl, v_row);
  end loop;
  v_pages := jsonb_build_array(jsonb_build_object('id', 'p-dash', 'name', 'Dashboard',
    'charts', jsonb_build_array(
      jsonb_build_object('id', 'c-topics', 'title', 'By topic', 'subject', v_tbl, 'kind', 'bar', 'groupBy', jsonb_build_array('topics'), 'measures', jsonb_build_array(jsonb_build_object('op', 'count'))),
      jsonb_build_object('id', 'c-targets', 'title', 'By target', 'subject', v_tbl, 'kind', 'bar', 'groupBy', jsonb_build_array('targets'), 'measures', jsonb_build_array(jsonb_build_object('op', 'count'))),
      jsonb_build_object('id', 'c-ftake', 'title', 'Filter on a masked formula', 'subject', v_tbl, 'kind', 'bar', 'groupBy', jsonb_build_array('status'), 'filter', jsonb_build_object('take', 7871), 'measures', jsonb_build_array(jsonb_build_object('op', 'count'))),
      jsonb_build_object('id', 'c-fmargin', 'title', 'Filter on the masked column', 'subject', v_tbl, 'kind', 'bar', 'groupBy', jsonb_build_array('status'), 'filter', jsonb_build_object('margin', 7771), 'measures', jsonb_build_array(jsonb_build_object('op', 'count'))),
      jsonb_build_object('id', 'c-fpaid', 'title', 'Filter on a formula over a formula', 'subject', v_tbl, 'kind', 'bar', 'groupBy', jsonb_build_array('status'), 'filter', jsonb_build_object('paid_state', 'Paid'), 'measures', jsonb_build_array(jsonb_build_object('op', 'count')))),
    'blocks', jsonb_build_array(
      jsonb_build_object('id', 'e-board', 'kind', 'layout', 'layout', 'kanban', 'table_id', v_tbl, 'group_field', 'status', 'me_field', 'client_contact'),
      jsonb_build_object('id', 'c-topics', 'kind', 'chart', 'title', 'By topic'))));
  perform set_config('role', 'authenticated', true);
  v_if := custom.dashboard_declare(v_org, v_tbl, 'Agency Ops', '[]'::jsonb, jsonb_build_object(
    'kind', 'interface', 'icon', 'layout-dashboard', 'color', 'blue',
    'draft', jsonb_build_object('pages', v_pages), 'published', jsonb_build_object('pages', v_pages, 'version', 1),
    'versions', jsonb_build_array(jsonb_build_object('version', 1, 'pages', v_pages))), null);
  if v_if is null then raise exception 'setup: the interface was not made'; end if;

  -- ══ MEMBERS: a chart (split_multi) counts each part; the grid group-by (default) keeps the exact combination ══
  v_g := (select jsonb_object_agg(x.groups ->> 'topics', x.row_count) from custom.record_aggregate(v_org, v_tbl, '["topics"]'::jsonb, '[{"op":"count"}]'::jsonb, p_split_multi => true) x);
  if v_g is distinct from '{"A": 3, "B": 2, "C": 1}'::jsonb then raise exception 'M1: the members'' chart did not count each option once: %', v_g; end if;
  v_g := (select jsonb_object_agg(coalesce(x.groups ->> 'targets', 'none'), x.row_count) from custom.record_aggregate(v_org, v_tbl, '["targets"]'::jsonb, '[{"op":"count"}]'::jsonb, p_split_multi => true) x);
  if v_g is distinct from jsonb_build_object(v_t1::text, 2, v_t2::text, 1, 'none', 2) then raise exception 'M2: the members'' chart did not count each linked record once: %', v_g; end if;
  -- grid group-by: unchanged - the exact combination, one group per distinct list
  v_n := (select count(*) from custom.record_aggregate(v_org, v_tbl, '["topics"]'::jsonb, '[{"op":"count"}]'::jsonb));
  v_g := (select jsonb_object_agg(coalesce(x.groups ->> 'topics','none'), x.row_count) from custom.record_aggregate(v_org, v_tbl, '["topics"]'::jsonb, '[{"op":"count"}]'::jsonb) x);
  if v_n <> 3 or (v_g ->> '["a"]')::int is distinct from 2 then raise exception 'M3: the grid group-by changed (expected combinations, 3 groups, ["a"] twice): %', v_g; end if;
  v_n := (select count(*) from custom.record_aggregate(v_org, v_tbl, '["targets"]'::jsonb, '[{"op":"count"}]'::jsonb, p_split_multi => false));
  if v_n <> 3 then raise exception 'M4: the grid group-by of links changed: % groups', v_n; end if;
  raise notice 'MEMBERS PASS - chart counts A3 B2 C1 and each link once; grid group-by keeps the combinations (3 / 3 groups).';

  -- a dashboard's chart tile counts each option too (custom.dashboard_run asks for the split)
  v_n := 0;
  v_dash := (custom.dashboard_declare(v_org, v_tbl, 'Tiles', jsonb_build_array(
      jsonb_build_object('id', 'b1', 'kind', 'bar', 'title', 'By topic', 'table_id', v_tbl, 'group_by', jsonb_build_array('topics'),
                         'measures', jsonb_build_array(jsonb_build_object('op', 'count')))), '{}'::jsonb, null));
  v_rows := (select to_jsonb(d) from custom.dashboard_run(v_org, v_dash) d);
  if v_rows is null or v_rows::text not like '%"A"%' or v_rows::text like '%[\\"a\\"%' then raise exception 'D1: the dashboard chart tile did not split the options: %', left(coalesce(v_rows::text, 'null'), 500); end if;
  -- the interface chart for the owner agrees with the members' aggregate
  v_out := custom.interface_chart(v_if, 'c-topics');
  if v_out is null or v_out ? 'refused' or (select jsonb_object_agg(r -> 'groups' ->> 'topics', (r ->> 'row_count')::int) from jsonb_array_elements(v_out -> 'rows') r) is distinct from '{"A": 3, "B": 2, "C": 1}'::jsonb then
    raise exception 'O1: the owner''s interface chart differs from the members'' chart: %', left(coalesce(v_out::text, 'null'), 400);
  end if;

  -- ══ OUTSIDERS ══
  perform set_config('request.jwt.claims', c_admin_j, true);
  v_res := to_jsonb(custom.share_grant(v_org, v_if, 'user', c_out, 'viewer'::public.permission_level));
  perform set_config('request.jwt.claims', c_out_j, true);
  v_out := custom.interface_chart(v_if, 'c-topics');
  v_g := (select jsonb_object_agg(r -> 'groups' ->> 'topics', (r ->> 'row_count')::int) from jsonb_array_elements(coalesce(v_out -> 'rows', '[]'::jsonb)) r);
  if v_g is distinct from '{"A": 2, "B": 2, "C": 1}'::jsonb then raise exception 'X1: her chart did not count each option once over HER rows (Northwind''s A must not count): % %', v_g, left(coalesce(v_out::text, 'null'), 300); end if;
  v_out := custom.interface_chart(v_if, 'c-targets');
  v_g := (select jsonb_object_agg(coalesce(r -> 'groups' ->> 'targets', 'none'), (r ->> 'row_count')::int) from jsonb_array_elements(coalesce(v_out -> 'rows', '[]'::jsonb)) r);
  if v_g is distinct from jsonb_build_object(v_t1::text, 2, v_t2::text, 1, 'none', 1) then raise exception 'X2: her chart did not count each linked record once: %', v_g; end if;
  raise notice 'OUTSIDERS PASS - she counts A2 B2 C1 and Spring 2 / Fall 1 / none 1 over her 3 posts only.';

  -- ══ a chart FILTER on a masked column, or on a formula over it, is refused like a group is - and no count appears ══
  foreach v_m in array array[to_jsonb('c-ftake'::text), to_jsonb('c-fmargin'::text), to_jsonb('c-fpaid'::text)] loop
    begin
      v_out := custom.interface_chart(v_if, v_m #>> '{}');
    exception when others then
      raise exception 'F1: the filter on a masked column raised instead of being refused plainly (%): % %', v_m #>> '{}', sqlstate, sqlerrm;
    end;
    if v_out is null or v_out ->> 'refused' is null or v_out ? 'rows' or v_out ? 'totals' or v_out::text ~ '777[0-9]' or v_out ->> 'refused' ~* '(take|margin|agency|paid)' then
      raise exception 'F2: a filter on a masked column was answered (%): %', v_m #>> '{}', left(coalesce(v_out::text, 'null'), 400);
    end if;
  end loop;
  raise notice 'FILTER PASS - a chart filter on the masked margin, on a formula over it, and on a formula over that formula is refused with no rows and no counts.';

  perform set_config('request.jwt.claims', c_test_j, true);
  if custom.interface_chart(v_if, 'c-topics') is not null then raise exception 'S: a stranger read a chart'; end if;
end
$t$;
