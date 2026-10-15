-- LANE VIEW-LINK — THE GREEN SUITE: a saved view is shared by link, and the link opens ONLY that view.
--
-- THE USE CASE (no fake data): Priya Raman runs Harbor & Pine Creative, a four-person content agency in Portland, Oregon.
-- Her "Content Calendar" holds every post she owes her client Northwind Outfitters; the "Client Approval" board shows only the
-- ones that are Ready for approval. She sends the client a link to THAT board - not the calendar, not the agency's internal
-- notes, no account, no verified-publisher status - and turns it off when the campaign ends. Priya is admin@admin.com (owner);
-- a freelance editor and a client-side reviewer are the one outside person (000eaa28…), first holding Viewer, then Edit.
--
-- WHAT MAKES IT FAIL (red before viclink_a is applied, green after):
--   1 the link reads another view's rows, a field the view hides, or rows its filter excludes
--   2 a link to view A reads view B, or a link to some OTHER thing reads a view
--   3 a revoked, expired, never-made or archived-view link answers anything but null (the 404)
--   4 a Viewer-level holder mints a link, lists the links, or retires one; an Edit holder may mint and retire
--   5 the published-address page stopped answering what it did (it now shares the reading with the link)
--   6 the maker is not named in the list; the view count does not rise on a read
-- Runs inside one transaction and always ends in ROLLBACK (scripts/campaign-tests/viewlink_run.py).

do $t$
declare
  c_admin constant uuid := '87a6e699-3622-4869-8843-d0867456c0dd';   -- admin@admin.com, the agency owner
  c_out   constant uuid := '000eaa28-cf5d-402a-8f01-5e2c24191323';   -- an outside person
  c_admin_j constant text := '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated"}';
  c_out_j   constant text := '{"sub":"000eaa28-cf5d-402a-8f01-5e2c24191323","role":"authenticated"}';
  v_org uuid := gen_random_uuid(); v_home uuid; v_tbl uuid; v_a uuid; v_b uuid; v_row jsonb;
  v_res jsonb; v_tok_a text; v_tok_b text; v_id_a uuid; v_id_b uuid; v_tok_other text := repeat('ab', 32);
  v_out jsonb; v_out_b jsonb; v_n integer; v_ready integer; v_keys text[]; v_rec uuid; v_link2 uuid; v_tok2 text;
  v_pub jsonb; v_uses integer;
begin
  perform set_config('app.actor_system', 'campaign-test/viewlink', true);
  perform set_config('request.jwt.claims', c_admin_j, true);
  insert into iam.organizations (id, name, slug, abbreviation, created_by)
  values (v_org, 'Harbor & Pine Creative ' || substr(v_org::text, 1, 8), 'harbor-pine-' || substr(v_org::text, 1, 8), 'HPC', c_admin);
  insert into iam.memberships (organization_id, container_type, container_id, user_id, role, status)
  values (v_org, 'organization', v_org, c_admin, 'owner', 'active');
  insert into platform.knob_override (feature, key, scope_kind, scope_id, organization_id, value, set_note)
  values ('custom', 'system_enabled', 'organization', v_org, v_org, 'true'::jsonb, 'viewlink fixture');
  insert into custom.record (organization_id, table_id, data) values (v_org, null, jsonb_build_object('name', 'Home')) returning id into v_home;

  v_tbl := custom.table_declare(v_org, jsonb_build_object('name', 'Content Calendar', 'slug', 'content_calendar', 'type', 'entity',
    'label_singular', 'Post', 'label_plural', 'Posts', 'title_field', 'title', 'display', 'list', 'weight', 'light',
    'ordered', true, 'row_order', 'sorted', 'agent_writable', true, 'retention_days', 3650,
    'default_sort', jsonb_build_array(jsonb_build_object('field', 'publish_on', 'direction', 'asc')), 'parent_id', v_home::text,
    'fields', jsonb_build_array(jsonb_build_object('name', 'title'))));
  perform custom.field_declare(v_org, v_tbl, jsonb_build_object('key', 'title', 'label', 'Post', 'type', 'text', 'sort', 10, 'required', true));
  perform custom.field_declare(v_org, v_tbl, jsonb_build_object('key', 'client', 'label', 'Client', 'type', 'text', 'sort', 20));
  perform custom.field_declare(v_org, v_tbl, jsonb_build_object('key', 'channel', 'label', 'Channel', 'type', 'select', 'sort', 30,
    'options', jsonb_build_array('Instagram', 'LinkedIn', 'Newsletter')));
  perform custom.field_declare(v_org, v_tbl, jsonb_build_object('key', 'status', 'label', 'Status', 'type', 'select', 'sort', 40,
    'options', jsonb_build_array('Draft', 'In progress', 'Ready for approval', 'Approved', 'Published')));
  perform custom.field_declare(v_org, v_tbl, jsonb_build_object('key', 'publish_on', 'label', 'Publish date', 'type', 'datetime', 'sort', 50));
  perform custom.field_declare(v_org, v_tbl, jsonb_build_object('key', 'internal_notes', 'label', 'Agency notes', 'type', 'long_text', 'sort', 60));

  for v_row in select e from jsonb_array_elements(jsonb_build_array(
    jsonb_build_object('title','Fall layering guide: carousel',   'client','Northwind Outfitters','channel','Instagram', 'status','Ready for approval','publish_on','2026-10-20','internal_notes','Client hates the teal; use rust.'),
    jsonb_build_object('title','Trail boot care: 3-step reel',    'client','Northwind Outfitters','channel','Instagram', 'status','Ready for approval','publish_on','2026-10-22','internal_notes','Margin on this one is thin.'),
    jsonb_build_object('title','Meet the Bend store team',        'client','Northwind Outfitters','channel','LinkedIn',  'status','Ready for approval','publish_on','2026-10-27','internal_notes','Legal still checking the headshots.'),
    jsonb_build_object('title','Black Friday teaser',             'client','Northwind Outfitters','channel','Newsletter','status','Draft',             'publish_on','2026-11-10','internal_notes','Discount depth not agreed.'),
    jsonb_build_object('title','Winter gear checklist',           'client','Northwind Outfitters','channel','Newsletter','status','In progress',       'publish_on','2026-11-03','internal_notes','Waiting on photos.'),
    jsonb_build_object('title','Summer recap: photo roundup',     'client','Northwind Outfitters','channel','Instagram', 'status','Published',         'publish_on','2026-09-15','internal_notes','Done.'),
    jsonb_build_object('title','Gift guide outline',              'client','Northwind Outfitters','channel','LinkedIn',  'status','Draft',             'publish_on','2026-11-18','internal_notes','Needs a stronger hook.')
  )) e loop
    perform custom.record_write(v_org, v_tbl, v_row);
  end loop;
  select count(*) into v_ready from custom.record r where r.table_id = v_tbl and r.deleted_at is null and r.data ->> 'status' ilike 'ready%';
  if v_ready is distinct from 3 then raise exception 'setup: % posts are Ready for approval, expected 3 (%)', v_ready, (select jsonb_agg(data ->> 'status') from custom.record where table_id = v_tbl); end if;

  v_a := custom.view_declare(v_org, v_tbl, jsonb_build_object('name', 'Client Approval', 'filters', jsonb_build_object('status', 'Ready for approval'),
    'definition', jsonb_build_object('layout', 'kanban', 'group_field', 'status', 'presentation', jsonb_build_object('hiddenFields', jsonb_build_array('internal_notes')))));
  v_b := custom.view_declare(v_org, v_tbl, jsonb_build_object('name', 'Editorial Drafts', 'filters', jsonb_build_object('status', 'Draft'),
    'definition', jsonb_build_object('layout', 'grid')));
  if v_a is null or v_b is null then raise exception 'setup: the two views were not made'; end if;

  -- ══ PART 4a — the OWNER mints a link for ONE view; no namespace, no publisher status needed ═══
  perform set_config('role', 'authenticated', true);
  if current_user is distinct from 'authenticated' or auth.uid() is distinct from c_admin then raise exception '0: not seated as admin (%, %)', current_user, auth.uid(); end if;
  v_res := public.create_share_link('platform_saved_view', v_a, 'viewer', null, null, 'Northwind Outfitters');
  if (v_res ->> 'success')::boolean is not true then raise exception '4a: the owner could not make a link: %', v_res; end if;
  v_tok_a := v_res ->> 'token'; v_id_a := (v_res ->> 'id')::uuid;
  v_res := public.create_share_link('platform_saved_view', v_b, 'viewer', null, null, 'Drafts, internal');
  v_tok_b := v_res ->> 'token'; v_id_b := (v_res ->> 'id')::uuid;
  if v_tok_b is null then raise exception '4a2: the second link was not made: %', v_res; end if;
  raise notice '4a PASS - the owner made a Viewer link for each view with no namespace or publisher status.';

  -- ══ PART 1 — the link reads exactly its view ═════════════════════════════════════════════════
  perform set_config('role', 'postgres', true);
  v_out := custom.shared_view_read(v_tok_a);
  if v_out is null or v_out ->> 'state' <> 'open' or v_out ->> 'title' <> 'Client Approval' or v_out ->> 'layout' <> 'kanban' then
    raise exception '1a: the link did not open the Client Approval board: %', left(coalesce(v_out::text, 'null'), 300);
  end if;
  if (v_out ->> 'count')::integer is distinct from 3 or jsonb_array_length(v_out -> 'rows') is distinct from 3 then
    raise exception '1b: the board shows % rows, the filter says 3', v_out ->> 'count';
  end if;
  select array_agg(f ->> 'key') into v_keys from jsonb_array_elements(v_out -> 'fields') f;
  if 'internal_notes' = any (v_keys) then raise exception '1c: the hidden Agency notes field is served: %', v_keys; end if;
  if not (v_keys @> array['title', 'status']) then raise exception '1c2: the shown fields are missing: %', v_keys; end if;
  if exists (select 1 from jsonb_array_elements(v_out -> 'rows') r, jsonb_object_keys(r -> 'values') k where k <> all (v_keys)) then
    raise exception '1d: a row carries a value of a field the view does not show';
  end if;
  if exists (select 1 from jsonb_array_elements(v_out -> 'rows') r
              where lower(regexp_replace(r -> 'values' ->> 'status', '[^A-Za-z0-9]+', '', 'g')) <> 'readyforapproval') then
    raise exception '1e: a row outside the view''s filter is served: %', (select jsonb_agg(r -> 'values' ->> 'status') from jsonb_array_elements(v_out -> 'rows') r);
  end if;
  if v_out::text like '%teal%' or v_out::text like '%Margin%' then raise exception '1f: an agency note leaked'; end if;
  raise notice '1 PASS - the link serves the 3 Ready for approval posts, the shown fields only, never the Agency notes.';

  -- ══ PART 2 — a link to view A cannot read view B; a link to another thing reads no view ══════
  v_out_b := custom.shared_view_read(v_tok_b);
  if v_out_b ->> 'title' <> 'Editorial Drafts' or (v_out_b ->> 'count')::integer is distinct from 2 then
    raise exception '2a: link B did not open Editorial Drafts with its 2 drafts: %', left(v_out_b::text, 200);
  end if;
  if exists (select 1 from jsonb_array_elements(v_out -> 'rows') a join jsonb_array_elements(v_out_b -> 'rows') b on a ->> 'id' = b ->> 'id') then
    raise exception '2b: the two links serve a row in common';
  end if;
  select id into v_rec from custom.record where table_id = v_tbl and deleted_at is null limit 1;
  insert into platform.share_links (resource_type, resource_id, token, permission_level, created_by, organization_id)
  values ('record', v_rec, v_tok_other, 'viewer', c_admin, v_org);
  if custom.shared_view_read(v_tok_other) is not null then raise exception '2c: a link to a RECORD opened a view'; end if;
  if custom.shared_view_read(v_tok_a || 'x') is not null or custom.shared_view_read('') is not null or custom.shared_view_read(null) is not null
     or custom.shared_view_read(repeat('0', 64)) is not null or custom.shared_view_read(v_id_a::text) is not null then
    raise exception '2d: a malformed or never-made token answered';
  end if;
  raise notice '2 PASS - link A shows A, link B shows B, a link to a record and malformed tokens answer null.';

  -- ══ PART 6 — the maker is named; a read is counted ═══════════════════════════════════════════
  select use_count into v_uses from platform.share_links where id = v_id_a;
  if v_uses is distinct from 1 then raise exception '6a: link A was read once and counts %', v_uses; end if;
  perform set_config('request.jwt.claims', c_admin_j, true); perform set_config('role', 'authenticated', true);
  select count(*) into v_n from custom.view_share_links(v_a) where created_by = c_admin and made_by_me and created_by_name is not null and use_count = 1 and token = v_tok_a;
  if v_n is distinct from 1 then raise exception '6b: the owner''s list does not name her as the maker of link A: %', (select jsonb_agg(to_jsonb(x) - 'token') from custom.view_share_links(v_a) x); end if;
  raise notice '6 PASS - link A counted one read and its list names its maker (%).', (select created_by_name from custom.view_share_links(v_a) limit 1);

  -- ══ PART 4b — a Viewer-level holder cannot mint, list or retire; an Edit holder can ══════════
  perform set_config('role', 'postgres', true);
  perform iam.share_with_person('platform_saved_view', v_a, c_out, 'viewer'::public.permission_level, c_admin, false);
  perform set_config('request.jwt.claims', c_out_j, true); perform set_config('role', 'authenticated', true);
  if auth.uid() is distinct from c_out then raise exception '0b: not seated as the outside person'; end if;
  v_res := public.create_share_link('platform_saved_view', v_a, 'viewer', null, null, 'sneaky');
  if (v_res ->> 'success')::boolean is not false or v_res ->> 'error' not ilike '%Edit or Full%' then
    raise exception '4b: a Viewer holder minted or got the wrong refusal: %', v_res;
  end if;
  if exists (select 1 from custom.view_share_links(v_a)) then raise exception '4c: a Viewer holder lists the links (the token is the credential)'; end if;
  v_res := custom.revoke_view_share_link(v_id_a);
  if (v_res ->> 'success')::boolean is not false then raise exception '4d: a Viewer holder retired the owner''s link: %', v_res; end if;
  perform set_config('role', 'postgres', true);
  if custom.shared_view_read(v_tok_a) is null then raise exception '4d2: the refused retire still turned the link off'; end if;
  perform iam.share_with_person('platform_saved_view', v_a, c_out, 'editor'::public.permission_level, c_admin, false);
  perform set_config('request.jwt.claims', c_out_j, true); perform set_config('role', 'authenticated', true);
  v_res := public.create_share_link('platform_saved_view', v_a, 'viewer', null, null, 'second link by an editor');
  if (v_res ->> 'success')::boolean is not true then raise exception '4e: an Edit holder could not make a link (Edit may share): %', v_res; end if;
  v_link2 := (v_res ->> 'id')::uuid; v_tok2 := v_res ->> 'token';
  select count(*) into v_n from custom.view_share_links(v_a);
  if v_n is distinct from 2 then raise exception '4f: the editor sees % links, expected 2', v_n; end if;
  if not exists (select 1 from custom.view_share_links(v_a) where id = v_id_a and not made_by_me and created_by = c_admin)
     or not exists (select 1 from custom.view_share_links(v_a) where id = v_link2 and made_by_me) then
    raise exception '4g: the list does not tell the two makers apart';
  end if;
  raise notice '4 PASS - Viewer cannot mint, list or retire; Edit can mint, list and sees who made which.';

  -- ══ PART 3 — revoked, expired, archived: one answer, null ═════════════════════════════════════
  v_res := custom.revoke_view_share_link(v_link2);
  if (v_res ->> 'success')::boolean is not true then raise exception '3a: the maker could not retire her own link: %', v_res; end if;
  v_res := custom.revoke_view_share_link(v_link2);
  if (v_res ->> 'success')::boolean is not true then raise exception '3a2: retiring twice is not the same success: %', v_res; end if;
  perform set_config('request.jwt.claims', c_admin_j, true);
  v_res := custom.revoke_view_share_link(v_id_a);   -- the owner retires the Northwind link
  if (v_res ->> 'success')::boolean is not true then raise exception '3b: the owner could not retire link A: %', v_res; end if;
  perform set_config('role', 'postgres', true);
  if custom.shared_view_read(v_tok_a) is not null or custom.shared_view_read(v_tok2) is not null then raise exception '3c: a revoked link still opens the view'; end if;
  perform set_config('request.jwt.claims', c_admin_j, true); perform set_config('role', 'authenticated', true);
  if exists (select 1 from custom.view_share_links(v_a)) then raise exception '3d: a revoked link is still listed'; end if;
  perform set_config('role', 'postgres', true);
  update platform.share_links set expires_at = now() - interval '1 minute' where id = v_id_b;
  if custom.shared_view_read(v_tok_b) is not null then raise exception '3e: an expired link opens the view'; end if;
  update platform.share_links set expires_at = null, max_uses = 1 where id = v_id_b;   -- one use, already spent
  if custom.shared_view_read(v_tok_b) is not null then raise exception '3e2: an exhausted link opens the view'; end if;
  update platform.share_links set max_uses = null where id = v_id_b;
  if custom.shared_view_read(v_tok_b) is null then raise exception '3f: the control read of link B failed'; end if;
  update platform.saved_view set deleted_at = now() where id = v_b;
  if custom.shared_view_read(v_tok_b) is not null then raise exception '3g: an archived view is still served by its link'; end if;
  raise notice '3 PASS - revoked (both makers), expired, exhausted and archived-view links all answer null.';

  -- ══ PART 5 — the published address still answers as before, through the same reading ════════
  insert into iam.content_lane (resource_type, resource_id, organization_id, lane, discoverable, unlisted)
  values ('platform_saved_view', v_a, v_org, 'mine', false, true) on conflict (resource_type, resource_id) do nothing;
  update iam.content_lane set lane = 'world', unlisted = true, entered_world_at = now(), entered_world_by = c_admin
   where resource_type = 'platform_saved_view' and resource_id = v_a;
  insert into iam.publish_binding (slug, resource_type, resource_id, organization_id, render_mode)
  values ('viewlink-proof-board', 'platform_saved_view', v_a, v_org, 'page');
  v_pub := custom.published_view_read('viewlink-proof-board');
  if v_pub is null or v_pub ->> 'state' <> 'open' or v_pub ->> 'title' <> 'Client Approval' or (v_pub ->> 'count')::integer <> 3
     or v_pub -> 'rows' is distinct from v_out -> 'rows' or v_pub -> 'fields' is distinct from v_out -> 'fields' then
    raise exception '5a: the published address answers differently from the link: %', left(coalesce(v_pub::text, 'null'), 300);
  end if;
  if custom.published_view_read('viewlink-proof-nothing') is not null then raise exception '5b: an address nobody made answered'; end if;
  if custom.published_view_read(v_tok_b) is not null then raise exception '5c: a share-link token opened the PUBLISH door'; end if;
  raise notice '5 PASS - the published address answers the same rows and fields as the link; a token never opens it.';

  raise notice 'VIEWLINK GREEN - every part passed.';
end
$t$;
