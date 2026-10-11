-- chair-step: the REVOKEs take the signed-copy door and the access-code hash column away from every client role, as the owner's "cannot be messed with" ruling and the final adversarial review (C1, Minor 4) require; everything else is additive (guards) or a surgical replace guarded by based-on.
-- THE EVIDENCE CANNOT BE SWAPPED (owner ruling 2026-10-10; final adversarial review C1 + Minor 1–4).
--
-- C1. After completion the sender could repoint `envelope_document.metadata.signed_copy_file_id` (a PATCH,
-- or the PUBLIC, SECURITY INVOKER `esign.record_signed_copy`) and every party downloaded another file as
-- "final (signed).pdf" while verify said intact. Its siblings: a client could INSERT a `signed_copy_made`,
-- `certificate_rendered` or even a `signed` event (finalize_inputs read the LATEST `certificate_rendered`
-- and the latest `signed` per signer), or a certificate row with an empty signature (verify reads an empty
-- signature as "not checked", never as false).
--   * the signed copy is recorded ONCE, by the finalize path only: file id + pinned file version + sha256,
--     cross-checked against the file version's own checksum; a second, different copy is refused by name;
--   * a sent document's metadata never moves for a client, and nobody — door flag or not — changes or
--     removes a recorded evidence key (signed_copy_file_id / _file_version / _sha256) (`_zz_guard_document_evidence`, the lock lane's deny-by-default family);
--   * no client role inserts an evidence event or a certificate (`_zz_guard_evidence_insert`); the doors
--     (SECURITY DEFINER, owner) still do;
--   * the certificate's rendered file is recorded ONCE with its version and sha256; finalize_inputs reads
--     the FIRST record, never the latest.
--   The server reads the pinned version and refuses to serve bytes whose sha256 is not the recorded one
--   (aidream services/esign/signed_copy.py, downloads.py, envelopes.verify).
-- Minor 1. Whitespace is not a value for a required field.
-- Minor 2. Wrong access codes are counted under a row lock (SELECT … FOR UPDATE): a burst cannot buy more.
-- Minor 3. An expired lock starts the count again; one typo after a lockout does not re-lock.
-- Minor 4. The access code hash is bcrypt (salted per set, re-hashed on every set); no client reads the column.
--
-- based-on: esign.record_signed_copy(uuid, uuid) d69117e87c147a2e58ebc6a3fc90781d921ee5b8dc996dc68432db9f48ce3e66
-- based-on: esign.record_signed_copy_made(uuid, uuid, text) ae75f0369ace7607663131736c0fdbd282654ed1a5a3cda14f9eb530c769057e
-- based-on: esign.record_certificate_file(uuid, uuid) 8e3658b99ba87c824440fb06872a67152463686161c3ed54297650a476667069
-- based-on: esign.finalize_inputs(uuid) 6c945eb53a4f8d83a11cc39b1f66de4c6fece5ea12cadd3b6a78b651f2c4e670
-- based-on: esign.signed_copy_inputs(uuid) 4667a58e2558807ca0e30c4acdb829bb27dd25e6b8e9992a47efe4fdad2793a6
-- based-on: esign._missing_required(uuid, jsonb) acd9b32d0fc8d53cfa58d1be905b99d5193a996c7f0b2572ac0c31fa5d48f342
-- based-on: public.outsider_verify(text, text, inet) 53227ba3ce0bfc2a1a5b32fa724a99eef1bd509f84f2e154140bce4639e9373b
-- based-on: esign.esign_draft_set_access_code(uuid, text, text) 4ebc80dee5cbd3ac6126b0a5602108bde7212ac99c2ea9e3602d72e54137f56a

-- ─── the file version a file id names right now, and that version's own checksum ─────────────────────
create function esign._file_pin(p_file_id uuid) returns jsonb
language sql stable security definer set search_path to ''
as $$
  select jsonb_build_object('version', coalesce(v.version_number, f.current_version, 1),
                            'checksum', lower(coalesce(v.checksum, f.checksum)))
    from files.files f
    left join files.file_versions v on v.file_id = f.id and v.version_number = f.current_version
   where f.id = p_file_id
$$;
revoke execute on function esign._file_pin(uuid) from public, anon, authenticated, authenticator;

-- ─── C1: the signed copy is recorded once, by the finalize path only ────────────────────────────────
drop function esign.record_signed_copy(uuid, uuid);
create function esign.record_signed_copy(p_document_id uuid, p_file_id uuid, p_file_version integer, p_sha256 text)
returns boolean
language plpgsql security definer set search_path to ''
as $$
begin
  -- Set once: the evidence guard refuses any change to a recorded key, for every caller.
  update esign.envelope_document
     set metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
           'signed_copy_file_id', p_file_id, 'signed_copy_file_version', p_file_version,
           'signed_copy_sha256', lower(p_sha256))
   where id = p_document_id;
  return found;
end $$;
revoke execute on function esign.record_signed_copy(uuid, uuid, integer, text) from public, anon, authenticated, authenticator;
grant execute on function esign.record_signed_copy(uuid, uuid, integer, text) to service_role;

create or replace function esign.record_signed_copy_made(p_document_id uuid, p_file_id uuid, p_sha256 text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'esign', 'public'
as $function$
declare d esign.envelope_document%rowtype; v_status text; v_pin jsonb; v_sha text := lower(nullif(btrim(p_sha256), ''));
begin
  select * into d from esign.envelope_document where id = p_document_id;
  if not found then return jsonb_build_object('granted', false, 'reason', 'unknown_document'); end if;
  select status into v_status from esign.envelope where id = d.envelope_id;
  if v_status is distinct from 'completed' then
    return jsonb_build_object('granted', false, 'reason', 'not_completed');
  end if;
  if d.metadata ? 'signed_copy_file_id' then
    -- Recorded once. The same copy again is a no-op; a different one is never accepted.
    if d.metadata ->> 'signed_copy_file_id' = p_file_id::text then
      return jsonb_build_object('granted', true, 'already_recorded', true);
    end if;
    return jsonb_build_object('granted', false, 'reason', 'signed_copy_already_recorded',
                              'recorded_file_id', d.metadata ->> 'signed_copy_file_id');
  end if;
  v_pin := esign._file_pin(p_file_id);
  if v_pin is null then return jsonb_build_object('granted', false, 'reason', 'unknown_file'); end if;
  if v_sha is null or v_sha !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('granted', false, 'reason', 'signed_copy_hash_missing');
  end if;
  if (v_pin ->> 'checksum') is not null and (v_pin ->> 'checksum') <> v_sha then
    return jsonb_build_object('granted', false, 'reason', 'signed_copy_hash_mismatch',
                              'file_checksum', v_pin ->> 'checksum', 'given', v_sha);
  end if;
  perform esign.record_signed_copy(p_document_id, p_file_id, (v_pin ->> 'version')::int, v_sha);
  if not exists (select 1 from esign.envelope_event where document_id = p_document_id and event_type = 'signed_copy_made') then
    perform esign._event(d.envelope_id, 'signed_copy_made', 'automation', p_document_id => p_document_id,
                         p_payload => jsonb_build_object('file_id', p_file_id, 'file_version', (v_pin ->> 'version')::int,
                                                         'sha256', v_sha));
  end if;
  return jsonb_build_object('granted', true);
end $function$;

-- ─── C1: a sent document's metadata never moves for a client; a recorded evidence key never moves ────
create function esign._guard_document_evidence() returns trigger
language plpgsql set search_path to ''
as $$
declare k text; v_sent boolean;
begin
  if new.metadata is not distinct from old.metadata then return new; end if;
  foreach k in array array['signed_copy_file_id', 'signed_copy_file_version', 'signed_copy_sha256'] loop
    if coalesce(old.metadata, '{}'::jsonb) ? k and (new.metadata -> k) is distinct from (old.metadata -> k) then
      raise exception 'esign: evidence_frozen — the recorded signed copy (%) never changes. Void the envelope and send a corrected copy.', k
        using errcode = '42501', hint = 'evidence_frozen',
              detail = jsonb_build_object('document_id', old.id, 'key', k)::text;
    end if;
  end loop;
  select e.status <> 'draft' into v_sent from esign.envelope e where e.id = old.envelope_id;
  if old.is_frozen or coalesce(v_sent, false) then
    if not esign._privileged() then
      raise exception 'esign: evidence_frozen — a sent document''s record is sealed.'
        using errcode = '42501', hint = 'evidence_frozen',
              detail = jsonb_build_object('document_id', old.id)::text;
    end if;
  end if;
  return new;
end $$;
revoke execute on function esign._guard_document_evidence() from public, anon, authenticated, authenticator;
create trigger _zz_guard_document_evidence before update on esign.envelope_document
  for each row execute function esign._guard_document_evidence();

-- ─── C1 siblings: evidence events and certificates are written by the doors only ─────────────────────
create function esign._guard_evidence_insert() returns trigger
language plpgsql set search_path to ''
as $$
begin
  if esign._privileged() then return new; end if;
  raise exception 'esign: evidence_written_by_doors — % rows are written by the e-sign doors, never directly.', tg_table_name
    using errcode = '42501', hint = 'evidence_written_by_doors',
          detail = jsonb_build_object('table', tg_table_name, 'envelope_id', new.envelope_id)::text;
end $$;
revoke execute on function esign._guard_evidence_insert() from public, anon, authenticated, authenticator;
create trigger _zz_guard_evidence_insert before insert on esign.envelope_event
  for each row execute function esign._guard_evidence_insert();
create trigger _zz_guard_evidence_insert before insert on esign.envelope_certificate
  for each row execute function esign._guard_evidence_insert();

-- ─── C1 sibling: the certificate PDF is recorded once, pinned and hashed ─────────────────────────────
drop function esign.record_certificate_file(uuid, uuid);
create function esign.record_certificate_file(p_certificate_id uuid, p_file_id uuid, p_sha256 text default null)
returns jsonb
language plpgsql security definer set search_path to 'esign', 'public'
as $$
declare c esign.envelope_certificate%rowtype; v_prior jsonb; v_pin jsonb; v_sha text := lower(nullif(btrim(p_sha256), ''));
begin
  select * into c from esign.envelope_certificate where id = p_certificate_id;
  if not found then return jsonb_build_object('granted', false, 'reason', 'unknown_certificate'); end if;
  select v.payload into v_prior from esign.envelope_event v
   where v.envelope_id = c.envelope_id and v.event_type = 'certificate_rendered' order by v.occurred_at, v.id limit 1;
  if v_prior is not null then
    if v_prior ->> 'file_id' = p_file_id::text then return jsonb_build_object('granted', true, 'already_recorded', true); end if;
    return jsonb_build_object('granted', false, 'reason', 'certificate_already_rendered', 'recorded_file_id', v_prior ->> 'file_id');
  end if;
  v_pin := esign._file_pin(p_file_id);
  if v_pin is null then return jsonb_build_object('granted', false, 'reason', 'unknown_file'); end if;
  v_sha := coalesce(v_sha, v_pin ->> 'checksum');
  if v_sha is null or v_sha !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('granted', false, 'reason', 'certificate_hash_missing');
  end if;
  if (v_pin ->> 'checksum') is not null and (v_pin ->> 'checksum') <> v_sha then
    return jsonb_build_object('granted', false, 'reason', 'certificate_hash_mismatch');
  end if;
  perform esign._event(c.envelope_id, 'certificate_rendered', 'automation',
                       p_payload => jsonb_build_object('certificate_id', c.id, 'file_id', p_file_id,
                                                       'file_version', (v_pin ->> 'version')::int, 'sha256', v_sha,
                                                       'payload_hash', c.payload_hash));
  return jsonb_build_object('granted', true);
end $$;
revoke execute on function esign.record_certificate_file(uuid, uuid, text) from public, anon, authenticated, authenticator;
grant execute on function esign.record_certificate_file(uuid, uuid, text) to service_role;

create or replace function esign.finalize_inputs(p_envelope_id uuid)
 returns jsonb
 language sql
 stable security definer
 set search_path to ''
as $function$
  select jsonb_build_object(
    'envelope_id', e.id, 'status', e.status, 'title', e.title, 'organization_id', e.organization_id,
    'owner_id', e.created_by, 'completed_at', e.completed_at, 'config_snapshot', e.config_snapshot,
    'certificate', (select jsonb_build_object('id', c.id, 'payload', c.payload, 'payload_hash', c.payload_hash,
                                              'signature', c.signature, 'key_id', c.key_id,
                                              -- the FIRST record of the rendered PDF: recorded once, never repointed
                                              'rendered_file_id', coalesce(c.rendered_file_id, (r.payload ->> 'file_id')::uuid),
                                              'rendered_file_version', (r.payload ->> 'file_version')::int,
                                              'rendered_sha256', r.payload ->> 'sha256',
                                              'generated_at', c.generated_at)
                      from esign.envelope_certificate c
                      left join lateral (select v.payload from esign.envelope_event v
                                          where v.envelope_id = e.id and v.event_type = 'certificate_rendered'
                                          order by v.occurred_at, v.id limit 1) r on true
                     where c.envelope_id = e.id),
    'signed', coalesce((select jsonb_object_agg(x.signer_id, x.ev) from (
        select distinct on (v.signer_id) v.signer_id, jsonb_build_object('payload', v.payload, 'occurred_at', v.occurred_at) ev
          from esign.envelope_event v where v.envelope_id = e.id and v.event_type = 'signed'
         order by v.signer_id, v.occurred_at desc) x), '{}'::jsonb),
    'recipients', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'full_name', s.full_name, 'email', s.email,
                                       'role', s.role, 'status', s.status, 'color_index', s.color_index)
                                       order by s.position, s.created_at)
                              from esign.envelope_signer s where s.envelope_id = e.id), '[]'::jsonb))
  from esign.envelope e where e.id = p_envelope_id
$function$;

create or replace function esign.signed_copy_inputs(p_envelope_id uuid)
 returns jsonb
 language sql
 stable
 set search_path to ''
as $function$
  select jsonb_build_object(
    'envelope_id', e.id, 'status', e.status, 'title', e.title,
    'organization_id', e.organization_id, 'owner_id', e.created_by, 'completed_at', e.completed_at,
    'documents', coalesce((select jsonb_agg(jsonb_build_object(
        'id', d.id, 'name', d.name, 'position', d.position,
        'content_file_id', d.content_file_id, 'content_file_version', d.content_file_version,
        'content_hash', d.content_hash, 'field_map', d.field_map,
        'signed_copy_file_id', d.metadata ->> 'signed_copy_file_id',
        'signed_copy_file_version', (d.metadata ->> 'signed_copy_file_version')::int,
        -- the ledger's record (append-only, the FIRST one) is what served bytes must hash to
        'signed_copy_sha256', coalesce((select v.payload ->> 'sha256' from esign.envelope_event v
                                         where v.document_id = d.id and v.event_type = 'signed_copy_made'
                                         order by v.occurred_at, v.id limit 1), d.metadata ->> 'signed_copy_sha256'))
        order by d.position)
      from esign.envelope_document d where d.envelope_id = e.id), '[]'::jsonb),
    'signers', coalesce((select jsonb_agg(jsonb_build_object(
        'id', s.id, 'full_name', s.full_name, 'email', s.email, 'status', s.status,
        'signature_kind', s.signature_kind, 'typed_name', s.typed_name, 'typed_style', s.typed_style,
        'signature_image_file_id', s.signature_image_file_id, 'signed_at', s.signed_at,
        'time_zone', s.metadata ->> 'time_zone') order by s.position)
      from esign.envelope_signer s where s.envelope_id = e.id), '[]'::jsonb))
  from esign.envelope e where e.id = p_envelope_id
$function$;

-- ─── Minor 1: whitespace is not a value ─────────────────────────────────────────────────────────────
create or replace function esign._missing_required(p_signer_id uuid, p_resolved jsonb)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to 'esign', 'public'
as $function$
-- §2.3 step 3: required fields and groups with no value ([field_id | 'group:<id>']).
declare f jsonb; g jsonb; v jsonb; v_missing jsonb := '[]'::jsonb; v_fields jsonb; v_cnt int;
begin
  v_fields := esign._my_fields(p_signer_id);
  for f in select * from jsonb_array_elements(v_fields) loop
    continue when nullif(f ->> 'group_id', '') is not null;
    continue when (f ->> 'kind') = 'date_signed';
    -- v1 maps: signature/initials are proven by the adopted mark, never a value.
    continue when (f ->> 'schema_version')::int = 1 and (f ->> 'kind') in ('signature','initials');
    continue when (f ->> 'schema_version')::int >= 2 and not coalesce((f ->> 'required')::boolean,
                                                                       (f ->> 'kind') <> 'checkbox');
    v := p_resolved -> (f ->> 'id');
    -- A value of only spaces, tabs or line breaks is no value (the signer UI trims the same way).
    if v is null or v = 'null'::jsonb or v = 'false'::jsonb
       or (jsonb_typeof(v) = 'string' and btrim(v #>> '{}', E' \t\n\r\f\v') = '') then
      v_missing := v_missing || to_jsonb(f ->> 'id');
    end if;
  end loop;
  for g in select * from jsonb_array_elements(esign._my_groups(p_signer_id)) loop
    select count(*) into v_cnt from jsonb_array_elements(v_fields) x
     where x ->> 'group_id' = g ->> 'id' and (p_resolved -> (x ->> 'id')) = 'true'::jsonb;
    if (g ->> 'kind') = 'radio' and coalesce((g ->> 'required')::boolean, true) and v_cnt < 1 then
      v_missing := v_missing || to_jsonb('group:' || (g ->> 'id'));
    elsif (g ->> 'kind') = 'checkbox' and coalesce((g ->> 'required')::boolean, false)
          and v_cnt < coalesce((g ->> 'min')::int, 1) then
      v_missing := v_missing || to_jsonb('group:' || (g ->> 'id'));
    end if;
  end loop;
  return v_missing;
end $function$;

-- ─── Minor 4: the access code is bcrypt, salted per set ─────────────────────────────────────────────
create function esign._access_code_hash(p_code text) returns text
language sql volatile set search_path to ''
as $$ select extensions.crypt(btrim(p_code), extensions.gen_salt('bf', 8)) $$;
revoke execute on function esign._access_code_hash(text) from public, anon, authenticated, authenticator;
comment on function esign._access_code_hash(text) is
  'THE hash of a sender-set access code: bcrypt, its own random salt every time it is set. public.outsider_verify reads it (and the older unsalted sha256 until that code is next set).';

create or replace function esign.esign_draft_set_access_code(p_envelope_id uuid, p_recipient_key text, p_code text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'esign', 'public'
as $function$
-- §11 / A-F6: hashed on entry into the non-versioned draft row (bcrypt, salted per set); never returned,
-- never in history, and no client role can read the column.
declare e esign.envelope%rowtype;
begin
  select * into e from esign.envelope where id = p_envelope_id and deleted_at is null;
  if not found or not esign._may_manage(p_envelope_id, 'editor') then
    return jsonb_build_object('granted', false, 'reason', 'no_access');
  end if;
  if e.status <> 'draft' then return jsonb_build_object('granted', false, 'reason', 'not_draft'); end if;
  if nullif(btrim(coalesce(p_code, '')), '') is null then
    update esign.envelope_draft set access_code_hashes = access_code_hashes - p_recipient_key where envelope_id = p_envelope_id;
    return jsonb_build_object('granted', true, 'has_access_code', false);
  end if;
  if length(btrim(p_code)) < 4 then
    return jsonb_build_object('granted', false, 'reason', 'code_too_short');
  end if;
  if length(btrim(p_code)) > 20 then
    return jsonb_build_object('granted', false, 'reason', 'code_too_long');
  end if;
  update esign.envelope_draft
     set access_code_hashes = access_code_hashes || jsonb_build_object(p_recipient_key, esign._access_code_hash(p_code))
   where envelope_id = p_envelope_id;
  return jsonb_build_object('granted', true, 'has_access_code', true);
end $function$;

do $$
declare v_cols text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position) into v_cols
    from information_schema.columns
   where table_schema = 'esign' and table_name = 'envelope_draft' and column_name <> 'access_code_hashes';
  execute 'revoke select on esign.envelope_draft from anon, authenticated, authenticator';
  execute format('grant select (%s) on esign.envelope_draft to authenticated', v_cols);
end $$;

-- ─── Minor 2 + 3 (+ bcrypt): the code check counts under a row lock; an expired lock starts again ───
create or replace function public.outsider_verify(p_secret text, p_code text, p_ip inet default null::inet)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public', 'platform'
as $function$
declare t platform.actor_token%rowtype; c platform.outsider_consumer%rowtype;
        v_hash text; v_sess text; v_sid uuid; v_code_ok boolean;
begin
  v_hash := encode(extensions.digest(coalesce(p_secret,''), 'sha256'), 'hex');
  -- FOR UPDATE: concurrent tries on one link queue here, so the count below is exact (a burst of
  -- wrong codes cannot be evaluated more than five times).
  select * into t from platform.actor_token where token_hash = v_hash for update;
  if not found or not t.is_active or t.revoked_at is not null or t.expires_at <= now()
     or (t.max_uses is not null and t.use_count >= t.max_uses) then
    return jsonb_build_object('ok', false, 'message','This link is no longer valid — ask the sender for a new one.');
  end if;
  -- Loosening L5: the link is live (outsider_begin already says so), so a locked or wrong code is
  -- named honestly instead of the dead-link sentence. Dead links keep the uniform answer above.
  if t.verification_locked_until is not null and t.verification_locked_until > now() then
    return jsonb_build_object('ok', false, 'reason', 'code_locked', 'locked_until', t.verification_locked_until,
                              'message', 'Too many tries. Try again later.');
  end if;
  -- A lock that has run out starts the count again: one typo after a lockout is one wrong try, not a re-lock.
  if t.verification_locked_until is not null then
    update platform.actor_token set verification_attempts = 0, verification_locked_until = null where id = t.id;
    t.verification_attempts := 0;
    t.verification_locked_until := null;
  end if;

  if t.verification_factor <> 'none' then
    v_code_ok := t.verification_code_hash is not null and t.verification_code_expires_at > now()
                 and case when t.verification_code_hash like '$2%'
                          then extensions.crypt(coalesce(p_code,''), t.verification_code_hash) = t.verification_code_hash
                          else t.verification_code_hash = encode(extensions.digest(coalesce(p_code,''),'sha256'),'hex') end;
    if not coalesce(v_code_ok, false) then
      update platform.actor_token
         set verification_attempts = verification_attempts + 1,
             verification_locked_until = case when verification_attempts + 1 >= 5
                                              then now() + interval '15 minutes' end
       where id = t.id;
      insert into platform.actor_token_event (organization_id, actor_token_id, event_type, ip)
      values (t.organization_id, t.id, 'verification_failed', p_ip);
      if t.verification_attempts + 1 >= 5 then
        return jsonb_build_object('ok', false, 'reason', 'code_locked', 'locked_until', now() + interval '15 minutes',
                                  'message', 'Too many tries. Try again later.');
      end if;
      return jsonb_build_object('ok', false, 'reason', 'code_wrong', 'attempts_left', 5 - (t.verification_attempts + 1),
                                'message', 'That code is not right.');
    end if;
  end if;

  select * into c from platform.outsider_consumer
   where consumer_key = t.consumer_key and resource = t.subject_type and is_subject_resource;

  -- single_session: a second session invalidates the first
  if t.single_session then
    update platform.actor_session set revoked_at = now()
     where actor_token_id = t.id and revoked_at is null;
  end if;

  v_sess := encode(extensions.gen_random_bytes(32), 'hex');
  insert into platform.actor_session
    (organization_id, actor_token_id, session_hash, expires_at, verified_at, ip)
  values (t.organization_id, t.id, encode(extensions.digest(v_sess,'sha256'),'hex'),
          now() + make_interval(mins => coalesce(c.session_ttl_minutes, 30)), now(),
          case when coalesce(c.ip_pinned,true) then p_ip end)
  returning id into v_sid;

  -- 🚨 THE USE IS CONSUMED HERE, on VERIFIED SESSION ISSUANCE — not on resolution.
  update platform.actor_token
     set use_count = use_count + 1, verification_attempts = 0, verification_locked_until = null,
         verification_code_hash = case when t.verification_factor = 'access_code' then verification_code_hash end,
         last_used_at = now(), last_used_ip = p_ip
   where id = t.id;

  insert into platform.actor_token_event (organization_id, actor_token_id, session_id, event_type, ip)
  values (t.organization_id, t.id, v_sid, 'verification_passed', p_ip),
         (t.organization_id, t.id, v_sid, 'session_issued', p_ip);

  return jsonb_build_object('ok', true, 'session', v_sess, 'session_id', v_sid,
                            'expires_at', now() + make_interval(mins => coalesce(c.session_ttl_minutes,30)));
end
$function$;

-- ─── the door registry: what each new or changed door is, and who may call it ──────────────────────
delete from platform.client_callable_door
 where schema_name = 'esign' and function_name in ('record_signed_copy', 'record_certificate_file');
insert into platform.client_callable_door (schema_name, function_name, identity_args, identity_argtypes, reason, declared_by, non_client_lane, signed_in_callers, anonymous_callers)
values
 ('esign', 'record_signed_copy', 'p_document_id uuid, p_file_id uuid, p_file_version integer, p_sha256 text',
  array['uuid'::regtype, 'uuid'::regtype, 'int4'::regtype, 'text'::regtype]::oid[],
  'p_document_id is not checked: only esign.record_signed_copy_made calls it, after the envelope has completed, and the evidence guard refuses any change to a recorded copy',
  'esign_parity_32_the_evidence_cannot_be_swapped.sql',
  'server_only: called only by esign.record_signed_copy_made on the aidream finalize path (services/esign/signed_copy.py ensure_signed_copies)', false, false),
 ('esign', 'record_certificate_file', 'p_certificate_id uuid, p_file_id uuid, p_sha256 text',
  array['uuid'::regtype, 'uuid'::regtype, 'text'::regtype]::oid[],
  'p_certificate_id is not checked: the aidream finalize path calls it for the certificate it just rendered; recorded once',
  'esign_parity_32_the_evidence_cannot_be_swapped.sql',
  'server_only: called by aidream services/esign/finalize.py after the certificate PDF is filed', false, false),
 ('esign', '_file_pin', 'p_file_id uuid', array['uuid'::regtype]::oid[],
  'p_file_id is not checked: it answers a file''s current version and checksum to the signed-copy and certificate recorders',
  'esign_parity_32_the_evidence_cannot_be_swapped.sql',
  'server_only: called inside esign.record_signed_copy_made and esign.record_certificate_file', false, false);
