-- chair-step: lane CLOSE-SHARE (CD-SHARE-07, Airtable "Restrict copying data from this view"). REPLACES custom.shared_view_read(text, text, text) by body (same signature) so an open view answers restrict_copy; DROPS and recreates custom.view_share_links(uuid) because its result gains one column, restrict_copy (its door row keys on schema, name and arguments, which do not change); ADDS one door, custom.set_view_share_link_copy(uuid, boolean), declared in platform.client_callable_door. The flag lives in the link row's own platform.share_links.metadata ->> 'restrict_copy'; no table or column is added. Inverse: migrations/inverse/20261021130000_closeshare_a_view_link_can_restrict_copy_down.sql.
-- lane: close-share
-- lock: custom,platform
-- target: production
-- based-on: custom.shared_view_read(text, text, text) 6b812c87966e9a64adb9d41c66fb3190ec5a68d8fbb2bdcd562807933f87d47c
-- based-on: custom.view_share_links(uuid) 047d0d185e9ca268424b994e8690ecdd842a84b6c53e13360a63990760d340d6
--
-- A view link's maker (or anyone who may make a link on that view) can stop people who open the link from copying
-- its data: the /v/<token> page then turns off selection, copy, cut and drag of the rows and says so in one line.
-- Test: scripts/campaign-tests/closeshare_restrict_copy_green.sql (RED before: the door is missing; GREEN after).

create or replace function custom.shared_view_read(p_token text, p_password text default null, p_unlock text default null)
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
  v_hash text;
  v_fp   text;
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

  -- THE PASSWORD, asked here and nowhere else: a protected link opens for the right password or for the fingerprint
  -- of the right password (what the server's signed cookie carries). Anything else gets `locked` and not one word of the view.
  select p.password_hash into v_hash from platform.share_link_password p where p.link_id = l.id;
  if v_hash is not null then
    v_fp := pg_catalog.encode(extensions.digest(v_hash, 'sha256'), 'hex');
    if p_unlock is not null and p_unlock = v_fp then
      null;
    elsif p_password is not null and p_password <> '' and extensions.crypt(p_password, v_hash) = v_hash then
      null;
    else
      return jsonb_build_object('state', 'locked', 'wrong', coalesce(p_password, '') <> '');
    end if;
  end if;

  v_out := custom._saved_view_public_read(v_view.id, v_view.organization_id, null,
                                          'Shared by link. It shows only this view, and the owner can turn the link off at any time.');
  if v_out is not null then
    update platform.share_links set use_count = use_count + 1, last_used_at = now() where id = l.id;
    if v_fp is not null then
      v_out := v_out || jsonb_build_object('unlock', v_fp);
    end if;
    -- CLOSE-SHARE: the maker stopped copying of this link's data; the page turns off selection, copy, cut and drag.
    if coalesce(l.metadata ->> 'restrict_copy', 'false') = 'true' then
      v_out := v_out || jsonb_build_object('restrict_copy', true);
    end if;
  end if;
  return v_out;
end
$function$;
comment on function custom.shared_view_read(text, text, text) is
  'VIEW-LINK / VIEW-LINK-2 / CLOSE-SHARE — what the holder of an Anyone link to ONE saved view sees at /v/<token>, with no sign-in. The link must be active, unexpired, not exhausted, of resource_type platform_saved_view, in an organization that is not archived. A link with a password answers {state: locked, wrong} until p_password (or the p_unlock fingerprint of the stored hash) is right; locked says nothing of the view. An open view carries restrict_copy: true when its maker stopped copying. Null = the 404. Server only.';

drop function if exists custom.view_share_links(uuid);
create or replace function custom.view_share_links(p_view_id uuid)
 returns table(id uuid, token text, permission_level text, label text, expires_at timestamptz, use_count integer,
               last_used_at timestamptz, created_at timestamptz, created_by uuid, created_by_name text, made_by_me boolean,
               has_password boolean, restrict_copy boolean)
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
  if iam.may_grant_as(v_uid, 'platform_saved_view', p_view_id, 'viewer'::public.permission_level, 'anyone', null) is not null then
    return;
  end if;
  return query
  select l.id, l.token, l.permission_level::text, l.label, l.expires_at, l.use_count, l.last_used_at, l.created_at, l.created_by,
         coalesce(nullif(u.raw_user_meta_data ->> 'display_name', ''), nullif(u.raw_user_meta_data ->> 'full_name', ''),
                  pg_catalog.split_part(u.email, '@', 1)),
         l.created_by = v_uid,
         exists (select 1 from platform.share_link_password p where p.link_id = l.id),
         coalesce(l.metadata ->> 'restrict_copy', 'false') = 'true'
    from platform.share_links l
    left join auth.users u on u.id = l.created_by
   where l.resource_type = 'platform_saved_view' and l.resource_id = p_view_id and l.is_active
     and (l.expires_at is null or l.expires_at > now())
   order by l.created_at desc, l.id;
end
$function$;
comment on function custom.view_share_links(uuid) is
  'VIEW-LINK / VIEW-LINK-2 / CLOSE-SHARE — the active Anyone links of one saved view, each with who made it, its expiry, whether it has a password and whether copying is stopped. Rows only for a person who may make a link on that view (iam.may_grant_as); anyone else, and a signed-out caller, gets none. The token is the credential; the password hash is never returned.';

create or replace function custom.set_view_share_link_copy(p_link_id uuid, p_restrict boolean)
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
  select * into v_link from platform.share_links s where s.id = p_link_id and s.resource_type = 'platform_saved_view' and s.is_active;
  if v_link.id is null
     or (v_link.created_by is distinct from v_uid
         and iam.may_grant_as(v_uid, 'platform_saved_view', v_link.resource_id, 'viewer'::public.permission_level, 'anyone', null) is not null) then
    return jsonb_build_object('success', false, 'error', 'Link not found or not yours');
  end if;
  update platform.share_links
     set metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('restrict_copy', coalesce(p_restrict, false))
   where id = v_link.id;
  return jsonb_build_object('success', true, 'restrict_copy', coalesce(p_restrict, false));
end
$function$;
comment on function custom.set_view_share_link_copy(uuid, boolean) is
  'CLOSE-SHARE — stops (true) or allows (false) copying of the data a view link shows. Its maker, or anyone who may make a link on that view. Stored in platform.share_links.metadata ->> restrict_copy; custom.shared_view_read passes it to the /v/<token> page.';

insert into platform.client_callable_door
  (schema_name, function_name, identity_args, identity_argtypes, reason, declared_by,
   non_client_lane, signed_in_callers, anonymous_callers, anonymous_purpose, argument_rules)
values
  ('custom', 'set_view_share_link_copy', 'p_link_id uuid, p_restrict boolean', array['uuid'::regtype, 'boolean'::regtype]::oid[],
   'Stops or allows copying of a view link''s data, from the "Share view link" panel: its maker, or anyone who may make a link on that view.',
   '20261021130000_closeshare_a_view_link_can_restrict_copy.sql', null, true, false, null,
   jsonb_build_object('version', 1, 'declared_by', '20261021130000_closeshare_a_view_link_can_restrict_copy.sql', 'declared_at', '2026-10-21 lane CLOSE-SHARE, read from the body and exercised in scripts/campaign-tests/closeshare_restrict_copy_green.sql',
     'arguments', jsonb_build_object(
       'p_link_id', jsonb_build_object(
         'type', 'uuid', 'position', 1, 'optional', false, 'entity', null,
         'entity_reason', 'The id names a platform.share_links row, not a record of a shareable type; the decision is made on that row''s own created_by = auth.uid() or iam.may_grant_as on the view it names.',
         'check', 'The link must be an active platform_saved_view link and its maker is the caller, or iam.may_grant_as(caller, platform_saved_view, its view, viewer, anyone) is null.',
         'foreign', jsonb_build_object('note', 'success false, "Link not found or not yours", for a link that is not there, one to something else, a retired one and one the caller may not change alike', 'not_a_leak', true, 'same_as_invented', true),
         'null_rule', jsonb_build_object('means', 'success false, the same refusal'),
         'verified', 'exercised from two seats in scripts/campaign-tests/closeshare_restrict_copy_green.sql, rolled back'),
       'p_restrict', jsonb_build_object(
         'type', 'boolean', 'position', 2, 'optional', false, 'entity', null, 'entity_reason', 'A switch; it names nothing.',
         'check', 'Only after the link check above.',
         'foreign', jsonb_build_object('note', 'not an id', 'not_a_leak', true, 'same_as_invented', true),
         'null_rule', jsonb_build_object('means', 'false: copying is allowed'),
         'verified', 'exercised in scripts/campaign-tests/closeshare_restrict_copy_green.sql, rolled back'))))
on conflict do nothing;

grant execute on function custom.view_share_links(uuid) to authenticated;
grant execute on function custom.set_view_share_link_copy(uuid, boolean) to authenticated;
select custom.reopen_declared_doors();
grant execute on function custom.shared_view_read(text, text, text) to service_role;
