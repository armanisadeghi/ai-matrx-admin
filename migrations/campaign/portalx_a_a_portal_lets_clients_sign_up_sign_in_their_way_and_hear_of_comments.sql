-- chair-step: ADDS two functions (custom.portal_self_signup for the app's server, custom._portal_client_notice internal), one platform.client_callable_door row and one EXECUTE grant (service_role on custom.portal_self_signup; anon and authenticated gain nothing), one communication.notification_event_type row (custom.portal.client_notice), and REPLACES three live bodies, each by one added block: custom._portal_config_judge accepts a portal's sign-in settings ("access": self_signup, password, google, notify_comments, name_field, email_field — all off until the owner turns them on), custom.portal_public tells the sign-in page which ways in it offers, custom._record_follow_commented tells a portal client about a comment on her record. Nothing is dropped; no row of anybody's data is rewritten. Inverse: migrations/campaign/portalx_a_a_portal_lets_clients_sign_up_sign_in_their_way_and_hear_of_comments.inverse.sql.
-- guard: custom/system_enabled
-- lock: custom,platform,communication
-- lane: CLOSE-PAGE
-- based-on: custom._portal_config_judge(uuid, uuid[], jsonb, jsonb) 118a574b2b853c7779f88efde827ab444ec40dc69d84bafcefc1f2fd9a3b4699
-- based-on: custom.portal_public(text) 257112141087ab825b4917497975162e7f917af2a3534bad940034db78344a8f
-- based-on: custom._record_follow_commented() e8d24abbf820e643cac8a96c30010bbaf92e56cecd129dd04610c136ccec37db
--
-- CD-PAGE-12 (ACCEPTANCE.json): "Portals offer self-signup, password or SSO sign-in, search and notifications."
-- Census (live catalog, 2026-10-21): a portal is invite-only and signs in by a one-time email link
-- (custom.portal.sign_in_method is checked to 'magic_link'); a portal client is a real sign-in, so a password and
-- Google (both on for the platform's sign-in) need no store part beyond the owner's switch — the page offers them
-- and binds a signed-in address to its principal through the existing custom.portal_invitation and
-- custom.portal_principal_bind. Search is the page's (over her own rows). This file adds:
--   . the owner's switches (config.access), judged with the rest of a portal's settings;
--   . custom.portal_self_signup: a visitor puts herself on the portal (a client row + a principal), then signs in
--     by the same link as an invited client;
--   . the notice: a comment somebody else writes on her record emails her, through communication.notify_from_sql.

set local lock_timeout = '3s';
set local statement_timeout = '60s';


-- ─────────────────────────────────────────────────────────────────────────────────────────
-- SELF SIGN-UP — server only. A portal whose owner turned sign-up on lets a visitor put herself on it: one
-- row in the portal's client table (her name and address in the columns the owner named) and one principal
-- for her address, made on behalf of whoever declared the portal. She signs in exactly as an invited client
-- does: the sign-in route mails her link. An address already on the portal is not a second client.
-- ─────────────────────────────────────────────────────────────────────────────────────────

create or replace function custom.portal_self_signup(p_slug text, p_email text, p_name text)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog'
as $fn$
declare
  v_p      custom.portal;
  v_mail   text := lower(btrim(coalesce(p_email, '')));
  v_name   text := nullif(btrim(coalesce(p_name, '')), '');
  v_namek  text;
  v_mailk  text;
  v_rec    uuid;
  v_pp     uuid;
  v_held   text;
  v_stood  boolean := false;
begin
  if not custom.query_is_store_owner() and custom.query_principal() is not null then
    raise exception 'This door is the server''s, not a person''s.' using errcode = '42501';
  end if;
  select * into v_p from custom.portal
   where slug = lower(btrim(coalesce(p_slug, ''))) and is_active and archived_at is null;
  if not found then return null; end if;
  if not coalesce((platform.knob_resolve('custom', 'external_principal_enabled', v_p.organization_id) #>> '{}')::boolean, false) then
    return null;
  end if;
  perform custom.assert_store_door(v_p.organization_id, 'custom.portal_self_signup');
  if not coalesce((v_p.config #>> '{access,self_signup}')::boolean, false) then
    return jsonb_build_object('state', 'off', 'message', 'This portal is by invitation only. Ask the business to invite your address.');
  end if;
  if position('@' in v_mail) < 2 or char_length(v_mail) > 320 then
    return jsonb_build_object('state', 'refused', 'message', 'Enter the email address you want to sign in with.');
  end if;
  if v_name is null or char_length(v_name) > 200 then
    return jsonb_build_object('state', 'refused', 'message', 'Enter your name.');
  end if;
  if exists (select 1 from custom.portal_principal pp where pp.portal_id = v_p.id and lower(pp.email) = v_mail and pp.is_active) then
    return jsonb_build_object('state', 'exists');
  end if;
  v_namek := v_p.config #>> '{access,name_field}';
  v_mailk := v_p.config #>> '{access,email_field}';
  if v_namek is null or not exists (
       select 1 from custom.record f
        where f.organization_id = v_p.organization_id and f.table_id = custom.field_kernel_id() and f.deleted_at is null
          and (f.data ->> 'entity_definition_id')::uuid = v_p.client_table_id and f.data ->> 'key' = v_namek) then
    return jsonb_build_object('state', 'unready',
      'message', 'This portal''s sign-up is not finished: its owner has not said which column holds a new client''s name.');
  end if;
  if v_mailk is not null and not exists (
       select 1 from custom.record f
        where f.organization_id = v_p.organization_id and f.table_id = custom.field_kernel_id() and f.deleted_at is null
          and (f.data ->> 'entity_definition_id')::uuid = v_p.client_table_id and f.data ->> 'key' = v_mailk) then
    v_mailk := null;
  end if;

  -- THE ROW IS WRITTEN ON BEHALF OF WHOEVER DECLARED THE PORTAL (admin on the client table — custom.portal_declare
  -- asked), the stand-in custom.anon_clear takes, put back on every path.
  if custom.query_principal() is null and v_p.created_by is not null then
    v_held := current_setting('request.jwt.claims', true);
    perform set_config('request.jwt.claims', jsonb_build_object('sub', v_p.created_by, 'role', 'authenticated')::text, true);
    v_stood := true;
  end if;
  begin
    v_rec := custom.record_write(v_p.organization_id, v_p.client_table_id,
      jsonb_build_object(v_namek, v_name)
      || case when v_mailk is not null then jsonb_build_object(v_mailk, v_mail) else '{}'::jsonb end
      || jsonb_build_object('_actor', 'system')
      || jsonb_build_object('_source', jsonb_build_object('via', 'portal_signup', 'portal_id', v_p.id,
           'at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))));
  exception when others then
    if v_stood then perform set_config('request.jwt.claims', coalesce(v_held, ''), true); end if;
    raise;
  end;
  if v_stood then perform set_config('request.jwt.claims', coalesce(v_held, ''), true); end if;

  insert into custom.portal_principal (portal_id, organization_id, client_record_id, email, user_id, invited_by)
  values (v_p.id, v_p.organization_id, v_rec, v_mail, null, v_p.created_by)
  returning id into v_pp;
  return jsonb_build_object('state', 'signed_up', 'principal_id', v_pp, 'client_record_id', v_rec);
end;
$fn$;

comment on function custom.portal_self_signup(text, text, text) is
  'CD-PAGE-12: a visitor puts herself on a portal whose owner turned sign-up on (config.access.self_signup): one row in the client table (her name in config.access.name_field, her address in config.access.email_field when set), written on behalf of the portal''s declarer, and one principal for her address; she then signs in by the same link as an invited client. off · refused · exists · unready · signed_up. Missing, closed, archived and lane-off portals answer null. server_only.';

-- ─────────────────────────────────────────────────────────────────────────────────────────
-- THE NOTICE TO HER — when somebody else comments on a record of hers on a portal whose owner turned
-- "Tell clients about comments" on (config.access.notify_comments). One email per comment to each principal
-- the record names, through the platform's one notice sender; the author is never told about their own comment.
-- ─────────────────────────────────────────────────────────────────────────────────────────

create or replace function custom._portal_client_notice(p_organization_id uuid, p_record_id uuid, p_table_id uuid,
                                                        p_author uuid, p_comment_id uuid, p_body text)
returns integer
language plpgsql
security definer
set search_path to 'pg_catalog'
as $fn$
declare
  v       record;
  v_key   text;
  v_title text;
  v_sent  integer := 0;
begin
  for v in
    select p.id as portal_id, p.slug, p.title, p.organization_id, pp.id as principal_id, pp.email, pp.user_id,
           pp.client_record_id, pt.names_via_field_id
      from custom.portal_table pt
      join custom.portal p on p.id = pt.portal_id and p.organization_id = pt.organization_id
      join custom.portal_principal pp on pp.portal_id = p.id and pp.is_active
     where pt.organization_id = p_organization_id and pt.table_id = p_table_id and pt.comments_allowed
       and p.is_active and p.archived_at is null
       and coalesce((p.config #>> '{access,notify_comments}')::boolean, false)
       and pp.user_id is distinct from p_author
  loop
    select f.data ->> 'key' into v_key from custom.record f
     where f.organization_id = p_organization_id and f.id = v.names_via_field_id;
    continue when v_key is null;
    continue when not exists (
      select 1 from custom.record r
       where r.organization_id = p_organization_id and r.id = p_record_id and r.deleted_at is null
         and jsonb_path_exists(coalesce(r.data -> v_key, 'null'::jsonb), '$.** ? (@ == $id)',
                               jsonb_build_object('id', v.client_record_id::text)));
    v_title := coalesce(custom.portal_record_title(p_organization_id, p_record_id), 'one of your records');
    perform communication.notify_from_sql(
      p_organization_id, 'custom.portal.client_notice', null, v.email, null,
      jsonb_build_object(
        'notice', jsonb_build_object(
          'subject', format('New comment on %s', v_title),
          'body', left(btrim(coalesce(p_body, '')), 1000)),
        'portal', jsonb_build_object('title', v.title, 'slug', v.slug)),
      format('/portal/c/%s/r/%s', v.slug, p_record_id), 'custom.record', p_record_id,
      format('portal-comment:%s:%s', p_comment_id, v.principal_id), '{}'::jsonb);
    v_sent := v_sent + 1;
  end loop;
  return v_sent;
end;
$fn$;

comment on function custom._portal_client_notice(uuid, uuid, uuid, uuid, uuid, text) is
  'CD-PAGE-12: emails each portal principal a record names (the portal table''s names_via Field points at her client record) when somebody else comments on it, on portals whose owner turned config.access.notify_comments on. Called by custom._record_follow_commented. Internal; no client grant.';

-- The platform's one notice sender needs the event declared (aidream declares it too; this row makes it work
-- before that server ships, as booking_notify did).
insert into communication.notification_event_type
  (event_key, label, description, default_channels, config, enabled, organization_id, visibility)
select 'custom.portal.client_notice', 'A comment on your record',
       'A client on a portal is emailed when the business comments on one of her records, when the portal''s owner turned it on.',
       '{"email": true}'::jsonb,
       jsonb_build_object(
         'bucket', 'direct', 'mandatory', false, 'alert_tier', 'informational', 'digestible', false,
         'sms_locked', true, 'target_kind', 'custom.record', 'max_attempts', 5, 'routing_mode', 'declared_audience',
         'push_declared', false, 'non_user_capable', true, 'deep_link_template', null, 'pair_dm_with_email', false,
         'quiet_hours_exempt', false, 'retry_base_seconds', 60, 'sender_program_key', null, 'sensitivity_ceiling', 'internal',
         'templates', jsonb_build_object('email', jsonb_build_object(
           'subject', '{{notice.subject}}',
           'body', E'{{notice.body}}\n\n--\nOpen it in {{portal.title}}: {{link.deep}}\nYou are getting this because you are a client on {{portal.title}}.'))),
       true, t.organization_id, t.visibility
  from communication.notification_event_type t
 where t.event_key = 'custom.form.respondent_copy' and t.deleted_at is null
on conflict do nothing;


insert into platform.client_callable_door
  (schema_name, function_name, identity_args, identity_argtypes, reason, declared_by,
   non_client_lane, signed_in_callers, anonymous_callers, argument_rules)
values
  ('custom', 'portal_self_signup', 'p_slug text, p_email text, p_name text',
   array['text'::regtype, 'text'::regtype, 'text'::regtype]::oid[],
   'It takes NO organization id: the portal''s slug supplies it, and only a live portal whose owner turned sign-up on answers. It writes one client row (on behalf of the portal''s declarer, through custom.record_write) and one custom.portal_principal for the address given; an address already on the portal is not written twice.',
   'portalx_a_a_portal_lets_clients_sign_up_sign_in_their_way_and_hear_of_comments.sql',
   'server_only: reached through the app''s own sign-up route beside the portal''s sign-in route, which mails the sign-in link. It refuses a signed-in caller in its own body, as custom.portal_invitation does. Schema custom stays revoked from anon; granted to the server lane alone.',
   false, false, null),
  ('custom', '_portal_client_notice', 'p_organization_id uuid, p_record_id uuid, p_table_id uuid, p_author uuid, p_comment_id uuid, p_body text',
   array['uuid'::regtype, 'uuid'::regtype, 'uuid'::regtype, 'uuid'::regtype, 'uuid'::regtype, 'text'::regtype]::oid[],
   'Every id comes from the comment row the trigger fired on (its organization, its record, the record''s table, its author and its own id); the portals, principals and records are matched in p_organization_id only. It writes only communication.notification rows through communication.notify_from_sql.',
   'portalx_a_a_portal_lets_clients_sign_up_sign_in_their_way_and_hear_of_comments.sql',
   'server_only: internal — called only by the trigger function custom._record_follow_commented on platform.comments; no client and no app route calls it, and it has no EXECUTE grant to any client role.',
   false, false, null)
on conflict do nothing;

grant execute on function custom.portal_self_signup(text, text, text) to service_role;

CREATE OR REPLACE FUNCTION custom._portal_config_judge(p_organization_id uuid, p_exposed uuid[], p_prior jsonb, p_given jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_out    jsonb := coalesce(p_prior, '{}'::jsonb);
  v_key    text;
  v_style  jsonb;
  v_s      jsonb := '{}'::jsonb;
  v_links  jsonb;
  v_link   jsonb;
  v_lout   jsonb := '[]'::jsonb;
  v_txt    text;
  v_url    text;
  v_logo   uuid;
  v_file   record;
  v_forms  jsonb;
  v_fout   jsonb := '[]'::jsonb;
  v_item   record;
  v_form   custom.anon_form;
  v_seen   uuid[] := '{}';
  v_n      integer := 0;
  v_table  text;
  v_acc    jsonb;   -- CD-PAGE-12: how people get in
  v_k      text;
begin
  if p_given is not null and jsonb_typeof(p_given) <> 'null' then
    if jsonb_typeof(p_given) <> 'object' then
      raise exception 'A portal''s settings are an object with a look ("style") and a list of forms ("forms").'
        using errcode = '22023', hint = 'Nothing was written.';
    end if;
    for v_key in select jsonb_object_keys(p_given) loop
      if v_key not in ('style', 'forms', 'blocks', 'access') then
        raise exception 'A portal''s settings have a look ("style"), forms ("forms"), page blocks ("blocks") and sign-in ("access"), and "%" is none of them.', v_key
          using errcode = '22023', hint = 'Nothing was written.';
      end if;
    end loop;

    -- ── THE LOOK ──────────────────────────────────────────────────────────────────────
    if p_given ? 'style' then
      v_style := p_given -> 'style';
      if v_style is null or jsonb_typeof(v_style) = 'null' then
        v_out := v_out - 'style';           -- back to the organization's own brand
      elsif jsonb_typeof(v_style) <> 'object' then
        raise exception 'A portal''s look is an object: display_name, welcome, logo_file_id, accent, footer_links.'
          using errcode = '22023', hint = 'Nothing was written.';
      else
        for v_key in select jsonb_object_keys(v_style) loop
          if v_key not in ('display_name', 'welcome', 'logo_file_id', 'accent', 'footer_links') then
            raise exception 'A portal''s look has a name, a welcome line, a logo, an accent color and footer links, and "%" is none of them.', v_key
              using errcode = '22023',
                    hint = 'The keys are display_name, welcome, logo_file_id, accent and footer_links. Nothing was written.';
          end if;
        end loop;

        v_txt := nullif(btrim(coalesce(v_style ->> 'display_name', '')), '');
        if v_txt is not null then
          if length(v_txt) < 2 or length(v_txt) > 80 then
            raise exception 'The name a portal shows has to be 2 to 80 characters, and "%" is %.', v_txt, length(v_txt)
              using errcode = '22023', hint = 'Leave it empty to show the organization''s own name. Nothing was written.';
          end if;
          v_s := v_s || jsonb_build_object('display_name', v_txt);
        end if;

        v_txt := nullif(btrim(coalesce(v_style ->> 'welcome', '')), '');
        if v_txt is not null then
          if length(v_txt) > 280 then
            raise exception 'A portal''s welcome line is at most 280 characters, and this one is %.', length(v_txt)
              using errcode = '22023', hint = 'It sits under the name on the sign-in page and at the top of the portal. Nothing was written.';
          end if;
          v_s := v_s || jsonb_build_object('welcome', v_txt);
        end if;

        v_txt := nullif(btrim(coalesce(v_style ->> 'accent', '')), '');
        if v_txt is not null then
          if not (v_txt = any (custom.portal_accents())) then
            raise exception 'A portal''s accent is one of the colors the rest of the app uses (%), and "%" is not one of them.',
              array_to_string(custom.portal_accents(), ', '), v_txt
              using errcode = '22023', hint = 'Leave it empty to use the app''s own color. Nothing was written.';
          end if;
          v_s := v_s || jsonb_build_object('accent', v_txt);
        end if;

        v_txt := nullif(btrim(coalesce(v_style ->> 'logo_file_id', '')), '');
        if v_txt is not null then
          begin
            v_logo := v_txt::uuid;
          exception when invalid_text_representation then
            raise exception 'A portal''s logo is a picture from this organization''s Files, named by its id, and "%" is not an id.', v_txt
              using errcode = '22023', hint = 'Nothing was written.';
          end;
          select f.id, f.organization_id, f.visibility::text as visibility, f.mime_type, f.storage_uri, f.deleted_at
            into v_file
            from files.files f where f.id = v_logo;
          if v_file.id is null or v_file.deleted_at is not null
             or v_file.organization_id is distinct from p_organization_id then
            -- A file of another organization answers exactly as one that does not exist.
            raise exception 'There is no such picture in this organization''s Files, so it cannot be this portal''s logo.'
              using errcode = '02000', hint = 'Pick a picture from Files, or upload the logo there first. Nothing was written.';
          end if;
          if coalesce(v_file.mime_type, '') not like 'image/%' then
            raise exception 'That file is not a picture, so it cannot be this portal''s logo.'
              using errcode = '22023', hint = 'Pick a PNG, JPEG, WebP or SVG from Files. Nothing was written.';
          end if;
          if custom._portal_picture_url(p_organization_id, v_logo, true) is null then
            raise exception 'That picture is private to your organization, so the people you invite could not see it: a portal''s logo is shown on its sign-in page, before anybody has signed in.'
              using errcode = '42501',
                    hint = 'Make the picture public in Files, or pick one that already is. Nothing was written.';
          end if;
          v_s := v_s || jsonb_build_object('logo_file_id', v_logo);
        end if;

        v_links := v_style -> 'footer_links';
        if v_links is not null and jsonb_typeof(v_links) <> 'null' then
          if jsonb_typeof(v_links) <> 'array' then
            raise exception 'A portal''s footer links are a list of {label, url}.'
              using errcode = '22023', hint = 'Nothing was written.';
          end if;
          if jsonb_array_length(v_links) > 5 then
            raise exception 'A portal''s footer carries at most five links, and this one has %.', jsonb_array_length(v_links)
              using errcode = '22023', hint = 'Nothing was written.';
          end if;
          for v_link in select value from jsonb_array_elements(v_links) loop
            v_txt := nullif(btrim(coalesce(v_link ->> 'label', '')), '');
            v_url := nullif(btrim(coalesce(v_link ->> 'url', '')), '');
            if v_txt is null or v_url is null then
              raise exception 'Every footer link needs the words it shows and the address it opens.'
                using errcode = '22004', hint = 'Nothing was written.';
            end if;
            if length(v_txt) > 40 then
              raise exception 'A footer link''s words are at most 40 characters, and "%" is %.', v_txt, length(v_txt)
                using errcode = '22023', hint = 'Nothing was written.';
            end if;
            if v_url !~* '^(https://[^[:space:]]+|mailto:[^[:space:]]+|tel:[+0-9() .-]+)$' or length(v_url) > 500 then
              raise exception 'The footer link "%" opens "%", and a portal only links to a secure web address (https://), an email (mailto:) or a phone number (tel:).', v_txt, v_url
                using errcode = '22023', hint = 'Nothing was written.';
            end if;
            v_lout := v_lout || jsonb_build_array(jsonb_build_object('label', v_txt, 'url', v_url));
          end loop;
          if jsonb_array_length(v_lout) > 0 then
            v_s := v_s || jsonb_build_object('footer_links', v_lout);
          end if;
        end if;

        if v_s = '{}'::jsonb then
          v_out := v_out - 'style';
        else
          v_out := v_out || jsonb_build_object('style', v_s);
        end if;
      end if;
    end if;


    -- ── THE BLOCKS (PORTAL-BLOCKS) ────────────────────────────────────────────────────
    -- What a page of this portal is built from: tiles, charts, lists. Each block names ONE
    -- exposed Table and the Field keys it reads. The screen computes every number over HER rows
    -- only and keeps every key to the Table's visible_fields, so a block is a view, never a door.
    if p_given ? 'blocks' then
      declare
        v_blocks jsonb := p_given -> 'blocks';
        v_b      jsonb;
        v_bout   jsonb := '[]'::jsonb;
        v_k      text;
        v_i      integer := 0;
        v_tid    uuid;
      begin
        if v_blocks is null or jsonb_typeof(v_blocks) = 'null'
           or (jsonb_typeof(v_blocks) = 'array' and jsonb_array_length(v_blocks) = 0) then
          v_out := v_out - 'blocks';
        elsif jsonb_typeof(v_blocks) <> 'array' then
          raise exception 'A portal''s blocks are a list of {kind, table_id, title, ...}.'
            using errcode = '22023', hint = 'Nothing was written.';
        elsif jsonb_array_length(v_blocks) > 24 then
          raise exception 'A portal page carries at most 24 blocks, and this one names %.', jsonb_array_length(v_blocks)
            using errcode = '22023', hint = 'Nothing was written.';
        else
          for v_b in select value from jsonb_array_elements(v_blocks) loop
            v_i := v_i + 1;
            if jsonb_typeof(v_b) <> 'object' then
              raise exception 'Block % is not an object.', v_i using errcode = '22023', hint = 'Nothing was written.';
            end if;
            for v_k in select jsonb_object_keys(v_b) loop
              if v_k not in ('kind', 'table_id', 'title', 'group_by', 'measure_op', 'measure_key', 'fields', 'detail_fields') then
                raise exception 'A block has a kind, a table, a title and the fields it reads, and "%" is none of them.', v_k
                  using errcode = '22023', hint = 'Nothing was written.';
              end if;
            end loop;
            if coalesce(v_b ->> 'kind', '') not in ('kpi', 'bar', 'line', 'donut', 'list', 'cards', 'table') then
              raise exception 'Block % has kind "%", and a block is a kpi, bar, line, donut, list, cards or table.', v_i, coalesce(v_b ->> 'kind', '')
                using errcode = '22023', hint = 'Nothing was written.';
            end if;
            begin
              v_tid := (v_b ->> 'table_id')::uuid;
            exception when others then
              raise exception 'Block % names a table that is not an id.', v_i using errcode = '22023', hint = 'Nothing was written.';
            end;
            if v_tid is null or not (v_tid = any (coalesce(p_exposed, '{}'))) then
              raise exception 'Block % reads a table this portal does not show, so a client would be shown numbers from rows she can never open.', v_i
                using errcode = '22023', hint = 'Add that table to the portal, or point the block at one it shows. Nothing was written.';
            end if;
            if v_b ? 'measure_op' and (v_b ->> 'measure_op') not in ('count', 'sum', 'avg', 'min', 'max') then
              raise exception 'Block % measures with "%", and a measure is count, sum, avg, min or max.', v_i, v_b ->> 'measure_op'
                using errcode = '22023', hint = 'Nothing was written.';
            end if;
            for v_k in select unnest(array['group_by', 'measure_key']) loop
              if v_b ? v_k and jsonb_typeof(v_b -> v_k) not in ('string', 'null') then
                raise exception 'Block %: % is a field key.', v_i, v_k using errcode = '22023', hint = 'Nothing was written.';
              end if;
            end loop;
            for v_k in select unnest(array['fields', 'detail_fields']) loop
              if v_b ? v_k and jsonb_typeof(v_b -> v_k) not in ('array', 'null') then
                raise exception 'Block %: % is a list of field keys.', v_i, v_k using errcode = '22023', hint = 'Nothing was written.';
              end if;
            end loop;
            v_bout := v_bout || jsonb_build_array(jsonb_strip_nulls(v_b));
          end loop;
          v_out := v_out || jsonb_build_object('blocks', v_bout);
        end if;
      end;
    end if;

    -- ── THE FORMS, AS GIVEN ───────────────────────────────────────────────────────────
    if p_given ? 'forms' then
      v_forms := p_given -> 'forms';
      if v_forms is null or jsonb_typeof(v_forms) = 'null'
         or (jsonb_typeof(v_forms) = 'array' and jsonb_array_length(v_forms) = 0) then
        v_out := v_out - 'forms';
      elsif jsonb_typeof(v_forms) <> 'array' then
        raise exception 'A portal''s forms are a list of {form_id, label, order}.'
          using errcode = '22023', hint = 'Nothing was written.';
      elsif jsonb_array_length(v_forms) > 12 then
        raise exception 'A portal carries at most twelve forms, and this one names %.', jsonb_array_length(v_forms)
          using errcode = '22023', hint = 'Nothing was written.';
      else
        v_out := v_out || jsonb_build_object('forms', v_forms);
      end if;
    end if;
  end if;

  -- ── EVERY FORM THAT WILL STAND IS JUDGED, GIVEN OR KEPT ─────────────────────────────
  -- Against the Tables THIS declaration exposes, so a table taken off the portal never takes a
  -- form with it in silence.
  if v_out ? 'forms' then
    for v_item in
      select e.v, e.pos,
             coalesce(case when jsonb_typeof(e.v -> 'order') = 'number' then (e.v ->> 'order')::numeric end, e.pos) as ord
        from jsonb_array_elements(v_out -> 'forms') with ordinality e(v, pos)
       order by 3, e.pos
    loop
      if jsonb_typeof(v_item.v) <> 'object' or nullif(v_item.v ->> 'form_id', '') is null then
        raise exception 'Every form on a portal is named by its id ({"form_id": …}).'
          using errcode = '22004', hint = 'Nothing was written.';
      end if;
      for v_key in select jsonb_object_keys(v_item.v) loop
        if v_key not in ('form_id', 'label', 'order') then
          raise exception 'A form on a portal has an id, a label and an order, and "%" is none of them.', v_key
            using errcode = '22023', hint = 'Nothing was written.';
        end if;
      end loop;
      begin
        select * into v_form from custom.anon_form f
         where f.organization_id = p_organization_id and f.id = (v_item.v ->> 'form_id')::uuid
           and f.deleted_at is null;
      exception when invalid_text_representation then
        raise exception 'A form on a portal is named by its id, and "%" is not an id.', v_item.v ->> 'form_id'
          using errcode = '22023', hint = 'Nothing was written.';
      end;
      if v_form.id is null then
        raise exception 'There is no form % in this organization, so this portal cannot offer it.', v_item.v ->> 'form_id'
          using errcode = '02000', hint = 'It may have been removed. Take it off the portal''s forms. Nothing was written.';
      end if;
      if v_form.id = any (v_seen) then
        raise exception 'The form "%" is on this portal twice.', coalesce(v_form.title, 'Form')
          using errcode = '23505', hint = 'Nothing was written.';
      end if;
      if v_form.audience = 'crew' then
        raise exception 'The form "%" is a crew form, filled in by your own people, so it cannot be offered to a client.', coalesce(v_form.title, 'Form')
          using errcode = '22023', hint = 'Nothing was written.';
      end if;
      if not (v_form.table_id = any (coalesce(p_exposed, '{}'))) then
        select coalesce(nullif(t.data ->> 'name', ''), 'a table') into v_table
          from custom.record t where t.organization_id = p_organization_id and t.id = v_form.table_id;
        raise exception 'The form "%" puts its answers in %, and this portal does not show that table, so a client would send something she could never see again.',
          coalesce(v_form.title, 'Form'), coalesce(v_table, 'a table')
          using errcode = '22023',
                hint = 'Add that table to the portal, or take the form off it. Nothing was written.';
      end if;
      v_seen := v_seen || v_form.id;
      v_n := v_n + 1;
      v_txt := nullif(btrim(coalesce(v_item.v ->> 'label', '')), '');
      if v_txt is not null and length(v_txt) > 60 then
        raise exception 'A form''s label on a portal is at most 60 characters, and "%" is %.', v_txt, length(v_txt)
          using errcode = '22023', hint = 'Nothing was written.';
      end if;
      v_fout := v_fout || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
                  'form_id', v_form.id, 'label', v_txt, 'order', v_n)));
    end loop;
    v_out := v_out || jsonb_build_object('forms', v_fout);
  end if;

  -- ── CD-PAGE-12: HOW PEOPLE GET IN — self sign-up, a password, Google, and a notice when the business
  -- comments on one of her records. Every one is OFF until the owner turns it on; the two field keys name the
  -- client table's columns a sign-up fills (custom.portal_self_signup checks they are there when it is used).
  if p_given is not null and jsonb_typeof(p_given) = 'object' and p_given ? 'access' then
    v_acc := p_given -> 'access';
    if jsonb_typeof(v_acc) = 'null' then
      v_out := v_out - 'access';
    elsif jsonb_typeof(v_acc) <> 'object' then
      raise exception 'A portal''s sign-in settings ("access") are an object.' using errcode = '22023', hint = 'Nothing was written.';
    else
      for v_k in select jsonb_object_keys(v_acc) loop
        if v_k not in ('self_signup', 'password', 'google', 'notify_comments', 'name_field', 'email_field') then
          raise exception 'A portal''s sign-in settings are self_signup, password, google, notify_comments, name_field and email_field, and "%" is none of them.', v_k
            using errcode = '22023', hint = 'Nothing was written.';
        end if;
        if v_k in ('self_signup', 'password', 'google', 'notify_comments')
           and jsonb_typeof(v_acc -> v_k) not in ('boolean', 'null') then
          raise exception 'The portal setting "%" is on or off (true or false).', v_k using errcode = '22023', hint = 'Nothing was written.';
        end if;
        if v_k in ('name_field', 'email_field') and jsonb_typeof(v_acc -> v_k) <> 'null'
           and (jsonb_typeof(v_acc -> v_k) <> 'string' or (v_acc ->> v_k) !~ '^[a-z][a-z0-9_]{0,62}$') then
          raise exception 'The portal setting "%" names one of the client table''s columns by its key.', v_k using errcode = '22023', hint = 'Nothing was written.';
        end if;
      end loop;
      v_out := v_out || jsonb_build_object('access', jsonb_strip_nulls(jsonb_build_object(
        'self_signup', case when (v_acc ->> 'self_signup')::boolean then true end,
        'password', case when (v_acc ->> 'password')::boolean then true end,
        'google', case when (v_acc ->> 'google')::boolean then true end,
        'notify_comments', case when (v_acc ->> 'notify_comments')::boolean then true end,
        'name_field', v_acc ->> 'name_field',
        'email_field', v_acc ->> 'email_field')));
    end if;
  end if;

  if v_out = '{}'::jsonb then
    return null;
  end if;
  return v_out;
end $function$;
CREATE OR REPLACE FUNCTION custom.portal_public(p_slug text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_p custom.portal;
  v_o text;
begin
  -- THE SIGN-IN PAGE, AND NOTHING ELSE. A slug that does not exist, one that is closed, one
  -- that is ARCHIVED, and one whose organization has not opened the external lane all answer
  -- the same NULL, which is the 404: the address cannot be used to learn that anything is
  -- there.
  select * into v_p from custom.portal
   where slug = lower(btrim(coalesce(p_slug, ''))) and is_active and archived_at is null;
  if not found then return null; end if;
  if not coalesce((platform.knob_resolve('custom', 'external_principal_enabled', v_p.organization_id) #>> '{}')::boolean, false) then
    return null;
  end if;
  select o.name into v_o from iam.organizations o where o.id = v_p.organization_id;

  if not custom.store_is_open(v_p.organization_id) then
    return jsonb_build_object(
      'portal_id', v_p.id, 'slug', v_p.slug, 'title', v_p.title, 'organization', v_o,
      'sign_in_method', v_p.sign_in_method, 'state', 'unavailable',
      'message', custom.store_off_sentence(v_p.organization_id),
      'style', custom._portal_style(v_p.organization_id, v_p.config));
  end if;

  -- S6: the look — what the business is called here, its logo and its color — so the page a
  -- client opens from a text message says whose it is before she types anything.
  return jsonb_build_object(
    'portal_id', v_p.id, 'slug', v_p.slug, 'title', v_p.title, 'organization', v_o,
    'sign_in_method', v_p.sign_in_method, 'state', 'open',
    'style', custom._portal_style(v_p.organization_id, v_p.config),
    -- CD-PAGE-12: which ways in the sign-in page offers (the switches only, never the column keys).
    'access', jsonb_build_object(
      'magic_link', true,
      'self_signup', coalesce((v_p.config #>> '{access,self_signup}')::boolean, false),
      'password', coalesce((v_p.config #>> '{access,password}')::boolean, false),
      'google', coalesce((v_p.config #>> '{access,google}')::boolean, false)));
end $function$;
CREATE OR REPLACE FUNCTION custom._record_follow_commented()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_table uuid := nullif(new.metadata ->> 'table_id', '')::uuid;
  v_skip  uuid[];
begin
  if new.entity_type <> 'record' or new.deleted_at is not null or v_table is null then
    return null;
  end if;
  if not coalesce((platform.knob_resolve('custom', 'system_enabled', new.organization_id) #>> '{}')::boolean, false) then
    return null;
  end if;
  -- CD-PAGE-12: a client on a portal is told about a comment on one of her records (when its owner turned it on).
  begin
    perform custom._portal_client_notice(new.organization_id, new.entity_id, v_table, new.created_by, new.id, new.body);
  exception when others then
    raise warning 'custom._portal_client_notice: comment % skipped — %', new.id, sqlerrm;
  end;
  if not exists (select 1 from custom.record_follow f
                  where f.organization_id = new.organization_id and f.record_id = new.entity_id and f.following) then
    return null;
  end if;
  -- Somebody the comment NAMES is already told by the mention notice: one notice, not two.
  begin
    select array_agg(m::uuid) into v_skip from jsonb_array_elements_text(coalesce(new.metadata -> 'mentions', '[]'::jsonb)) m;
  exception when others then
    v_skip := null;
  end;
  begin
    perform custom._record_follow_notify(
      new.organization_id, new.entity_id, v_table, new.created_by, 'comment:' || new.id::text,
      'commented on',
      format('/data/%s?record=%s&comment=%s', v_table, new.entity_id, new.id),
      new.body, v_skip);
  exception when others then
    raise warning 'custom._record_follow_commented: comment % skipped — %', new.id, sqlerrm;
  end;
  return null;
end
$function$;
