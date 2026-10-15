-- LANE VIEW-LINK-2 — THE GREEN SUITE: a shared view link can be locked with a password, can expire, and a saved-view link never opens the generic viewer.
-- Priya Raman (admin@admin.com, Harbor & Pine Creative) sends Northwind Outfitters the Client Approval board; she adds a password so a forwarded
-- link is no use to a stranger, and an end date for the campaign.
-- RED before viewlink2 is applied, green after. One transaction, always ROLLBACK (scripts/campaign-tests/viewlink_run.py).
do $t$
declare
  c_admin constant uuid := '87a6e699-3622-4869-8843-d0867456c0dd';   -- admin@admin.com, the agency owner
  c_out   constant uuid := '000eaa28-cf5d-402a-8f01-5e2c24191323';   -- an outside person
  c_admin_j constant text := '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated"}';
  c_out_j   constant text := '{"sub":"000eaa28-cf5d-402a-8f01-5e2c24191323","role":"authenticated"}';
  v_org uuid := gen_random_uuid(); v_pw text := 'harbor-pine-2026'; v_fp text; v_fp2 text; v_nused integer; v_home uuid; v_tbl uuid; v_a uuid; v_b uuid; v_row jsonb;
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


  perform set_config('role', 'authenticated', true);
  v_res := public.create_share_link('platform_saved_view', v_a, 'viewer', null, null, 'Northwind Outfitters');
  v_tok_a := v_res ->> 'token'; v_id_a := (v_res ->> 'id')::uuid;
  if v_tok_a is null then raise exception '0: no link: %', v_res; end if;

  -- 1 an unprotected link opens exactly as before, on the token alone
  perform set_config('role', 'postgres', true);
  v_out := custom.shared_view_read(v_tok_a);
  if v_out ->> 'state' <> 'open' or v_out ->> 'title' <> 'Client Approval' or v_out ? 'unlock' then raise exception '1: unprotected link: %', left(coalesce(v_out::text,'null'),200); end if;
  raise notice '1 PASS - a link with no password opens on the token alone and carries no unlock.';

  -- 2 the owner sets a password: stored hashed, the list says so
  perform set_config('role', 'authenticated', true);
  v_res := custom.set_view_share_link_protection(v_id_a, v_pw);
  if (v_res ->> 'success')::boolean is not true or (v_res ->> 'has_password')::boolean is not true then raise exception '2a: could not set: %', v_res; end if;
  if not exists (select 1 from custom.view_share_links(v_a) where id = v_id_a and has_password) then raise exception '2b: the list does not say the link is locked'; end if;
  begin
    perform 1 from platform.share_link_password;
    raise exception '2c: a signed-in client can read the password table';
  exception when insufficient_privilege then null; end;
  perform set_config('role', 'postgres', true);
  if not exists (select 1 from platform.share_link_password where link_id = v_id_a and password_hash like '$2%' and position(v_pw in password_hash) = 0) then
    raise exception '2d: the password is not stored as a bcrypt hash';
  end if;
  raise notice '2 PASS - the password is stored as a bcrypt hash, no client can read it, the list says the link is locked.';

  -- 3 the read door asks for it, and says nothing of the view until it is right
  select use_count into v_nused from platform.share_links where id = v_id_a;
  v_out := custom.shared_view_read(v_tok_a);
  if v_out ->> 'state' <> 'locked' or (v_out ->> 'wrong')::boolean is not false or v_out ? 'title' or v_out ? 'rows' then raise exception '3a: no password: %', v_out; end if;
  v_out := custom.shared_view_read(v_tok_a, 'not-the-password');
  if v_out ->> 'state' <> 'locked' or (v_out ->> 'wrong')::boolean is not true or v_out::text like '%Client%' or v_out ? 'rows' then raise exception '3b: wrong password: %', v_out; end if;
  v_out := custom.shared_view_read(v_tok_a, v_pw);
  if v_out ->> 'state' <> 'open' or (v_out ->> 'count')::integer <> 3 or v_out ->> 'unlock' is null then raise exception '3c: right password: %', left(v_out::text,200); end if;
  v_fp := v_out ->> 'unlock';
  if v_out::text like '%' || v_pw || '%' then raise exception '3d: the password came back in the answer'; end if;
  v_out := custom.shared_view_read(v_tok_a, null, v_fp);
  if v_out ->> 'state' <> 'open' then raise exception '3e: the unlock fingerprint did not open it'; end if;
  v_out := custom.shared_view_read(v_tok_a, null, 'ab' || substr(v_fp, 3));
  if v_out ->> 'state' <> 'locked' then raise exception '3f: a made-up unlock opened it'; end if;
  select use_count into v_uses from platform.share_links where id = v_id_a;
  if v_uses is distinct from v_nused + 2 then raise exception '3g: use_count %, expected % (only the two opens count)', v_uses, v_nused + 2; end if;
  raise notice '3 PASS - locked says nothing of the view; wrong says wrong; right opens; the fingerprint opens; only opens are counted.';

  -- 4 changing the password retires the old unlock; clearing opens the link again
  perform set_config('role', 'authenticated', true);
  v_res := custom.set_view_share_link_protection(v_id_a, 'a-new-password');
  perform set_config('role', 'postgres', true);
  if custom.shared_view_read(v_tok_a, null, v_fp) ->> 'state' <> 'locked' then raise exception '4a: the old unlock still opens after a new password'; end if;
  if custom.shared_view_read(v_tok_a, v_pw) ->> 'state' <> 'locked' then raise exception '4b: the old password still opens'; end if;
  if custom.shared_view_read(v_tok_a, 'a-new-password') ->> 'state' <> 'open' then raise exception '4c: the new password does not open'; end if;
  perform set_config('role', 'authenticated', true);
  v_res := custom.set_view_share_link_protection(v_id_a, 'abc');
  if (v_res ->> 'success')::boolean is not false then raise exception '4d: a 3-character password was accepted'; end if;
  v_res := custom.set_view_share_link_protection(v_id_a, '');
  if (v_res ->> 'success')::boolean is not true or (v_res ->> 'has_password')::boolean is not false then raise exception '4e: could not clear: %', v_res; end if;
  perform set_config('role', 'postgres', true);
  if custom.shared_view_read(v_tok_a) ->> 'state' <> 'open' then raise exception '4f: cleared link does not open on the token'; end if;
  raise notice '4 PASS - a new password retires the old password and the old unlock; clearing opens the link again.';

  -- 5 expiry: set, refuse the past, clear, and an ended link is the 404
  perform set_config('role', 'authenticated', true);
  v_res := custom.set_view_share_link_protection(v_id_a, null, true, now() - interval '1 hour');
  if (v_res ->> 'success')::boolean is not false then raise exception '5a: a past expiry was accepted'; end if;
  v_res := custom.set_view_share_link_protection(v_id_a, null, true, now() + interval '30 days');
  if (v_res ->> 'success')::boolean is not true or v_res ->> 'expires_at' is null then raise exception '5b: could not set an expiry: %', v_res; end if;
  if not exists (select 1 from custom.view_share_links(v_a) where id = v_id_a and expires_at > now() + interval '29 days') then raise exception '5c: the list does not show the expiry'; end if;
  v_res := custom.set_view_share_link_protection(v_id_a, 'keep-this-one');
  if not exists (select 1 from custom.view_share_links(v_a) where id = v_id_a and expires_at is not null and has_password) then raise exception '5d: leaving the expiry (change_expiry false) changed it'; end if;
  perform set_config('role', 'postgres', true);
  update platform.share_links set expires_at = now() - interval '1 minute' where id = v_id_a;
  if custom.shared_view_read(v_tok_a, 'keep-this-one') is not null then raise exception '5e: an ended link answered'; end if;
  update platform.share_links set expires_at = null where id = v_id_a;
  raise notice '5 PASS - expiry is set, shown, left alone when not asked, refused in the past; an ended link is the 404.';

  -- 6 who may: a Viewer holder cannot lock, unlock or re-date a link; an Edit holder can
  perform iam.share_with_person('platform_saved_view', v_a, c_out, 'viewer'::public.permission_level, c_admin, false);
  perform set_config('request.jwt.claims', c_out_j, true); perform set_config('role', 'authenticated', true);
  v_res := custom.set_view_share_link_protection(v_id_a, '');
  if (v_res ->> 'success')::boolean is not false then raise exception '6a: a Viewer holder cleared the owner''s password: %', v_res; end if;
  v_res := custom.set_view_share_link_protection(v_id_a, null, true, null);
  if (v_res ->> 'success')::boolean is not false then raise exception '6b: a Viewer holder changed the expiry'; end if;
  perform set_config('role', 'postgres', true);
  if custom.shared_view_read(v_tok_a) ->> 'state' <> 'locked' then raise exception '6c: the refused call still changed the link'; end if;
  perform iam.share_with_person('platform_saved_view', v_a, c_out, 'editor'::public.permission_level, c_admin, false);
  perform set_config('request.jwt.claims', c_out_j, true); perform set_config('role', 'authenticated', true);
  v_res := custom.set_view_share_link_protection(v_id_a, '');
  if (v_res ->> 'success')::boolean is not true then raise exception '6d: an Edit holder could not clear: %', v_res; end if;
  raise notice '6 PASS - Viewer cannot change a link; Edit can.';

  -- 7 the generic viewer hands a saved-view link back to its own page and counts nothing
  perform set_config('request.jwt.claims', '{"role":"anon"}', true); perform set_config('role', 'anon', true);
  v_res := public.resolve_share_token(v_tok_a);
  if v_res ->> 'error' is distinct from 'opens_elsewhere' or v_res ->> 'resource_type' is distinct from 'platform_saved_view' or (v_res ->> 'success')::boolean or v_res::text like '%Client Approval%' then
    raise exception '7a: the generic resolver answered %', v_res;
  end if;
  perform set_config('role', 'postgres', true);
  select use_count into v_uses from platform.share_links where id = v_id_a;
  perform set_config('role', 'anon', true);
  perform public.resolve_share_token(v_tok_a);
  perform set_config('role', 'postgres', true);
  if (select use_count from platform.share_links where id = v_id_a) is distinct from v_uses then raise exception '7b: the generic viewer counted a use'; end if;
  perform set_config('request.jwt.claims', c_admin_j, true); perform set_config('role', 'authenticated', true);
  perform custom.revoke_view_share_link(v_id_a);
  perform set_config('role', 'anon', true);
  if public.resolve_share_token(v_tok_a) ->> 'error' <> 'revoked' then raise exception '7c: a revoked link no longer says revoked'; end if;
  raise notice '7 PASS - a saved-view link answers opens_elsewhere (no name, no count); revoked still says revoked.';

  -- 8 the public board says whether the owner hides empty groups
  perform set_config('request.jwt.claims', c_admin_j, true); perform set_config('role', 'postgres', true);
  v_res := public.create_share_link('platform_saved_view', v_a, 'viewer', null, null, 'board link');
  if v_res ->> 'token' is null then
    perform set_config('role', 'authenticated', true);
    v_res := public.create_share_link('platform_saved_view', v_a, 'viewer', null, null, 'board link');
    perform set_config('role', 'postgres', true);
  end if;
  v_tok2 := v_res ->> 'token';
  if (custom.shared_view_read(v_tok2) ->> 'board_hide_empty')::boolean is not false then raise exception '8a: a board that hides nothing says % ', custom.shared_view_read(v_tok2) ->> 'board_hide_empty'; end if;
  update platform.saved_view set definition = jsonb_set(definition, '{presentation,boardHideEmpty}', 'true'::jsonb, true) where id = v_a;
  if (custom.shared_view_read(v_tok2) ->> 'board_hide_empty')::boolean is not true then raise exception '8b: the board hides empty groups and the reading does not say so'; end if;
  raise notice '8 PASS - the public reading carries the owner''s hide-empty-groups choice.';

  -- 9 the board's columns follow the choices' own order
  if custom.shared_view_read(v_tok2) -> 'choice_order' -> 'status' is distinct from '["Draft","In progress","Ready for approval","Approved","Published"]'::jsonb then
    raise exception '9: choice_order is %', custom.shared_view_read(v_tok2) -> 'choice_order';
  end if;
  raise notice '9 PASS - the reading carries each choice field''s choices in the order they were made.';

  raise notice 'VIEWLINK2 GREEN - every part passed.';
end
$t$;
