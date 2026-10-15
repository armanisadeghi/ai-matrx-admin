-- LANE AT-INTERFACE — THE GREEN SUITE: an Interface is shared to a client contact who is NOT in the organization, and she
-- reads exactly what its published elements expose: only her own client's content, only the shown columns, never the draft.
--
-- THE USE CASE: Harbor & Pine Creative (admin@admin.com, owner) runs "Agency Ops" over Content. Keith Watanabe of Comtech
-- (000eaa28…, an outside person) approves Comtech's posts. The interface's "Approval review" element shows Content whose
-- Client contact is the viewer (the current-user rule); Northwind's posts and the Agency notes column must never reach him.
--
-- WHAT MAKES IT FAIL (red before atinterface_a is applied, green after):
--   1 the owner cannot open the interface, or the builder does not get the draft
--   2 the outsider opens it before it is shared, or after sharing sees the draft / history
--   3 the outsider's review element serves another client's rows, the hidden notes column, or a draft-only element
--   4 a number element does not count exactly the element's rows; p_record_id reaches a row outside the element
--   5 a stranger (shared nothing) reads anything
--   6 an element with a current-user column but no me_only shows the client another client's rows (atinterface_b)
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
  perform set_config('app.actor_system', 'campaign-test/atinterface', true);
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
  perform custom.field_declare(v_org, v_tbl, jsonb_build_object('key', 'internal_notes', 'label', 'Agency notes', 'type', 'long_text', 'sort', 60));
  for v_row in select e from jsonb_array_elements(jsonb_build_array(
    jsonb_build_object('title','Comtech Q4 webinar promo',     'client','Comtech','client_contact','keith.watanabe@comtech.com','status','Ready for approval','internal_notes','Keith wants it shorter.'),
    jsonb_build_object('title','Comtech case study: Lakeside', 'client','Comtech','client_contact','Keith.Watanabe@comtech.com','status','Ready for approval','internal_notes','Margin is thin.'),
    jsonb_build_object('title','Comtech hiring post',          'client','Comtech','client_contact','keith.watanabe@comtech.com','status','Draft',             'internal_notes','Not ready.'),
    jsonb_build_object('title','Northwind fall layering guide','client','Northwind Outfitters','client_contact','dana@northwind.example.com','status','Ready for approval','internal_notes','Client hates teal.')
  )) e loop
    perform custom.record_write(v_org, v_tbl, v_row);
  end loop;
  select r.id into v_northwind from custom.record r where r.table_id = v_tbl and r.data ->> 'client' = 'Northwind Outfitters';

  v_pages := jsonb_build_array(jsonb_build_object('id', 'p-review', 'name', 'Approval review', 'blocks', jsonb_build_array(
    jsonb_build_object('id', 'e-review', 'kind', 'review', 'table_id', v_tbl, 'filter', jsonb_build_object('status', 'Ready for approval', 'client', null),
                       'columns', jsonb_build_array('title', 'status'), 'me_field', 'client_contact', 'me_only', true),
    jsonb_build_object('id', 'e-count', 'kind', 'number', 'table_id', v_tbl, 'filter', jsonb_build_object('status', 'Ready for approval'),
                       'me_field', 'client_contact', 'me_only', true),
    jsonb_build_object('id', 'e-board', 'kind', 'layout', 'layout', 'kanban', 'table_id', v_tbl, 'group_field', 'status', 'me_field', 'client_contact'),
    jsonb_build_object('id', 'e-head', 'kind', 'heading', 'text', 'Approvals'))));

  perform set_config('role', 'authenticated', true);
  v_if := custom.dashboard_declare(v_org, v_tbl, 'Agency Ops', '[]'::jsonb, jsonb_build_object(
    'kind', 'interface', 'icon', 'layout-dashboard', 'color', 'blue',
    'draft', jsonb_build_object('pages', v_pages || jsonb_build_array(jsonb_build_object('id', 'p-new', 'name', 'Unpublished', 'blocks', jsonb_build_array(
        jsonb_build_object('id', 'e-secret', 'kind', 'list', 'table_id', v_tbl))))),
    'published', jsonb_build_object('pages', v_pages, 'version', 1),
    'versions', jsonb_build_array(jsonb_build_object('version', 1, 'pages', v_pages))), null);
  if v_if is null then raise exception 'setup: the interface was not made'; end if;

  -- ══ 1 — the owner opens it, with the draft ══
  v_out := custom.interface_read(v_if);
  if v_out is null or v_out ->> 'level' not in ('admin', 'editor') or v_out -> 'presentation' -> 'draft' is null or (v_out ->> 'member')::boolean is not true then
    raise exception '1: the owner did not get the interface with its draft: %', left(coalesce(v_out::text, 'null'), 300);
  end if;
  raise notice '1 PASS - the owner opens Agency Ops at % with its draft.', v_out ->> 'level';

  -- ══ 2 — the outsider, before and after sharing ══
  perform set_config('request.jwt.claims', c_out_j, true);
  if custom.interface_read(v_if) is not null or custom.interface_rows(v_if, 'e-review') is not null then
    raise exception '2a: the outsider opened an interface nobody shared with him';
  end if;
  perform set_config('request.jwt.claims', c_admin_j, true);
  v_res := to_jsonb(custom.share_grant(v_org, v_if, 'user', c_out, 'viewer'::public.permission_level));
  perform set_config('request.jwt.claims', c_out_j, true);
  v_out := custom.interface_read(v_if);
  if v_out is null then raise exception '2b: the shared outsider cannot open the interface (grant said %)', v_res; end if;
  if v_out -> 'presentation' ? 'draft' or v_out -> 'presentation' ? 'versions' or v_out ->> 'level' <> 'viewer' or (v_out ->> 'member')::boolean then
    raise exception '2c: the outsider sees the draft, the history, the wrong level or is called a member: %', left(v_out::text, 400);
  end if;
  raise notice '2 PASS - unshared: nothing; shared View: the published interface only, as an interface-only viewer.';

  -- ══ 3 — the outsider reads only his client's ready posts, only the shown columns ══
  v_out := custom.interface_rows(v_if, 'e-review');
  if v_out is null or jsonb_array_length(v_out -> 'rows') <> 2 or (v_out ->> 'count')::integer <> 2 then
    raise exception '3a: the review element served % rows, expected his 2: %', jsonb_array_length(v_out -> 'rows'), left(coalesce(v_out::text, 'null'), 400);
  end if;
  if v_out::text like '%Northwind%' or v_out::text like '%Margin%' or v_out::text like '%hiring%' then
    raise exception '3b: another client''s post, an agency note or a draft leaked: %', left(v_out::text, 400);
  end if;
  select array_agg(f ->> 'key') into v_keys from jsonb_array_elements(v_out -> 'fields') f;
  if 'internal_notes' = any (v_keys) or not (v_keys @> array['title', 'status']) then raise exception '3c: shown fields wrong: %', v_keys; end if;
  if custom.interface_rows(v_if, 'e-secret') is not null then raise exception '3d: a draft-only element was readable by a viewer'; end if;
  if custom.interface_rows(v_if, 'e-head') is not null then raise exception '3e: a heading answered rows'; end if;
  raise notice '3 PASS - Keith reads his 2 ready Comtech posts (email matched case-blind), title and status only; drafts and other clients never.';

  -- ══ 4 — the number and the one-row narrowing ══
  v_out := custom.interface_rows(v_if, 'e-count');
  if (v_out ->> 'count')::integer is distinct from 2 or v_out ? 'rows' then raise exception '4a: the number element answered %', v_out; end if;
  v_out := custom.interface_rows(v_if, 'e-review', v_northwind);
  if jsonb_array_length(v_out -> 'rows') <> 0 then raise exception '4b: p_record_id reached a row outside his set'; end if;
  raise notice '4 PASS - the number counts 2; naming another client''s row by id answers no row.';

  -- ══ 6 — a board with a current-user column but no me_only: the client sees his 3 posts, the owner every post ══
  v_out := custom.interface_rows(v_if, 'e-board');
  if jsonb_array_length(v_out -> 'rows') <> 3 or v_out::text like '%Northwind%' then
    raise exception '6a: the client''s board served % rows: %', jsonb_array_length(v_out -> 'rows'), left(v_out::text, 300);
  end if;
  perform set_config('request.jwt.claims', c_admin_j, true);
  if jsonb_array_length(custom.interface_rows(v_if, 'e-board') -> 'rows') <> 4 then raise exception '6b: the owner''s board is narrowed'; end if;
  perform set_config('request.jwt.claims', c_out_j, true);
  raise notice '6 PASS - one board: the client sees his 3 Comtech posts, the owner all 4.';

  -- ══ 5 — a stranger ══
  perform set_config('request.jwt.claims', c_test_j, true);
  if custom.interface_read(v_if) is not null or custom.interface_rows(v_if, 'e-review') is not null then
    raise exception '5: a stranger read the interface';
  end if;
  raise notice '5 PASS - test@test.com, shared nothing, reads nothing.';
end
$t$;
