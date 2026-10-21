-- LANE CHART-READ-2 — an Interface chart for a non-member may be cut by a formula column, over her rows only, and refuses a formula
-- that reads a column she may not see (directly or through another formula). RED before atcr2_a is applied, GREEN after.
-- Runs in one transaction that always ends in ROLLBACK (scripts/campaign-tests/viewlink_run.py <this> [<migration>]).

-- ORG-CLEANUP (2026-10-18): the suite only asserts, so it builds inside one transaction and leaves nothing.
begin;
do $t$
declare
  c_admin constant uuid := '87a6e699-3622-4869-8843-d0867456c0dd';
  c_out   constant uuid := '000eaa28-cf5d-402a-8f01-5e2c24191323';
  c_admin_j constant text := '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated"}';
  c_out_j   constant text := '{"sub":"000eaa28-cf5d-402a-8f01-5e2c24191323","role":"authenticated"}';
  c_test_j  constant text := '{"sub":"4060701e-706a-4c76-b3ca-0bbc69fa5a14","role":"authenticated"}';
  v_org uuid := gen_random_uuid(); v_home uuid; v_tbl uuid; v_row jsonb; v_if uuid; v_out jsonb; v_keys text[];
  v_pages jsonb; v_northwind uuid; v_res jsonb; v_expr jsonb; v_m jsonb; v_ref jsonb;
begin
  perform set_config('app.actor_system', 'campaign-test/atcr2', true);
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
  if (select count(*) from custom.field fl where fl.entity_definition_id = v_tbl and fl.key in ('margin', 'internal_notes') and fl.sensitivity = 'confidential') <> 2 then
    raise exception 'setup: the confidential columns did not take their sensitivity';
  end if;
  for v_row in select e from jsonb_array_elements(jsonb_build_array(
    jsonb_build_object('title','Comtech Q4 webinar promo',     'client','Comtech','client_contact','keith.watanabe@comtech.com','status','Ready for approval','amount',100,'margin',7771,'internal_notes','Keith wants it shorter.'),
    jsonb_build_object('title','Comtech case study: Lakeside', 'client','Comtech','client_contact','Keith.Watanabe@comtech.com','status','Ready for approval','amount',200,'margin',7772,'internal_notes','Margin is thin.'),
    jsonb_build_object('title','Comtech hiring post',          'client','Comtech','client_contact','keith.watanabe@comtech.com','status','Draft',             'amount',300,'margin',7773,'internal_notes','Not ready.'),
    jsonb_build_object('title','Northwind fall layering guide','client','Northwind Outfitters','client_contact','dana@northwind.example.com','status','Ready for approval','amount',1000,'margin',7774,'internal_notes','Client hates teal.')
  )) e loop
    perform custom.record_write(v_org, v_tbl, v_row);
  end loop;

  v_pages := jsonb_build_array(jsonb_build_object('id', 'p-dash', 'name', 'Dashboard',
    'charts', jsonb_build_array(
      jsonb_build_object('id', 'c-size', 'title', 'Posts by size', 'subject', v_tbl, 'kind', 'bar', 'groupBy', jsonb_build_array('size'), 'measures', jsonb_build_array(jsonb_build_object('op', 'count'))),
      jsonb_build_object('id', 'c-double', 'title', 'Double by status', 'subject', v_tbl, 'kind', 'bar', 'groupBy', jsonb_build_array('status'), 'measures', jsonb_build_array(jsonb_build_object('op', 'sum', 'key', 'double'))),
      jsonb_build_object('id', 'c-plus', 'title', 'Plus one', 'subject', v_tbl, 'kind', 'bar', 'groupBy', jsonb_build_array('client'), 'measures', jsonb_build_array(jsonb_build_object('op', 'sum', 'key', 'plus_one'), jsonb_build_object('op', 'count'))),
      jsonb_build_object('id', 'c-take', 'title', 'Take', 'subject', v_tbl, 'kind', 'bar', 'groupBy', jsonb_build_array('status'), 'measures', jsonb_build_array(jsonb_build_object('op', 'sum', 'key', 'take'))),
      jsonb_build_object('id', 'c-paid', 'title', 'Paid', 'subject', v_tbl, 'kind', 'bar', 'groupBy', jsonb_build_array('paid_state'), 'measures', jsonb_build_array(jsonb_build_object('op', 'count')))),
    'blocks', jsonb_build_array(
      jsonb_build_object('id', 'e-board', 'kind', 'layout', 'layout', 'kanban', 'table_id', v_tbl, 'group_field', 'status', 'me_field', 'client_contact'),
      jsonb_build_object('id', 'c-size', 'kind', 'chart', 'title', 'Posts by size'))));
  -- the platform stamps a formula confidential when it reads a confidential column and re-stamps any attempt to undo it; the chart
  -- read must not rest on that stamp alone, so ask its own judge directly with the columns she sees (no margin): the formulas that read
  -- margin - directly or through another formula - are not chartable, the ones that read only what she sees are.
  declare v_vis text[] := array['title','client','client_contact','status','amount']; begin
   if to_regprocedure('custom.interface_chart_formula_ok(uuid,uuid,text,text[],integer)') is not null then
    if custom.interface_chart_formula_ok(v_org, v_tbl, 'take', v_vis, 0) or custom.interface_chart_formula_ok(v_org, v_tbl, 'paid_state', v_vis, 0) then
      raise exception 'setup: the judge let a formula over a masked column through';
    end if;
    if not (custom.interface_chart_formula_ok(v_org, v_tbl, 'size', v_vis, 0) and custom.interface_chart_formula_ok(v_org, v_tbl, 'plus_one', v_vis, 0)) then
      raise exception 'setup: the judge refused a formula over visible columns';
    end if;
   end if;
  end;
  perform set_config('role', 'authenticated', true);
  v_if := custom.dashboard_declare(v_org, v_tbl, 'Agency Ops', '[]'::jsonb, jsonb_build_object(
    'kind', 'interface', 'icon', 'layout-dashboard', 'color', 'blue',
    'draft', jsonb_build_object('pages', v_pages), 'published', jsonb_build_object('pages', v_pages, 'version', 1),
    'versions', jsonb_build_array(jsonb_build_object('version', 1, 'pages', v_pages))), null);
  if v_if is null then raise exception 'setup: the interface was not made'; end if;

  -- the owner (a member) reads the whole table: the chart agrees with the members' own aggregate over the same columns
  v_out := custom.interface_chart(v_if, 'c-size');
  if v_out is null or v_out ? 'refused' then raise exception 'owner 0: the formula group did not draw: %', left(coalesce(v_out::text, 'null'), 400); end if;
  v_ref := (select jsonb_agg(jsonb_build_object('groups', x.groups, 'n', x.row_count) order by x.groups::text) from custom.record_aggregate(v_org, v_tbl, '["size"]'::jsonb, '[{"op":"count"}]'::jsonb) x);
  if (select jsonb_agg(jsonb_build_object('groups', r -> 'groups', 'n', (r ->> 'row_count')::bigint) order by (r -> 'groups')::text) from jsonb_array_elements(v_out -> 'rows') r) is distinct from v_ref then
    raise exception 'owner 1: the interface chart differs from the members'' aggregate: % vs %', left(v_out::text, 300), left(v_ref::text, 300);
  end if;
  raise notice 'owner PASS - formula group equals the members'' aggregate: %', v_ref;

  -- ══ gap 2 — the shared outsider charts a formula over HER rows ══
  perform set_config('request.jwt.claims', c_admin_j, true);
  v_res := to_jsonb(custom.share_grant(v_org, v_if, 'user', c_out, 'viewer'::public.permission_level));
  perform set_config('request.jwt.claims', c_out_j, true);
  v_out := custom.interface_chart(v_if, 'c-size');
  if v_out is null or v_out ? 'refused' then raise exception '2a: the outsider cannot chart a formula group: %', left(coalesce(v_out::text, 'null'), 400); end if;
  if (select count(*) from jsonb_array_elements(v_out -> 'rows') r where (r -> 'groups' ->> 'size') = 'Big' and (r ->> 'row_count')::int = 2) <> 1
     or (select count(*) from jsonb_array_elements(v_out -> 'rows') r where (r -> 'groups' ->> 'size') = 'Small' and (r ->> 'row_count')::int = 1) <> 1
     or (v_out -> 'totals' ->> 'current')::numeric <> 3 then
    raise exception '2b: size groups are not her Big 2 / Small 1: %', left(v_out::text, 500);
  end if;
  v_out := custom.interface_chart(v_if, 'c-double');
  if v_out is null or v_out ? 'refused' or (select sum((r -> 'measures' ->> 'sum_double')::numeric) from jsonb_array_elements(v_out -> 'rows') r) <> 1200 then
    raise exception '2c: the sum of a formula is not her 1200 (Northwind 2000 must not be added): %', left(coalesce(v_out::text, 'null'), 500);
  end if;
  v_out := custom.interface_chart(v_if, 'c-plus');
  if v_out is null or v_out ? 'refused' or (select sum((r -> 'measures' ->> 'sum_plus_one')::numeric) from jsonb_array_elements(v_out -> 'rows') r) <> 1203 then
    raise exception '2d: a formula over a formula is not her 1203: %', left(coalesce(v_out::text, 'null'), 500);
  end if;
  raise notice '2 PASS - she charts Size (Big 2 / Small 1), sums Double (1200) and Plus one (1203 through another formula); Northwind never counted.';

  -- ══ 3 — a formula that reads a column she may not see is refused, plainly, naming nothing ══
  foreach v_m in array array[to_jsonb('c-take'::text), to_jsonb('c-paid'::text)] loop
    v_out := custom.interface_chart(v_if, v_m #>> '{}');
    if v_out is null or v_out ->> 'refused' is null or v_out ? 'rows' or v_out::text ~ '777[0-9]' or v_out::text ilike '%margin%' or v_out::text ilike '%Agency%'
       or v_out ->> 'refused' is null then
      raise exception '3a: a formula over a masked column was charted or leaked (%): %', v_m #>> '{}', left(coalesce(v_out::text, 'null'), 400);
    end if;
  end loop;
  raise notice '3 PASS - Take (reads the confidential margin) and Paid state (reads Take) answer a refusal naming no column and no value.';

  -- ══ 4 — a stranger still reads nothing ══
  perform set_config('request.jwt.claims', c_test_j, true);
  if custom.interface_chart(v_if, 'c-size') is not null then raise exception '4: a stranger read a formula chart'; end if;
  raise notice '4 PASS - a stranger answers nothing.';
end
$t$;
rollback;
