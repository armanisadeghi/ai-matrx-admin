-- LANE AT-FIX-G1b — an Interface chart for somebody the interface is shared with who is NOT an organization member.
-- She reads the aggregate (group, count / sum) over the rows her interface access shows, only through columns the interface
-- door exposes; a confidential column can be neither charted nor leaked; a stranger and a draft-only chart answer nothing.
-- WHAT MAKES IT FAIL (red before atg1b_a is applied, green after):
--   1 the outsider cannot read a chart (the door does not exist)         2 the aggregate is wider than her rows (another client counted)
--   3 a confidential column is charted (sum/group) or its values appear   4 a stranger / unshared / draft-only chart answers
-- Runs inside one transaction and always ends in ROLLBACK (scripts/campaign-tests/viewlink_run.py <this> [<migration>]).

do $t$
declare
  c_admin constant uuid := '87a6e699-3622-4869-8843-d0867456c0dd';
  c_out   constant uuid := '000eaa28-cf5d-402a-8f01-5e2c24191323';
  c_admin_j constant text := '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated"}';
  c_out_j   constant text := '{"sub":"000eaa28-cf5d-402a-8f01-5e2c24191323","role":"authenticated"}';
  c_test_j  constant text := '{"sub":"4060701e-706a-4c76-b3ca-0bbc69fa5a14","role":"authenticated"}';
  v_org uuid := gen_random_uuid(); v_home uuid; v_tbl uuid; v_row jsonb; v_if uuid; v_out jsonb; v_keys text[];
  v_pages jsonb; v_northwind uuid; v_res jsonb;
begin
  perform set_config('app.actor_system', 'campaign-test/atg1b', true);
  perform set_config('request.jwt.claims', c_admin_j, true);
  insert into iam.organizations (id, name, slug, abbreviation, created_by)
  values (v_org, 'Harbor & Pine Creative ' || substr(v_org::text, 1, 8), 'harbor-pine-' || substr(v_org::text, 1, 8), 'HPC', c_admin);
  insert into iam.memberships (organization_id, container_type, container_id, user_id, role, status)
  values (v_org, 'organization', v_org, c_admin, 'owner', 'active');
  insert into platform.knob_override (feature, key, scope_kind, scope_id, organization_id, value, set_note)
  values ('custom', 'system_enabled', 'organization', v_org, v_org, 'true'::jsonb, 'atinterface fixture');
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
      jsonb_build_object('id', 'c-status', 'title', 'Posts by status', 'subject', v_tbl, 'kind', 'bar', 'groupBy', jsonb_build_array('status'), 'measures', jsonb_build_array(jsonb_build_object('op', 'count'))),
      jsonb_build_object('id', 'c-amount', 'title', 'Amount by status', 'subject', v_tbl, 'kind', 'bar', 'groupBy', jsonb_build_array('status'), 'measures', jsonb_build_array(jsonb_build_object('op', 'sum', 'key', 'amount'))),
      jsonb_build_object('id', 'c-margin', 'title', 'Margin', 'subject', v_tbl, 'kind', 'bar', 'groupBy', jsonb_build_array('status'), 'measures', jsonb_build_array(jsonb_build_object('op', 'sum', 'key', 'margin'))),
      jsonb_build_object('id', 'c-notes', 'title', 'By notes', 'subject', v_tbl, 'kind', 'bar', 'groupBy', jsonb_build_array('internal_notes'), 'measures', jsonb_build_array(jsonb_build_object('op', 'count')))),
    'blocks', jsonb_build_array(
      jsonb_build_object('id', 'e-board', 'kind', 'layout', 'layout', 'kanban', 'table_id', v_tbl, 'group_field', 'status', 'me_field', 'client_contact'),
      jsonb_build_object('id', 'c-status', 'kind', 'chart', 'title', 'Posts by status'))));

  perform set_config('role', 'authenticated', true);
  v_if := custom.dashboard_declare(v_org, v_tbl, 'Agency Ops', '[]'::jsonb, jsonb_build_object(
    'kind', 'interface', 'icon', 'layout-dashboard', 'color', 'blue',
    'draft', jsonb_build_object('pages', v_pages || jsonb_build_array(jsonb_build_object('id', 'p-new', 'name', 'Unpublished', 'blocks', '[]'::jsonb,
        'charts', jsonb_build_array(jsonb_build_object('id', 'c-draft', 'title', 'Draft only', 'subject', v_tbl, 'kind', 'bar', 'measures', jsonb_build_array(jsonb_build_object('op', 'count'))))))),
    'published', jsonb_build_object('pages', v_pages, 'version', 1),
    'versions', jsonb_build_array(jsonb_build_object('version', 1, 'pages', v_pages))), null);
  if v_if is null then raise exception 'setup: the interface was not made'; end if;

  -- the owner (a member) reads the whole table's chart: 4 posts
  v_out := custom.interface_chart(v_if, 'c-status');
  if v_out is null or (v_out -> 'totals' ->> 'current')::numeric <> 4 then
    raise exception 'owner: the chart did not count all 4 posts: %', left(coalesce(v_out::text, 'null'), 400);
  end if;
  raise notice 'owner PASS - the member reads all 4 posts in the chart.';

  -- ══ 4a — unshared outsider and stranger read nothing ══
  perform set_config('request.jwt.claims', c_out_j, true);
  if custom.interface_chart(v_if, 'c-status') is not null then raise exception '4a: an unshared outsider read a chart'; end if;
  perform set_config('request.jwt.claims', c_admin_j, true);
  v_res := to_jsonb(custom.share_grant(v_org, v_if, 'user', c_out, 'viewer'::public.permission_level));

  -- ══ 1 + 2 — the shared outsider reads the aggregate over HER rows only ══
  perform set_config('request.jwt.claims', c_out_j, true);
  v_out := custom.interface_chart(v_if, 'c-status');
  if v_out is null or v_out ? 'refused' then raise exception '1: the shared outsider got no chart: %', left(coalesce(v_out::text, 'null'), 400); end if;
  if (v_out -> 'totals' ->> 'current')::numeric <> 3 then raise exception '2a: the outsider''s chart counted % rows, expected her 3: %', v_out -> 'totals' ->> 'current', left(v_out::text, 400); end if;
  if v_out::text like '%Northwind%' then raise exception '2b: another client leaked into the chart'; end if;
  if (select count(*) from jsonb_array_elements(v_out -> 'rows') r where (r -> 'groups' ->> 'status') ilike 'Ready%' and (r ->> 'row_count')::int = 2) <> 1 then
    raise exception '2c: the Ready group is not her 2 posts: %', left(v_out::text, 500);
  end if;
  v_out := custom.interface_chart(v_if, 'c-amount');
  if (select sum((r -> 'measures' ->> 'sum_amount')::numeric) from jsonb_array_elements(v_out -> 'rows') r) <> 600 then
    raise exception '2d: the outsider''s sum is not her 600 (the other client''s 1000 must not be added): %', left(v_out::text, 500);
  end if;
  raise notice '1+2 PASS - Keith charts 3 Comtech posts (2 Ready, 1 Draft) and sums 600; Northwind never counted.';

  -- ══ 3 — a confidential column can be neither charted nor leaked ══
  v_out := custom.interface_chart(v_if, 'c-margin');
  if v_out is null or v_out ->> 'refused' is null or v_out ? 'rows' or v_out::text ~ '777[0-9]' then
    raise exception '3a: a confidential measure was charted or leaked: %', left(coalesce(v_out::text, 'null'), 400);
  end if;
  v_out := custom.interface_chart(v_if, 'c-notes');
  if v_out is null or v_out ->> 'refused' is null or v_out ? 'rows' or v_out::text ilike '%shorter%' or v_out::text ilike '%thin%' then
    raise exception '3b: a confidential group was charted or leaked: %', left(coalesce(v_out::text, 'null'), 400);
  end if;
  raise notice '3 PASS - the confidential measure and the confidential group answer a refusal naming no column and no value.';

  -- ══ 4b — a draft-only chart and a made-up id answer nothing ══
  if custom.interface_chart(v_if, 'c-draft') is not null or custom.interface_chart(v_if, 'nope') is not null then
    raise exception '4b: a draft-only or unknown chart answered a viewer';
  end if;
  perform set_config('request.jwt.claims', c_test_j, true);
  if custom.interface_chart(v_if, 'c-status') is not null then raise exception '4c: a stranger read a chart'; end if;
  raise notice '4 PASS - unshared, stranger, draft-only and unknown charts answer nothing.';
end
$t$;
