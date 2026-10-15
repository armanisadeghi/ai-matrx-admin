-- lane: VIEW-LINK-2
-- chair-step: replaces the VIEW-LINK read door and list door by signature (a new argument / a new column cannot be added in place), so it drops custom.shared_view_read(text) and custom.view_share_links(uuid) and deletes the old door row; nothing else is dropped.
-- lock: custom,platform,public
-- based-on: custom.view_share_links(uuid) 90602000adc622f2abd396ac37cfe231dba9a8d1058d3a8469099f8fd68dcdd9
-- based-on: public.resolve_share_token(text) a78be3a4d4a7f605c16b6d2e709d62eda33b5521ca8ffd640e361f1bfc77b3f0
-- based-on: custom.shared_view_read(text) 2ef7ca8e5362cd7fa5855dc30a9ebe1e17c78dd38872edd59c5c78edd64915a4
-- scope: a shared view link can be PASSWORD-PROTECTED and can EXPIRE (Airtable parity), and a saved-view link never opens in the generic record viewer.
--   . platform.share_link_password (link_id, bcrypt hash): its own table, no client grant, so the hash can never ride a share_links column list.
--   . custom.shared_view_read(token, password, unlock): the read door checks the password itself (null/locked/wrong/open); a correct password
--     returns `unlock`, a fingerprint of the stored hash the server turns into a short-lived signed cookie. Changing the password changes the fingerprint.
--   . custom.set_view_share_link_protection(link, password, change_expiry, expires_at): set / clear the password and the expiry. Edit or Full on the view, or its maker.
--   . custom.view_share_links also answers has_password and expires_at.
--   . public.resolve_share_token answers 'opens_elsewhere' for a saved-view link (counts nothing, names nothing) so /s/<token> can send it to /v/<token>.
-- inverse: migrations/inverse/viewlink2_a_a_view_link_can_be_locked_down.sql

create table if not exists platform.share_link_password (
  link_id       uuid primary key references platform.share_links(id) on delete cascade,
  password_hash text not null,
  set_by        uuid,
  set_at        timestamptz not null default now()
);
alter table platform.share_link_password enable row level security;
revoke all on platform.share_link_password from public, anon, authenticated;
comment on table platform.share_link_password is
  'VIEW-LINK-2 — the bcrypt hash of the password on one share link. Never selectable by a client (no grant, RLS on, no policy); read and written only by the SECURITY DEFINER doors custom.shared_view_read and custom.set_view_share_link_protection.';

insert into platform.entity_types (token, schema_name, table_name, label, audit_class, audit_class_reason, table_ref)
values ('share_link_password', 'platform', 'share_link_password', 'Share link password', 'machinery',
        'Holds only the bcrypt hash of a share link''s password; no app or person reads it, only the two definer doors that check and set it.',
        'platform.share_link_password'::regclass)
on conflict do nothing;

-- ── the read door: the old one-argument door goes, the three-argument one replaces it ──────────────────────
delete from platform.client_callable_door where schema_name = 'custom' and function_name = 'shared_view_read';
drop function if exists custom.shared_view_read(text);

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
  end if;
  return v_out;
end
$function$;
comment on function custom.shared_view_read(text, text, text) is
  'VIEW-LINK / VIEW-LINK-2 — what the holder of an Anyone link to ONE saved view sees at /v/<token>, with no sign-in. The link must be active, unexpired, not exhausted, of resource_type platform_saved_view, in an organization that is not archived. A link with a password answers {state: locked, wrong} until p_password (or the p_unlock fingerprint of the stored hash) is right; locked says nothing of the view. Null = the 404. Server only.';

-- ── set / clear the password and the expiry ──────────────────────────────────────────────────────────────────
create or replace function custom.set_view_share_link_protection(
  p_link_id uuid, p_password text default null, p_change_expiry boolean default false, p_expires_at timestamptz default null)
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
  if p_password is not null and p_password <> '' and (char_length(p_password) < 4 or char_length(p_password) > 128) then
    return jsonb_build_object('success', false, 'error', 'A password needs 4 to 128 characters.');
  end if;
  if coalesce(p_change_expiry, false) and p_expires_at is not null and p_expires_at <= now() then
    return jsonb_build_object('success', false, 'error', 'The expiry has to be in the future.');
  end if;
  if p_password = '' then
    delete from platform.share_link_password where link_id = v_link.id;
  elsif p_password is not null then
    insert into platform.share_link_password (link_id, password_hash, set_by)
    values (v_link.id, extensions.crypt(p_password, extensions.gen_salt('bf', 10)), v_uid)
    on conflict (link_id) do update set password_hash = excluded.password_hash, set_by = excluded.set_by, set_at = now();
  end if;
  if coalesce(p_change_expiry, false) then
    update platform.share_links set expires_at = p_expires_at where id = v_link.id;
  end if;
  return jsonb_build_object('success', true,
    'has_password', exists (select 1 from platform.share_link_password where link_id = v_link.id),
    'expires_at', (select expires_at from platform.share_links where id = v_link.id));
end
$function$;
comment on function custom.set_view_share_link_protection(uuid, text, boolean, timestamptz) is
  'VIEW-LINK-2 — sets (p_password text), clears (p_password = empty) or leaves (null) the password of one view link, and, when p_change_expiry, sets or clears (null) its expiry. Its maker, or anyone who may make a link on that view. The password is stored only as a bcrypt hash.';

-- ── the list says which links are locked and when they end ──────────────────────────────────────────────────
drop function if exists custom.view_share_links(uuid);
create or replace function custom.view_share_links(p_view_id uuid)
 returns table(id uuid, token text, permission_level text, label text, expires_at timestamptz, use_count integer,
               last_used_at timestamptz, created_at timestamptz, created_by uuid, created_by_name text, made_by_me boolean,
               has_password boolean)
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
         exists (select 1 from platform.share_link_password p where p.link_id = l.id)
    from platform.share_links l
    left join auth.users u on u.id = l.created_by
   where l.resource_type = 'platform_saved_view' and l.resource_id = p_view_id and l.is_active
     and (l.expires_at is null or l.expires_at > now())
   order by l.created_at desc, l.id;
end
$function$;
comment on function custom.view_share_links(uuid) is
  'VIEW-LINK / VIEW-LINK-2 — the active Anyone links of one saved view, each with who made it, its expiry and whether it has a password. Rows only for a person who may make a link on that view (iam.may_grant_as); anyone else, and a signed-out caller, gets none. The token is the credential; the password hash is never returned.';

-- ── the generic viewer hands a saved-view link back to its own page ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.resolve_share_token(p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_link record; v_resolved record; v_full jsonb; v_allowed text[]; v_row jsonb; v_newcount integer; v_shareable boolean; v_children jsonb;
BEGIN
  SELECT * INTO v_link FROM platform.share_links WHERE token = p_token;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'not_found', 'message', 'This link is invalid.'); END IF;
  IF NOT v_link.is_active THEN RETURN jsonb_build_object('success', false, 'error', 'revoked', 'message', 'This link has been turned off by its owner.'); END IF;
  IF v_link.expires_at IS NOT NULL AND v_link.expires_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'expired', 'message', 'This link has expired.'); END IF;
  -- VIEW-LINK-2: a saved-view link opens at its OWN page (/v/<token>), never in this generic viewer, and this door says
  -- nothing about the view (not even its name, which a password-protected link must not give away) and counts no use.
  IF v_link.resource_type = 'platform_saved_view' THEN
    RETURN jsonb_build_object('success', false, 'error', 'opens_elsewhere', 'resource_type', 'platform_saved_view',
                              'message', 'This link opens as a shared view.'); END IF;
  BEGIN SELECT * INTO STRICT v_resolved FROM public.resolve_shareable_resource(v_link.resource_type);
  EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', false, 'error', 'unknown_type', 'message', 'This item type can no longer be shared.'); END;
  SELECT COALESCE(is_link_shareable, false), COALESCE(public_columns, '{}') INTO v_shareable, v_allowed
    FROM platform.shareable_resource_registry WHERE resource_type = v_link.resource_type;
  IF NOT v_shareable THEN RETURN jsonb_build_object('success', false, 'error', 'disabled', 'message', 'Public sharing is turned off for this item type.'); END IF;
  EXECUTE format('SELECT to_jsonb(t) FROM %I.%I t WHERE t.%I = $1', v_resolved.schema_name, v_resolved.table_name, v_resolved.id_column) INTO v_full USING v_link.resource_id;
  IF v_full IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'gone', 'message', 'The shared item no longer exists.'); END IF;
  IF (v_full ? 'deleted_at') AND (v_full->>'deleted_at') IS NOT NULL THEN RETURN jsonb_build_object('success', false, 'error', 'gone', 'message', 'The shared item was deleted.'); END IF;
  -- An archived organization is closed (access ladder T-33/T-40): no link opens anything inside it.
  IF platform.share_target_in_closed_org(v_link.resource_type, v_link.resource_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'closed', 'message', 'This link is closed while its organization is archived.'); END IF;
  v_allowed := array_append(v_allowed, v_resolved.id_column);
  SELECT COALESCE(jsonb_object_agg(e.key, e.value), '{}'::jsonb) INTO v_row FROM jsonb_each(v_full) e WHERE e.key = ANY(v_allowed);
  UPDATE platform.share_links SET use_count = use_count + 1, last_used_at = now()
   WHERE id = v_link.id AND (max_uses IS NULL OR use_count < max_uses) RETURNING use_count INTO v_newcount;
  IF v_newcount IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'exhausted', 'message', 'This link has reached its view limit.'); END IF;
  -- Children inherit their parent (access ladder T-19): only after every check above passed.
  v_children := platform.share_link_children(v_link.resource_type, v_link.resource_id);
  RETURN jsonb_build_object('success', true, 'resource_type', v_link.resource_type, 'resource_id', v_link.resource_id,
    'permission_level', v_link.permission_level, 'display_label', v_resolved.display_label,
    'url_path_template', v_resolved.url_path_template, 'resource', v_row, 'children', v_children);
END; $function$
;

-- ── the doors declare themselves ─────────────────────────────────────────────────────────────────────────────
insert into platform.client_callable_door
  (schema_name, function_name, identity_args, identity_argtypes, reason, declared_by,
   non_client_lane, signed_in_callers, anonymous_callers, anonymous_purpose, argument_rules)
values
  ('custom', 'shared_view_read', 'p_token text, p_password text, p_unlock text', array['text'::regtype, 'text'::regtype, 'text'::regtype]::oid[],
   'Reads one saved view for the shared-view page: the token is resolved only against platform.share_links, the password (if the link has one) is checked here, then only that view''s filtered rows and shown fields.',
   'viewlink2_a_a_view_link_can_be_locked.sql',
   'server_only: called only by the /v/<token> route with the service role, because the visitor holds no session and the browser must never hold a read door that takes a bearer token or a password. The decision is the link row''s and its password row''s; this function adds no access of its own.',
   false, false, null, null),
  ('custom', 'set_view_share_link_protection', 'p_link_id uuid, p_password text, p_change_expiry boolean, p_expires_at timestamp with time zone',
   array['uuid'::regtype, 'text'::regtype, 'boolean'::regtype, 'timestamptz'::regtype]::oid[],
   'Sets or clears the password and the expiry of one view link, from the "Share view link" panel: its maker, or anyone who may make a link on that view.',
   'viewlink2_a_a_view_link_can_be_locked.sql', null, true, false, null,
   jsonb_build_object('version', 1, 'declared_by', 'viewlink2_a_a_view_link_can_be_locked.sql', 'declared_at', '2026-10-14 lane VIEW-LINK-2, read from the body and exercised in scripts/campaign-tests/viewlink2_green.sql',
     'arguments', jsonb_build_object(
       'p_link_id', jsonb_build_object(
         'type', 'uuid', 'position', 1, 'optional', false, 'entity', null,
         'entity_reason', 'The id names a platform.share_links row, not a record of a shareable type; the decision is made on that row''s own created_by = auth.uid() or iam.may_grant_as on the view it names.',
         'check', 'The link must be an active platform_saved_view link and its maker is the caller, or iam.may_grant_as(caller, platform_saved_view, its view, viewer, anyone) is null.',
         'foreign', jsonb_build_object('note', 'success false, "Link not found or not yours", for a link that is not there, one to something else, a retired one and one the caller may not change alike', 'not_a_leak', true, 'same_as_invented', true),
         'null_rule', jsonb_build_object('means', 'success false, the same refusal'),
         'verified', 'exercised from three seats in scripts/campaign-tests/viewlink2_green.sql, rolled back'),
       'p_password', jsonb_build_object(
         'type', 'text', 'position', 2, 'optional', true, 'entity', null, 'entity_reason', 'A secret the caller chooses; it names nothing.',
         'check', 'Only after the link check above; 4 to 128 characters, or the empty string to remove it. Stored as a bcrypt hash.',
         'foreign', jsonb_build_object('note', 'not an id', 'not_a_leak', true, 'same_as_invented', true),
         'null_rule', jsonb_build_object('means', 'leave the password as it is'),
         'verified', 'exercised in scripts/campaign-tests/viewlink2_green.sql, rolled back'),
       'p_change_expiry', jsonb_build_object(
         'type', 'boolean', 'position', 3, 'optional', true, 'entity', null, 'entity_reason', 'A switch; it names nothing.',
         'check', 'Only after the link check above.',
         'foreign', jsonb_build_object('note', 'not an id', 'not_a_leak', true, 'same_as_invented', true),
         'null_rule', jsonb_build_object('means', 'false: the expiry is left as it is'),
         'verified', 'exercised in scripts/campaign-tests/viewlink2_green.sql, rolled back'),
       'p_expires_at', jsonb_build_object(
         'type', 'timestamptz', 'position', 4, 'optional', true, 'entity', null, 'entity_reason', 'A moment; it names nothing.',
         'check', 'Only after the link check above, and only read when p_change_expiry is true; it has to be in the future.',
         'foreign', jsonb_build_object('note', 'not an id', 'not_a_leak', true, 'same_as_invented', true),
         'null_rule', jsonb_build_object('means', 'with p_change_expiry: the link never expires'),
         'verified', 'exercised in scripts/campaign-tests/viewlink2_green.sql, rolled back'))))
on conflict do nothing;

grant execute on function custom.view_share_links(uuid) to authenticated;
grant execute on function custom.set_view_share_link_protection(uuid, text, boolean, timestamptz) to authenticated;

select custom.reopen_declared_doors();
grant execute on function custom.shared_view_read(text, text, text) to service_role;
