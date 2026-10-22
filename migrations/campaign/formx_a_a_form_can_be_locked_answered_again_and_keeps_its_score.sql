-- chair-step: ADDS one table (custom.anon_form_password, a bcrypt hash per public form, no client grant), four functions (custom.form_set_password for the owner, and custom.form_unlock, custom.form_response_read, custom.form_response_update for the app's server), their four platform.client_callable_door rows and their four EXECUTE grants (authenticated for the owner's door, service_role for the three server doors; anon gains nothing), one platform.entity_types row, and REPLACES custom.form_submit by its live body with three added blocks (a form with a password takes an answer only with the password's fingerprint; the answer-again secret's hash is kept on the submission while the form allows changes; the score lands in the form's score column). Nothing is dropped; no row of anybody's data is rewritten. Inverse: migrations/campaign/formx_a_a_form_can_be_locked_answered_again_and_keeps_its_score.inverse.sql.
-- guard: custom/system_enabled
-- lock: custom,platform
-- lane: CLOSE-PAGE
-- based-on: custom.form_submit(uuid, text, jsonb, text, text, text) 097d35320ca298739c89aa23e85b4c95f253fcaa753496deab2fc26b7258c8e8
--
-- CD-PAGE-08 (ACCEPTANCE.json): "Forms match Typeform's extras: calculated fields, password protection,
-- multiple languages, receipts and a response-edit link." Census of what already stood (2026-10-21, read
-- from the live catalog): receipts are custom.form_respondent_copy (presentation.notify.email_respondent);
-- scoring is TYPEFORM-DUP's points and score-ranged endings (custom._form_route). Multiple languages need no
-- store part (presentation.languages, words only, applied by the public page). This file adds the rest:
--
--   . PASSWORD. Its own table, never in presentation (the public page hands presentation to the browser).
--     custom.form_unlock answers open / locked exactly as custom.shared_view_read does for a view link
--     (VIEW-LINK-2): a right password returns the fingerprint of the stored hash, which the app's server
--     signs into a cookie scoped to the form; changing the password changes the fingerprint. form_submit
--     refuses an answer without it, so a hand-written POST cannot answer around the page's gate.
--   . ANSWER AGAIN (the response-edit link). When presentation.allow_edit is true, the app's server mints a
--     secret for each send (`_edit`) and the submission keeps only its sha256. The secret is the respondent's
--     link: custom.form_response_read opens their answers, custom.form_response_update changes the record they
--     became through custom.record_update on behalf of the publisher (the stand-in anon_clear and
--     booking_reschedule take), marked as a form write.
--   . A CALCULATED SCORE ON THE ROW. presentation.score_field names one of the table's own columns; the score
--     the route works out from the answers' points is written there on every send and every change.

set local lock_timeout = '3s';
set local statement_timeout = '60s';

-- ─────────────────────────────────────────────────────────────────────────────────────────
-- 1. THE PASSWORD'S HOME: its own table, no client grant, so the hash can never ride a form's
--    presentation (which the public page hands to the browser) or any column list.
-- ─────────────────────────────────────────────────────────────────────────────────────────

create table if not exists custom.anon_form_password (
  form_id         uuid primary key references custom.anon_form(id) on delete cascade,
  organization_id uuid not null,
  password_hash   text not null,
  set_by          uuid,
  set_at          timestamptz not null default now()
);
alter table custom.anon_form_password enable row level security;
revoke all on custom.anon_form_password from public, anon, authenticated;
comment on table custom.anon_form_password is
  'FORM-EXTRAS (CD-PAGE-08) — the bcrypt hash of the password on one public form. Never selectable by a client (no grant, RLS on, no policy); read and written only by the SECURITY DEFINER doors custom.form_set_password, custom.form_unlock, custom.form_submit and the answer-again doors.';

insert into platform.entity_types (token, schema_name, table_name, label, audit_class, audit_class_reason, table_ref)
values ('anon_form_password', 'custom', 'anon_form_password', 'Form password', 'machinery',
        'Holds only the bcrypt hash of a public form''s password; no app or person reads it, only the definer doors that check and set it.',
        'custom.anon_form_password'::regclass)
on conflict do nothing;

-- ─────────────────────────────────────────────────────────────────────────────────────────
-- 2. SET, CLEAR OR READ A FORM'S PASSWORD — the owner's side. Admin on the form's table, the
--    rung custom.form_declare asks for. p_password null leaves it and only answers the state.
-- ─────────────────────────────────────────────────────────────────────────────────────────

create or replace function custom.form_set_password(p_organization_id uuid, p_form_id uuid, p_password text default null)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog'
as $fn$
declare
  v_user uuid := custom.query_principal();
  v_f    custom.anon_form;
begin
  perform custom.assert_store_door(p_organization_id, 'custom.form_set_password');
  if v_user is null then
    raise exception 'Nobody is signed in, so no form''s password can be changed.' using errcode = '42501';
  end if;
  select * into v_f from custom.anon_form
   where organization_id = p_organization_id and id = p_form_id and deleted_at is null;
  if not found then
    raise exception 'There is no such form in this organization.' using errcode = '02000';
  end if;
  perform custom.assert_client_may_change(p_organization_id, v_f.table_id, 'custom.form_set_password',
                                          'admin'::public.permission_level, 'table');
  if p_password is not null and p_password <> '' and (char_length(p_password) < 4 or char_length(p_password) > 128) then
    raise exception 'A form''s password needs 4 to 128 characters.' using errcode = '22023';
  end if;
  if p_password = '' then
    delete from custom.anon_form_password where form_id = v_f.id;
  elsif p_password is not null then
    insert into custom.anon_form_password (form_id, organization_id, password_hash, set_by)
    values (v_f.id, v_f.organization_id, extensions.crypt(p_password, extensions.gen_salt('bf', 10)), v_user)
    on conflict (form_id) do update set password_hash = excluded.password_hash, set_by = excluded.set_by, set_at = now();
  end if;
  return jsonb_build_object('has_password', exists (select 1 from custom.anon_form_password where form_id = v_f.id));
end;
$fn$;

comment on function custom.form_set_password(uuid, uuid, text) is
  'FORM-EXTRAS (CD-PAGE-08): sets (4 to 128 characters), clears ('''') or leaves (null) the password of one public form and answers {has_password}. Admin on the form''s table, the rung custom.form_declare asks for. Only the bcrypt hash is kept, in custom.anon_form_password.';

-- ─────────────────────────────────────────────────────────────────────────────────────────
-- 3. THE PUBLIC SIDE OF THE PASSWORD — server only. A form with no password is open; a right
--    password, or the fingerprint of the stored hash the server's signed cookie carries, is open
--    and answers that fingerprint; anything else is locked and says nothing of the form.
-- ─────────────────────────────────────────────────────────────────────────────────────────

create or replace function custom.form_unlock(p_form_id uuid, p_password text default null, p_unlock text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'pg_catalog'
as $fn$
declare
  v_f    custom.anon_form;
  v_hash text;
  v_fp   text;
begin
  if p_form_id is null then return null; end if;
  select * into v_f from custom.anon_form where id = p_form_id and deleted_at is null and published_at is not null;
  if not found then return null; end if;
  select p.password_hash into v_hash from custom.anon_form_password p where p.form_id = v_f.id;
  if v_hash is null then return jsonb_build_object('state', 'open'); end if;
  v_fp := encode(extensions.digest(v_hash, 'sha256'), 'hex');
  if (p_unlock is not null and p_unlock = v_fp)
     or (p_password is not null and p_password <> '' and extensions.crypt(p_password, v_hash) = v_hash) then
    return jsonb_build_object('state', 'open', 'unlock', v_fp);
  end if;
  return jsonb_build_object('state', 'locked', 'wrong', coalesce(p_password, '') <> '');
end;
$fn$;

comment on function custom.form_unlock(uuid, text, text) is
  'FORM-EXTRAS (CD-PAGE-08): whether a published public form is open to this visitor. No password: {state: open}. The right password, or p_unlock equal to the fingerprint (sha256) of the stored hash: {state: open, unlock: <fingerprint>}, which the app''s server signs into a cookie. Otherwise {state: locked, wrong}. Missing and unpublished forms answer null (the 404). server_only.';

-- ─────────────────────────────────────────────────────────────────────────────────────────
-- 4. ANSWER AGAIN — READ. The respondent's own answers, by the secret only their edit link
--    holds, while the form still allows changes. Server only.
-- ─────────────────────────────────────────────────────────────────────────────────────────

create or replace function custom.form_response_read(p_form_id uuid, p_edit text, p_unlock text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'pg_catalog'
as $fn$
declare
  v_f       custom.anon_form;
  v_s       custom.anon_submission;
  v_hash    text;
  v_exposed text[];
  v_values  jsonb;
begin
  if p_form_id is null then return null; end if;
  select * into v_f from custom.anon_form where id = p_form_id and deleted_at is null and published_at is not null;
  if not found then return null; end if;
  if not custom.store_is_open(v_f.organization_id) then
    return jsonb_build_object('state', 'unavailable', 'message', custom.store_off_sentence(v_f.organization_id));
  end if;
  if coalesce(v_f.presentation ->> 'allow_edit', 'false') <> 'true' then
    return jsonb_build_object('state', 'off', 'message', 'This form no longer lets answers be changed.');
  end if;
  select p.password_hash into v_hash from custom.anon_form_password p where p.form_id = v_f.id;
  if v_hash is not null and (p_unlock is null or p_unlock <> encode(extensions.digest(v_hash, 'sha256'), 'hex')) then
    return jsonb_build_object('state', 'locked', 'message', 'This form needs its password.');
  end if;
  if p_edit is null or char_length(btrim(p_edit)) < 24 then
    return jsonb_build_object('state', 'not_found', 'message', 'This link does not open an answer to this form.');
  end if;
  select * into v_s from custom.anon_submission s
   where s.organization_id = v_f.organization_id and s.form_id = v_f.id and s.deleted_at is null
     and s.state <> 'rejected'
     and s.metadata ->> 'edit_hash' = encode(extensions.digest(btrim(p_edit), 'sha256'), 'hex')
   limit 1;
  if not found then
    return jsonb_build_object('state', 'not_found', 'message', 'This link does not open an answer to this form.');
  end if;
  if v_f.closed_at is not null then
    return jsonb_build_object('state', 'closed', 'message', 'This form is closed, so its answers can no longer be changed.');
  end if;
  select coalesce(array_agg(value #>> '{}'), array[]::text[]) into v_exposed
    from jsonb_array_elements(v_f.exposed_field_keys);
  if v_s.record_id is not null then
    select r.data into v_values from custom.record r
     where r.organization_id = v_f.organization_id and r.id = v_s.record_id and r.deleted_at is null;
    if v_values is null then
      return jsonb_build_object('state', 'not_found', 'message', 'The answer this link opened was removed by the form''s owner.');
    end if;
  else
    v_values := v_s.payload;
  end if;
  return jsonb_build_object(
    'state', 'found',
    'answers', coalesce((select jsonb_object_agg(k, v_values -> k) from unnest(v_exposed) k where v_values ? k), '{}'::jsonb),
    'sent_at', v_s.created_at,
    'edited_at', v_s.metadata ->> 'edited_at');
end;
$fn$;

comment on function custom.form_response_read(uuid, text, text) is
  'FORM-EXTRAS (CD-PAGE-08): a respondent''s own answers to a published form, by the answer-again secret their edit link holds (matched on its sha256 in the submission''s metadata), narrowed to the form''s exposed keys and read from the record the answer became. found · off (the form stopped allowing changes) · locked · closed · not_found · unavailable, each with its sentence. Missing and unpublished forms answer null. server_only.';

-- ─────────────────────────────────────────────────────────────────────────────────────────
-- 5. ANSWER AGAIN — WRITE. The same judgement custom.form_submit makes (keys, required-when-asked,
--    the score), then the record the answer became is changed in place through the one write
--    door, on behalf of the form's publisher, marked as coming through a form. Server only.
-- ─────────────────────────────────────────────────────────────────────────────────────────

create or replace function custom.form_response_update(p_form_id uuid, p_edit text, p_origin text, p_payload jsonb, p_bucket text)
returns table(submission_id uuid, record_id uuid, state text, message text)
language plpgsql
security definer
set search_path to 'pg_catalog'
as $fn$
declare
  v_f         custom.anon_form;
  v_s         custom.anon_submission;
  v_hash      text;
  v_unlock    text;
  v_exposed   text[];
  v_required  text[];
  v_missing   text[];
  v_key       text;
  v_doc       jsonb := '{}'::jsonb;
  v_route     jsonb;
  v_score_key text;
  v_held      text;
  v_stood     boolean := false;
begin
  perform custom._write_via_mark('form', true);
  select * into v_f from custom.anon_form where id = p_form_id and deleted_at is null and published_at is not null;
  if not found then
    raise exception 'This form is not available.' using errcode = '23503';
  end if;
  perform custom.assert_store_door(v_f.organization_id, 'custom.form_response_update');
  if coalesce(v_f.presentation ->> 'allow_edit', 'false') <> 'true' then
    raise exception 'This form no longer lets answers be changed.' using errcode = '42501';
  end if;
  v_unlock := nullif(btrim(coalesce(p_payload ->> '_unlock', '')), '');
  p_payload := coalesce(p_payload, '{}'::jsonb) - '_unlock' - '_hidden' - '_visit' - '_time_zone' - '_edit';
  select p.password_hash into v_hash from custom.anon_form_password p where p.form_id = v_f.id;
  if v_hash is not null and (v_unlock is null or v_unlock <> encode(extensions.digest(v_hash, 'sha256'), 'hex')) then
    raise exception 'This form needs its password before it takes an answer.' using errcode = '42501';
  end if;
  if v_f.closed_at is not null then
    submission_id := null; record_id := null; state := 'closed';
    message := 'This form is closed, so its answers can no longer be changed.';
    return next; return;
  end if;
  select * into v_s from custom.anon_submission s
   where s.organization_id = v_f.organization_id and s.form_id = v_f.id and s.deleted_at is null
     and s.state <> 'rejected'
     and p_edit is not null and char_length(btrim(p_edit)) >= 24
     and s.metadata ->> 'edit_hash' = encode(extensions.digest(btrim(p_edit), 'sha256'), 'hex')
   limit 1;
  if not found then
    raise exception 'This link does not open an answer to this form.' using errcode = '42501';
  end if;

  begin
    perform custom.anon_rate_take(v_f.organization_id, v_f.id,
                                  'edit:' || coalesce(nullif(btrim(p_bucket), ''), 'anonymous'), null);
  exception when sqlstate '53400' then
    submission_id := null; record_id := null; state := 'too_many';
    message := 'That is more changes than this form takes in one go. Try again in a little while.';
    return next; return;
  end;

  select coalesce(array_agg(value #>> '{}'), array[]::text[]) into v_exposed
    from jsonb_array_elements(v_f.exposed_field_keys);
  for v_key in select jsonb_object_keys(p_payload) loop
    if not (v_key = any (v_exposed)) then
      raise exception 'This form does not have a field called "%".', v_key
        using errcode = '42501',
              hint = format('It accepts: %s.', coalesce(array_to_string(v_exposed, ', '), '(nothing)'));
    end if;
    -- A DRAWN SIGNATURE IS KEPT AS A FILE when it is first sent; the answer-again link keeps it and
    -- says so rather than storing a drawing as text.
    if jsonb_typeof(p_payload -> v_key) = 'string' and (p_payload ->> v_key) ~ '^data:image/(png|jpeg);base64,' then
      raise exception 'A signature cannot be drawn again through this link, so it was kept as it was sent.' using errcode = '22023';
    end if;
    v_doc := v_doc || jsonb_build_object(v_key, p_payload -> v_key);
  end loop;

  select coalesce(array_agg(value #>> '{}'), array[]::text[]) into v_required
    from jsonb_array_elements(v_f.required_field_keys);
  v_route := custom._form_route(v_f.organization_id,
                                coalesce(v_f.presentation -> 'questions', '[]'::jsonb),
                                coalesce(v_f.presentation -> 'endings', '[]'::jsonb),
                                p_payload);
  select coalesce(array_agg(k), array[]::text[]) into v_missing
    from unnest(v_required) k
   where coalesce(p_payload -> k, 'null'::jsonb) in ('null'::jsonb, '""'::jsonb)
     and not exists (select 1 from jsonb_array_elements(v_route -> 'asks') a
                      where a ->> 'field_key' = k and (a ->> 'asked')::boolean = false);
  if array_length(v_missing, 1) > 0 then
    raise exception 'This form needs %.', array_to_string(v_missing, ', ') using errcode = '22004';
  end if;
  if v_doc = '{}'::jsonb then
    raise exception 'Nothing was changed, because no answer was sent.' using errcode = '22004';
  end if;

  v_score_key := nullif(btrim(coalesce(v_f.presentation ->> 'score_field', '')), '');
  if v_score_key is not null and jsonb_typeof(v_route -> 'score') = 'number'
     and exists (select 1 from custom.record fd
                  where fd.organization_id = v_f.organization_id
                    and fd.table_id = custom.field_kernel_id()
                    and fd.deleted_at is null
                    and (fd.data ->> 'entity_definition_id')::uuid = v_f.table_id
                    and fd.data ->> 'key' = v_score_key) then
    v_doc := v_doc || jsonb_build_object(v_score_key, v_route -> 'score');
  end if;

  if v_s.record_id is not null then
    -- The record the answer became, changed in place through the one write door. With nobody
    -- signed in (a stranger on the link), on behalf of the form's publisher, put back on every path.
    if custom.query_principal() is null and v_f.published_by is not null then
      v_held := current_setting('request.jwt.claims', true);
      perform set_config('request.jwt.claims',
                         jsonb_build_object('sub', v_f.published_by, 'role', 'authenticated')::text, true);
      v_stood := true;
    end if;
    begin
      perform custom.record_update(v_f.organization_id, v_s.record_id, v_doc, null);
    exception
      when sqlstate '02000' then
        if v_stood then perform set_config('request.jwt.claims', coalesce(v_held, ''), true); end if;
        raise exception 'The answer this link opened was removed by the form''s owner, so it cannot be changed.' using errcode = '02000';
      when others then
        if v_stood then perform set_config('request.jwt.claims', coalesce(v_held, ''), true); end if;
        raise;
    end;
    if v_stood then perform set_config('request.jwt.claims', coalesce(v_held, ''), true); end if;
  elsif v_s.state = 'quarantined' then
    -- Not a record yet (it waits for a person): the waiting answer itself is what changes.
    update custom.anon_submission s set payload = s.payload || v_doc
     where s.organization_id = v_f.organization_id and s.id = v_s.id;
  end if;

  update custom.anon_submission s
     set metadata = coalesce(s.metadata, '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
           'edited_at', now(),
           'edits', coalesce((s.metadata ->> 'edits')::integer, 0) + 1,
           'edited_from', p_origin,
           'score', v_route -> 'score')),
         updated_at = now()
   where s.organization_id = v_f.organization_id and s.id = v_s.id;

  submission_id := v_s.id; record_id := v_s.record_id;
  state := 'accepted'; message := null;
  return next;
end;
$fn$;

comment on function custom.form_response_update(uuid, text, text, jsonb, text) is
  'FORM-EXTRAS (CD-PAGE-08): a respondent changes their own answer to a published form, by the answer-again secret their edit link holds, while presentation.allow_edit is true and the form is open. The same judgement as custom.form_submit (exposed keys refused by name, required-when-asked, the score into presentation.score_field), then the record the answer became is changed through custom.record_update on behalf of the form''s publisher, marked as coming through a form; an answer still waiting for a person changes in place. Rate-limited on its own edit: bucket. server_only.';

-- ─────────────────────────────────────────────────────────────────────────────────────────
-- 6. THE DOOR ROWS (declaration first; the grants below come after, in this same file).
-- ─────────────────────────────────────────────────────────────────────────────────────────

insert into platform.client_callable_door
  (schema_name, function_name, identity_args, identity_argtypes, reason, declared_by,
   non_client_lane, signed_in_callers, anonymous_callers, argument_rules)
values
  ('custom', 'form_set_password', 'p_organization_id uuid, p_form_id uuid, p_password text',
   array['uuid'::regtype, 'uuid'::regtype, 'text'::regtype]::oid[],
   'The owner''s side of a form''s password. custom.assert_store_door first, then admin on the form''s table (custom.assert_client_may_change), the rung custom.form_declare asks for. The form is matched in p_organization_id only. Writes only custom.anon_form_password, and only a bcrypt hash.',
   'formx_a_a_form_can_be_locked_answered_again_and_keeps_its_score.sql', null, true, false,
   jsonb_build_object('version', '1', 'arguments', jsonb_build_object(
     'p_organization_id', jsonb_build_object('foreign', jsonb_build_object('bounded', true,
       'note', 'custom.assert_store_door decides it first; the form is matched in this organization only.')),
     'p_form_id', jsonb_build_object('foreign', jsonb_build_object('bounded', true,
       'note', 'Matched only with organization_id = p_organization_id (another organization''s form reads as absent, 02000); admin on its table decides the change.'))))),
  ('custom', 'form_unlock', 'p_form_id uuid, p_password text, p_unlock text',
   array['uuid'::regtype, 'text'::regtype, 'text'::regtype]::oid[],
   'It takes NO organization id: the published form id is the capability, exactly as custom.form_public. It reads only custom.anon_form and custom.anon_form_password and answers open, open with the fingerprint, or locked; missing and unpublished forms answer null.',
   'formx_a_a_form_can_be_locked_answered_again_and_keeps_its_score.sql',
   'server_only: the public form page is server-rendered and checks the password through the app''s own route handler, which turns the fingerprint into a signed cookie. Schema custom stays revoked from anon; granted to the server lane alone, the same posture as custom.form_public.',
   false, false, null),
  ('custom', 'form_response_read', 'p_form_id uuid, p_edit text, p_unlock text',
   array['uuid'::regtype, 'text'::regtype, 'text'::regtype]::oid[],
   'It takes NO organization id: the published form id and the answer-again secret only the respondent holds are the capability (matched on its sha256). It reads one submission of that form and the record it became, narrowed to the form''s exposed keys.',
   'formx_a_a_form_can_be_locked_answered_again_and_keeps_its_score.sql',
   'server_only: reached through the app''s own public form page. Schema custom stays revoked from anon; granted to the server lane alone, the same posture as custom.form_draft_read.',
   false, false, null),
  ('custom', 'form_response_update', 'p_form_id uuid, p_edit text, p_origin text, p_payload jsonb, p_bucket text',
   array['uuid'::regtype, 'text'::regtype, 'text'::regtype, 'jsonb'::regtype, 'text'::regtype]::oid[],
   'It takes NO organization id: the published form id and the answer-again secret only the respondent holds are the capability. Keys the form does not expose are refused by name; required-when-asked is the store''s route; the record is changed through custom.record_update on behalf of the form''s publisher.',
   'formx_a_a_form_can_be_locked_answered_again_and_keeps_its_score.sql',
   'server_only: reached through the app''s own route handler, which alone knows the request''s real origin and client address (the rate bucket). Schema custom stays revoked from anon; granted to the server lane alone, the same posture as custom.form_submit.',
   false, false, null)
on conflict do nothing;

-- ─────────────────────────────────────────────────────────────────────────────────────────
-- 7. THE GRANTS — exactly these four, after their declarations. anon gains nothing (PUBLIC's default
--    EXECUTE is cleared at birth by the definer guard).
-- ─────────────────────────────────────────────────────────────────────────────────────────

grant execute on function custom.form_set_password(uuid, uuid, text) to authenticated;
grant execute on function custom.form_unlock(uuid, text, text) to service_role;
grant execute on function custom.form_response_read(uuid, text, text) to service_role;
grant execute on function custom.form_response_update(uuid, text, text, jsonb, text) to service_role;

-- ─────────────────────────────────────────────────────────────────────────────────────────
-- 8. custom.form_submit, the live body with the FORM-EXTRAS blocks added (password, the
--    answer-again hash, the score's column).
-- ─────────────────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION custom.form_submit(p_form_id uuid, p_origin text, p_payload jsonb, p_bucket text, p_honeypot text DEFAULT NULL::text, p_client_key text DEFAULT NULL::text)
 RETURNS TABLE(submission_id uuid, record_id uuid, state text, message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_f        custom.anon_form;
  v_count    bigint;
  v_exposed  text[];
  v_required text[];
  v_missing  text[];
  v_key      text;
  v_doc      jsonb := '{}'::jsonb;
  v_existing uuid;
  v_id       uuid;
  v_rec      uuid;
  v_file     uuid;
  v_sigs     jsonb := '{}'::jsonb;
  v_held     text;
  v_stood    boolean := false;
  v_hidden   jsonb := '{}'::jsonb;
  v_visit    text;
  v_route    jsonb;
  v_hk       text;
  v_tzr      text;
  v_unlock   text;   -- FORM-EXTRAS: the fingerprint of the form's password the server's signed cookie carries
  v_edit     text;   -- FORM-EXTRAS: the respondent's answer-again secret, minted by the app's server
  v_pw       text;
  v_score_key text;
begin
  perform custom._write_via_mark('form', true);  -- CHAIR-DOORS-4: the change event says it came through a form door (a booking confirming through here keeps its word)
  if p_form_id is null then
    raise exception 'This form is not available.' using errcode = '23503';
  end if;
  select * into v_f from custom.anon_form where id = p_form_id and deleted_at is null;
  if not found then
    raise exception 'This form is not available.'
      using errcode = '23503',
            hint = 'The link names no form. It may have been mistyped, or the form may have been taken down.';
  end if;
  perform custom.assert_store_door(v_f.organization_id, 'custom.form_submit');

  -- TYPEFORM-DUP: TWO RESERVED KEYS RIDE BESIDE THE ANSWERS and are lifted out before anything
  -- judges the answers. `_hidden` is the form's hidden fields as the link carried them (utm_source,
  -- ref, …): narrowed to the names the form declares (presentation.hidden_fields), each a short
  -- string, kept on the submission and never a question. `_visit` is the page's per-visit key, so
  -- the visit that sent this is counted complete.
  if jsonb_typeof(p_payload -> '_hidden') = 'object' then
    for v_hk in select jsonb_array_elements_text(coalesce(v_f.presentation -> 'hidden_fields', '[]'::jsonb)) loop
      if jsonb_typeof(p_payload #> array['_hidden', v_hk]) in ('string', 'number', 'boolean')
         and btrim(p_payload #>> array['_hidden', v_hk]) <> '' then
        v_hidden := v_hidden || jsonb_build_object(v_hk, left(p_payload #>> array['_hidden', v_hk], 500));
      end if;
    end loop;
  end if;
  v_visit := nullif(btrim(coalesce(p_payload ->> '_visit', '')), '');
  v_tzr := nullif(btrim(coalesce(p_payload ->> '_time_zone', '')), '');
  if v_tzr is not null and not exists (select 1 from pg_catalog.pg_timezone_names z where z.name = v_tzr) then v_tzr := null; end if;
  -- FORM-EXTRAS: two more reserved keys. `_unlock` proves the sender passed the form's password;
  -- `_edit` is the secret the app's server minted for the respondent's answer-again link.
  v_unlock := nullif(btrim(coalesce(p_payload ->> '_unlock', '')), '');
  v_edit := nullif(btrim(coalesce(p_payload ->> '_edit', '')), '');
  p_payload := coalesce(p_payload, '{}'::jsonb) - '_hidden' - '_visit' - '_time_zone' - '_unlock' - '_edit';

  -- CLOSED BY DEFAULT, the same three words custom.anon_write says.
  if v_f.published_at is null then
    raise exception 'This form is not accepting responses.'
      using errcode = '42501',
            hint = 'It exists but has never been published. Whoever owns it publishes it; until then nothing can be submitted, which is the point of the default.';
  end if;
  if v_f.closed_at is not null then
    submission_id := null; record_id := null; state := 'closed';
    message := 'This form is closed, so it is not taking any more answers.';
    return next; return;
  end if;

  -- FORM-EXTRAS: A FORM WITH A PASSWORD TAKES AN ANSWER ONLY FROM SOMEBODY WHO TYPED IT. The page
  -- withholds the questions until the password is right (custom.form_unlock); this is the other
  -- half, so a hand-written POST to the link cannot answer around it.
  select p.password_hash into v_pw from custom.anon_form_password p where p.form_id = v_f.id;
  if v_pw is not null and (v_unlock is null or v_unlock <> encode(extensions.digest(v_pw, 'sha256'), 'hex')) then
    raise exception 'This form needs its password before it takes an answer.'
      using errcode = '42501',
            hint = 'Open the form''s link and type the password its owner gave you.';
  end if;

  -- THE DECOY, ANSWERED FIRST AND ANSWERED CHEERFULLY. See this file's header, decision 5.
  if v_f.honeypot_key is not null and coalesce(btrim(p_honeypot), '') <> '' then
    insert into custom.anon_submission (organization_id, form_id, table_id, source, payload,
                                        raw_payload, client_key, state, remote_origin,
                                        rejection_reason)
    values (v_f.organization_id, v_f.id, v_f.table_id, 'form', '{}'::jsonb,
            jsonb_build_object('form_id', v_f.id, 'at', now(), 'origin', p_origin,
                               'honeypot', true),
            p_client_key, 'rejected', p_origin,
            format('The decoy field "%s" was filled in, which a person answering this form never does. Nothing was written and the sender was shown the thank-you screen.',
                   v_f.honeypot_key))
    returning id into v_id;
    submission_id := v_id; record_id := null; state := 'accepted';
    message := null; return next; return;
  end if;

  -- IDEMPOTENCY BEFORE RATE, so a replay costs no budget and makes no second row.
  if p_client_key is not null then
    select s.id, s.record_id into v_existing, v_rec from custom.anon_submission s
     where s.organization_id = v_f.organization_id and s.form_id = v_f.id
       and s.client_key = p_client_key;
    if v_existing is not null then
      submission_id := v_existing; record_id := v_rec; state := 'accepted';
      message := 'This answer had already arrived, so it was not written twice.';
      return next; return;
    end if;
  end if;

  select count(*) into v_count from custom.anon_submission s
   where s.organization_id = v_f.organization_id and s.form_id = v_f.id and s.state <> 'rejected';
  if v_f.submission_cap is not null and v_count >= v_f.submission_cap then
    submission_id := null; record_id := null; state := 'full';
    message := 'This form has all the answers it was set up to take.';
    return next; return;
  end if;

  -- THE RATE LIMIT, on the bucket the SERVER chose (a coarse client identifier). A
  -- browser choosing its own bucket would be counting itself.
  begin
    perform custom.anon_rate_take(v_f.organization_id, v_f.id,
                                  coalesce(nullif(btrim(p_bucket), ''), 'anonymous'), null);
  exception when sqlstate '53400' then
    submission_id := null; record_id := null; state := 'too_many';
    message := 'That is more answers than this form takes in one go. Try again in a little while.';
    return next; return;
  end;

  -- SCOPE. A key the form does not ask for is refused BY NAME, never trimmed in silence.
  select coalesce(array_agg(value #>> '{}'), array[]::text[]) into v_exposed
    from jsonb_array_elements(v_f.exposed_field_keys);
  for v_key in select jsonb_object_keys(coalesce(p_payload, '{}'::jsonb)) loop
    if not (v_key = any (v_exposed)) then
      raise exception 'This form does not have a field called "%".', v_key
        using errcode = '42501',
              hint = format('It accepts: %s.', coalesce(array_to_string(v_exposed, ', '), '(nothing)'));
    end if;
    v_doc := v_doc || jsonb_build_object(v_key, p_payload -> v_key);
  end loop;

  select coalesce(array_agg(value #>> '{}'), array[]::text[]) into v_required
    from jsonb_array_elements(v_f.required_field_keys);
  -- TYPEFORM-DUP: REQUIRED MEANS REQUIRED WHEN ASKED. The route (custom._form_route — showIf and
  -- logic jumps) says which questions this person was asked; a required question their answers
  -- jumped past, or hid, is not missing. The route also names the ending and the score.
  v_route := custom._form_route(v_f.organization_id,
                                coalesce(v_f.presentation -> 'questions', '[]'::jsonb),
                                coalesce(v_f.presentation -> 'endings', '[]'::jsonb),
                                p_payload);
  select coalesce(array_agg(k), array[]::text[]) into v_missing
    from unnest(v_required) k
   where coalesce(p_payload -> k, 'null'::jsonb) in ('null'::jsonb, '""'::jsonb)
     and not exists (select 1 from jsonb_array_elements(v_route -> 'asks') a
                      where a ->> 'field_key' = k and (a ->> 'asked')::boolean = false);
  if array_length(v_missing, 1) > 0 then
    raise exception 'This form needs %.', array_to_string(v_missing, ', ')
      using errcode = '22004',
            hint = 'Each missing field is named so the screen can point at it, rather than showing one error beside a form with twenty questions.';
  end if;

  -- A DRAWN SIGNATURE IS A FILE (lane VIEWS-AND-FIELDS; CHAIR-DOORS-1, 2026-10-02), exactly as
  -- custom.sign_request_sign keeps one: a File record (REC-27) holding the drawing, in the form's
  -- organization, and the Value's envelope naming it as `signature_file_id`. The Value itself is the
  -- word "Signed" — a drawn form signature carries no typed name, and the drawing is not copied into
  -- the record. Only an answer to a Signature column (custom.doc_signature_field_ok) that is a drawing
  -- (the same data: URL shape sign_request_sign accepts) is turned into a File; every other answer
  -- passes unchanged. The File is written on behalf of the form's publisher when nobody is signed in
  -- (a stranger on the public form), the same stand-in custom.anon_clear takes, put back on every path.
  for v_key in select k from jsonb_object_keys(v_doc) k loop
    continue when jsonb_typeof(v_doc -> v_key) <> 'string'
               or (v_doc ->> v_key) !~ '^data:image/(png|jpeg);base64,[A-Za-z0-9+/=]{64,}$';
    continue when not exists (
      select 1 from custom.record fd
       where fd.organization_id = v_f.organization_id
         and fd.table_id = custom.field_kernel_id()
         and fd.deleted_at is null
         and (fd.data ->> 'entity_definition_id')::uuid = v_f.table_id
         and fd.data ->> 'key' = v_key
         and custom.doc_signature_field_ok(fd.data));
    if not v_stood and custom.query_principal() is null and v_f.published_by is not null then
      v_held := current_setting('request.jwt.claims', true);
      perform set_config('request.jwt.claims',
                         jsonb_build_object('sub', v_f.published_by, 'role', 'authenticated')::text, true);
      v_stood := true;
    end if;
    begin
      insert into custom.record (organization_id, table_id, data_class, data)
      values (v_f.organization_id, custom.file_kernel_id(), 'record', jsonb_build_object(
        'name',      format('Signature on %s', coalesce(nullif(btrim(v_f.title), ''), 'a form')),
        'mime_type', split_part(split_part(v_doc ->> v_key, ';', 1), ':', 2),
        'content',   v_doc ->> v_key,
        'byte_size', length(v_doc ->> v_key),
        'kind',      'signature'))
      returning id into v_file;
    exception when others then
      if v_stood then
        perform set_config('request.jwt.claims', coalesce(v_held, ''), true);
      end if;
      raise;
    end;
    v_sigs := v_sigs || jsonb_build_object(v_key, jsonb_build_object('src', jsonb_build_object(
      'kind', 'signature', 'mark', 'drawn', 'signature_file_id', v_file,
      'signed_at', now(), 'via', 'form', 'form_id', v_f.id)));
    v_doc := v_doc || jsonb_build_object(v_key, 'Signed');
  end loop;
  if v_stood then
    perform set_config('request.jwt.claims', coalesce(v_held, ''), true);
  end if;
  if v_sigs <> '{}'::jsonb then
    v_doc := v_doc || jsonb_build_object('_values', v_sigs);
  end if;

  -- FORM-EXTRAS: A CALCULATED SCORE LANDS ON THE ROW. When the form names one of its table's own
  -- columns as the score's home (presentation.score_field), the score the route worked out from the
  -- answers' points is written there, so the row says it without anybody adding it up.
  v_score_key := nullif(btrim(coalesce(v_f.presentation ->> 'score_field', '')), '');
  if v_score_key is not null and jsonb_typeof(v_route -> 'score') = 'number'
     and exists (select 1 from custom.record fd
                  where fd.organization_id = v_f.organization_id
                    and fd.table_id = custom.field_kernel_id()
                    and fd.deleted_at is null
                    and (fd.data ->> 'entity_definition_id')::uuid = v_f.table_id
                    and fd.data ->> 'key' = v_score_key) then
    v_doc := v_doc || jsonb_build_object(v_score_key, v_route -> 'score');
  end if;

  -- QUARANTINE. `custom.record` is not touched here, and the provenance travels with the
  -- submission so the record made from it can always say where it came from.
  insert into custom.anon_submission (organization_id, form_id, table_id, source, payload,
                                      raw_payload, client_key, state, remote_origin, metadata)
  values (v_f.organization_id, v_f.id, v_f.table_id, 'form', v_doc,
          jsonb_build_object('form_id', v_f.id, 'form_slug', v_f.slug,
                             'form_version', v_f.version, 'at', now(),
                             'origin', p_origin, 'via', 'form'),
          p_client_key, 'quarantined', p_origin,
          -- TYPEFORM-DUP: the hidden fields, the ending reached and the score, on the submission.
          jsonb_strip_nulls(jsonb_build_object(
            'hidden', case when v_hidden = '{}'::jsonb then null else v_hidden end,
            'respondent_time_zone', v_tzr,
            'ending', v_route ->> 'ending',
            'score', v_route -> 'score',
            -- FORM-EXTRAS: only the hash of the answer-again secret, and only while the form allows it.
            'edit_hash', case when coalesce(v_f.presentation ->> 'allow_edit', 'false') = 'true'
                                   and v_edit is not null and char_length(v_edit) between 24 and 200
                              then encode(extensions.digest(v_edit, 'sha256'), 'hex') end)))
  returning id into v_id;

  -- TYPEFORM-DUP: the visit that sent this is complete (custom.form_results counts it).
  if v_visit is not null then
    update custom.anon_form_visit
       set completed_at = now(), submission_id = v_id, started_at = coalesce(started_at, now()), updated_at = now()
     where form_id = v_f.id and organization_id = v_f.organization_id
       and visit_hash = encode(extensions.digest(v_visit, 'sha256'), 'hex')
       and completed_at is null;
  end if;

  if p_client_key is not null then
    insert into custom.anon_replay (organization_id, client_key, table_id, submission_id, captured_at)
    values (v_f.organization_id, p_client_key, v_f.table_id, v_id, now())
    on conflict (organization_id, client_key) where deleted_at is null do nothing;
  end if;

  -- S7': THE STRANGER'S SAVED PLACE IS USED UP BY THE ANSWER IT BECAME. When the page saved
  -- progress for this person it sends that saved place's key as the client key, so the one
  -- send that turns the answers into a submission also marks the saved place sent, in this
  -- same transaction. Its answers are emptied — they live in the submission now, and a second
  -- copy of somebody's intake answers kept for a month would be a copy nobody asked for.
  if p_client_key is not null then
    update custom.anon_form_draft d
       set submitted_at = now(), submission_id = v_id, answers = '{}'::jsonb
     where d.organization_id = v_f.organization_id
       and d.form_id = v_f.id
       and d.secret_hash = encode(extensions.digest(p_client_key, 'sha256'), 'hex')
       and d.submitted_at is null
       and d.deleted_at is null;
  end if;

  -- THE ACCEPT RULE. With one, the answer becomes a record now; with none, it waits for a
  -- person and this function SAYS SO instead of implying it landed.
  if v_f.quarantine_rule_id is not null then
    v_rec := custom.anon_clear(v_f.organization_id, v_id);
  end if;

  if v_rec is not null then
    perform custom.form_notify(v_f.organization_id, v_f.id, v_rec, v_id);
    submission_id := v_id; record_id := v_rec; state := 'accepted'; message := null;
  elsif v_f.quarantine_rule_id is null then
    submission_id := v_id; record_id := null; state := 'held';
    message := 'Your answer arrived and is waiting for someone to look at it.';
  else
    select s.rejection_reason into message from custom.anon_submission s
     where s.organization_id = v_f.organization_id and s.id = v_id;
    submission_id := v_id; record_id := null; state := 'held';
    message := coalesce(message, 'Your answer arrived and is waiting for someone to look at it.');
  end if;
  return next;
end;
$function$;
