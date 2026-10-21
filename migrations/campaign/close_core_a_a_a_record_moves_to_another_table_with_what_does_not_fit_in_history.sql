-- additive: yes
-- based-on: custom._value_envelope() b4f356e221f48261ad750af71a67cdd18f36656cba724b4f355dc780ad8773e6
-- based-on: custom.migrate_retype(uuid, uuid, text, text) 3b54b779d114d0b86153ef2663899549a12b95efd2f806bf1c3a80e316bd0eb1
-- based-on: custom._door_action_words(text) 8f3f6891b50a783723ca48439a902f0b390661c1b881c73e9a7067175c8888d7
--
-- CLOSE-CORE CD-CORE-16 (acceptance test 9, "Retype": a record moves to another table keeping its id and its
-- links; the values that do not fit go to History with the reason). Measured live 2026-10-21 as admin@admin.com:
-- custom.migrate_retype refused EVERY move of a record holding a value the new table has no column for -
-- "This record carries where "budget" came from, and this table has no field called "budget"" - because
-- custom._value_envelope's clearing arm stamped an envelope for each value the move took off. Three bodies:
--   1. custom._value_envelope: the clearing arm runs only when the record stays on its table.
--   2. custom.migrate_retype: a record move is refused in its own words, not as a column change.
--   3. custom._door_action_words: those words.
-- Nothing is dropped, granted or revoked; no row is written.

CREATE OR REPLACE FUNCTION custom._value_envelope()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_data     jsonb := coalesce(new.data, '{}'::jsonb);
  v_actor    text;
  v_obo      text;
  v_refusal  text;
  v_values   jsonb;
  v_key      text;
  v_declared boolean;
  v_type_fld text;
  v_rtype    text;
  v_src      text;
  v_agent    text[] := '{}'::text[];   -- ENRICH: the keys of this Table a model owns
  -- KINDS-GLUE N-C3: the platform Fields of a Table kept for agent outputs (config.kept_by = agent_output),
  -- key -> {label, default}, read in the same walk of the applicable Fields.
  v_platform jsonb := '{}'::jsonb;
  v_kept_by  text;
  v_flabel   text;
  v_fdefault jsonb;
  v_pkey     text;
  -- BIG-VALUES-WRITE: the text values over the ceiling this write carries into files.
  v_whole    jsonb := '{}'::jsonb;     -- key -> the whole text the writer supplied
  v_park     jsonb := '{}'::jsonb;     -- key -> the whole text that still needs its file
  v_ceiling  bigint;
  v_text     text;
  v_prior    jsonb;
  v_carry    jsonb;
begin
  -- THE DOOR. The thirteenth and last RETURNS trigger in this schema to read the ONE
  -- predicate, which judges custom.caller_role() and never current_user. custom/system_enabled
  -- decides WHO may write and never which check runs.
  perform custom.assert_store_door(new.organization_id, 'custom.record');

  -- A WRITE THAT ASSERTS NO VALUE HAS NO AUTHOR TO JUDGE (lane AGENT, 2026-09-19).
  -- MEASURED: a real agent turn wrote twenty records and could not delete ONE of them.
  -- custom.record_delete does `update custom.record set deleted_at = now()`, which fires
  -- this trigger over the UNCHANGED document; the document names no `_actor`, so
  -- custom.actor_word falls back to the connection's declaration ('agent'), and the
  -- forward arm below then refuses because nothing names the person the agent acts for —
  -- and nothing CAN, because a delete carries no document to put `_on_behalf_of` in and
  -- there is no GUC for it. So every agent delete, restore and reparent of a business
  -- record was refused, by a check about authorship, on a statement that authors nothing.
  --
  -- The condition is exactly that: an UPDATE whose `data` is not distinct from the row's
  -- existing `data` asserts no Value, so there is no new authorship to record and the
  -- authorship already stored stays exactly as it was. Every check below still runs, in
  -- full, on every statement that DOES change the document. This cannot widen anything:
  -- a write that changes no data could not have carried a value to mis-author.
  if TG_OP = 'UPDATE' and old.data is not distinct from new.data then
    return new;
  end if;

  -- A TEXT VALUE OF ANY SIZE SIMPLY SAVES (lane BIG-VALUES-WRITE, 2026-09-25). The owner:
  -- "Make sure that large data size is easy for users." A business record's text value over
  -- this organization's ceiling for one value (custom/value_max_bytes) is no longer refused:
  -- the cell keeps its first 1000 characters, and the whole text is carried into a file by
  -- the ONE rule the table mover already uses (matrx_records.big_values) - here it waits in
  -- custom.whole_value_parked until its file is written (below, and custom.whole_value_complete).
  -- The ceiling below then judges what the cell really holds. A definition row, a JSON value
  -- and a value on a key that is not one of the Table's Fields keep the refusal.
  if new.data_class = 'record'
     and new.table_id is not null
     and new.table_id <> custom.table_kernel_id()
     and new.table_id <> custom.field_kernel_id() then
    v_ceiling := custom.whole_value_ceiling(new.organization_id);
    for v_key, v_text in
      select e.key, e.value #>> '{}'
        from jsonb_each(v_data) e
       where left(e.key, 1) <> '_' and jsonb_typeof(e.value) = 'string'
         and octet_length(e.value::text) > v_ceiling
    loop
      -- Held OFF by the store's own switch (custom/system_enabled): an organization whose store
      -- is not on keeps the refusal below, exactly as before this file.
      -- CHAIR-ALWAYS-ON 2026-10-03: the store switch is retired; the store is always on, so no exit here.
      v_whole := v_whole || jsonb_build_object(v_key, v_text);
      v_data := jsonb_set(v_data, array[v_key], to_jsonb(custom.whole_value_head(v_text)));
    end loop;
  end if;

  -- THE CEILING (finding 4), over what the WRITER supplied, before anything else touches
  -- the document.
  v_refusal := custom.size_refusal(new.organization_id, v_data);
  if v_refusal is not null then
    raise exception '%', v_refusal
      using errcode = '23514',
            hint = 'The ceilings are custom/value_max_bytes and custom/document_max_bytes - organization-settable knobs with published defaults, not constants. A value too big to live in the record lives as a record of this store''s File table, and the value points at it.';
  end if;

  v_declared := v_data ? '_values' or v_data ? '_sources' or v_data ? '_actor' or v_data ? '_on_behalf_of';

  -- WHO OPENS THE ENVELOPE (finding 2). A business document always gets one, whether or not
  -- its writer opened it; a DEFINITION row (kernel, table, field, rule, merge_field,
  -- relation) is the shape of the store rather than a set of asserted Values, and keeps its
  -- prior behaviour exactly - nothing to do unless it declared something itself.
  if new.data_class is distinct from 'record' and not v_declared then
    return new;
  end if;

  v_actor := custom.actor_word(v_data ->> '_actor');
  v_obo   := nullif(btrim(coalesce(v_data ->> '_on_behalf_of', '')), '');
  -- DATA-V2-BASICS-2 (2026-09-29): AN AGENT ACTING FOR A PERSON CARRIES THAT PERSON. When the document
  -- does not say who wrote it, the author is the connection's declaration (custom.actor_word above)
  -- — and so is the person: the connection is signed in AS the person the agent acts for (the server's
  -- acting_as, the same principal the held-write card carries). The records a store door writes for an
  -- agent (a choice column's choices, a board's rules) used to be refused "does not say who the agent is
  -- acting for" whenever custom/agent_schema_changes let the agent write without asking. A document that
  -- DECLARES itself an agent still names its person itself.
  if v_obo is null and v_actor = 'agent' and nullif(btrim(coalesce(v_data ->> '_actor', '')), '') is null then
    v_obo := nullif(btrim(coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub', '')), '');
  end if;
  -- A SERVER-SIDE AGENT WRITE CARRIES ITS PERSON ON THE ROW (Agent Studio, 2026-10-04). A server
  -- channel has no JWT, so the arm above finds nobody — yet the row it writes already names the person
  -- the work is for: `created_by`. Measured: the Agent Builder (MCP agent_author) saving an agent whose
  -- tags were new made `platform.tag_scope_id` create the tag scope, whose store copy
  -- (`custom._ctx_store_scope`, created_by = the agent's owner) was refused "does not say who the
  -- agent is acting for", so no agent with a never-used tag could be built server-side. A document
  -- that DECLARES itself an agent still names its person itself.
  if v_obo is null and v_actor = 'agent' and nullif(btrim(coalesce(v_data ->> '_actor', '')), '') is null
     and new.created_by is not null then
    v_obo := new.created_by::text;
  end if;
  if v_obo is not null and v_actor <> 'agent' then
    raise exception 'This write says it is on behalf of somebody, and its author is a %. Only an agent acts on behalf of a person.', v_actor
      using errcode = '22023';
  end if;
  -- THE FORWARD ARM (finding 3). The converse above was built; this one was not, so an agent
  -- write naming nobody landed unremarked.
  if v_actor = 'agent' and v_obo is null then
    raise exception 'This write says an agent wrote it, and does not say who the agent is acting for. An agent always acts on behalf of a person.'
      using errcode = '22004',
            hint = 'Put "_on_behalf_of" in the record with that person''s id. Work the platform does for nobody in particular is written by "system" - that is what the third word in the vocabulary is for. The vocabulary is exactly user, agent, system.';
  end if;

  -- The declaration is a fact about the WRITE, not content of the record.
  v_data := v_data - '_actor' - '_on_behalf_of';

  -- A VALUE IS A FIELD'S VALUE. The envelope is opened over the APPLICABLE FIELDS of this
  -- record's Table - the same set custom._record_field_validation validates against, chosen
  -- by the record's own type field where the Table has one - and never over the document's
  -- other keys, which carry structure rather than assertions. custom.validate_value_envelope
  -- refuses an envelope on a key that is not a declared Field, and it is right to.
  if new.data_class = 'record'
     and new.table_id is not null
     and new.table_id <> custom.table_kernel_id()
     and new.table_id <> custom.field_kernel_id() then
    v_type_fld := custom.table_type_field(new.organization_id, new.table_id);
    if v_type_fld is not null then
      v_rtype := v_data ->> v_type_fld;
    end if;
    v_values := coalesce(v_data -> '_values', '{}'::jsonb);
    if jsonb_typeof(v_values) <> 'object' then
      v_values := '{}'::jsonb;        -- the envelope law below refuses the malformed block by name
    end if;
    -- ENRICH, 2026-09-20: THE SAME LOOP NOW ALSO ANSWERS "WHO OWNS THIS COLUMN".
    -- A Field whose `source` is `agent` is a column an enrichment fills (AGT-6). Reading it
    -- here costs nothing - the Field rows are already being walked - and it is what lets the
    -- rule below pin a cell the moment a PERSON types over one of them.
    for v_key, v_src, v_kept_by, v_flabel, v_fdefault in
                        select f.data ->> 'key', f.data ->> 'source', f.data -> 'config' ->> 'kept_by',
                               coalesce(nullif(btrim(f.data ->> 'label'), ''), f.data ->> 'key'), f.data -> 'default'
                          from custom.applicable_fields(new.organization_id, new.table_id, v_rtype) f
    loop
      if v_key is not null and v_data ? v_key and not (v_values ? v_key) then
        v_values := v_values || jsonb_build_object(v_key, '{}'::jsonb);
      end if;
      if v_key is not null and v_src = 'agent' then
        v_agent := v_agent || v_key;
      end if;
      if v_key is not null and v_kept_by = 'agent_output' then
        v_platform := v_platform || jsonb_build_object(v_key, jsonb_build_object('label', v_flabel, 'default', v_fdefault));
      end if;
    end loop;

    -- KINDS-GLUE N-C3 (CHAIR-DOORS-2): ON A TABLE KEPT FOR AGENT OUTPUTS, A PERSON NEVER WRITES THE
    -- PLATFORM FIELDS, AND A PERSON'S EDIT MARKS THE ROW KEPT. The platform Fields (output_state,
    -- output_chain, output_generation, output_replaced_by, output_reason, ...) say where an output stands
    -- in its chain; only the chain door custom.record_write_graph_superseding moves them, and it opens
    -- itself for exactly its own transaction (custom.output_chain_door = this transaction's id), so a
    -- person's Make current / Keep both through that door is the door's write, not hers. The one
    -- platform Field a person sets herself is output_kept = true: keeping is the owner's own mark.
    -- Any other value a person writes on such a row (or a row she adds) marks it kept, so the next
    -- regeneration never hides or overwrites her work (knob records/agent_outputs.keep_on_person_edit,
    -- default on, per organization and Table). A person's own import counts as hers: the importer
    -- stamps imported values `system` (they came from a file), so a row it adds in a person's browser
    -- session (the connection says user, the document says it came via import) is judged as her write.
    if v_platform <> '{}'::jsonb
       and (v_actor = 'user'
            or (v_data -> '_source' ->> 'via' = 'import' and platform.declared_actor_tier() is not distinct from 'user'))
       and coalesce(current_setting('custom.output_chain_door', true), '') is distinct from txid_current()::text then
      for v_pkey in select k from jsonb_object_keys(v_platform) k loop
        if v_pkey = 'output_kept' and (v_data -> v_pkey) = 'true'::jsonb then
          continue;
        end if;
        if (tg_op = 'UPDATE' and (v_data -> v_pkey) is distinct from (old.data -> v_pkey))
           or (tg_op = 'INSERT' and coalesce(v_data -> v_pkey, 'null'::jsonb) <> 'null'::jsonb
               and (v_data -> v_pkey) is distinct from (v_platform -> v_pkey -> 'default')) then
          raise exception '"%" is a platform table, so it is not yours to change.', v_platform -> v_pkey ->> 'label'
            using errcode = '42501',
                  hint = 'Nothing was saved. Where an output stands in its chain changes only through its own actions (Make current, Keep both, It replaces...). Edit the output''s values instead, and it is kept as yours.';
        end if;
      end loop;
      if v_platform ? 'output_kept'
         and (v_data -> 'output_kept') is distinct from 'true'::jsonb
         and (tg_op = 'INSERT'
              or exists (select 1 from jsonb_each(v_data) e
                          where left(e.key, 1) <> '_' and not (v_platform ? e.key)
                            and (old.data -> e.key) is distinct from e.value))
         and coalesce((platform.knob_resolve('records', 'agent_outputs.keep_on_person_edit', new.organization_id, null,
                         jsonb_build_array(jsonb_build_object('kind', 'table', 'id', new.table_id))) #>> '{}')::boolean, true) then
        v_data := v_data || jsonb_build_object('output_kept', true);
        if not (v_values ? 'output_kept') then
          v_values := v_values || jsonb_build_object('output_kept', '{}'::jsonb);
        end if;
      end if;
    end if;
    if v_values <> '{}'::jsonb or v_data ? '_values' then
      v_data := jsonb_set(v_data, '{_values}', v_values);
    end if;
  end if;

  -- BIG-VALUES-WRITE: each carried value's envelope names its whole text. The SAME whole text
  -- the cell's file already holds (same SHA-256) keeps that pointer, so re-saving it is not a
  -- new version; any other text gets a pending pointer and waits for its file.
  for v_key, v_text in select e.key, e.value #>> '{}' from jsonb_each(v_whole) e loop
    if coalesce(jsonb_typeof(v_data -> '_values' -> v_key), '') <> 'object' then
      raise exception '%', custom.size_refusal(new.organization_id,
                                               jsonb_build_object(v_key, v_whole -> v_key))
        using errcode = '23514',
              hint = 'Only a Field of this Table carries a big text into a file. Declare the Field, then write it again.';
    end if;
    v_prior := null;
    if tg_op = 'UPDATE' then
      v_prior := old.data -> '_sources' -> (old.data -> '_values' -> v_key ->> 'src');
    end if;
    v_carry := custom.whole_value_source(v_text, v_data -> '_values' -> v_key -> 'src');
    if v_prior is not null and v_prior ->> 'kind' = 'whole_value_in_file'
       and v_prior ->> 'sha256' = v_carry ->> 'sha256' then
      v_data := jsonb_set(v_data, array[v_key], old.data -> v_key);
      v_data := jsonb_set(v_data, array['_values', v_key, 'src'], v_prior);
    else
      v_data := jsonb_set(v_data, array['_values', v_key, 'src'], v_carry);
      v_park := v_park || jsonb_build_object(v_key, v_text);
    end if;
  end loop;

  v_data := custom.intern_provenance(v_data);
  v_data := custom.stamp_value_envelopes(v_data, v_actor, v_obo, now());
  v_data := custom.value_versions(case when tg_op = 'UPDATE' then old.data else '{}'::jsonb end, v_data);
  -- ENRICH: A PERSON'S EDIT OF AN AGENT-OWNED CELL PINS IT, THROUGH EVERY DOOR AT ONCE —
  -- AND ONLY THE CELL THEY ACTUALLY EDITED. This runs AFTER custom.value_versions on
  -- purpose: `custom.stamp_value_envelopes` puts the writer's word on EVERY envelope in the
  -- document, so before the version is decided there is no way to tell the value a person
  -- just typed from the forty others the same write left alone. The version IS that
  -- distinction, already computed, and asking it a second way is how the two would drift.
  v_data := custom.pin_agent_cells(v_data,
              case when tg_op = 'UPDATE' then old.data else '{}'::jsonb end, v_agent);
  -- ENRICH: AND A VALUE NOBODY RE-ASSERTED KEEPS ITS OWN MOMENT AND ITS OWN AUTHOR.
  v_data := custom.carry_unchanged_value_stamps(
              case when tg_op = 'UPDATE' then old.data else '{}'::jsonb end, v_data);

  -- LANE 10 P4 round 3 (V11 #6): CLEARING A VALUE IS A WRITE, AND SAYS WHO MADE IT. A value this
  -- write removed keeps an envelope stamped with this writer and moment (its version moved on, no
  -- value, no absence word), so Last changed by names whoever cleared it. A value set aside into
  -- `_retired` by this same write (a change of the column) keeps that path instead.
  -- CLOSE-CORE CD-CORE-16 (2026-10-21): A RECORD MOVED TO ANOTHER TABLE CLEARED NOTHING. custom.migrate_retype
  -- takes the values the new table has no column for off the record (they are kept in History on its
  -- Migration). This arm read that as a person clearing them and stamped an envelope for each, on a table
  -- with no such field, which VAL-1 then refused - so no record holding a value the new table lacks could
  -- ever be moved. A value is only cleared on the table it stays on.
  if tg_op = 'UPDATE' and jsonb_typeof(old.data -> '_values') = 'object'
     and new.table_id is not distinct from old.table_id then
    for v_key in
      select e.key from jsonb_each(old.data -> '_values') e
       where old.data ? e.key and jsonb_typeof(old.data -> e.key) <> 'null'
         and (not (v_data ? e.key) or jsonb_typeof(v_data -> e.key) = 'null')
         and not exists (select 1 from jsonb_array_elements(case when jsonb_typeof(v_data -> '_retired') = 'array'
                                                                  then v_data -> '_retired' else '[]'::jsonb end) x
                          where x ->> 'key' = e.key)
    loop
      v_data := jsonb_set(v_data, '{_values}',
                  coalesce(case when jsonb_typeof(v_data -> '_values') = 'object' then v_data -> '_values' end, '{}'::jsonb)
                  || jsonb_build_object(v_key, jsonb_build_object(
                       'ver', coalesce((old.data -> '_values' -> v_key ->> 'ver')::numeric, 0) + 1,
                       'actor', v_actor, 'on_behalf_of', to_jsonb(v_obo), 'at', to_jsonb(now()))));
    end loop;
  end if;

  v_refusal := custom.value_envelope_refusal(v_data);
  if v_refusal is not null then
    raise exception '%', v_refusal
      using errcode = '23514', hint = 'VAL-1..VAL-8: a value carries its source, its author, its reason for being missing and its other candidates, inside this record''s one document.';
  end if;

  new.data := v_data;

  -- BIG-VALUES-WRITE: the whole texts that still need their file wait beside the record, in
  -- the same transaction - so a refused write leaves nothing waiting.
  if v_park <> '{}'::jsonb then
    perform custom.whole_value_park(new.organization_id, new.table_id, new.id,
                                    coalesce(new.created_by, custom.query_principal()),
                                    new.visibility, v_data, v_park);
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION custom.migrate_retype(p_organization_id uuid, p_id uuid, p_to text, p_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_row     custom.record%rowtype;
  v_log     uuid;
  v_keep    jsonb;
  v_misfit  jsonb := '{}'::jsonb;
  v_ok      text[];
  v_key     text;
  v_to_tbl  uuid;
  v_was     text;
  v_conv    integer;
  v_ret     integer;
begin
  -- THE CALLER AND THE ROW, on the one ladder, exactly as the other verbs ask it — this verb
  -- is executable by `authenticated` and a door that decides nothing is not a door. Then the
  -- switch: custom.assert_store_door resolves custom/system_enabled.
  perform custom.assert_client_may_reach(p_organization_id, 'custom.migrate_retype');
  -- CLOSE-CORE CD-CORE-16: the refusal names what the person tried. Moving a RECORD said "Changing a column's
  -- type needs Full access"; it now says "Moving a record to another table needs Full access".
  perform custom.assert_client_may_change(p_organization_id, p_id,
            case when exists (select 1 from custom.record r
                               where r.organization_id = p_organization_id and r.id = p_id and r.data_class = 'field')
                 then 'custom.migrate_retype' else 'custom.migrate_retype_record' end,
            'admin'::public.permission_level, 'record');
  perform custom.assert_store_door(p_organization_id, 'custom.migrate_retype');

  select * into v_row from custom.record r
   where r.organization_id = p_organization_id and r.id = p_id and r.deleted_at is null;
  if v_row.id is null then
    raise exception 'There is no such record here to retype.' using errcode = '02000',
            detail = jsonb_build_object('id', p_id)::text;
  end if;

  -- ── ARM TWO FIRST, because it is the smaller one: a FIELD changes what it behaves as
  --    (FLD-4 / T12). The values already written are CONVERTED where they convert and kept in
  --    `_retired` with their reason where they do not — by the trigger on the Field row, so
  --    this verb and an ordinary write behave identically.
  if v_row.data_class = 'field' then
    v_was := v_row.data ->> 'type';
    if v_was = p_to then
      return jsonb_build_object('verb', 'retype', 'field_id', p_id, 'was', v_was, 'now', p_to,
                                'changed', false, 'at', now());
    end if;
    v_log := history.migration_record(p_organization_id, 'retype', 'field', p_id,
               jsonb_build_object('kind', 'patch', 'record_id', p_id::text,
                                  'patch', jsonb_build_object('type', v_was)
                                           -- PERSON-UNDO: the WHOLE old shape, so a Person column changed to Text comes back a Person column
                                           -- (the retype drops what a relation points at; the undo must say it again).
                                           || coalesce((select jsonb_object_agg(k, v_row.data -> k)
                                                          from unnest(array['config', 'rules', 'format', 'parity_type', 'relation_target', 'relation_max', 'on_target_delete']) k
                                                         where v_row.data ? k), '{}'::jsonb)),
               coalesce(p_note, format('%s behaves as %s instead of %s; values that fit are converted and values that do not are kept in _retired with the reason, neither coerced nor deleted', coalesce(v_row.data ->> 'label', v_row.data ->> 'key'), p_to, v_was)));
    -- DATA-V2-BASICS-2 (2026-09-29, BREAKER-2 B2-05): THE CHANGE GOES THROUGH THE ONE DOOR THAT SHAPES
    -- A COLUMN. Writing the bare `type` word left a choice column's list and its several-choices switch
    -- on a column that was now Text, and the shape guard refused it ("is not a list, so it has no
    -- choices to take from a table") — the Sheet's Stores → Text could never change a choice column.
    -- custom.field_update builds the whole document for the new kind (list kept, several choices off,
    -- its default carried); its own trigger converts the values and writes the migration row, which
    -- sees this verb's row and does not write a second.
    perform custom.field_update(p_organization_id, p_id,
              jsonb_build_object('type', case p_to when 'boolean' then 'checkbox'
                                                   when 'range' then 'number'
                                                   else p_to end));
    select count(*) filter (where true) into v_ret
      from custom.record x, lateral jsonb_array_elements(coalesce(x.data -> '_retired', '[]'::jsonb)) e
     where x.organization_id = p_organization_id
       and x.table_id = nullif(v_row.data ->> 'entity_definition_id', '')::uuid
       and x.deleted_at is null
       and e ->> 'key' = (v_row.data ->> 'key');
    select count(*) into v_conv
      from custom.record x
     where x.organization_id = p_organization_id
       and x.table_id = nullif(v_row.data ->> 'entity_definition_id', '')::uuid
       and x.deleted_at is null
       and x.data ? (v_row.data ->> 'key');
    return jsonb_build_object('verb', 'retype', 'field_id', p_id, 'was', v_was, 'now', p_to,
                              'changed', true, 'migration_id', v_log,
                              'records_still_holding_a_value', v_conv,
                              'values_in_retired_for_this_field', v_ret,
                              'values', 'converted where they convert; kept in _retired with the reason where they do not',
                              'at', now());
  end if;

  -- ── ARM ONE: a RECORD moves to another Table (REC-N-18 / T9). The id does not change, so
  --    every relation to it still resolves — that is the whole point of the verb.
  select t.id into v_to_tbl from custom.record t
   where t.organization_id = p_organization_id and t.data_class = 'table'
     and t.deleted_at is null
     and (t.id = platform.uuid_or_null(p_to) or t.data ->> 'slug' = p_to or t.data ->> 'name' = p_to)
   limit 1;
  if v_to_tbl is null then
    raise exception 'There is no table "%" in this organization to retype it to.', p_to
      using errcode = '02000', hint = 'REC-N-18: name the table by id, slug or name.';
  end if;

  select coalesce(array_agg(f.data ->> 'key'), '{}')
    into v_ok
    from custom.applicable_fields(p_organization_id, v_to_tbl, null) f;

  v_keep := v_row.data;
  for v_key in select jsonb_object_keys(v_row.data) loop
    if left(v_key, 1) = '_' or v_key in ('parent_id') then
      continue;
    end if;
    if not (v_key = any (v_ok)) then
      v_misfit := v_misfit || jsonb_build_object(v_key, v_row.data -> v_key);
      v_keep := v_keep - v_key;
      -- THE ENVELOPE GOES WITH THE VALUE. A record saying where a value it no longer holds
      -- came from is orphan provenance, and W1-VAL refuses it by name — correctly.
      v_keep := case when v_keep ? '_values'
                     then jsonb_set(v_keep, array['_values'], (v_keep -> '_values') - v_key)
                     else v_keep end;
    end if;
  end loop;

  v_log := history.migration_record(p_organization_id, 'retype', 'record', p_id,
             jsonb_build_object('kind', 'patch', 'record_id', p_id::text,
                                'patch', v_row.data, 'table_id', v_row.table_id::text),
             coalesce(p_note, format('retyped to %s; %s value(s) did not fit and are in History with this reason, neither coerced nor deleted',
                                     coalesce((select t.data ->> 'name' from custom.record t
                                                where t.organization_id = p_organization_id and t.id = v_to_tbl), p_to),
                                     (select count(*) from jsonb_object_keys(v_misfit)))));

  update custom.record r
     set table_id = v_to_tbl, data = v_keep
   where r.organization_id = p_organization_id and r.id = p_id;

  return jsonb_build_object('verb', 'retype', 'record_id', p_id, 'kept_the_id', true,
                            'from_table', v_row.table_id, 'to_table', v_to_tbl,
                            'migration_id', v_log,
                            'misfits', v_misfit,
                            'misfits_are', 'in History with the reason, on migration ' || v_log::text,
                            'at', now());
end;
$function$;

CREATE OR REPLACE FUNCTION custom._door_action_words(p_door text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'pg_catalog'
AS $function$
  -- THE DOOR NEVER REACHES A PERSON (AT-SWEEP-3, moved here by AT-SWEEP-4): the one map from a door to the action in plain words.
  -- custom.assert_client_may_change and custom.assert_client_may_reach / custom._not_a_member_refusal all say THIS, so there is
  -- one place to add a door. Null when the door is not in the map; each caller says its own generic words then.
  select case lower(btrim(coalesce(p_door, ''))) when 'custom.action_declare' then 'Changing a table''s buttons' when 'custom.agent_table_claim' then 'Letting an agent take over a table' when 'custom.automation_declare' then 'Changing an automation' when 'custom.automation_test' then 'Testing an automation' when 'custom.autonumber_backfill' then 'Numbering existing rows' when 'custom.base_move' then 'Moving a base' when 'custom.base_move_access_kept' then 'Seeing who keeps access after a move' when 'custom.base_move_remove_access' then 'Taking back access after a move' when 'custom.booking_declare' then 'Changing a booking page' when 'custom.button_press' then 'Pressing a button' when 'custom.capture_publish' then 'Publishing a capture form' when 'custom.capture_sheet_declare' then 'Changing a capture sheet' when 'custom.checklist_declare' then 'Changing a checklist' when 'custom.checklist_step_complete' then 'Completing a checklist step' when 'custom.dashboard_declare' then 'Changing a dashboard' when 'custom.dashboard_delete' then 'Deleting a dashboard' when 'custom.dashboard_restore' then 'Restoring a dashboard' when 'custom.doc_sign' then 'Signing a document' when 'custom.doc_template_delete' then 'Deleting a document template' when 'custom.doc_template_restore' then 'Restoring a document template' when 'custom.doc_template_save' then 'Saving a document template' when 'custom.enrich_declare' then 'Changing a column''s AI fill' when 'custom.enrich_pin' then 'Pinning an AI-filled value' when 'custom.field_declare' then 'Changing a column' when 'custom.field_make_automatic' then 'Making a column fill itself' when 'custom.field_notify_on_assign' then 'Changing assignment notifications' when 'custom.field_restore' then 'Restoring a column' when 'custom.field_retire' then 'Removing a column' when 'custom.field_update' then 'Changing a column''s settings' when 'custom.form_archive' then 'Archiving a form' when 'custom.form_declare' then 'Changing a form' when 'custom.form_restore' then 'Restoring a form' when 'custom.home_add' then 'Adding a table to a base' when 'custom.inbound_declare' then 'Changing an inbound address' when 'custom.inbound_set' then 'Switching an inbound address on or off' when 'custom.io_import_begin' then 'Starting an import' when 'custom.io_import_declare_columns' then 'Adding columns for an import' when 'custom.io_import_finish' then 'Finishing an import' when 'custom.io_import_forget' then 'Discarding an import' when 'custom.io_import_open' then 'Opening an import' when 'custom.io_import_rows' then 'Importing rows' when 'custom.migrate_choice_keys' then 'Changing a column''s choices' when 'custom.migrate_delete' then 'Deleting a record' when 'custom.migrate_demote' then 'Restructuring a table' when 'custom.migrate_extract_parent' then 'Restructuring a table' when 'custom.migrate_merge' then 'Merging records' when 'custom.migrate_promote' then 'Restructuring a table' when 'custom.migrate_purge' then 'Clearing out a table' when 'custom.migrate_rename' then 'Renaming a record' when 'custom.migrate_reparent' then 'Moving a record under another' when 'custom.migrate_retype' then 'Changing a column''s type' when 'custom.migrate_retype_record' then 'Moving a record to another table' when 'custom.migrate_split' then 'Splitting a record' when 'custom.migrate_undo' then 'Undoing a change' when 'custom.pipeline_declare' then 'Changing a pipeline' when 'custom.portal_archive' then 'Archiving a portal' when 'custom.portal_declare' then 'Changing a portal' when 'custom.portal_invite' then 'Inviting someone to a portal' when 'custom.portal_preview' then 'Previewing a portal' when 'custom.portal_principal_bind' then 'Linking a portal member' when 'custom.portal_restore' then 'Restoring a portal' when 'custom.portal_revoke' then 'Removing someone from a portal' when 'custom.record_change_many' then 'Changing several records' when 'custom.record_delete' then 'Deleting a record' when 'custom.record_reparent' then 'Moving a record' when 'custom.record_restore' then 'Restoring a record' when 'custom.record_restore_preview' then 'Previewing a restore' when 'custom.record_row_controls_set' then 'Changing a row''s controls' when 'custom.record_update' then 'Changing a record' when 'custom.record_upsert' then 'Saving a record' when 'custom.record_write' then 'Adding a record' when 'custom.record_write_graph' then 'Adding a record with its linked records' when 'custom.record_write_graph_superseding' then 'Replacing a record with its linked records' when 'custom.record_write_many' then 'Adding several records' when 'custom.relation_carry' then 'Linking records' when 'custom.relation_own' then 'Linking a record' when 'custom.relation_restore' then 'Restoring a link' when 'custom.relation_reverse_set' then 'Changing a link' when 'custom.relation_uncarry' then 'Unlinking records' when 'custom.row_template_declare' then 'Changing a row template' when 'custom.rule_declare' then 'Changing a rule' when 'custom.rule_restore' then 'Restoring a rule' when 'custom.share_grant' then 'Sharing this' when 'custom.share_lane_set' then 'Changing who can see this' when 'custom.share_revoke' then 'Taking back someone''s access' when 'custom.sign_requests' then 'Seeing signature requests' when 'custom.subscription_declare' then 'Changing a notification' when 'custom.table_archive' then 'Archiving a table' when 'custom.table_decorate' then 'Changing a table''s look' when 'custom.table_dimensions_set' then 'Changing a table''s dimensions' when 'custom.table_ensure' then 'Creating a table' when 'custom.table_restore' then 'Restoring a table' when 'custom.table_share_outside_grant' then 'Sharing a table outside the workspace' when 'custom.table_share_outside_invite' then 'Inviting someone outside the workspace' when 'custom.table_share_outside_resend' then 'Resending an outside invitation' when 'custom.table_share_outside_revoke' then 'Taking back an outside share' when 'custom.table_sync' then 'Syncing a table' when 'custom.table_sync_cell' then 'Syncing a cell' when 'custom.table_sync_settings_set' then 'Changing a table''s sync settings' when 'custom.table_webhook_archive' then 'Removing a webhook' when 'custom.table_webhook_declare' then 'Changing a webhook' when 'custom.table_webhooks' then 'Seeing a table''s webhooks' when 'custom.template_restore' then 'Restoring a template' when 'custom.template_uninstall' then 'Removing a template' when 'custom.view_designate' then 'Choosing a table''s main view' when 'custom.whole_value_complete' then 'Completing a value' when 'custom.whole_values_waiting' then 'Seeing values still waiting' when 'custom.work_assign' then 'Assigning work' when 'custom.work_set_state' then 'Changing the state of work' when 'custom.work_slot_expire' then 'Expiring a held slot' when 'custom.work_slot_hold' then 'Holding a slot' when 'custom.work_slot_release' then 'Releasing a held slot' when 'custom.work_slots_declare' then 'Changing a table''s slots' when 'custom.work_take_assignment' then 'Taking an assignment' when 'custom.work_template_declare' then 'Changing a work template' when 'custom.work_template_instantiate' then 'Starting work from a template' when 'platform.relation_on_delete' then 'Cleaning up links on delete' when 'platform.relation_set' then 'Linking records' when 'platform.relation_unset' then 'Unlinking records' when 'share_grant' then 'Sharing this' when 'share_lane_set' then 'Changing who can see this' when 'share_revoke' then 'Taking back someone''s access' else null end
$function$;
