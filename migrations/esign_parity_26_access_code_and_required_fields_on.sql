-- based-on: esign._enforce(text) ce7013058a64e8247183864e0e729b51622a1e36c2ee4f824d12f6b536dd7621
-- based-on: esign.esign_draft_set_access_code(uuid, text, text) e4955f85fad5456f9e6316f48aba03840d50d56a75d3023e4b0f9683c1a73119
-- based-on: esign.esign_draft_create(uuid, text, uuid, uuid) 445a4dd79d95b8709e68bcf38ff94f5acb14a848beffbf6574e0ea594d3e0b64
-- based-on: esign._notice_facts(uuid, uuid) 3bb4f4db8a71588d249b901d999a46eefd192bebeb87e0654f74bd97b10ad9c8
--
-- Owner rulings 2026-10-10 (Arman): the sender-set access code (Docusign ships it: 4-20 characters,
-- shared out of band) is BUILT, and a signer cannot finish while a required field assigned to them
-- is empty. F1 and F2 are on; F3 (value-format checks) stays a warning, never a refusal.
--  * esign._enforce: F1 true, F2 true, F3 false.
--  * esign_draft_set_access_code: 4-20 characters, refused by name (code_too_short / code_too_long).
--  * esign_draft_create (the legacy copy of a pre-draft envelope): keeps the recipient's choice; the
--    code itself is never copied, the sender types it again.
--  * esign._notice_facts: the invitation to an access-code recipient says a code is needed and to ask
--    the sender for it; the email never carries the code.
create or replace function esign._enforce(p_flag text)
 returns boolean
 language sql
 immutable
 set search_path to 'pg_catalog'
as $function$
  -- §18: F1 access code (ON, owner 2026-10-10), F2 required_fields_missing at Sign (ON, owner
  -- 2026-10-10), F3 save_values shape refusals (OFF: a value-format problem is a warning, never a block).
  select case p_flag when 'F1' then true when 'F2' then true when 'F3' then false else false end
$function$;
CREATE OR REPLACE FUNCTION esign.esign_draft_set_access_code(p_envelope_id uuid, p_recipient_key text, p_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'esign', 'public'
AS $function$
-- §11 / A-F6: hashed on entry into the non-versioned draft row; never returned, never in history.
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
     set access_code_hashes = access_code_hashes || jsonb_build_object(p_recipient_key,
           encode(extensions.digest(btrim(p_code), 'sha256'), 'hex'))
   where envelope_id = p_envelope_id;
  return jsonb_build_object('granted', true, 'has_access_code', true);
end $function$;
CREATE OR REPLACE FUNCTION esign.esign_draft_create(p_organization_id uuid, p_title text, p_template_id uuid DEFAULT NULL::uuid, p_copy_of_envelope_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'esign', 'public'
AS $function$
declare v_uid uuid := auth.uid(); v_comp jsonb; v_env uuid; v_cat uuid; t esign.template%rowtype; v_title text;
begin
  if v_uid is null then return jsonb_build_object('granted', false, 'reason', 'not_authenticated'); end if;
  if p_organization_id is null or not esign.may_send_in(p_organization_id) then
    return jsonb_build_object('granted', false, 'reason', 'not_a_member');
  end if;
  v_title := coalesce(nullif(btrim(p_title), ''), 'Untitled');
  v_comp := esign._default_composition(p_organization_id, v_title);
  if p_template_id is not null then
    select * into t from esign.template where id = p_template_id and deleted_at is null;
    if not found or not (t.created_by = v_uid or iam.has_access('esign_template', t.id, 'viewer'::permission_level)) then
      return jsonb_build_object('granted', false, 'reason', 'template_not_found');
    end if;
    v_comp := t.composition || jsonb_build_object('title', v_title,
      'recipients', coalesce((select jsonb_agg(r || jsonb_build_object('has_access_code', false))
                                from jsonb_array_elements(coalesce(t.composition -> 'recipients', '[]')) r), '[]'::jsonb));
  elsif p_copy_of_envelope_id is not null then
    if not esign._may_manage(p_copy_of_envelope_id, 'viewer') then
      return jsonb_build_object('granted', false, 'reason', 'no_access');
    end if;
    select d.composition into v_comp from esign.envelope_draft d where d.envelope_id = p_copy_of_envelope_id;
    if v_comp is null then
      -- An envelope sent before drafts existed: its documents and recipients, no fields.
      select jsonb_build_object('documents', coalesce((select jsonb_agg(jsonb_build_object('key', x.id, 'file_id', coalesce(x.document_id, x.content_file_id),
                                   'name', x.name, 'page_count', x.page_count) order by x.position)
                                  from esign.envelope_document x where x.envelope_id = e.id), '[]'::jsonb),
                                'recipients', coalesce((select jsonb_agg(jsonb_build_object('key', s.id, 'role', case when s.role in ('signer','viewer','cc_recipient') then s.role else 'signer' end,
                                   'order', s.position, 'full_name', s.full_name, 'email', s.email, 'user_id', s.signer_user_id,
                                   'color_index', coalesce(s.color_index, s.position - 1), 'verification', case s.verification_factor when 'access_code' then 'access_code' when 'email_code' then 'email_code' else 'none' end, 'has_access_code', false) order by s.position)
                                  from esign.envelope_signer s where s.envelope_id = e.id and s.status <> 'delegated'), '[]'::jsonb),
                                'message', coalesce(e.message, ''))
        into v_comp from esign.envelope e where e.id = p_copy_of_envelope_id;
      v_comp := esign._default_composition(p_organization_id, v_title) || v_comp;
    end if;
    v_comp := v_comp || jsonb_build_object('title', v_title,
      'recipients', coalesce((select jsonb_agg(r || jsonb_build_object('has_access_code', false))
                                from jsonb_array_elements(coalesce(v_comp -> 'recipients', '[]')) r), '[]'::jsonb));
  end if;

  select id into v_cat from platform.categories
   where dimension = 'esign_envelope_type' and slug = 'custom' and deleted_at is null
   order by (organization_id = p_organization_id) desc limit 1;
  perform esign._arm();
  -- A-F7: expires_at and the snapshot are PLACEHOLDERS until Send replaces both.
  insert into esign.envelope (organization_id, category_id, title, message, status, signing_order, consumer_key,
                              source_type, sensitivity, expires_at, config_snapshot, created_by, template_id,
                              copied_from_envelope_id, email_subject, metadata)
  values (p_organization_id, v_cat, v_title, nullif(v_comp ->> 'message', ''), 'draft',
          coalesce(v_comp #>> '{settings,signing_order}', 'sequential'), 'documents.send_for_signature',
          'files.file', 'standard', now() + interval '365 days',
          esign.resolve_config_snapshot(p_organization_id, 'standard'), v_uid, p_template_id, p_copy_of_envelope_id,
          v_comp ->> 'email_subject', jsonb_build_object('placeholder_until_send', jsonb_build_array('expires_at', 'config_snapshot')))
  returning id into v_env;
  insert into esign.envelope_draft (organization_id, envelope_id, composition, revision, saved_at, created_by)
  values (p_organization_id, v_env, v_comp, 0, now(), v_uid);
  perform esign._event(v_env, 'created', 'employee', p_actor_user_id => v_uid, p_actor_label => 'requester',
                       p_payload => jsonb_build_object('draft', true, 'template_id', p_template_id,
                                                       'copy_of', p_copy_of_envelope_id));
  perform esign._disarm();
  return jsonb_build_object('granted', true, 'envelope_id', v_env, 'revision', 0, 'composition', v_comp);
end $function$;
CREATE OR REPLACE FUNCTION esign._notice_facts(p_envelope_id uuid, p_signer_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'esign', 'public'
AS $function$
declare e esign.envelope%rowtype; s esign.envelope_signer%rowtype; d esign.envelope_signer%rowtype;
        v_title text; v_docs text; v_note text;
begin
  select * into e from esign.envelope where id = p_envelope_id;
  if p_signer_id is not null then select * into s from esign.envelope_signer where id = p_signer_id; end if;
  if s.delegated_to_signer_id is not null then select * into d from esign.envelope_signer where id = s.delegated_to_signer_id; end if;
  v_title := coalesce(nullif(btrim(e.title), ''), 'Your document');
  select string_agg(x.name || coalesce(' (' || x.page_count || case when x.page_count = 1 then ' page)' else ' pages)' end, ''), ', ' order by x.position)
    into v_docs from esign.envelope_document x where x.envelope_id = p_envelope_id;
  v_note := nullif(concat_ws(E'\n\n', nullif(btrim(coalesce(e.message, '')), ''),
                                       nullif(btrim(coalesce(s.private_message, '')), '')), '');
  -- A delegate's request carries the delegator's note (§8.2).
  if s.delegated_from_signer_id is not null then
    v_note := coalesce((select nullif(btrim(f.delegation_reason), '') from esign.envelope_signer f
                         where f.id = s.delegated_from_signer_id), v_note);
  end if;
  return jsonb_build_object(
    'request', jsonb_build_object(
      'subject', case when nullif(btrim(e.email_subject), '') is null or btrim(e.email_subject) = 'Please sign: ' || v_title
                      then coalesce(nullif(btrim(esign.envelope_sender(p_envelope_id) ->> 'name'), ''), 'Someone') || ' sent you ' || v_title || ' to sign'
                      else btrim(e.email_subject) end,
      'note', concat_ws(E'\n\n', coalesce(v_note, 'Documents: ' || coalesce(v_docs, v_title)),
                       case when s.verification_factor = 'access_code'
                            then 'You need an access code to open it. Ask '
                                 || coalesce(nullif(btrim(esign.envelope_sender(p_envelope_id) ->> 'name'), ''), 'the sender')
                                 || ' for it. It is not in this email.' end)),
    'envelope', jsonb_build_object('title', v_title,
                                   'expires_on', to_char(e.expires_at, 'Mon FMDD, YYYY')),
    'recipient', jsonb_build_object('first_name', coalesce(nullif(split_part(btrim(coalesce(s.full_name, '')), ' ', 1), ''), 'there')),
    'progress', jsonb_build_object(
      'signed', (select count(*) from esign.envelope_signer x where x.envelope_id = p_envelope_id and x.status in ('signed','acknowledged')),
      'total',  (select count(*) from esign.envelope_signer x where x.envelope_id = p_envelope_id
                   and x.role <> 'cc_recipient' and x.status <> 'delegated')),
    'signer', jsonb_build_object('name', coalesce(nullif(btrim(s.full_name), ''), 'A signer'),
                                 'note', coalesce(nullif(btrim(s.message_to_sender), ''),
                                                  nullif(btrim(s.delegation_reason), ''), '—')),
    'decline', jsonb_build_object('reason', coalesce(nullif(btrim(s.decline_reason), ''), '—')),
    'delegate', jsonb_build_object('name', coalesce(d.full_name, '—'), 'email', coalesce(d.email, '—')),
    'void', jsonb_build_object('reason', coalesce(nullif(btrim(e.void_reason), ''), '—')),
    'handoff', jsonb_build_object('minutes', coalesce(
        (esign.config_resolve(e.organization_id, 'esign.signature.handoff_ttl_minutes'))::text, '10')));
end $function$;
