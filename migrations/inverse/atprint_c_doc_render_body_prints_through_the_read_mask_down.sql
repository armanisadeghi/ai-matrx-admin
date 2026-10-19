-- INVERSE of atprint_c_doc_render_body_prints_through_the_read_mask.sql: custom.doc_render_body back to the atprint_b body (no read mask).
-- chair-step: restores one function body.
-- based-on: custom.doc_render_body(uuid, uuid, uuid) 5192ccb53d5cc99ec69e2dcf16a9e49c7b42cac9bbbeaa37653facc86dff76d0

CREATE OR REPLACE FUNCTION custom.doc_render_body(p_organization_id uuid, p_template_id uuid, p_record_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_tpl    record;
  v_rec    record;
  v_values jsonb;
  v_out    text;
  v_tok    record;
  v_field  jsonb;
begin
  perform custom.assert_client_may_reach(p_organization_id, 'custom.doc_render_body');
  perform custom.assert_client_may_open(p_organization_id, p_record_id, 'custom.doc_render_body', 'viewer'::public.permission_level, 'record');
  select t.data ->> 'body' as body,
         (t.data ->> 'renders_table_id')::uuid as renders_table_id
    into v_tpl
    from custom.record t
   where t.organization_id = p_organization_id and t.id = p_template_id
     and t.data_class = 'doc_template' and t.deleted_at is null;
  if v_tpl.renders_table_id is null then
    raise exception 'there is no such document template in this organization' using errcode = '02000',
            detail = jsonb_build_object('template_id', p_template_id)::text;
  end if;

  select r.table_id into v_rec
    from custom.record r
   where r.organization_id = p_organization_id and r.id = p_record_id
     and r.deleted_at is null;
  if v_rec.table_id is null then
    raise exception 'there is no such record in this organization' using errcode = '02000',
            detail = jsonb_build_object('record_id', p_record_id)::text;
  end if;
  if v_rec.table_id is distinct from v_tpl.renders_table_id then
    raise exception 'this template renders a different kind of record than that one' using errcode = '22023',
            hint = 'REC-68: a template''s tokens are the Fields of ONE Table, so it renders the records of that Table and of no other. Pick the template that belongs to this record''s table.',
            detail = jsonb_build_object('record_id', p_record_id)::text;
  end if;

  -- The record's own values, through the store's own read — which folds in computed and
  -- derived Values, so a formula Field merges as the answer a reader sees.
  v_values := coalesce(custom.record_values(p_organization_id, p_record_id), '{}'::jsonb);

  v_out := v_tpl.body;
  for v_tok in
    select distinct t.raw, t.field_id from custom.doc_tokens(v_tpl.body) t
  loop
    select f.data into v_field
      from custom.field f
     where f.organization_id = p_organization_id and f.id = v_tok.field_id;
    -- A token that reaches here and resolves to nothing cannot happen through
    -- custom.doc_template_save, which refuses it at save (REC-68). It can happen when the
    -- FIELD was deleted after the template was saved, and then the honest render is an
    -- empty space: a document that prints {{field:...}} to a client is the merge lying
    -- about what the record holds.
    v_out := replace(v_out, v_tok.raw,
                     case when v_field is null then ''
                          -- FIXED: a signature Field never merges its live value into the
                          -- body. The value IS the thing `doc_sign` writes onto the record,
                          -- so baking it back into the same content the seal hashes would
                          -- make every signed document self-invalidating the instant it was
                          -- signed. The signature is carried as the Value and the seal, never
                          -- as body text a hash depends on (DocuSign's own separation).
                          when nullif(v_field ->> 'format', '') = 'signature' then ''
                          else custom.doc_format_value(v_field, v_values -> (v_field ->> 'key'))
                     end);
  end loop;
  return v_out;
end;
$function$

