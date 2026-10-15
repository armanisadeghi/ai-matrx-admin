-- lane: VIEW-LINK
-- lock: custom,platform
-- based-on: custom.published_view_read(text) 1d2b8716a4eb8b1150fda94c3ae3c2084af7febdf8c12c1b322a41664f5cd292
-- scope: one saved view can be SHARED BY LINK (Airtable's "Create a shared view link"): an Anyone link of the existing
--   platform.share_links primitive on resource_type 'platform_saved_view', read by a signed-out visitor at /v/<token>.
--   Moves the published-view read body into custom._saved_view_public_read (verbatim) and keeps custom.published_view_read as its
--   thin caller; adds custom.shared_view_read(token) (server only), custom.view_share_links(view) and custom.revoke_view_share_link(link).
--   The world-publish gate (iam.publish_binding / iam.publish_to_world / the verified-publisher rule) is NOT touched.
-- inverse: migrations/inverse/viewlink_a_a_view_is_shared_by_link_down.sql
--
-- WHY A SECOND LANE. custom.publish_bind(kind => 'view') lists a view for the world and refuses unless the organization has a claimed
-- namespace and is a verified publisher. That is the right gate for LISTING in public and the wrong tool for "send my client a link
-- to the Content Approval Board". An Anyone link is the platform's answer for that (access-ladder.md "Sharing sits outside the
-- ladder"): no namespace, no publisher, an unguessable 64-character token, viewer only, revoked any time.
--
-- WHAT EXISTS AND IS REUSED, UNCHANGED:
--   . public.create_share_link('platform_saved_view', <view>, 'viewer', ...) mints it (platform_saved_view is link-shareable). The rule
--     "Edit may share, sharing outside the organization follows the inside rule" is iam.may_grant_as inside that door; a person who holds
--     only Viewer on the view is refused with "You need Edit or Full access on this to share it."
--   . platform.share_links is the one table of links; its restrictive policies keep every client write out. Nothing about it changes.
-- WHAT THIS ADDS:
--   . custom.shared_view_read(p_token) — SERVER ONLY (service role, called by /v/<token>). The token is resolved here and only here:
--     it must be an active, unexpired, not-exhausted link whose resource_type is 'platform_saved_view' (a link to anything else answers
--     null), the organization not archived, the view not archived. Then it reads through the SAME body as the published page, so a
--     link shows exactly the view's own filter, only its shown fields, at most 500 rows, people and relations by name. Null = the 404;
--     revoked, expired, archived and never-made are one answer. The link's view count rises only when something was shown.
--   . custom.view_share_links(p_view_id) — the active links of one view, with who made each. Only a person who may make one (Edit or
--     Full on the view) sees them: the token IS the credential. Anyone else gets no rows.
--   . custom.revoke_view_share_link(p_link_id) — retires one link; its maker, or anyone who may make one on that view.

create or replace function custom._saved_view_public_read(p_view_id uuid, p_org uuid, p_namespace text, p_notice text)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to 'pg_catalog'
as $function$
declare
  v_view   platform.saved_view;
  v_table  uuid;
  v_trow   custom.record;
  v_def    jsonb;
  v_hidden text[];
  v_hidden_ids text[];
  v_fields jsonb;
  v_keys   text[];
  v_where  text := 'true';
  v_expr   jsonb;
  v_order  text := 'r.created_at, r.id';
  v_sorts  text[] := '{}';
  s        jsonb;
  v_rows   jsonb;
  v_n      integer;
  v_refs   jsonb := '{}'::jsonb;
  v_labels jsonb := '{}'::jsonb;
  f        record;
  v_limit  constant integer := 500;
begin
  select * into v_view from platform.saved_view sv
   where sv.id = p_view_id and sv.organization_id = p_org and sv.deleted_at is null;
  if v_view.id is null then
    return null;
  end if;
  v_def := coalesce(v_view.definition, '{}'::jsonb);
  v_table := coalesce(v_view.subject_id, nullif(v_def ->> 'table_id', '')::uuid);

  select * into v_trow from custom.record t where t.id = v_table and t.organization_id = p_org;
  if v_trow.id is null then
    return null;
  end if;
  if v_trow.deleted_at is not null then
    -- the view is real and was published on purpose: say what happened to it, never show its rows
    return jsonb_build_object('state', 'archived', 'title', v_view.name, 'namespace', p_namespace, 'notice', p_notice);
  end if;

  v_hidden := coalesce(array(select jsonb_array_elements_text(coalesce(v_def -> 'presentation' -> 'hiddenFields', '[]'::jsonb))), '{}');
  v_hidden_ids := coalesce(array(select jsonb_array_elements_text(coalesce(v_def -> 'hidden_fields', '[]'::jsonb))), '{}');

  -- the fields the view shows: its table's fields, not hidden by the view, not above internal
  -- sensitivity, and not computed ones whose value is not stored (stamps are read from the row)
  select coalesce(jsonb_agg(jsonb_build_object(
           'key', fl.key, 'label', coalesce(nullif(fl.label, ''), fl.name, fl.key), 'type', fl.type,
           'multi', coalesce(fl.multi, false), 'system', fl.config ->> 'system',
           'relation_target', fl.relation_target, 'format', fl.format) order by fl.sort, fl.key), '[]'::jsonb),
         coalesce(array_agg(fl.key order by fl.sort, fl.key), '{}')
    into v_fields, v_keys
    from custom.field fl
   where fl.entity_definition_id = v_table and fl.organization_id = p_org
     and fl.key <> all (v_hidden) and fl.id::text <> all (v_hidden_ids)
     and coalesce(fl.sensitivity, 'internal') in ('public', 'internal')
     and (fl.type <> 'formula' or fl.config ->> 'system' in ('created_time', 'modified_time'));

  -- the view's own question: its rule, then its flat map, each compiled by the list door's builder
  foreach v_expr in array array[v_def -> 'where', v_def -> 'filters']
  loop
    if v_expr is not null and jsonb_typeof(v_expr) = 'object' and v_expr <> '{}'::jsonb then
      v_where := v_where || ' and ' || custom.record_filter_sql(p_org, v_table,
        case when custom.filter_is_rule(v_expr) then v_expr
             else custom.choice_filter_normalize(custom.choice_field_map(p_org, v_table), v_expr) end);
    end if;
  end loop;

  -- the view's own sort (up to five), by stored value; the table's order otherwise
  if jsonb_typeof(v_def -> 'sorts') = 'array' then
    for s in select e from jsonb_array_elements(v_def -> 'sorts') e limit 5 loop
      if (s ->> 'field') = any (v_keys) then
        v_sorts := v_sorts || format('r.data -> %L %s nulls last', s ->> 'field',
                                     case when lower(coalesce(s ->> 'direction', 'asc')) = 'desc' then 'desc' else 'asc' end);
      end if;
    end loop;
    if array_length(v_sorts, 1) > 0 then
      v_order := array_to_string(v_sorts, ', ') || ', r.created_at, r.id';
    end if;
  end if;

  execute format($q$
    select coalesce(jsonb_agg(jsonb_build_object('id', q.id, 'created_at', q.created_at, 'updated_at', q.updated_at, 'values', q.vals)), '[]'::jsonb),
           count(*)::integer
      from (select r.id, r.created_at, r.updated_at,
                   coalesce((select jsonb_object_agg(e.key, e.value) from jsonb_each(r.data) e where e.key = any (%L::text[])), '{}'::jsonb) as vals
              from custom.record r
             where r.organization_id = %L::uuid and r.table_id = %L::uuid and r.deleted_at is null and %s
             order by %s
             limit %s) q
  $q$, v_keys, p_org, v_table, v_where, v_order, v_limit)
  into v_rows, v_n;

  -- the words of what the cells point at: related records and people by their names...
  select coalesce(jsonb_object_agg(x.id, custom.record_words(p_org, x.id::uuid)), '{}'::jsonb) into v_refs
    from (select distinct c.id
            from jsonb_array_elements(v_rows) row_,
                 jsonb_each(row_ -> 'values') cell,
                 jsonb_array_elements(case jsonb_typeof(cell.value) when 'array' then cell.value else jsonb_build_array(cell.value) end) el,
                 lateral (select case jsonb_typeof(el) when 'string' then el #>> '{}'
                                                       when 'object' then coalesce(el ->> 'id', el ->> 'record_id') end as id) c
           where cell.key in (select fl ->> 'key' from jsonb_array_elements(v_fields) fl where fl ->> 'relation_target' is not null)
             and c.id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
           limit 2000) x;

  -- ...and choice values in their own words
  for f in
    select fl.key, fl.options_table_id
      from custom.field fl
     where fl.entity_definition_id = v_table and fl.organization_id = p_org
       and fl.key = any (v_keys) and fl.options_table_id is not null
  loop
    v_labels := v_labels || jsonb_build_object(f.key, coalesce((
      select jsonb_object_agg(lower(regexp_replace(o.data ->> 'title', '[^A-Za-z0-9]+', '', 'g')), o.data ->> 'title')
        from custom.record o
       where o.table_id = f.options_table_id and o.organization_id = p_org and o.deleted_at is null
         and o.data ->> 'title' is not null), '{}'::jsonb));
  end loop;

  return jsonb_build_object(
    'state', 'open', 'title', v_view.name, 'table', coalesce(v_trow.data ->> 'name', v_trow.data ->> 'title'),
    'layout', coalesce(v_def ->> 'layout', 'grid'),
    'group_field', v_def ->> 'group_field', 'date_field', v_def ->> 'date_field', 'end_field', v_def ->> 'end_field',
    'namespace', p_namespace, 'notice', p_notice,
    'fields', v_fields, 'rows', v_rows, 'count', v_n, 'truncated', v_n >= v_limit,
    'refs', v_refs, 'labels', v_labels);
end
$function$;

-- ── the published page keeps its own door and its own gate; only the reading moved ──────────────────────────
create or replace function custom.published_view_read(p_slug text)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to 'pg_catalog'
as $function$
declare
  b record;
begin
  select * into b from iam.resolve_publish_binding_kind(p_slug) k where k.kind = 'view' limit 1;
  if b.slug is null then
    return null;
  end if;
  return custom._saved_view_public_read(b.resource_id, b.organization_id, b.namespace, b.notice);
end
$function$;
comment on function custom.published_view_read(text) is
  'NOTION-PEOPLE — what a signed-out visitor sees at the public address of a saved view. The address is resolved only through iam.resolve_publish_binding_kind (the world lane); the reading is custom._saved_view_public_read, shared with custom.shared_view_read (VIEW-LINK). Null = the 404. Server only.';

comment on function custom._saved_view_public_read(uuid, uuid, text, text) is
  'VIEW-LINK — the one reading of a saved view for somebody who is signed out: the view''s title and layout, its table''s fields minus the view''s hidden ones, at most 500 rows through the view''s own filter and sort, the names of what its cells point at, choice words. Takes an already-decided view; the callers (published_view_read, shared_view_read) each make their own access decision first. Not a door: no client and no server route calls it.';

-- ── the link door: a token for ONE view, read by a signed-out visitor ───────────────────────────────────────
create or replace function custom.shared_view_read(p_token text)
 returns jsonb
 language plpgsql
 volatile
 security definer
 set search_path to 'pg_catalog'
as $function$
declare
  l      platform.share_links;
  v_view platform.saved_view;
  v_out  jsonb;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then
    return null;
  end if;
  select * into l from platform.share_links s where s.token = p_token and s.resource_type = 'platform_saved_view';
  if l.id is null or not l.is_active then
    return null;
  end if;
  if l.expires_at is not null and l.expires_at < now() then
    return null;
  end if;
  if l.max_uses is not null and l.use_count >= l.max_uses then
    return null;
  end if;
  if platform.share_target_in_closed_org(l.resource_type, l.resource_id) then
    return null;
  end if;
  select * into v_view from platform.saved_view sv where sv.id = l.resource_id and sv.deleted_at is null;
  if v_view.id is null then
    return null;
  end if;
  v_out := custom._saved_view_public_read(v_view.id, v_view.organization_id, null,
                                          'Shared by link. It shows only this view, and the owner can turn the link off at any time.');
  if v_out is not null then
    update platform.share_links set use_count = use_count + 1, last_used_at = now() where id = l.id;
  end if;
  return v_out;
end
$function$;
comment on function custom.shared_view_read(text) is
  'VIEW-LINK — what the holder of an Anyone link to ONE saved view sees at /v/<token>, with no sign-in. The link must be active, unexpired, not exhausted, of resource_type platform_saved_view, in an organization that is not archived; the reading is the published page''s own. Null = the 404 (revoked, expired, archived, never made, or a link to something else). Server only.';

-- ── who made the links of this view, and retiring one ────────────────────────────────────────────────────────
create or replace function custom.view_share_links(p_view_id uuid)
 returns table(id uuid, token text, permission_level text, label text, expires_at timestamptz, use_count integer,
               last_used_at timestamptz, created_at timestamptz, created_by uuid, created_by_name text, made_by_me boolean)
 language plpgsql
 stable
 security definer
 set search_path to 'pg_catalog'
as $function$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or p_view_id is null then
    return;
  end if;
  -- the token is the credential: only a person who may make a link on this view lists them
  if iam.may_grant_as(v_uid, 'platform_saved_view', p_view_id, 'viewer'::public.permission_level, 'anyone', null) is not null then
    return;
  end if;
  return query
  select l.id, l.token, l.permission_level::text, l.label, l.expires_at, l.use_count, l.last_used_at, l.created_at, l.created_by,
         coalesce(nullif(u.raw_user_meta_data ->> 'display_name', ''), nullif(u.raw_user_meta_data ->> 'full_name', ''),
                  pg_catalog.split_part(u.email, '@', 1)),
         l.created_by = v_uid
    from platform.share_links l
    left join auth.users u on u.id = l.created_by
   where l.resource_type = 'platform_saved_view' and l.resource_id = p_view_id and l.is_active
     and (l.expires_at is null or l.expires_at > now())
   order by l.created_at desc, l.id;
end
$function$;
comment on function custom.view_share_links(uuid) is
  'VIEW-LINK — the active Anyone links of one saved view, each with who made it. Rows only for a person who may make a link on that view (iam.may_grant_as: Edit or Full); anyone else, and a signed-out caller, gets none. The token is the credential.';

create or replace function custom.revoke_view_share_link(p_link_id uuid)
 returns jsonb
 language plpgsql
 volatile
 security definer
 set search_path to 'pg_catalog'
as $function$
declare
  v_uid  uuid := auth.uid();
  v_link platform.share_links;
begin
  if v_uid is null then
    return jsonb_build_object('success', false, 'error', 'Not authenticated');
  end if;
  select * into v_link from platform.share_links s where s.id = p_link_id and s.resource_type = 'platform_saved_view';
  -- a link that is not there, one to something else and one the caller may not retire are ONE answer
  if v_link.id is null
     or (v_link.created_by is distinct from v_uid
         and iam.may_grant_as(v_uid, 'platform_saved_view', v_link.resource_id, 'viewer'::public.permission_level, 'anyone', null) is not null) then
    return jsonb_build_object('success', false, 'error', 'Link not found or not yours');
  end if;
  update platform.share_links set is_active = false where id = v_link.id and is_active;
  return jsonb_build_object('success', true);
end
$function$;
comment on function custom.revoke_view_share_link(uuid) is
  'VIEW-LINK — retires one Anyone link of a saved view (is_active = false; the row stays as the record). Its maker, or anyone who may make a link on that view, may. Revoking twice is the same success.';

-- ── the doors declare themselves ─────────────────────────────────────────────────────────────────────────────
insert into platform.client_callable_door
  (schema_name, function_name, identity_args, identity_argtypes, reason, declared_by,
   non_client_lane, signed_in_callers, anonymous_callers, anonymous_purpose, argument_rules)
values
  ('custom', '_saved_view_public_read', 'p_view_id uuid, p_org uuid, p_namespace text, p_notice text', array['uuid'::regtype, 'uuid'::regtype, 'text'::regtype, 'text'::regtype]::oid[],
   'The one reading of an already-decided saved view for a signed-out page. Its callers (custom.published_view_read, custom.shared_view_read) decide access first; p_view_id and p_org are only ever the pair those two resolved.',
   'viewlink_a_a_view_is_shared_by_link.sql',
   'server_only: a helper no client and no server route calls; only custom.published_view_read and custom.shared_view_read call it, after each has made its own access decision (the world binding, the share-link row). It holds no grant.',
   false, false, null, null),
  ('custom', 'shared_view_read', 'p_token text', array['text'::regtype]::oid[],
   'Reads one saved view for the shared-view page: the token is resolved only against platform.share_links (active, unexpired, not exhausted, a platform_saved_view link, organization open), then only that view''s filtered rows and shown fields.',
   'viewlink_a_a_view_is_shared_by_link.sql',
   'server_only: called only by the /v/<token> route with the service role, because the visitor holds no session and the browser must never hold a read door that takes a bearer token. The decision is the link row''s; this function adds no access of its own.',
   false, false, null, null),
  ('custom', 'view_share_links', 'p_view_id uuid', array['uuid'::regtype]::oid[],
   'Lists the active Anyone links of one saved view and who made each, for the view menu''s "Share view link". Rows only for a person who may make one (iam.may_grant_as).',
   'viewlink_a_a_view_is_shared_by_link.sql', null, true, false, null,
   jsonb_build_object('version', 1, 'declared_by', 'viewlink_a_a_view_is_shared_by_link.sql', 'declared_at', '2026-10-14 lane VIEW-LINK, read from the body and exercised in scripts/campaign-tests/viewlink_green.sql',
     'arguments', jsonb_build_object('p_view_id', jsonb_build_object(
       'type', 'uuid', 'position', 1, 'optional', false, 'entity', 'platform_saved_view', 'access', 'a person who may make an Anyone link on the view (Edit or Full)',
       'check', 'The decision is iam.may_grant_as(auth.uid(), ''platform_saved_view'', p_view_id, ''viewer'', ''anyone'', null) is null, taken before any link row is read; the view is never read here.',
       'foreign', jsonb_build_object('note', 'no rows, for a view that is not there, one the caller may not share and NULL alike', 'not_a_leak', true, 'same_as_invented', true),
       'null_rule', jsonb_build_object('means', 'no rows'),
       'verified', 'exercised from three seats in scripts/campaign-tests/viewlink_green.sql, rolled back')))),
  ('custom', 'revoke_view_share_link', 'p_link_id uuid', array['uuid'::regtype]::oid[],
   'Retires one Anyone link of a saved view: its maker, or anyone who may make a link on that view.',
   'viewlink_a_a_view_is_shared_by_link.sql', null, true, false, null,
   jsonb_build_object('version', 1, 'declared_by', 'viewlink_a_a_view_is_shared_by_link.sql', 'declared_at', '2026-10-14 lane VIEW-LINK, read from the body and exercised in scripts/campaign-tests/viewlink_green.sql',
     'arguments', jsonb_build_object('p_link_id', jsonb_build_object(
       'type', 'uuid', 'position', 1, 'optional', false, 'entity', null,
       'entity_reason', 'The id names a platform.share_links row, not a record of a shareable type; the decision is made on that row''s own created_by = auth.uid() or iam.may_grant_as on the view it names, which is the entity the check is really made on.',
       'check', 'The link must be a platform_saved_view link and its maker is the caller, or iam.may_grant_as(caller, platform_saved_view, its view, viewer, anyone) is null.',
       'foreign', jsonb_build_object('note', 'success false, "Link not found or not yours", for a link that is not there, one to something else and one the caller may not retire alike', 'not_a_leak', true, 'same_as_invented', true),
       'null_rule', jsonb_build_object('means', 'success false, the same refusal'),
       'verified', 'exercised from three seats in scripts/campaign-tests/viewlink_green.sql, rolled back'))))
on conflict do nothing;

grant execute on function custom.view_share_links(uuid) to authenticated;
grant execute on function custom.revoke_view_share_link(uuid) to authenticated;

select custom.reopen_declared_doors();
grant execute on function custom.shared_view_read(text) to service_role;
grant execute on function custom.published_view_read(text) to service_role;
