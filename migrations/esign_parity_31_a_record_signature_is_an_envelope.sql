-- E-sign parity: a records signature request (matrx-records RecordStore.signature_request) is an
-- e-sign envelope, not a /sign/<token> link. Two server-only steps join the two systems:
--
--   esign.link_record_signature(envelope, render, field) — on a DRAFT, as the sender: the render is in
--     the envelope's organization, the sender is editor on its record, the field is a signature Field
--     on that record's table and is not signed yet. Keeps {render, record, table, field} on the
--     envelope's metadata so completion can write the signature back.
--   esign.apply_record_signature(envelope) — on a COMPLETED envelope (aidream finalize, owed and
--     idempotent): writes the signer's signature onto the record through custom.doc_sign, which seals
--     the render's hash; records the signature id (or the refusal) on the envelope.

create or replace function esign.link_record_signature(p_envelope_id uuid, p_render_id uuid, p_field_key text)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_uid   uuid := auth.uid();
  e       record;
  d       record;
  v_field jsonb;
  v_title text;
begin
  if v_uid is null then return jsonb_build_object('granted', false, 'reason', 'not_authenticated'); end if;
  select x.id, x.status, x.organization_id into e from esign.envelope x where x.id = p_envelope_id and x.deleted_at is null;
  if not found or not esign._may_manage(p_envelope_id, 'editor') then
    return jsonb_build_object('granted', false, 'reason', 'no_access');
  end if;
  if e.status <> 'draft' then return jsonb_build_object('granted', false, 'reason', 'not_draft'); end if;

  select r.record_id, r.table_id, r.template_id, r.template_version, r.content_hash
    into d
    from custom.doc_render r
   where r.id = p_render_id and r.organization_id = e.organization_id and r.deleted_at is null;
  if d.record_id is null then
    return jsonb_build_object('granted', false, 'reason', 'no_document',
      'message', 'That document version is not in the organization this envelope is sent from.');
  end if;
  if coalesce(custom.effective_level(v_uid, e.organization_id, d.record_id, 'record') >= 'editor'::public.permission_level, false) is false
     and not public.is_platform_admin() then
    return jsonb_build_object('granted', false, 'reason', 'no_access',
      'message', 'You need to be able to edit this record to ask for its signature.');
  end if;

  select f.data into v_field
    from custom.field f
   where f.organization_id = e.organization_id and f.entity_definition_id = d.table_id and f.key = p_field_key;
  if v_field is null or not custom.doc_signature_field_ok(v_field) then
    return jsonb_build_object('granted', false, 'reason', 'not_a_signature_field',
      'message', format('"%s" is not a signature field on this table. Signature fields: %s.', p_field_key,
        coalesce((select string_agg(format('%s (%s)', g.data ->> 'label', g.key), ', ' order by g.key)
                    from custom.field g
                   where g.organization_id = e.organization_id and g.entity_definition_id = d.table_id
                     and custom.doc_signature_field_ok(g.data)), 'none yet')));
  end if;
  if exists (select 1 from custom.doc_signature s
              where s.organization_id = e.organization_id and s.record_id = d.record_id
                and s.field_key = p_field_key and s.deleted_at is null) then
    return jsonb_build_object('granted', false, 'reason', 'already_signed',
      'message', format('"%s" on this record is already signed.', coalesce(v_field ->> 'label', p_field_key)));
  end if;

  select coalesce(t.data ->> 'name', 'Document') into v_title
    from custom.record t
   where t.organization_id = e.organization_id and t.id = d.template_id;

  perform esign._arm();
  update esign.envelope
     set metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('record_signature', jsonb_build_object(
           'render_id', p_render_id, 'record_id', d.record_id, 'table_id', d.table_id, 'field_key', p_field_key,
           'document_hash', d.content_hash, 'document_version', d.template_version, 'linked_by', v_uid))
   where id = p_envelope_id;
  perform esign._disarm();
  return jsonb_build_object('granted', true, 'record_id', d.record_id, 'table_id', d.table_id,
                            'field_label', coalesce(v_field ->> 'label', p_field_key),
                            'document_title', coalesce(v_title, 'Document'),
                            'document_version', d.template_version, 'document_hash', d.content_hash);
end
$$;

create or replace function esign.apply_record_signature(p_envelope_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  e      record;
  v_link jsonb;
  s      record;
  v_sig  uuid;
begin
  select x.id, x.status, x.organization_id, x.metadata into e from esign.envelope x where x.id = p_envelope_id;
  if not found then return jsonb_build_object('applied', false, 'reason', 'no_envelope'); end if;
  v_link := e.metadata -> 'record_signature';
  if v_link is null then return jsonb_build_object('applied', false, 'reason', 'no_record_link'); end if;
  if v_link ? 'signature_id' then
    return jsonb_build_object('applied', true, 'signature_id', v_link ->> 'signature_id', 'already', true);
  end if;
  if e.status <> 'completed' then return jsonb_build_object('applied', false, 'reason', 'not_completed'); end if;

  select x.full_name, x.signer_user_id into s
    from esign.envelope_signer x
   where x.envelope_id = e.id and x.role = 'signer' and x.status = 'signed'
   order by x.signed_at desc limit 1;
  if s.full_name is null then return jsonb_build_object('applied', false, 'reason', 'no_signer'); end if;

  begin
    perform set_config('app.actor_system', 'esign.apply_record_signature', true);
    v_sig := custom.doc_sign(e.organization_id, (v_link ->> 'render_id')::uuid, v_link ->> 'field_key',
                             s.full_name, s.signer_user_id);
  exception when others then
    perform esign._arm();
    update esign.envelope
       set metadata = metadata || jsonb_build_object('record_signature', v_link || jsonb_build_object(
             'refused', sqlerrm, 'refused_at', now()))
     where id = e.id;
    perform esign._disarm();
    return jsonb_build_object('applied', false, 'reason', 'refused', 'message', sqlerrm);
  end;

  perform esign._arm();
  update esign.envelope
     set metadata = metadata || jsonb_build_object('record_signature', (v_link - 'refused' - 'refused_at')
           || jsonb_build_object('signature_id', v_sig, 'applied_at', now()))
   where id = e.id;
  perform esign._disarm();
  return jsonb_build_object('applied', true, 'signature_id', v_sig, 'record_id', v_link ->> 'record_id');
end
$$;

grant execute on function esign.link_record_signature(uuid, uuid, text) to service_role;
grant execute on function esign.apply_record_signature(uuid) to service_role;

insert into platform.client_callable_door (schema_name, function_name, identity_args, identity_argtypes, reason, declared_by, non_client_lane, signed_in_callers, anonymous_callers)
select n.nspname, p.proname, pg_get_function_identity_arguments(p.oid), platform.door_argtypes(p.proargtypes),
       'Internal e-sign step; the envelope, render and record are checked inside against the caller.',
       'esign_parity_31_a_record_signature_is_an_envelope',
       case p.proname
         when 'link_record_signature' then 'server_only: called only by aidream record_signature (the records SDK signature_request) on the service connection with the sender''s claims; no client calls it directly'
         else 'server_only: called only by aidream e-sign finalize on the service connection after the envelope completes; no client calls it directly' end,
       false, false
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'esign' and p.proname in ('link_record_signature', 'apply_record_signature')
on conflict do nothing;
