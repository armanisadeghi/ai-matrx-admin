-- why: AT-SWEEP-3: ten more refusals (found by the wider sweep: "admin on it", "Admin on this", "its admins") said Admin for the access ladder's top rung; the share screens and the vocabulary say Full access.
-- Proof: scripts/campaign-tests/atsweep3_a_the_ladder_refusal_names_the_action_not_the_door.sql (PART 2). Inverse: migrations/inverse/atsweep3_c_more_refusals_say_full_access_not_admin_down.sql
-- based-on: custom._entity_change_file(uuid, uuid, jsonb, text, uuid, text, uuid) 3ac31d5cd43641bb5be38fed17288cba767c82ce81a17a388fe2386cb2232a4a
-- based-on: custom.field_update(uuid, uuid, jsonb) b0bf5c6ce9db23af19ede8b4497d4de6393200fabaa128da7f613d7d9ae9bd46
-- based-on: custom.io_import_finish(uuid, uuid, text) c95ba63e7f5a7e699d311ad5ea1ec2faaaa2b2222d70729cfb128844426362ad
-- based-on: custom.io_import_begin(uuid, uuid, text, text, jsonb, text, jsonb, text, bigint, boolean) a38dabda7367019d5089e7d4e9f44be6997815bfe264fcb664f2378a1ece13e6
-- based-on: public.audience_share_preview(text, uuid, text) e8c957e02daff345ac6bc3c2afd4a27f2a2d1ec1f1f5d2dcd5071ae9fa753dea
-- based-on: iam._audience_plan(text, uuid, permission_level, uuid, text[]) 457f9a8cae388335b679ef7f0f561ff08904e657044b2cb5091ef899077bb8de
-- based-on: custom.work_approval_approvers(uuid, uuid, uuid) cde3ab2e42871c950de1d92d585d81ac8f757b20328398dacc2eff9b1be9674c
-- based-on: custom.work_approval_request(uuid, uuid, jsonb, text, uuid, text, uuid) 20b131d2f638d1a92071344adceffb709e837f4f2ac7e247547aa489a4a91da5
-- based-on: public.revoke_resource_access(text, uuid, uuid) fa0d14fe16b469dbcb07b0e4573c9a75cf6ca6304a9812f695b749352321f844
-- based-on: public.revoke_resource_org_access(text, uuid, uuid) 9aa0aa8edf2b26bc6cd3d87bf35a28fafcfbb6264a3f0e5e4da05f25fdb327bc
CREATE OR REPLACE FUNCTION custom._entity_change_file(p_organization_id uuid, p_subject_id uuid, p_change jsonb, p_note text, p_approver_id uuid, p_origin text, p_conversation_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_me    uuid := custom.query_principal();
  v_token text := nullif(p_change ->> 'token', '');
  t       record;
  v_org   uuid;
  v_title text;
  v_who   jsonb;
  v_id    uuid;
begin
  -- LANE7-W3B: TRIED FIRST, AS THE CALLER. custom.entity_row_propose (SECURITY INVOKER) ran the change
  -- through custom.entity_row_write as the person and rolled it back; only then is it filed. A request
  -- that did not come that way was never tried as anybody, so it is not filed.
  if coalesce(current_setting('custom.entity_change_tried', true), '') is distinct from p_subject_id::text then
    raise exception 'A change to a standard record is asked for through custom.entity_row_propose, which tries it as you first. Nothing was filed.'
      using errcode = '42501';
  end if;
  perform set_config('custom.entity_change_tried', '', true);

  if p_origin not in ('person', 'agent') then
    raise exception 'An approval comes from a person or from an agent, and "%" is neither.', p_origin
      using errcode = '22023';
  end if;
  if p_origin = 'agent' and platform.declared_actor_tier() is distinct from 'agent' then
    raise exception 'This was asked for by a person, so it waits for somebody else to approve it, not as an agent''s request.'
      using errcode = '42501';
  end if;
  if v_token is null then
    raise exception 'A change to a standard record names its table''s token.' using errcode = '22004';
  end if;
  if (jsonb_typeof(coalesce(p_change -> 'columns', '{}'::jsonb)) <> 'object')
     or (jsonb_typeof(coalesce(p_change -> 'custom', '{}'::jsonb)) <> 'object') then
    raise exception 'A change to a standard record names its values as {"name": value}.' using errcode = '22023';
  end if;
  if coalesce(p_change -> 'columns', '{}'::jsonb) = '{}'::jsonb
     and coalesce(p_change -> 'custom', '{}'::jsonb) = '{}'::jsonb
     and jsonb_typeof(p_change -> 'archive') is distinct from 'boolean' then
    raise exception 'A change waiting for approval has to say what it would change.' using errcode = '22004';
  end if;

  select * into t from custom.entity_table(v_token);
  execute format('select x.organization_id, %s from %I.%I x where x.id = $1',
                 case when t.title_column is null then 'null::text' else format('x.%I::text', t.title_column) end,
                 t.schema_name, t.table_name)
    into v_org, v_title using p_subject_id;
  if v_org is null or v_org is distinct from p_organization_id then
    raise exception 'There is no % in this organization with that id, so there is nothing to approve.', t.label
      using errcode = '02000';
  end if;

  if p_approver_id is not null
     and not exists (select 1 from iam.organization_member m
                      where m.organization_id = p_organization_id and m.user_id = p_approver_id) then
    raise exception 'That person is not in this organization, so they cannot be asked to approve anything here.'
      using errcode = '42501';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('user_id', a.user_id, 'name', a.name, 'why', a.why)), '[]'::jsonb)
    into v_who
    from custom.work_approval_approvers(p_organization_id, p_subject_id, p_approver_id) a;
  if jsonb_array_length(v_who) = 0 then
    raise exception 'Nobody in this organization could approve that, so asking would leave it waiting forever.'
      using errcode = '42501',
            hint = 'Name an approver, or ask an owner of the organization to give somebody Full access on it.';
  end if;

  perform set_config('custom.decision_door', 'work_approval:request', true);
  insert into custom.record (organization_id, table_id, data_class, data)
  values (p_organization_id, null, 'work_approval', jsonb_strip_nulls(jsonb_build_object(
    'subject_id',      p_subject_id::text,
    'subject_kind',    'standard_row',
    'subject_token',   t.token,
    'subject_label',   t.label,
    'subject_title',   coalesce(nullif(btrim(v_title), ''), t.label),
    'change',          p_change || jsonb_build_object('label', t.label),
    'origin',          p_origin,
    'note',            nullif(btrim(coalesce(p_note, '')), ''),
    'approver_id',     p_approver_id::text,
    'conversation_id', p_conversation_id::text,
    'requested_by',    v_me::text,
    'requested_at',    to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'state',           'pending')))
  returning id into v_id;
  perform set_config('custom.decision_door', '', true);

  if p_approver_id is not null and not custom.query_is_store_owner() then
    perform custom.share_grant(p_organization_id, v_id, 'person', p_approver_id, 'admin'::public.permission_level);
  end if;

  return jsonb_build_object(
    'approval_id',  v_id,
    'state',        'pending',
    'subject_id',   p_subject_id,
    'subject_kind', 'standard_row',
    'origin',       p_origin,
    'approvers',    v_who,
    'message',      format('This is waiting for %s.',
                      case when jsonb_array_length(v_who) = 1
                           then coalesce(v_who -> 0 ->> 'name', 'somebody')
                           else format('%s people who can approve it', jsonb_array_length(v_who)) end));
end
$function$;

CREATE OR REPLACE FUNCTION custom.field_update(p_organization_id uuid, p_field_id uuid, p_patch jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_old       jsonb;
  v_table     uuid;
  v_next      jsonb;
  v_opts      uuid;
  v_word      text;
  v_spec      jsonb;
  v_was       text;
  v_now       text;
  v_behaviour boolean;
  v_compute_was text;
  v_compute_now text;
  v_parity    text;
  v_restamped integer := 0;
  -- IMPORT-2: THE CLOSED LIST OF WHAT THIS DOOR STORES. A key that is not here is refused by
  -- name; a key that is added to an arm below is added here in the same edit, which is the
  -- whole point — the list and the body cannot drift apart without the door going silent.
  c_settings constant text[] := array[
    'key', 'label', 'required', 'dated', 'sort', 'sensitivity', 'context_policy', 'unit',
    'rules', 'options', 'options_table_id', 'display', 'multi', 'promoted', 'unique',
    'depends_on', 'applies_to_types', 'expr', 'compute_on', 'relation_target', 'relation_max',
    'on_target_delete', 'source', 'source_config', 'review_interval_days',
    'parity_type', 'plain', 'type',
    -- GRID-PRIMITIVES G3 / G5: the formula a person types, and how the grid draws the column.
    'formula_text', 'display_format',
    -- STORE-RULE-GAPS (2): a choice list's "other values allowed" setting.
    'allow_other',
    -- CHOICE-COLUMN-EDIT: choices added to the ones a column already has (the cell's "Add").
    'options_add',
    -- DATA-V2-BASICS-2: what a new record this column is not named in starts with.
    'default',
    -- CHAIR-MATH (b), 2026-10-03: what a lookup or roll-up reads (via, pick, agg, of) and which
    -- linked records a roll-up adds up (filter). Before this they were refused here by name on a
    -- retype, and `filter` did not exist.
    'via', 'pick', 'agg', 'of', 'filter',
    -- LANE 10 P4: a status column's groups and a barcode column's symbology.
    'status_groups', 'symbology',
    -- LANE AT-FORMULA: a column's help text (config.description), shown when the header is hovered.
    'description',
    -- LANE 10 P4 round 3 (V11 #4): a rating's top star, as custom.field_declare takes it.
    'max',
    -- NOTION-PROPS-3: a button column's settings, and a link to its own table that says one record
    -- waits on another (a timeline draws it as a dependency).
    'button', 'dependency',
    -- NOTION-PROPS-3 (b): a one-record link to its own table nests the table's records as sub-items.
    'sub_items',
    -- ACCESS-SETUP §12.1 (Store Tables): the part of the Table this column belongs to (who sees and edits it).
    'part',
    -- W2-A 4: a Last changed time column limited to chosen fields (config.only_fields, the key formula_eval reads).
    'only_fields'];
  v_unknown  text[];
  v_missing_keys text;  -- W2-A 4: only_fields keys this table does not have
  v_target_word text;   -- LANE 10 P4 round 3: the kind a change of behaviour names
  v_maxn     numeric;   -- LANE 10 P4 round 3: a rating's new top star
  v_parsed   jsonb;
  -- CHOICE-COLUMN-EDIT: the choices exactly as they were sent (words, or {id, words}).
  v_opt_entries jsonb;
  -- FX2 (2026-10-17): the choices this column had before this save; only the ones it gains are painted.
  v_opts_before uuid[] := '{}';
  v_painted     jsonb;
begin
  perform custom.assert_store_door(p_organization_id, 'custom.field_update');
  perform custom.assert_client_may_reach(p_organization_id, 'custom.field_update');
  -- VISION-REACH W4 (a): the organization's "Agent changes" setting, enforced here (custom._agent_change_gate).
  perform custom._agent_change_gate(p_organization_id, null, 'custom.field_update', p_field_id);

  -- ── IMPORT-2: STORED OR REFUSED BY NAME, NEVER IGNORED. ─────────────────────────────────
  -- `custom.field_update(field, {"expr": …})` answered with the field id and changed nothing,
  -- because `expr` is read only inside the behaviour arm below. A door that accepts a word and
  -- drops it is the silent failure this store does not allow, and the remedy is a list rather
  -- than one more arm: whatever this body does not store, it says so about, by name.
  select array_agg(k order by k) into v_unknown
    from jsonb_object_keys(coalesce(p_patch, '{}'::jsonb)) k
   where k <> all (c_settings);
  if v_unknown is not null then
    raise exception 'A column has no setting called %.',
        (select string_agg(format('"%s"', u), ', ') from unnest(v_unknown) u)
      using errcode = '23514',
            hint = format('FLD-12: the settings this door changes are %s. Nothing was changed.',
                          (select string_agg(format('%s', s), ', ' order by s) from unnest(c_settings) s));
  end if;

  -- ── CHOICE-COLUMN-EDIT, 2026-09-27: A CHOICE IS KNOWN BY ITS ID, NOT ONLY BY ITS WORDS. ──
  -- The column editor sends each choice as {id, words}, so a re-worded choice is the SAME
  -- option with new words, not one retired and another made (which left every cell holding the
  -- retired one). Every reader below this line still reads plain words; the entries themselves
  -- are what custom._field_choices_save saves.
  if jsonb_typeof(p_patch -> 'options') = 'array' then
    v_opt_entries := p_patch -> 'options';
    p_patch := jsonb_set(p_patch, '{options}', custom._choice_words_array(p_patch -> 'options'));
  end if;
  if p_patch ? 'options_add' and jsonb_typeof(p_patch -> 'options_add') <> 'array' then
    raise exception 'Choices to add are sent as a list of words, and % is not one.', p_patch -> 'options_add'
      using errcode = '23514', hint = 'Send options_add as ["the words", …]. Nothing was changed.';
  end if;
  if p_patch ? 'options_add' and (p_patch ? 'type' or p_patch ? 'parity_type' or p_patch ? 'plain') then
    raise exception 'Adding choices and changing what a column stores are two saves, not one.'
      using errcode = '23514', hint = 'Change what it stores first, then add the choices. Nothing was changed.';
  end if;

  select r.data, (r.data ->> 'entity_definition_id')::uuid into v_old, v_table
    from custom.record r
   where r.organization_id = p_organization_id
     and r.id = p_field_id
     and r.table_id = custom.field_kernel_id()
     and r.deleted_at is null;
  v_opts_before := custom._choice_ids_live(p_organization_id, nullif(v_old -> 'config' ->> 'options_table_id', '')::uuid);
  if v_old is null then
    raise exception 'There is no such field in this organization, so nothing was changed.'
      using errcode = '23514', hint = 'REC-29: organizations are hard walls.';
  end if;
  if v_table is not null then
    perform custom.assert_client_may_change(p_organization_id, v_table, 'custom.field_update',
                                            'admin'::public.permission_level, 'table');
  end if;

  -- ── GRID-PRIMITIVES G3, 2026-09-22: A TYPED FORMULA BECOMES THE EXPRESSION HERE. ─────────
  -- The person edits text; the store parses it against this Table's columns and the rest of
  -- this door stores the expression exactly as if it had been sent, so every refusal below
  -- ("not worked out by the store", FIX-10B-F5's column check) still applies to it.
  if p_patch ? 'formula_text' then
    if v_table is null then
      raise exception 'A typed formula reads the columns of a table, and this field belongs to none.'
        using errcode = '23514';
    end if;
    v_parsed := custom.formula_parse(p_organization_id, v_table, p_patch ->> 'formula_text');
    if not coalesce((v_parsed ->> 'ok')::boolean, false) then
      raise exception 'The formula for "%" cannot be worked out: % (at character %).',
                      coalesce(nullif(v_old ->> 'label', ''), v_old ->> 'key'),
                      v_parsed ->> 'error', coalesce((v_parsed ->> 'position')::integer, 0) + 1
        using errcode = '23514',
              hint = 'GRID-PRIMITIVES G3: a formula names columns in braces, like {Visit fee} - {Deposit taken}; select signature, says from custom.formula_node_kinds() lists every function. Nothing was changed.';
    end if;
    p_patch := p_patch || jsonb_build_object('expr', v_parsed -> 'expr');
  end if;

  if nullif(p_patch ->> 'key', '') is not null and (p_patch ->> 'key') is distinct from (v_old ->> 'key') then
    raise exception 'A field''s key is how every saved value finds it, so it cannot be renamed.'
      using errcode = '23514', hint = 'The name a person reads is the label, and that can be changed freely.';
  end if;

  -- ── DATA-V2-BASICS, 2026-09-27: TWO COLUMNS OF ONE TABLE NEVER READ THE SAME. ──────────────
  -- BREAKER-1 F8: renaming "Notes" to "Patient Name" beside a real "Patient Name" was taken, the
  -- header row then read "Patient Name" twice over different data, and a 500-row paste matched its
  -- header to the wrong one and blanked a real column (F10). A person tells columns apart by their
  -- names, so a rename onto another column's name is refused, naming it.
  if p_patch ? 'label' and v_table is not null
     and lower(btrim(coalesce(p_patch ->> 'label', ''))) is distinct from lower(btrim(coalesce(v_old ->> 'label', '')))
     and exists (select 1 from custom.record r
                  where r.organization_id = p_organization_id
                    and r.table_id = custom.field_kernel_id()
                    and r.data_class = 'field'
                    and r.deleted_at is null
                    and r.id <> p_field_id
                    and r.data ->> 'entity_definition_id' = v_table::text
                    and lower(btrim(coalesce(r.data ->> 'label', ''))) = lower(btrim(coalesce(p_patch ->> 'label', '')))) then
    raise exception 'You already have a column called "%".', btrim(p_patch ->> 'label')
      using errcode = '23505',
            hint = 'Give this column another name, or rename the other one first. Nothing was changed.';
  end if;

  -- ── IS THIS A CHANGE OF BEHAVIOUR? T12. ───────────────────────────────────────────────
  -- Any of the three words a caller uses for it. The door used to refuse one of them and
  -- ignore the other two; it now carries all three out through the same function that shapes
  -- a field when it is created, so a column changed and a column created are the same shape.
  v_behaviour := coalesce(nullif(p_patch ->> 'parity_type', ''),
                          nullif(p_patch ->> 'plain', ''),
                          nullif(p_patch ->> 'type', '')) is not null;

  -- LANE 10 P4 round 3 (V11 #3): TWO CHANGES OF KIND A COLUMN CANNOT MAKE, said plainly. A Count is
  -- declared with the link column it counts, so a column cannot become one; and a column that fills
  -- itself in (Created by, Last changed by, a Count) cannot become another kind.
  if v_behaviour then
    v_target_word := lower(btrim(coalesce(nullif(p_patch ->> 'parity_type', ''), nullif(p_patch ->> 'plain', ''), p_patch ->> 'type')));
    if v_target_word in ('count', 'count_of_linked', 'link_count') and custom.field_kind_of(v_old) is distinct from 'count' then
      raise exception 'A column cannot become a Count. Add a Count column instead; it counts the records a link column points at.'
        using errcode = '23514', hint = 'P4: declare a column of type count with via naming the link column. Nothing was changed.';
    end if;
    if custom.field_kind_of(v_old) in ('created_by', 'modified_by', 'count')
       and v_target_word is distinct from custom.field_kind_of(v_old) then
      raise exception '"%" fills itself in, so it cannot become another kind of column. Add a new column instead.',
                      coalesce(nullif(v_old ->> 'label', ''), v_old ->> 'key')
        using errcode = '23514', hint = 'P4: Created by, Last changed by and a Count are worked out by the store. Nothing was changed.';
    end if;
  end if;

  -- ACCESS-SETUP §12.1: a column's part is a setting of its own, never carried by a change of kind.
  if v_behaviour and p_patch ? 'part' then
    raise exception 'Change what "%" holds and who sees it in two steps.',
        coalesce(nullif(v_old ->> 'label', ''), v_old ->> 'key')
      using errcode = '23514', hint = 'ACCESS-SETUP: send part on its own patch. Nothing was changed.';
  end if;

  if v_behaviour then
    -- The spec is everything this field already is, with the patch written over it. The key
    -- and the table never move; `custom._field_document_for` decides the rest.
    v_spec := jsonb_strip_nulls(jsonb_build_object(
      'key',            v_old ->> 'key',
      'label',          coalesce(p_patch ->> 'label', v_old ->> 'label'),
      -- LANE 10 P4 round 3 (V11 #8): "several" and a unit are carried only to a kind that takes them,
      -- so a column changed to a rating or an address is never refused for what it used to be.
      'multi',          coalesce(p_patch -> 'multi',
                                 case when v_target_word in ('rating', 'stars', 'star_rating', 'duration', 'address', 'rich_text',
                                                             'status', 'created_by', 'modified_by', 'count', 'select', 'checkbox')
                                      then null else v_old -> 'multi' end),
      'dated',          coalesce(p_patch -> 'dated', v_old -> 'dated'),
      'required',       coalesce(p_patch -> 'required', v_old -> 'required'),
      'sort',           coalesce(p_patch -> 'sort', v_old -> 'sort'),
      'source',         coalesce(p_patch ->> 'source', v_old ->> 'source'),
      'source_config',  coalesce(p_patch -> 'source_config', v_old -> 'source_config'),
      'sensitivity',    coalesce(p_patch ->> 'sensitivity', v_old ->> 'sensitivity'),
      'context_policy', coalesce(p_patch ->> 'context_policy', v_old ->> 'context_policy'),
      'applies_to_types', coalesce(p_patch -> 'applies_to_types', v_old -> 'applies_to_types'),
      'depends_on',     coalesce(p_patch -> 'depends_on', v_old -> 'depends_on'),
      'unit',           coalesce(p_patch ->> 'unit',
                                 case when v_target_word in ('number', 'range', 'integer', 'decimal', 'float', 'currency')
                                      then v_old ->> 'unit' end),
      'max',            p_patch -> 'max',
      'expr',           coalesce(p_patch -> 'expr', v_old -> 'config' -> 'expr'),
      -- CHAIR-MATH (b), 2026-10-03: WHAT A LOOKUP OR ROLL-UP READS rides a change of kind too.
      -- This fixed key list never carried via / pick / agg / of, so a column retyped to a rollup
      -- through this door was refused by the guard as "has to say which relation it reads
      -- through" however the caller spelled it; and the new filter rides beside them.
      'via',            coalesce(nullif(p_patch ->> 'via', ''),  v_old -> 'config' ->> 'via'),
      'pick',           coalesce(nullif(p_patch ->> 'pick', ''), v_old -> 'config' ->> 'pick'),
      'agg',            coalesce(nullif(p_patch ->> 'agg', ''),  v_old -> 'config' ->> 'agg'),
      'of',             coalesce(nullif(p_patch ->> 'of', ''),   v_old -> 'config' ->> 'of'),
      'filter',         case when p_patch ? 'filter' then p_patch -> 'filter'
                             else v_old -> 'config' -> 'filter' end,
      -- TAILS-2, 2026-09-21: WHEN a worked-out column works itself out is part of what the
      -- column IS, and this builder's fixed key list did not carry it — so a caller who
      -- retyped a formula and said `compute_on` got `custom._field_document_for`'s default
      -- ('read') and no word about it. It is carried now; a rollup still gets 'read', and
      -- that is said out loud rather than swallowed (see the settings arm below).
      'compute_on',     coalesce(nullif(p_patch ->> 'compute_on', ''), v_old ->> 'compute_on'),
      'on_target_delete', coalesce(p_patch ->> 'on_target_delete', v_old ->> 'on_target_delete'),
      -- DATA-V2-BASICS-2 (BREAKER-2 B2-07): the table a relation points at rides the change of kind. A
      -- column made a Relation from its settings, naming its table, was refused "does not say which".
      'relation_target', coalesce(nullif(p_patch ->> 'relation_target', ''), v_old ->> 'relation_target'),
      'options_table_id', coalesce(p_patch ->> 'options_table_id', v_old -> 'config' ->> 'options_table_id'),
      'options',        p_patch -> 'options',
      'rules',          coalesce(p_patch -> 'rules', v_old -> 'rules'),
      -- DEFECTS A1: `unique: true` reaches the one field-document builder, which turns it into the unique rule.
      'unique',         p_patch -> 'unique',
      -- GRID-PRIMITIVES G3 / G5: carried like every other setting, so a retyped column keeps them.
      'formula_text',   case when p_patch ? 'formula_text' then p_patch -> 'formula_text'
                             when p_patch ? 'expr' then null
                             else v_old -> 'config' -> 'formula_text' end,
      'display_format', coalesce(p_patch -> 'display_format', v_old -> 'display_format'),
      -- LANE 10 P4: carried like every other setting, so a status keeps its groups and a barcode
      -- its symbology when the column is saved through its kind.
      'status_groups',  coalesce(p_patch -> 'status_groups', v_old -> 'config' -> 'status_groups'),
      'symbology',      coalesce(p_patch -> 'symbology', v_old -> 'config' -> 'symbology')));
    -- The patch's own word for the behaviour, whichever of the three it used.
    if nullif(p_patch ->> 'parity_type', '') is not null then
      v_spec := v_spec || jsonb_build_object('parity_type', p_patch ->> 'parity_type');
    elsif nullif(p_patch ->> 'plain', '') is not null then
      v_spec := v_spec || jsonb_build_object('plain', p_patch ->> 'plain');
    else
      v_spec := v_spec || jsonb_build_object('type', p_patch ->> 'type');
    end if;

    v_next := custom._field_document_for(p_organization_id, v_table, v_spec);
    -- The key and the table are this field's identity and _field_document_for takes them from
    -- the spec; written again here so a spec that lost one cannot silently move a field.
    v_next := v_next || jsonb_build_object('key', v_old ->> 'key');
    -- SEAT-SUITES: a column that was indexed stays indexed when it changes what it holds,
    -- unless the patch says otherwise. `custom._field_document_for` builds a fresh document
    -- and knows nothing about either setting, so without this a retype silently un-promoted
    -- the column and the index went on standing for a shape that no longer exists.
    if coalesce(p_patch -> 'promoted', v_old -> 'promoted') is not null then
      v_next := v_next || jsonb_build_object('promoted', coalesce(p_patch -> 'promoted', v_old -> 'promoted'));
    end if;
    if coalesce(p_patch -> 'unique', v_old -> 'unique') is not null then
      v_next := v_next || jsonb_build_object('unique', coalesce(p_patch -> 'unique', v_old -> 'unique'));
    end if;
    -- W1-STORE 4d: `unique: false` TAKES THE UNIQUE RULE OFF. It used to store the flag and keep the rule, so a column a
    -- person had made not-unique went on refusing duplicates. Callers read first: no database function passes `unique`
    -- to this door (promote_table adds the rule itself and never calls it; promote_field is not client-callable); the
    -- only sender is a person's settings change in the grid, so this is that and nothing else. A promoted column's
    -- already-built unique index is not touched here (it is the index's own change to make).
    if lower(coalesce(p_patch ->> 'unique', '')) in ('false', 'f', '0', 'no') then
      v_next := jsonb_set(v_next, '{rules}', coalesce((select jsonb_agg(x order by n)
                  from jsonb_array_elements(coalesce(v_next -> 'rules', '[]'::jsonb)) with ordinality e(x, n)
                 where x ->> 'kind' is distinct from 'unique'), '[]'::jsonb));
    end if;
    if v_table is not null then
      v_next := v_next || jsonb_build_object('entity_definition_id', v_table::text);
    end if;

    -- DATA-V2-BASICS-2 (2026-09-29, BREAKER-2 B2-05 / B2-15): A COLUMN THAT STOPS BEING A LIST.
    -- (1) Several choices turn off, and the values are kept as words ("Neck, Knee"): a Multi-choice
    --     column changed to Text kept `multi` and every value was refused as "holds many values",
    --     so it could never be made Text at all.
    -- (2) Its list goes with it, kept (`config.list_kept`): changing Visit Status to Text and back
    --     made a second "Visit Status choices" with only the words in use — the unused No-show and
    --     every colour were gone. Changing it back to a choice column takes the same list again.
    if (v_old ->> 'type') = 'list' and (v_next ->> 'type') <> 'list' then
      if not (p_patch ? 'multi') and v_next ? 'multi' then
        v_next := jsonb_set(v_next, '{multi}', 'false'::jsonb);
      end if;
      if nullif(v_old -> 'config' ->> 'options_table_id', '') is not null then
        v_next := jsonb_set(v_next, '{config}', coalesce(v_next -> 'config', '{}'::jsonb)
                    || jsonb_build_object('list_kept', v_old -> 'config' -> 'options_table_id'));
        -- (3) DATA-V2-BASICS-2 (2026-10-01, BREAKER-3/4 B3-15): its "take other values" setting is kept
        --     with it, so a strict column changed to Text and back is strict again, never silently open.
        if jsonb_typeof(v_old -> 'config' -> 'allow_other') = 'boolean' then
          v_next := jsonb_set(v_next, '{config}', (v_next -> 'config')
                      || jsonb_build_object('list_kept_allow_other', v_old -> 'config' -> 'allow_other'));
        end if;
      end if;
    elsif (v_next ->> 'type') <> 'list' and nullif(v_old -> 'config' ->> 'list_kept', '') is not null then
      v_next := jsonb_set(v_next, '{config}', coalesce(v_next -> 'config', '{}'::jsonb)
                  || jsonb_build_object('list_kept', v_old -> 'config' -> 'list_kept'));
      if jsonb_typeof(v_old -> 'config' -> 'list_kept_allow_other') = 'boolean' then
        v_next := jsonb_set(v_next, '{config}', (v_next -> 'config')
                    || jsonb_build_object('list_kept_allow_other', v_old -> 'config' -> 'list_kept_allow_other'));
      end if;
    end if;

    -- THE LIST KEPT COMES BACK (B2-15): a column that becomes a list again takes the list it had, when
    -- that list is still live, and adds any new words the caller sent to it.
    if (v_next ->> 'type') = 'list'
       and nullif(v_next -> 'config' ->> 'options_table_id', '') is null
       and nullif(v_old -> 'config' ->> 'list_kept', '') is not null
       and exists (select 1 from custom.record t
                    where t.organization_id = p_organization_id
                      and t.id = (v_old -> 'config' ->> 'list_kept')::uuid
                      and t.table_id = custom.table_kernel_id()
                      and t.deleted_at is null) then
      v_opts := (v_old -> 'config' ->> 'list_kept')::uuid;
      v_next := jsonb_set(v_next, '{config,options_table_id}', to_jsonb(v_opts::text));
      -- The kept "take other values" comes back with it, unless this change names it (B3-15).
      if not (p_patch ? 'allow_other') and jsonb_typeof(v_old -> 'config' -> 'list_kept_allow_other') = 'boolean' then
        v_next := jsonb_set(v_next, '{config}', (v_next -> 'config')
                    || jsonb_build_object('allow_other', v_old -> 'config' -> 'list_kept_allow_other'));
      end if;
      if jsonb_typeof(p_patch -> 'options') = 'array' and jsonb_array_length(p_patch -> 'options') > 0 then
        perform custom._field_choices_save(p_organization_id, v_opts, coalesce(v_opt_entries, p_patch -> 'options'), true);
      end if;
    end if;
    if (v_next ->> 'type') = 'list' and ((v_next -> 'config') ? 'list_kept' or (v_next -> 'config') ? 'list_kept_allow_other') then
      v_next := jsonb_set(v_next, '{config}', (v_next -> 'config') - 'list_kept' - 'list_kept_allow_other');
    end if;

    v_was := custom.field_behaviour(v_old);
    v_now := custom.field_behaviour(v_next);

    -- THE CHOICES. A column that becomes a list gets its Table of choices here, with the words
    -- the caller typed — or with none (lane CHOICE-COLUMN-EDIT, 2026-09-27: a choice column made
    -- with no choices yet stays a choice column with an empty list; it used to be refused, and the
    -- Sheet's Add column kept the column as plain text without a word). Its first choice is added
    -- from its settings, or from a cell (options_add, the enum nudge).
    if (v_next ->> 'type') = 'list'
       and nullif(v_next -> 'config' ->> 'options_table_id', '') is null then
      v_opts := custom._options_table_for(p_organization_id, v_next ->> 'label',
                                          case when jsonb_typeof(p_patch -> 'options') = 'array'
                                               then p_patch -> 'options' else '[]'::jsonb end);
      v_next := jsonb_set(v_next, '{config,options_table_id}', to_jsonb(v_opts::text));
    end if;

    -- STORE-RULE-GAPS (2): "other values allowed" is the list's own setting, so a retype that
    -- stays a list (one choice ↔ several) keeps it, and a patch that names it sets it. The
    -- shape guard refuses it on anything that is not a list, by name.
    if (v_next ->> 'type') = 'list' and p_patch ? 'allow_other' then
      v_next := jsonb_set(v_next, '{config}', coalesce(v_next -> 'config', '{}'::jsonb)
                          || jsonb_build_object('allow_other', p_patch -> 'allow_other'));
    elsif (v_next ->> 'type') = 'list' and (v_old -> 'config') ? 'allow_other' then
      v_next := jsonb_set(v_next, '{config}', coalesce(v_next -> 'config', '{}'::jsonb)
                          || jsonb_build_object('allow_other', v_old -> 'config' -> 'allow_other'));
    elsif p_patch ? 'allow_other' then
      raise exception 'Only a choice column can take values that are not one of its choices, and "%" will not be one.',
          coalesce(nullif(v_next ->> 'label', ''), v_next ->> 'key')
        using errcode = '23514', hint = 'FLD-5: allow_other belongs to a list field. Nothing was changed.';
    end if;

    -- ── RELATION-DECLARE, 2026-09-20: THE LINKS GO FIRST, THEN THE COLUMN CHANGES. ────
    -- Retyping a relation column to text left its edges LIVE in platform.associations, still
    -- naming a field that no longer behaves as a relation - and platform.relations_to then
    -- raised 23514 for EVERY record of the table it used to point at. One column took down
    -- the whole reverse side of another table. The links go in the same operation as the
    -- change that made them meaningless, softly, so REL-13's history keeps its record of them.
    if (v_old ->> 'type') = 'relation'
       and ((v_next ->> 'type') is distinct from 'relation'
            or (v_next ->> 'relation_target') is distinct from (v_old ->> 'relation_target')) then
      perform custom.relation_edges_withdraw(p_organization_id, array[p_field_id],
        case when (v_next ->> 'type') is distinct from 'relation'
             then format('"%s" no longer points at other records',
                         coalesce(v_next ->> 'label', v_next ->> 'key'))
             else format('"%s" now points at a different table',
                         coalesce(v_next ->> 'label', v_next ->> 'key')) end);
    end if;

    -- DATA-V2-BASICS-2 (2026-09-27): A COLUMN'S DEFAULT IS ONE OF ITS SETTINGS. `default` is what a
    -- new record this column is not named in starts with (custom.record_write fills it); null
    -- clears it. A column that changes what it holds keeps its default — a default that no longer
    -- fits is simply not filled, never a refusal.
    if p_patch ? 'default' then
      v_next := case when p_patch -> 'default' is null or jsonb_typeof(p_patch -> 'default') = 'null'
                     then v_next - 'default' else jsonb_set(v_next, '{default}', p_patch -> 'default') end;
    elsif v_old ? 'default' and not (v_next ? 'default') then
      -- DATA-V2-BASICS-2 (2026-09-29, BREAKER-2 B2-01): THE DEFAULT IS CARRIED LIKE THE VALUES. A default
      -- the column can no longer hold would make every new row fail, so it converts the way a cell does
      -- (custom._field_value_carry: a choice by its words, words to their choice) or it goes, said.
      if coalesce(jsonb_typeof(custom._field_value_carry(p_organization_id, v_old, v_next, v_old -> 'default')), 'null') <> 'null' then
        v_next := v_next || jsonb_build_object('default',
                    custom._field_value_carry(p_organization_id, v_old, v_next, v_old -> 'default'));
      else
        raise notice 'custom: "%" no longer has a default: % does not fit what it holds now.',
          coalesce(v_next ->> 'label', v_next ->> 'key'), coalesce((v_old -> 'default')::text, 'it');
      end if;
    end if;

    -- DATA-V2-BASICS-2 (2026-09-29): the default fits what the column holds now, or the save is refused.
    v_next := custom._field_default_fitted(p_organization_id, v_next);

    -- AND THE WRITE, which is what fires custom._field_type_converts_values: every value of
    -- this column is converted where it converts and kept in `_retired` with its reason where
    -- it does not, and the history.migration_log row is written by that same trigger. Nothing
    -- here duplicates any of it — this door's whole job was to let it happen.
    update custom.record
       set data = v_next, updated_at = now(), version = version + 1
     where organization_id = p_organization_id
       and id = p_field_id
       and table_id = custom.field_kernel_id();

    -- FX2: A COLUMN THAT BECAME A CHOICE COLUMN takes its words as choices in the write above (F2's
    -- `_field_type_converts_values` trigger), so they are painted here, once, and only when there is
    -- something to paint (measured: a text → Choice retype drew every choice grey).
    if coalesce(v_old ->> 'type', '') <> 'list' and (v_next ->> 'type') = 'list' then
      select r.data into v_painted
        from custom.record r
       where r.organization_id = p_organization_id and r.id = p_field_id and r.table_id = custom.field_kernel_id();
      if v_painted is not null then
        v_next := custom._choices_paint_new(p_organization_id, v_painted, v_opts_before);
        if v_next is distinct from v_painted then
          update custom.record
             set data = v_next, updated_at = now(), version = version + 1
           where organization_id = p_organization_id
             and id = p_field_id
             and table_id = custom.field_kernel_id();
        end if;
      end if;
    end if;
    if v_was is not distinct from v_now then
      raise notice 'custom: "%" still behaves as %; its other settings were saved.',
        coalesce(v_next ->> 'label', v_next ->> 'key'), coalesce(v_now, 'before');
    end if;
    return p_field_id;
  end if;

  -- ── OTHERWISE: THE SETTINGS, exactly as before. ───────────────────────────────────────
  v_next := v_old;
  -- ── ACCESS-SETUP §12.1 (Store Tables): WHICH PART OF THE TABLE THIS COLUMN BELONGS TO. ─────
  -- A table admin's choice, never an agent's (constraint d); the column that names each record and a
  -- worked-out column (as private as every column it reads) never carry one. Null or '' takes it back.
  if p_patch ? 'part' then
    if platform.declared_actor_tier() is not distinct from 'agent' then
      raise exception 'An agent never decides who sees a column. A table admin does that in "Who can see and edit".'
        using errcode = '42501', hint = 'ACCESS-SETUP §12 (d): no agent door writes a part. Nothing was changed.';
    end if;
    if auth.uid() is not null
       and custom.effective_level(auth.uid(), p_organization_id,
                                  nullif(v_old ->> 'entity_definition_id', '')::uuid, 'record') is distinct from 'admin' then
      raise exception 'Only a table admin decides who sees "%".', coalesce(nullif(v_old ->> 'label', ''), v_old ->> 'key')
        using errcode = '42501', hint = 'ACCESS-SETUP §12 (d): moving a column into a part needs Full access on its Table. Nothing was changed.';
    end if;
    if jsonb_typeof(p_patch -> 'part') = 'null' or btrim(coalesce(p_patch ->> 'part', '')) = '' then
      v_next := v_next - 'part';
    else
      if coalesce(v_old ->> 'type', '') = 'formula' then
        raise exception '"%" is worked out from other columns, so it is as private as what it reads and has no part of its own.',
            coalesce(nullif(v_old ->> 'label', ''), v_old ->> 'key')
          using errcode = '23514', hint = 'ACCESS-SETUP §12.1: move the columns it reads instead. Nothing was changed.';
      end if;
      if exists (select 1 from custom.record t
                  where t.id = nullif(v_old ->> 'entity_definition_id', '')::uuid
                    and t.table_id = custom.table_kernel_id()
                    and t.data ->> 'title_field' = v_old ->> 'key') then
        raise exception '"%" names each record, so everyone who can open a row sees it.',
            coalesce(nullif(v_old ->> 'label', ''), v_old ->> 'key')
          using errcode = '23514', hint = 'ACCESS-SETUP §12.1: pick another column to name each record first. Nothing was changed.';
      end if;
      if jsonb_typeof(p_patch -> 'part') <> 'string' or char_length(btrim(p_patch ->> 'part')) > 40 then
        raise exception 'A part is named in words, at most 40 characters (for example "Pay").'
          using errcode = '22023', hint = 'ACCESS-SETUP: send part as a short name, or null to take it back. Nothing was changed.';
      end if;
      v_next := jsonb_set(v_next, '{part}', to_jsonb(btrim(p_patch ->> 'part')));
    end if;
  end if;
  if p_patch ? 'label'          then v_next := jsonb_set(v_next, '{label}', to_jsonb(p_patch ->> 'label')); end if;
  if p_patch ? 'required'       then v_next := jsonb_set(v_next, '{required}', to_jsonb(coalesce((p_patch ->> 'required')::boolean, false))); end if;
  if p_patch ? 'dated'          then v_next := jsonb_set(v_next, '{dated}', to_jsonb(coalesce((p_patch ->> 'dated')::boolean, false))); end if;
  if p_patch ? 'sort'           then v_next := jsonb_set(v_next, '{sort}', to_jsonb(coalesce((p_patch ->> 'sort')::numeric, 100))); end if;
  if p_patch ? 'sensitivity'    then v_next := jsonb_set(v_next, '{sensitivity}', to_jsonb(p_patch ->> 'sensitivity')); end if;
  if p_patch ? 'context_policy' then v_next := jsonb_set(v_next, '{context_policy}', to_jsonb(p_patch ->> 'context_policy')); end if;
  if p_patch ? 'unit'           then v_next := jsonb_set(v_next, '{unit}', to_jsonb(p_patch ->> 'unit')); end if;
  if p_patch ? 'applies_to_types' then
    v_next := jsonb_set(v_next, '{applies_to_types}',
                        case when jsonb_typeof(p_patch -> 'applies_to_types') = 'array'
                             then p_patch -> 'applies_to_types' else '[]'::jsonb end);
  end if;
  if p_patch ? 'options_table_id' then
    v_next := jsonb_set(v_next, '{config,options_table_id}', to_jsonb(p_patch ->> 'options_table_id'));
  end if;
  -- LANE 10 P4: a status column's groups, and a barcode column's symbology, changed in place.
  -- custom._field_kind_shape_ok refuses either on a column that is not that kind, by name.
  if p_patch ? 'status_groups' then
    -- V8 #3: MERGED into the groups the column holds, never replacing them; the Field guard keys
    -- each name to its choice, refuses a name that is no choice, and drops removed choices.
    v_next := jsonb_set(v_next, '{config,status_groups}',
                coalesce(case when jsonb_typeof(v_old -> 'config' -> 'status_groups') = 'object'
                              then v_old -> 'config' -> 'status_groups' end, '{}'::jsonb)
                || custom.status_groups_of(p_patch -> 'status_groups'));
  end if;
  if p_patch ? 'symbology' then
    v_next := case when nullif(btrim(coalesce(p_patch ->> 'symbology', '')), '') is null
                   then v_next #- '{config,symbology}'
                   else jsonb_set(v_next, '{config,symbology}', to_jsonb(lower(btrim(p_patch ->> 'symbology')))) end;
  end if;

  -- NOTION-PROPS-3 (2026-10-08): A BUTTON'S SETTINGS, changed in place — its label, its colour and what a
  -- press does ({label, color?, do?, url?, automation_id?, action_id?}). The object REPLACES config.button;
  -- custom._field_kind_shape_ok judges it as the document lands (a do that is none of the three, a link
  -- that is not one, an automation or action id that is not an id are refused there, by name).
  if p_patch ? 'button' then
    if custom.field_kind_of(v_old) is distinct from 'button' then
      raise exception '"%" is not a button, so it has no button settings.', coalesce(nullif(v_old ->> 'label', ''), v_old ->> 'key')
        using errcode = '23514', hint = 'NOTION-PROPS-3: send button only for a button column. Nothing was written.';
    end if;
    if jsonb_typeof(p_patch -> 'button') is distinct from 'object' then
      raise exception 'A button''s settings are its label, its colour and what a press does.'
        using errcode = '22023', hint = 'NOTION-PROPS-3: button = {"label": "…", "color": "…", "do": "open_url" | "run_automation" | "run_action", …}. Nothing was written.';
    end if;
    if (p_patch -> 'button') ? 'color' and (p_patch -> 'button' ->> 'color') is not null
       and (p_patch -> 'button' ->> 'color') !~ '^[a-z_]{1,24}$' then
      raise exception 'A button''s colour is one of the table''s colour names, and "%" is not one.', left(p_patch -> 'button' ->> 'color', 40)
        using errcode = '22023', hint = 'NOTION-PROPS-3: a colour name like blue, green or red. Nothing was written.';
    end if;
    v_next := jsonb_set(v_next, '{config}', coalesce(v_next -> 'config', '{}'::jsonb) || jsonb_build_object('button',
                jsonb_strip_nulls((p_patch -> 'button') || jsonb_build_object('label',
                  coalesce(nullif(btrim(p_patch -> 'button' ->> 'label'), ''), v_next ->> 'label', v_old ->> 'label')))));
  end if;
  -- AIRTABLE PARITY (lane AT-FORMULA): A COLUMN'S HELP TEXT (config.description). Plain text of at most 300
  -- characters; empty or null takes it away. It rides config, so it survives a change of kind.
  if p_patch ? 'description' then
    if jsonb_typeof(p_patch -> 'description') not in ('string', 'null') then
      raise exception 'A column''s help text is words.' using errcode = '22023',
        hint = 'AT-FORMULA: description is text of at most 300 characters, or null to clear it. Nothing was written.';
    end if;
    if char_length(coalesce(p_patch ->> 'description', '')) > 300 then
      raise exception 'A column''s help text is at most 300 characters.' using errcode = '22023',
        hint = 'AT-FORMULA: shorten description. Nothing was written.';
    end if;
    v_next := case when nullif(btrim(coalesce(p_patch ->> 'description', '')), '') is null
                   then v_next #- '{config,description}'
                   else jsonb_set(v_next, '{config}', coalesce(v_next -> 'config', '{}'::jsonb)
                                  || jsonb_build_object('description', btrim(p_patch ->> 'description'))) end;
  end if;
  -- W2-A 4 (AIRTABLE-PARITY row 89): A LAST CHANGED TIME COLUMN WATCHES ONLY THESE FIELDS (config.only_fields). A list of
  -- this table's own field keys; the column then answers the latest moment one of them was written (formula_eval reads
  -- the per-field stamps). Empty or null takes the limit away: the column follows the whole record again.
  if p_patch ? 'only_fields' then
    if coalesce(v_old -> 'config' ->> 'system', '') <> 'modified_time' then
      raise exception '"%" is not a last changed time column, so it watches no fields.', coalesce(nullif(v_old ->> 'label', ''), v_old ->> 'key')
        using errcode = '23514', hint = 'W2-A: send only_fields only for a last changed time column. Nothing was written.';
    end if;
    if jsonb_typeof(p_patch -> 'only_fields') not in ('array', 'null')
       or exists (select 1 from jsonb_array_elements(case when jsonb_typeof(p_patch -> 'only_fields') = 'array' then p_patch -> 'only_fields' else '[]'::jsonb end) e
                   where jsonb_typeof(e) <> 'string') then
      raise exception 'The fields a last changed time column watches are a list of column keys.' using errcode = '22023',
        hint = 'W2-A: only_fields = ["title", "status"], or null to watch the whole record. Nothing was written.';
    end if;
    select string_agg(k, ', ') into v_missing_keys
      from jsonb_array_elements_text(case when jsonb_typeof(p_patch -> 'only_fields') = 'array' then p_patch -> 'only_fields' else '[]'::jsonb end) k
     where not exists (select 1 from custom.record f
                        where f.organization_id = p_organization_id and f.table_id = custom.field_kernel_id() and f.deleted_at is null
                          and (f.data ->> 'entity_definition_id') = (v_old ->> 'entity_definition_id') and (f.data ->> 'key') = k
                          and f.id <> p_field_id);
    if v_missing_keys is not null then
      raise exception 'This table has no other column called %.', v_missing_keys using errcode = '23514',
        hint = 'W2-A: only_fields names this table''s own column keys. Nothing was written.';
    end if;
    v_next := case when coalesce(jsonb_array_length(case when jsonb_typeof(p_patch -> 'only_fields') = 'array' then p_patch -> 'only_fields' end), 0) = 0
                   then v_next #- '{config,only_fields}'
                   else jsonb_set(v_next, '{config}', coalesce(v_next -> 'config', '{}'::jsonb)
                                  || jsonb_build_object('only_fields', (select jsonb_agg(distinct k) from jsonb_array_elements_text(p_patch -> 'only_fields') k))) end;
  end if;
  -- NOTION-PROPS-3: A LINK TO ITS OWN TABLE MAY SAY ONE RECORD WAITS ON ANOTHER (config.dependency). A timeline
  -- draws each such link as a connector, and moving a record moves the records waiting on it.
  if p_patch ? 'dependency' then
    if coalesce(v_old ->> 'type', '') <> 'relation'
       or coalesce(v_old ->> 'relation_target', '') is distinct from coalesce(v_old ->> 'entity_definition_id', '-') then
      raise exception '"%" does not link a table to itself, so it cannot say one record waits on another.',
        coalesce(nullif(v_old ->> 'label', ''), v_old ->> 'key')
        using errcode = '23514', hint = 'NOTION-PROPS-3: dependency is a setting of a link to its own table. Nothing was written.';
    end if;
    if jsonb_typeof(p_patch -> 'dependency') not in ('boolean', 'null') then
      raise exception 'Whether a link is a dependency is yes or no.' using errcode = '22023',
        hint = 'NOTION-PROPS-3: dependency is true or false. Nothing was written.';
    end if;
    v_next := case when coalesce((p_patch ->> 'dependency')::boolean, false)
                   then jsonb_set(v_next, '{config}', coalesce(v_next -> 'config', '{}'::jsonb) || '{"dependency": true}'::jsonb)
                   else v_next #- '{config,dependency}' end;
  end if;

  -- NOTION-PROPS-3 (b): SUB-ITEMS ON AND OFF (config.sub_items). A one-record link to its own table names each
  -- record's parent; on, the table draws its records as a tree; off, the link stays a plain link and no value moves.
  if p_patch ? 'sub_items' then
    if coalesce(v_old ->> 'type', '') <> 'relation'
       or coalesce(v_old ->> 'relation_target', '') is distinct from coalesce(v_old ->> 'entity_definition_id', '-')
       or coalesce((v_old ->> 'multi')::boolean, false) then
      raise exception '"%" is not a one-record link to its own table, so it cannot nest sub-items.',
        coalesce(nullif(v_old ->> 'label', ''), v_old ->> 'key')
        using errcode = '23514', hint = 'NOTION-PROPS-3: sub_items is a setting of a one-record link to its own table (its parent). Nothing was written.';
    end if;
    if jsonb_typeof(p_patch -> 'sub_items') not in ('boolean', 'null') then
      raise exception 'Whether a link nests sub-items is yes or no.' using errcode = '22023',
        hint = 'NOTION-PROPS-3: sub_items is true or false. Nothing was written.';
    end if;
    v_next := case when coalesce((p_patch ->> 'sub_items')::boolean, false)
                   then jsonb_set(v_next, '{config}', coalesce(v_next -> 'config', '{}'::jsonb) || '{"sub_items": true}'::jsonb)
                   else v_next #- '{config,sub_items}' end;
  end if;

  -- ── IMPORT-2: THE FORMULA ITSELF, CHANGEABLE WITHOUT RETYPING THE COLUMN. ────────────────
  -- This was the found instance: `expr` appeared exactly once in this body, inside the
  -- behaviour arm, so changing a formula without ALSO sending a type word reported success and
  -- left yesterday's expression in place. A person who edits the formula of a column that is
  -- already a formula is not retyping anything. The two cases that cannot be applied are
  -- refused by name, the way `compute_on` refuses them, rather than forced quietly; and a
  -- formula naming a column that does not exist is still refused as the document lands, by
  -- FIX-10B-F5's guard on `config.expr`.
  if p_patch ? 'expr' then
    if coalesce(v_old ->> 'type', '') <> 'formula' and coalesce(v_old ->> 'source', '') <> 'formula' then
      raise exception '"%" is not worked out by the store, so it has no formula to change.',
        coalesce(nullif(v_old ->> 'label', ''), v_old ->> 'key')
        using errcode = '23514',
              hint = 'FLD-11: make it a worked-out column first - send type "formula" with the expr to this same door - and then the formula can be edited on its own. Nothing was changed.';
    end if;
    if jsonb_typeof(p_patch -> 'expr') is distinct from 'object' then
      raise exception 'A formula is an expression, and this one is a %.',
        coalesce(jsonb_typeof(p_patch -> 'expr'), 'nothing')
        using errcode = '23514',
              hint = 'FLD-11 / REC-15: expr is a Rule expression - the same shape and the same evaluator a Rule uses, e.g. {"op":"concat","args":[{"field":"<field id>"}]}. Nothing was changed.';
    end if;
    v_next := jsonb_set(v_next, '{config,expr}', p_patch -> 'expr');
  end if;

  -- ── FIX-7B-FIELD, 2026-09-20: THE SHAPE OF THE VALUE, WHICH IS A SETTING LIKE ANY OTHER. ──
  -- MEASURED on this database from the seat `authenticated`, before this migration: declare a
  -- relation column with `multi` false, call `custom.field_update(org, field, {"multi": true})`,
  -- read it back with `custom.read_record` — `multi=false, relation_max=1`. The door returned
  -- the field id, reported success and changed NOTHING. `multi` appeared exactly once in this
  -- body, inside the BEHAVIOUR arm above, which only runs when the patch also carries
  -- `parity_type`, `plain` or `type`. So the ONE control the roll-up panel's own refusal sends
  -- a person to — "Tick 'Can hold more than one' on Photos, or use Borrowed value to read its
  -- one value" — could not be reached by any door, from any client, at all. Same class as
  -- `promoted` / `unique` (SEAT-SUITES, 2026-09-19) and `source` / `review_interval_days`
  -- (ENRICH, 2026-09-20): a door that says yes and does nothing.
  --
  -- A LIST IS REFUSED BY NAME, NOT SILENTLY WRITTEN. For `select` and `multi_select`, "one
  -- answer or several" IS the behaviour — `custom._field_document_for` derives `multi` from the
  -- parity type and never from the caller — so writing `multi` on a list column here would put
  -- the document permanently at odds with its own `parity_type`, which is the silent failure
  -- again wearing the fix's clothes. The behaviour arm above already does this properly, and
  -- the refusal names the word to send it.
  if p_patch ? 'multi' then
    if (v_old ->> 'type') = 'list' then
      raise exception 'Whether "%" takes one answer or several IS what it holds, so it is changed by saying which kind it is.',
        coalesce(v_old ->> 'label', v_old ->> 'key')
        using errcode = '23514',
              hint = 'FLD-2: send parity_type "select" for one answer or "multi_select" for several; multi alone is not a setting on a list.';
    end if;
    v_next := jsonb_set(v_next, '{multi}', to_jsonb(coalesce((p_patch ->> 'multi')::boolean, false)));
  end if;
  -- CHAIR-MATH (b), 2026-10-03: WHICH LINKED RECORDS A ROLL-UP ADDS UP IS A SETTING LIKE ANY
  -- OTHER. `{"filter": {"status": "open"}}` on an existing roll-up lands in config.filter and is
  -- validated against the far table by custom._field_type_parity_guard on this very write;
  -- `{"filter": null}` takes it off. On anything that is not a roll-up it is refused by name.
  if p_patch ? 'filter' then
    if custom.parity_type(v_old) is distinct from 'rollup' then
      raise exception 'Only a column that adds up linked records can narrow which ones it adds up, and "%" is not one.',
        coalesce(v_old ->> 'label', v_old ->> 'key')
        using errcode = '23514',
              hint = 'FLD-11: make it a roll-up first (type "rollup" with via and agg), then send filter.';
    end if;
    if jsonb_typeof(p_patch -> 'filter') = 'null' then
      v_next := jsonb_set(v_next, '{config}', coalesce(v_next -> 'config', '{}'::jsonb) - 'filter');
    else
      v_next := jsonb_set(v_next, '{config}', coalesce(v_next -> 'config', '{}'::jsonb)
                  || jsonb_build_object('filter', p_patch -> 'filter'));
    end if;
  end if;
  -- REC-51: A RELATION'S CARDINALITY LIVES IN TWO KEYS AND BOTH MUST MOVE. `custom.validate_values`
  -- counts the links against `relation_max` and `custom.relation_declaration` calls the column
  -- "one" while that number is 1 — so `multi` true beside `relation_max` 1 is a column that ticks
  -- the box on screen and still refuses the second record. `custom._field_document_for` derives
  -- the same pair the same way when a column is created (1, or 25 when it holds several); a cap a
  -- caller had already widened past 25 is kept rather than narrowed, and an explicit
  -- `relation_max` in the patch always wins.
  if (v_next ->> 'type') = 'relation' and (p_patch ? 'multi' or p_patch ? 'relation_max') then
    v_next := jsonb_set(v_next, '{relation_max}', to_jsonb(greatest(1, coalesce(
      nullif(p_patch ->> 'relation_max', '')::integer,
      case when coalesce((v_next ->> 'multi')::boolean, false)
           then greatest(coalesce((v_old ->> 'relation_max')::integer, 1), 25)
           else 1 end))));
  end if;
  -- ── ENRICH, 2026-09-20: THE THREE SETTINGS THAT MADE AGT-6 UNREACHABLE. ───────────────
  -- `source`, `source_config` and `review_interval_days` are keys the Field document has
  -- always carried and this door has never had an arm for. So `custom.field_update(field,
  -- {"source":"agent","review_interval_days":30})` returned the field id, reported success
  -- and changed NOTHING - and no person and no agent could declare an enrichment on an
  -- existing column through any door at all. That is the measured state behind AGT-6's own
  -- "zero readers and zero writers", and it is the same class as `promoted` / `unique`,
  -- which SEAT-SUITES closed on 2026-09-19.
  --
  -- A column a MODEL owns is not an ordinary setting, so the arm does not simply write the
  -- word: `source = 'agent'` is handed to custom.enrich_normalize, the ONE judge of an
  -- enrichment, exactly as custom.enrich_declare does. There is therefore no way into
  -- "a model fills this in" that skips the judging - not a door, not a script, not a lane.
  if p_patch ? 'review_interval_days' then
    if jsonb_typeof(p_patch -> 'review_interval_days') = 'null' then
      v_next := v_next - 'review_interval_days';
    else
      v_next := jsonb_set(v_next, '{review_interval_days}',
                          to_jsonb((p_patch ->> 'review_interval_days')::integer));
    end if;
  end if;
  if p_patch ? 'source' or p_patch ? 'source_config' then
    v_next := jsonb_set(v_next, '{source}',
                        to_jsonb(coalesce(nullif(p_patch ->> 'source', ''), v_next ->> 'source', 'manual')));
    v_next := jsonb_set(v_next, '{source_config}',
                        coalesce(p_patch -> 'source_config', v_next -> 'source_config', '{}'::jsonb));
    if (v_next ->> 'source') = 'agent' then
      v_next := jsonb_set(v_next, '{source_config}',
                  custom.enrich_normalize(p_organization_id, v_table, v_next ->> 'key',
                    coalesce(v_next -> 'source_config', '{}'::jsonb)
                    || jsonb_strip_nulls(jsonb_build_object('review_interval_days',
                         v_next -> 'review_interval_days'))));
      -- The two copies of freshness cannot disagree: the Field's own key is the one AGT-6
      -- names, and the judged config is what the runner reads, so the judge decides both.
      if (v_next -> 'source_config' -> 'review_interval_days') is not null then
        v_next := jsonb_set(v_next, '{review_interval_days}',
                            v_next -> 'source_config' -> 'review_interval_days');
      else
        v_next := v_next - 'review_interval_days';
      end if;
    end if;
  end if;
  -- SEAT-SUITES: THE TWO SETTINGS THIS DOOR ACCEPTED AND THREW AWAY. `custom.promote_field`
  -- reads `promoted` and `unique` off the Field document to decide whether to build an index
  -- and whether it is a unique one. Neither had an arm here, so `custom.field_update(field,
  -- {"promoted":true,"unique":true})` returned the field id, reported success and changed
  -- nothing — and no person could ever ask for an indexed or a unique column through any
  -- door. Measured from the seat `authenticated` on the main database, 2026-09-19:
  -- promote_field answered `"unique": false` after the door said yes. Same class as T12,
  -- which STORE-T closed for `plain` and `type`; these are the last two.
  if p_patch ? 'promoted'       then v_next := jsonb_set(v_next, '{promoted}', to_jsonb(coalesce((p_patch ->> 'promoted')::boolean, false))); end if;
  if p_patch ? 'unique'         then v_next := jsonb_set(v_next, '{unique}', to_jsonb(coalesce((p_patch ->> 'unique')::boolean, false))); end if;
  if p_patch ? 'rules'          then v_next := jsonb_set(v_next, '{rules}', coalesce(p_patch -> 'rules', '[]'::jsonb)); end if;
  -- DEFECTS A1: `unique: true` is the unique rule here too, exactly as custom._field_document_for makes it for every
  -- declaring door (once; a rule already there is not doubled). It used to store only the flag, and duplicates were taken.
  if lower(coalesce(p_patch ->> 'unique', '')) in ('true', 't', '1', 'yes')
     and not coalesce(v_next -> 'rules', '[]'::jsonb) @> '[{"kind": "unique"}]'::jsonb then
    v_next := jsonb_set(v_next, '{rules}', coalesce(v_next -> 'rules', '[]'::jsonb) || '[{"kind": "unique"}]'::jsonb);
  end if;
    -- W1-STORE 4d: `unique: false` TAKES THE UNIQUE RULE OFF. It used to store the flag and keep the rule, so a column a
    -- person had made not-unique went on refusing duplicates. Callers read first: no database function passes `unique`
    -- to this door (promote_table adds the rule itself and never calls it; promote_field is not client-callable); the
    -- only sender is a person's settings change in the grid, so this is that and nothing else. A promoted column's
    -- already-built unique index is not touched here (it is the index's own change to make).
    if lower(coalesce(p_patch ->> 'unique', '')) in ('false', 'f', '0', 'no') then
      v_next := jsonb_set(v_next, '{rules}', coalesce((select jsonb_agg(x order by n)
                  from jsonb_array_elements(coalesce(v_next -> 'rules', '[]'::jsonb)) with ordinality e(x, n)
                 where x ->> 'kind' is distinct from 'unique'), '[]'::jsonb));
    end if;
  -- STORE-RULE-GAPS (2): whether this choice list takes values that are not one of its
  -- choices. Stored on the list's own config; the shape guard judges the word and the type.
  if p_patch ? 'allow_other' then
    if (v_next ->> 'type') is distinct from 'list' then
      raise exception 'Only a choice column can take values that are not one of its choices, and "%" is not one.',
          coalesce(nullif(v_next ->> 'label', ''), v_next ->> 'key')
        using errcode = '23514', hint = 'FLD-5: allow_other belongs to a list field. Nothing was changed.';
    end if;
    v_next := jsonb_set(v_next, '{config}', coalesce(v_next -> 'config', '{}'::jsonb)
                        || jsonb_build_object('allow_other', p_patch -> 'allow_other'));
  end if;
  -- ── lane RELATION-DISPLAY, 2026-09-21: WHICH OF THE OTHER RECORD''S COLUMNS THIS ONE
  --    SHOWS. The same judge the create door uses (custom._display_spec_for), so a spec
  --    cannot be looser here than it was there, and an explicit null REMOVES it - the
  --    column goes back to whatever the table it points at is titled by.
  if p_patch ? 'display' then
    if (v_next ->> 'type') is distinct from 'relation' then
      raise exception 'Only a column that points at other records can say which of their columns to show, and "%" does not point at any.',
          coalesce(nullif(v_next ->> 'label', ''), nullif(v_next ->> 'key', ''), 'this column')
        using errcode = '23514',
              hint = 'REL-DISP: retype it to a column that points at another table first, or leave display out. Nothing was changed.';
    end if;
    if jsonb_typeof(p_patch -> 'display') = 'null' then
      v_next := v_next - 'display';
    else
      v_next := jsonb_set(v_next, '{display}',
                  coalesce(custom._display_spec_for(p_organization_id,
                             nullif(v_next ->> 'relation_target', '')::uuid,
                             p_patch -> 'display'), 'null'::jsonb));
      if jsonb_typeof(v_next -> 'display') = 'null' then v_next := v_next - 'display'; end if;
    end if;
  end if;
  -- STORE-T / T7: the dependency list is a SETTING of a worked-out column, and a door that
  -- could not change it could not fix a formula that reads the wrong column either.
  if p_patch ? 'depends_on'     then v_next := jsonb_set(v_next, '{depends_on}',
                                       case when jsonb_typeof(p_patch -> 'depends_on') = 'array'
                                            then p_patch -> 'depends_on' else '[]'::jsonb end); end if;

  -- ── RED-SUITES-2, 2026-09-21: THE LAST TWO KEYS THIS DOOR WAS TOLD AND THREW AWAY. ──────
  -- MEASURED on the main database through `w1_rel_c12` REL-2 / T7, from the seat
  -- `authenticated`: `custom.field_update(org, field, {"on_target_delete":"restrict"})` returns
  -- the field id, reports success, and the column still says `set_null`. `on_target_delete` and
  -- `relation_target` are BOTH declared on the published contract — `FieldPatch` in
  -- `@ai-matrx/records` `src/field.ts`, where `relation_target` is documented as "re-point the
  -- column. The old edges are withdrawn by the door" — and BOTH are honoured only by the
  -- BEHAVIOUR arm above, which runs only when the same patch also carries `type` / `plain` /
  -- `parity_type`. A person changing only "what happens when the thing this points at is
  -- deleted" sends neither, so the settings arm ran and dropped the key.
  --
  -- This is the SAME CLASS this door has already been fixed for four times, each one written
  -- into the body above: `promoted` / `unique` (SEAT-SUITES), `multi` (FIX-7B-FIELD),
  -- `source` / `review_interval_days` (ENRICH), `compute_on` (TAILS-2). These are the last two
  -- keys of `FieldPatch` the settings arm did not carry. As in every one of those, THE ANSWER
  -- IS TO APPLY IT, and the cases that cannot be applied are refused BY NAME.
  if p_patch ? 'on_target_delete' then
    if (v_next ->> 'type') is distinct from 'relation' then
      raise exception '"%" does not point at other records, so there is nothing to decide when something it points at is deleted.',
        coalesce(v_next ->> 'label', v_next ->> 'key')
        using errcode = '22023',
              hint = 'on_target_delete belongs to a relation column. Change the column to point at a table first, or leave this out.';
    end if;
    if coalesce(p_patch ->> 'on_target_delete', '') not in ('restrict', 'set_null', 'cascade') then
      raise exception '"%" is not something that can happen when a linked record is deleted.',
        coalesce(p_patch ->> 'on_target_delete', '<nothing>')
        using errcode = '22023',
              hint = 'The three answers are: restrict (refuse the delete while this link exists), set_null (drop the link and keep this record), cascade (delete this record too).';
    end if;
    v_next := jsonb_set(v_next, '{on_target_delete}', to_jsonb(p_patch ->> 'on_target_delete'));
  end if;

  -- RE-POINTING THE COLUMN, with the edges withdrawn in the SAME operation — the rule the
  -- behaviour arm above states in full: "the links go in the same operation as the change that
  -- made them meaningless, softly, so REL-13's history keeps its record of them." Dropping this
  -- key silently was the worse half of that defect: it left the caller believing the column had
  -- been re-pointed while every edge still named the old table.
  if p_patch ? 'relation_target' then
    if (v_next ->> 'type') is distinct from 'relation' then
      raise exception '"%" does not point at other records, so it cannot be pointed at a different table.',
        coalesce(v_next ->> 'label', v_next ->> 'key')
        using errcode = '22023',
              hint = 'Change the column to a link first, and then choose the table it points at.';
    end if;
    if nullif(p_patch ->> 'relation_target', '') is null then
      raise exception '"%" has to point at some table — it cannot point at nothing.',
        coalesce(v_next ->> 'label', v_next ->> 'key')
        using errcode = '22023',
              hint = 'Name the table this column should point at, or change the column to a kind that holds its own value.';
    end if;
    -- "MAY I POINT AT IT" IS "MAY I SEE IT" — the same question custom.field_declare asks of a
    -- caller who names the target themselves (RELATION-DECLARE, 2026-09-20). Without it this
    -- arm would be a way to reach a table the caller may not see, by patching instead of
    -- declaring.
    perform custom.assert_may_know_table(p_organization_id,
              (p_patch ->> 'relation_target')::uuid, 'custom.field_update');
    if (p_patch ->> 'relation_target') is distinct from (v_next ->> 'relation_target') then
      perform custom.relation_edges_withdraw(p_organization_id, array[p_field_id],
        format('"%s" now points at a different table',
               coalesce(v_next ->> 'label', v_next ->> 'key')));
    end if;
    v_next := jsonb_set(v_next, '{relation_target}', to_jsonb(p_patch ->> 'relation_target'));
  end if;

  -- THE CHOICES, EDITED WHERE THEY LIVE (lane CHOICE-COLUMN-EDIT, 2026-09-27). The whole list,
  -- in its order: re-worded by id, added, brought back, reordered and — what the list no longer
  -- names — retired (archived, never deleted), in this one statement. The options table's own
  -- title field is written, so a moved column (a copy keyed `name`) is edited exactly like a
  -- native one; before this, the arm wrote `title` only and a moved column was refused upstream.
  if jsonb_typeof(p_patch -> 'options') = 'array' and (v_old ->> 'type') = 'list' then
    v_opts := nullif(v_old -> 'config' ->> 'options_table_id', '')::uuid;
    if v_opts is null then
      v_opts := custom._options_table_for(p_organization_id, v_next ->> 'label', p_patch -> 'options');
      v_next := jsonb_set(v_next, '{config,options_table_id}', to_jsonb(v_opts::text));
    else
      perform custom._field_choices_save(p_organization_id, v_opts, coalesce(v_opt_entries, p_patch -> 'options'), false);
    end if;
  end if;

  -- CHOICES ADDED, NOTHING ELSE TOUCHED: what a cell's "Add "<words>" to the choices" sends. A
  -- word that already names a live choice (any case) adds nothing; one that names a retired
  -- choice brings it back; the rest are added at the end.
  if jsonb_typeof(p_patch -> 'options_add') = 'array' then
    if coalesce(v_next ->> 'type', v_old ->> 'type') <> 'list' then
      raise exception '"%" is not a choice column, so it has no choices to add to.', coalesce(v_old ->> 'label', v_old ->> 'key')
        using errcode = '23514', hint = 'Make it a choice column first (its settings, Stores). Nothing was changed.';
    end if;
    v_opts := nullif(v_next -> 'config' ->> 'options_table_id', '')::uuid;
    if v_opts is null then
      v_opts := custom._options_table_for(p_organization_id, v_next ->> 'label',
                                          custom._choice_words_array(p_patch -> 'options_add'));
      v_next := jsonb_set(v_next, '{config,options_table_id}', to_jsonb(v_opts::text));
    else
      perform custom._field_choices_save(p_organization_id, v_opts, p_patch -> 'options_add', true);
    end if;
  end if;

  -- ── TAILS-2, 2026-09-21: WHEN IT WORKS ITSELF OUT, WHICH THIS DOOR WAS TOLD AND IGNORED. ──
  -- MEASURED (lane SHARE-OUT, 2026-09-20): the settings arm's key list has never carried
  -- `compute_on`, so `custom.field_update(org, field, {"compute_on":"write"})` returned the
  -- field id, reported success and left the column working itself out on every read forever.
  -- A door that is told something and answers yes without doing it is the silent failure this
  -- campaign exists to end — same class as `promoted`/`unique`, `multi`, `source`.
  --
  -- THE ANSWER IS TO APPLY IT, not to refuse it: `custom._derived_fields` already stamps a
  -- `write` formula into `_derived` on every save and `custom.derived_values_of` already works
  -- a `read` one out on every read. The only cases that CANNOT be applied are refused BY NAME,
  -- with the way to change them, because "it is not a formula" and "a rollup is always read"
  -- are answers a person can act on.
  if p_patch ? 'compute_on' then
    v_parity := custom.parity_type(v_old);
    v_compute_was := nullif(v_old ->> 'compute_on', '');
    v_compute_now := nullif(btrim(coalesce(p_patch ->> 'compute_on', '')), '');
    if v_compute_now is null or v_compute_now not in ('read', 'write') then
      raise exception 'A column either works its answer out when somebody reads it or when somebody saves it, and "%" is neither.',
        coalesce(p_patch ->> 'compute_on', 'nothing')
        using errcode = '23514', hint = 'FLD-9: send compute_on as "read" or as "write".';
    end if;
    if coalesce(v_old ->> 'type', '') <> 'formula' and coalesce(v_old ->> 'source', '') <> 'formula' then
      raise exception '"%" is not worked out by the store, so there is no moment for it to be worked out at.',
        coalesce(v_old ->> 'label', v_old ->> 'key')
        using errcode = '23514',
              hint = 'FLD-9: make it a worked-out column first — send type "formula" (with expr), "lookup" or "rollup" to this same door — and then say compute_on.';
    end if;
    if v_parity = 'rollup' and v_compute_now = 'write' then
      raise exception 'A roll-up adds up other records, so an answer stamped when "%" was last saved would be wrong the moment one of them changed. It is worked out when somebody reads it, always.',
        coalesce(v_old ->> 'label', v_old ->> 'key')
        using errcode = '23514',
              hint = 'FLD-11: to stamp a number at save time, make this column a formula over its own record''s columns (send type "formula" with an expr) — a roll-up cannot be one.';
    end if;
    v_next := jsonb_set(v_next, '{compute_on}', to_jsonb(v_compute_now));
  end if;

  -- ── GRID-PRIMITIVES G3 / G5, 2026-09-22. ────────────────────────────────────────────────
  -- The text beside the expression: kept when the person typed it, dropped when an expression
  -- was sent without it (the old text would no longer describe what is worked out). A system
  -- column's expression is its system node and is not replaced by a patch.
  if coalesce(v_next -> 'config' ->> 'system', '') <> '' and p_patch ? 'expr'
     and (p_patch -> 'expr' ->> 'op') is distinct from ('fx.' || (v_next -> 'config' ->> 'system')) then
    raise exception '"%" is filled in by the store (%), so it has no formula of its own to change.',
      coalesce(nullif(v_old ->> 'label', ''), v_old ->> 'key'), v_next -> 'config' ->> 'system'
      using errcode = '23514',
            hint = 'Make it a formula column first (send type "formula" with formula_text), then its formula can be edited. Nothing was changed.';
  end if;
  if p_patch ? 'formula_text' then
    v_next := jsonb_set(v_next, '{config,formula_text}', to_jsonb(p_patch ->> 'formula_text'));
  elsif p_patch ? 'expr' then
    v_next := jsonb_set(v_next, '{config}', coalesce(v_next -> 'config', '{}'::jsonb) - 'formula_text');
  end if;
  if p_patch ? 'display_format' then
    v_next := custom._with_display_format(v_next, p_patch);
  end if;

  -- DATA-V2-BASICS-2 (2026-09-27): A COLUMN'S DEFAULT IS ONE OF ITS SETTINGS. `default` is what a
  -- new record this column is not named in starts with (custom.record_write fills it); null
  -- clears it. A column that changes what it holds keeps its default — a default that no longer
  -- fits is simply not filled, never a refusal.
  if p_patch ? 'default' then
    v_next := case when p_patch -> 'default' is null or jsonb_typeof(p_patch -> 'default') = 'null'
                   then v_next - 'default' else jsonb_set(v_next, '{default}', p_patch -> 'default') end;
  elsif v_old ? 'default' and not (v_next ? 'default') then
    v_next := v_next || jsonb_build_object('default', v_old -> 'default');
  end if;

  -- LANE 10 P4 round 3 (V11 #4): A RATING'S TOP STAR, CHANGED IN PLACE — the same word and the same
  -- refusals as custom.field_declare. It is the column's max Rule (min 0 beside it) and its stars;
  -- values above the new top are kept in `_retired` by custom._field_type_converts_values.
  if p_patch ? 'max' then
    if custom.field_kind_of(v_next) is distinct from 'rating' then
      raise exception 'A top star belongs to a rating, and "%" is not one.', coalesce(nullif(v_old ->> 'label', ''), v_old ->> 'key')
        using errcode = '23514', hint = 'P4: max is a rating''s setting. Nothing was changed.';
    end if;
    if coalesce(p_patch ->> 'max', '') !~ '^-?[0-9]+(\.[0-9]+)?$' then
      raise exception 'A rating goes up to a whole number of stars from 1 to 10, and "%" asks for "%", which is not a number.',
                      coalesce(nullif(v_old ->> 'label', ''), v_old ->> 'key'), coalesce(p_patch ->> 'max', 'nothing')
        using errcode = '23514', hint = 'P4: send max as a number between 1 and 10. Nothing was changed.';
    end if;
    v_maxn := (p_patch ->> 'max')::numeric;
    if v_maxn <> trunc(v_maxn) or v_maxn < 1 or v_maxn > 10 then
      raise exception 'A rating goes up to a whole number of stars from 1 to 10, and "%" asks for %.',
                      coalesce(nullif(v_old ->> 'label', ''), v_old ->> 'key'), v_maxn
        using errcode = '23514', hint = 'P4: send max between 1 and 10. Nothing was changed.';
    end if;
    v_next := jsonb_set(v_next, '{rules}',
                coalesce((select jsonb_agg(r) from jsonb_array_elements(coalesce(v_next -> 'rules', '[]'::jsonb)) r
                           where coalesce(r ->> 'kind', '') not in ('min', 'max')), '[]'::jsonb)
                || jsonb_build_array(jsonb_build_object('kind', 'min', 'value', 0), jsonb_build_object('kind', 'max', 'value', v_maxn)));
    if coalesce(v_next -> 'display_format' ->> 'id', 'rating') = 'rating' then
      v_next := jsonb_set(v_next, '{display_format}', jsonb_build_object('id', 'rating', 'options',
                  coalesce(v_next -> 'display_format' -> 'options', '{}'::jsonb) || jsonb_build_object('ratingMax', v_maxn)));
    end if;
  end if;

  -- DATA-V2-BASICS-2 (2026-09-29): the default fits what the column holds, or the save is refused.
  v_next := custom._field_default_fitted(p_organization_id, v_next);

  -- FX2 (records walk W3, 2026-10-17): A NEW CHOICE WEARS A COLOUR. Every choice this save adds (the
  -- list's own words, "Add" from a cell, a list brought back) takes the next palette colour the
  -- column does not wear yet; a choice that already has a look is never repainted.
  v_next := custom._choices_paint_new(p_organization_id, v_next, v_opts_before);

  update custom.record
     set data = v_next, updated_at = now(), version = version + 1
   where organization_id = p_organization_id
     and id = p_field_id
     and table_id = custom.field_kernel_id();


  -- ── AND THE ANSWERS THAT ARE ALREADY OUT THERE MOVE WITH IT. ────────────────────────────
  -- `_derived` is written by the save path and by nothing else, so a column switched to
  -- `write` would hold NO stamped answer on any record until each one happened to be saved
  -- again — a column that reads empty on every existing row and full on every new one, with
  -- nothing on the screen saying why. Switching the other way leaves a stale stamp behind
  -- that `custom.computed_provenance` would keep reporting as a fact about this column.
  -- Both are closed here, through the ordinary write path, so every guard and every history
  -- row sees the change exactly as it sees a save.
  if v_table is not null and v_compute_now is not null and v_compute_now is distinct from v_compute_was then
    if v_compute_now = 'write' then
      update custom.record r
         set updated_at = now()
       where r.organization_id = p_organization_id
         and r.table_id = v_table
         and r.deleted_at is null
         and r.data_class = 'record';
      get diagnostics v_restamped = row_count;
    else
      update custom.record r
         set data = jsonb_set(r.data, '{_derived}', (r.data -> '_derived') - (v_old ->> 'key')),
             updated_at = now()
       where r.organization_id = p_organization_id
         and r.table_id = v_table
         and r.deleted_at is null
         and r.data_class = 'record'
         and (r.data -> '_derived') ? (v_old ->> 'key');
      get diagnostics v_restamped = row_count;
    end if;
    raise notice 'custom: "%" is now worked out on %, and % record(s) were brought with it.',
      coalesce(v_next ->> 'label', v_next ->> 'key'), v_compute_now, v_restamped;
  end if;

  return p_field_id;
end;
$function$;

CREATE OR REPLACE FUNCTION custom.io_import_finish(p_organization_id uuid, p_import_id uuid, p_unmapped text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_run    custom.io_import;
  v_mode   text;
  v_p      jsonb;
  v_spec   jsonb;
  v_next   jsonb := '[]'::jsonb;
  v_filed  integer := 0;
  v_made   integer := 0;
  v_left   integer := 0;
  v_id     uuid;
  v_ask    jsonb;
  v_admin  boolean;
  -- B4-03: how many landed rows hold a value for the column being filed, and for all of them.
  v_held   integer;
  v_heldall integer := 0;
  v_cut    boolean;
begin
  perform custom.assert_client_may_reach(p_organization_id, 'custom.io_import_finish');
  perform custom.assert_store_door(p_organization_id, 'custom.io_import_finish');
  select * into v_run from custom.io_import
   where organization_id = p_organization_id and id = p_import_id and deleted_at is null;
  if not found then
    raise exception 'There is no import run here to finish.' using errcode = '23503';
  end if;
  -- KINDS-GLUE N-C6 (CHAIR-DOORS-2): ADDING a record is the editor rung on the Table, except on a
  -- Table the app keeps for agent outputs, where every member who may see it may add (viewer);
  -- changing a record already there is still decided on that record, so a member edits only her own.
  perform custom.assert_client_may_change(p_organization_id, v_run.table_id, 'custom.io_import_finish',
                                          custom.table_add_rung(p_organization_id, v_run.table_id), 'table');

  v_mode := lower(coalesce(nullif(btrim(coalesce(p_unmapped, '')), ''),
                           nullif(v_run.policy ->> 'unmapped', ''), 'propose'));
  if v_mode not in ('propose', 'create', 'ignore') then
    raise exception 'A column this table does not have is offered ("propose"), added outright ("create") or left out ("ignore"), and this asked for "%".', v_mode
      using errcode = '22023';
  end if;
  v_admin := custom.my_level(p_organization_id, v_run.table_id, 'table') = 'admin'::public.permission_level
             or custom.query_is_store_owner();
  if v_mode = 'create' and not v_admin then
    raise exception 'Adding columns to this table outright takes Full access on it. Your columns can still be OFFERED, and whoever has Full access on this table decides.'
      using errcode = '42501',
            hint = 'Finish with "propose" and every new column goes to the approvals inbox instead. The rows that landed are unaffected either way.';
  end if;

  for v_p in select value from jsonb_array_elements(coalesce(v_run.proposals, '[]'::jsonb)) loop
    if coalesce(v_p ->> 'state', 'proposed') <> 'proposed' then
      v_next := v_next || jsonb_build_array(v_p);
      continue;
    end if;
    v_spec := custom.io_proposal_spec(v_p);
    if v_mode = 'ignore' then
      v_left := v_left + 1;
      v_next := v_next || jsonb_build_array(v_p || jsonb_build_object('state', 'ignored'));
    elsif v_mode = 'create' then
      -- THE SAME DOOR A HAND-MADE COLUMN GOES THROUGH, so nothing downstream ever has to ask
      -- where a column came from. A refusal is kept ON the proposal rather than ending the
      -- finish: nineteen good columns are not lost because the twentieth collided.
      begin
        v_id := custom.field_declare(p_organization_id, v_run.table_id, v_spec);
        v_made := v_made + 1;
        v_next := v_next || jsonb_build_array(v_p || jsonb_build_object('state', 'accepted', 'field_id', v_id));
      exception when others then
        v_next := v_next || jsonb_build_array(v_p || jsonb_build_object('state', 'refused', 'reason', sqlerrm));
      end;
    else
      -- THE ONE INBOX. A column an import wants and a column an agent wants are the same
      -- waiting change, in the same queue, decided by the same people with the same right —
      -- and approving it runs `custom.field_declare` with THIS spec, in that transaction.
      -- B4-03 (2026-09-30): AND ITS VALUES WAIT WITH IT. An Editor pasted Client, Package,
      -- Sessions and Start into an empty table; Package, Sessions and Start went here, the rows
      -- landed with a name only, and after the admin approved all three every cell was empty —
      -- the values were never kept, and nothing said so. `custom.io_import_rows` now keeps them on
      -- the proposal (`values`), the change names them (`fill`), and approving it fills them in
      -- (`custom._io_fill_held_column`, from `custom.work_approval_decide`).
      v_held := (select count(*) from jsonb_object_keys(coalesce(v_p -> 'values', '{}'::jsonb)));
      v_cut  := coalesce((v_p ->> 'values_cut')::boolean, false);
      begin
        v_ask := custom.work_approval_request(
                   p_organization_id, v_run.table_id,
                   jsonb_build_object('kind', 'field_add', 'field', v_spec)
                   || case when v_held > 0
                           then jsonb_build_object('fill', jsonb_build_object(
                                  'import_id', p_import_id::text,
                                  'column',    v_p ->> 'column',
                                  'values',    v_held))
                           else '{}'::jsonb end,
                   format('The file "%s" has a column called "%s" that this table does not. %s%s',
                          coalesce(v_run.source_name, 'you imported'),
                          v_p ->> 'column',
                          coalesce(v_p ->> 'why', ''),
                          case when v_held > 0
                               then format(' Approving it also fills in the %s value%s the file had for it%s.',
                                           v_held, case when v_held = 1 then '' else 's' end,
                                           case when v_cut then ' (the first 20000 rows kept theirs; the rest were not kept)' else '' end)
                               else '' end),
                   null, 'person', null);
        v_filed := v_filed + 1;
        v_heldall := v_heldall + v_held;
        v_next := v_next || jsonb_build_array(v_p || jsonb_build_object(
                    'state', 'waiting', 'approval_id', v_ask ->> 'approval_id'));
      exception when others then
        v_next := v_next || jsonb_build_array(v_p || jsonb_build_object('state', 'refused', 'reason', sqlerrm));
      end;
    end if;
  end loop;

  update custom.io_import
     set proposals   = v_next,
         state       = 'finished',
         finished_at = now(),
         policy      = policy || jsonb_build_object('unmapped', v_mode)
   where organization_id = p_organization_id and id = p_import_id
  returning * into v_run;

  return jsonb_build_object(
    'import_id',       p_import_id,
    'state',           'finished',
    'rows_seen',       v_run.rows_seen,
    'rows_written',    v_run.rows_written,
    'rows_duplicate',  v_run.rows_duplicate,
    'rows_refused',    v_run.rows_seen - v_run.rows_written - v_run.rows_duplicate,
    'columns_offered', v_filed,
    'columns_added',   v_made,
    'columns_ignored', v_left,
    -- The kept values stay on the run for approval; the answer names each column without them.
    'proposals',       (select coalesce(jsonb_agg(p - 'values'), '[]'::jsonb) from jsonb_array_elements(v_next) p),
    'message', format('%s row%s landed, %s were already here, %s refused.%s',
                      v_run.rows_written, case when v_run.rows_written = 1 then '' else 's' end,
                      v_run.rows_duplicate,
                      v_run.rows_seen - v_run.rows_written - v_run.rows_duplicate,
                      case when v_filed > 0 then format(' %s new column%s %s waiting in the approvals inbox%s.',
                                                        v_filed, case when v_filed = 1 then '' else 's' end,
                                                        case when v_filed = 1 then 'is' else 'are' end,
                                                        case when v_heldall > 0
                                                             then format(', and %s value%s wait with %s: approving %s fills %s into these rows',
                                                                         v_heldall, case when v_heldall = 1 then '' else 's' end,
                                                                         case when v_filed = 1 then 'it' else 'them' end,
                                                                         case when v_filed = 1 then 'it' else 'a column' end,
                                                                         case when v_heldall = 1 then 'it' else 'them' end)
                                                             else '' end)
                           when v_made > 0 then format(' %s new column%s added.', v_made,
                                                       case when v_made = 1 then '' else 's' end)
                           else '' end));
end;
$function$;

CREATE OR REPLACE FUNCTION custom.io_import_begin(p_organization_id uuid, p_table_id uuid, p_format text DEFAULT 'csv'::text, p_source_name text DEFAULT NULL::text, p_source_columns jsonb DEFAULT '[]'::jsonb, p_file_hash text DEFAULT NULL::text, p_policy jsonb DEFAULT '{}'::jsonb, p_dedupe_key text DEFAULT NULL::text, p_file_bytes bigint DEFAULT NULL::bigint, p_force boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_prior  custom.io_import;
  v_policy jsonb;
  v_dupes  text;
  v_unmap  text;
  v_id     uuid;
begin
  -- THE SWITCH, THE WALL, THE RUNG — all three by name, before anything is read or written.
  -- Opening an import is a change to the Table's contents, so it is the editor rung, exactly
  -- as `custom.io_import_open` has always asked.
  perform custom.assert_store_door(p_organization_id, 'custom.io_import_begin');
  perform custom.assert_client_may_reach(p_organization_id, 'custom.io_import_begin');
  -- KINDS-GLUE N-C6 (CHAIR-DOORS-2): ADDING a record is the editor rung on the Table, except on a
  -- Table the app keeps for agent outputs, where every member who may see it may add (viewer);
  -- changing a record already there is still decided on that record, so a member edits only her own.
  perform custom.assert_client_may_change(p_organization_id, p_table_id, 'custom.io_import_begin',
                                          custom.table_add_rung(p_organization_id, p_table_id), 'table');

  if p_organization_id is null or p_table_id is null then
    raise exception 'An import belongs to one organization and one table, and this one does not say which.'
      using errcode = '22004';
  end if;
  -- LANE 4 N2 (CHAIR-DOORS-1, 2026-10-02): `rows` — records that are not a file. A kind block's
  -- typed rows (an agent's output) arrive already structured, so there is no parse; everything after
  -- this line — the editor rung above, the duplicate key, the column policy, the run's report — is the
  -- one importer's, unchanged. custom.io_import_rows keeps a typed value as typed for this format.
  if coalesce(p_format, '') not in ('csv', 'xlsx', 'rows') then
    raise exception 'A file is read as a spreadsheet (xlsx) or as a comma-separated file (csv), records arrive as rows, and "%" is none of those.', p_format
      using errcode = '22023',
            hint = 'The parse differs; nothing after it does.';
  end if;

  v_policy := coalesce(p_policy, '{}'::jsonb);
  v_dupes  := lower(coalesce(nullif(btrim(coalesce(v_policy ->> 'on_duplicate', '')), ''), 'skip'));
  v_unmap  := lower(coalesce(nullif(btrim(coalesce(v_policy ->> 'unmapped', '')), ''), 'propose'));
  if v_dupes not in ('skip', 'update') then
    raise exception 'A row that is already here is either left alone ("skip") or brought up to date ("update"), and this import asked for "%".', v_dupes
      using errcode = '22023',
            hint = 'Nothing was opened. Writing a second copy is not one of the choices, which is the whole point of naming a duplicate key.';
  end if;
  if v_unmap not in ('propose', 'create', 'ignore') then
    raise exception 'A column this table does not have is offered as a new column ("propose"), added outright ("create") or left out ("ignore"), and this import asked for "%".', v_unmap
      using errcode = '22023', hint = 'Nothing was opened.';
  end if;
  -- ADDING A COLUMN OUTRIGHT IS AN ADMIN'S ACT, AND IT IS ASKED HERE RATHER THAN AT THE END.
  -- A person who chose "just add them" and is told at the end of a 5,000-row run that they
  -- may not has been made to wait for a refusal the store knew at the start.
  if v_unmap = 'create'
     and custom.my_level(p_organization_id, p_table_id, 'table') <> 'admin'::public.permission_level
     and not custom.query_is_store_owner() then
    raise exception 'Adding columns to this table outright takes Full access on it. Your columns can still be OFFERED, and whoever has Full access on this table decides.'
      using errcode = '42501',
            hint = 'Open the import with unmapped set to "propose" and every new column goes to the approvals inbox instead. Nothing was opened.';
  end if;
  if nullif(btrim(coalesce(p_dedupe_key, '')), '') is not null
     and not exists (select 1 from custom.applicable_fields(p_organization_id, p_table_id, null) f
                      where f.data ->> 'key' = btrim(p_dedupe_key)) then
    raise exception 'This table has no column called "%", so it cannot be what makes a row the same row.', btrim(p_dedupe_key)
      using errcode = '23503',
            hint = 'The columns are: ' ||
                   coalesce((select string_agg(coalesce(nullif(f.data ->> 'label', ''), f.data ->> 'key'), ', ' order by f.data ->> 'key')
                               from custom.applicable_fields(p_organization_id, p_table_id, null) f), '(none yet)') ||
                   '. Nothing was opened.';
  end if;

  -- THE SAME FILE, TWICE. This is the whole of "a re-import doubles nothing", and it is
  -- decided here rather than per row: the second run is never opened at all, so there is no
  -- half-run to reconcile and no second set of proposals for the same columns.
  --
  -- 🚨 FIX-10B (VERIFIER-10 F2). The question is "DID ANYTHING LAND", not "have I seen this
  -- file". A run that wrote nothing and matched nothing is not the time this file was
  -- imported — it is a run that failed — and remembering it turned a guard against DOUBLE
  -- writing into a guard against ANY writing: the file that created a table's columns on its
  -- first pass could never be imported again. A run that landed rows or matched duplicates is
  -- still answered exactly as before, with its own date and its own true count.
  if nullif(btrim(coalesce(p_file_hash, '')), '') is not null and not coalesce(p_force, false) then
    select * into v_prior
      from custom.io_import i
     where i.organization_id = p_organization_id
       and i.table_id = p_table_id
       and i.file_hash = btrim(p_file_hash)
       and i.deleted_at is null
       and (coalesce(i.rows_written, 0) > 0 or coalesce(i.rows_duplicate, 0) > 0)
     order by i.created_at
     limit 1;
    if found then
      return jsonb_build_object(
        'rows_per_call', 25,
        'import_id',     v_prior.id,
        'state',         v_prior.state,
        'already',       true,
        'opened_at',     v_prior.created_at,
        'rows_seen',     v_prior.rows_seen,
        'rows_written',  v_prior.rows_written,
        'rows_duplicate',v_prior.rows_duplicate,
        'source_name',   v_prior.source_name,
        'message',       format('This file was already imported into this table on %s — %s row%s landed then. Nothing was written again.',
                                to_char(v_prior.created_at at time zone 'utc', 'FMDay FMDD FMMonth, HH24:MI'),
                                v_prior.rows_written,
                                case when v_prior.rows_written = 1 then '' else 's' end));
    end if;
  end if;

  insert into custom.io_import (organization_id, table_id, format, source_name, source_columns,
                                file_hash, file_bytes, dedupe_key, policy, state)
  values (p_organization_id, p_table_id, p_format, p_source_name,
          coalesce(p_source_columns, '[]'::jsonb),
          nullif(btrim(coalesce(p_file_hash, '')), ''),
          p_file_bytes,
          nullif(btrim(coalesce(p_dedupe_key, '')), ''),
          jsonb_build_object('on_duplicate', v_dupes, 'unmapped', v_unmap)
            || (v_policy - 'on_duplicate' - 'unmapped')
            || case when coalesce(p_force, false) then jsonb_build_object('forced', true) else '{}'::jsonb end,
          'open')
  returning id into v_id;

  return jsonb_build_object('import_id', v_id, 'state', 'open', 'already', false,
                            'rows_seen', 0, 'rows_written', 0, 'rows_duplicate', 0,
                            'source_name', p_source_name,
                            -- IMPORT-2: THE OPENING GUESS, SAID BY THE DOOR RATHER THAN BY A
                            -- SCREEN. Nothing has been measured yet, so this is the one number
                            -- in the whole walk that is chosen rather than observed, and it is
                            -- chosen HERE so that there is exactly one of it. 25 (lane FOLLOW-BATCH-2; it was 100) because the
                            -- writing phase measured 12-13 ms a row on a quiet database and
                            -- 22-33 ms a row on a loaded one (both measured 2026-09-22 on the
                            -- main database, 250-row batches of a real 8-column dispatch file),
                            -- and 100 x 33 ms is 3.3 s - comfortably inside the ~8 s ceiling on
                            -- the worst moment seen. Every call after the first uses the
                            -- rows_per_call custom.io_import_rows measured on the call before.
                            'rows_per_call', 25,
                            'message', 'Ready. Send the rows in batches.');
end;
$function$;

CREATE OR REPLACE FUNCTION public.audience_share_preview(p_kind text, p_source_id uuid, p_level text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_me    uuid := auth.uid();
  k       record;
  v_org   uuid;
  v_title text;
  v_href  text;
  v_level text;
  v_offer text;
  v_plan  jsonb;
begin
  select * into k from iam.audience_kinds() ak where ak.kind = p_kind;
  if not found then
    raise exception 'There is no audience called "%".', p_kind using errcode = '22023';
  end if;
  if p_level is not null and p_level not in ('viewer', 'commenter', 'editor', 'admin') then
    raise exception 'A Permission is viewer, commenter, editor or admin (got "%").', p_level using errcode = '22023';
  end if;
  -- Authority before anything is read about the record.
  if v_me is null or not (coalesce(iam.owner_of(k.source_token, p_source_id) = v_me, false)
          or iam.has_access_for(v_me, k.source_token, p_source_id, 'admin'::public.permission_level)) then
    raise exception 'Only the person who owns this %, or someone with Full access on it, can share it with %.',
      k.source_noun, k.label using errcode = '42501';
  end if;
  execute format('select organization_id, title, href from %s($1)', k.describe_fn)
    into v_org, v_title, v_href using p_source_id;
  v_level := coalesce(p_level,
                      platform.knob_resolve(k.level_knob_feature, k.level_knob_key, v_org, v_me) #>> '{}',
                      'viewer');
  v_offer := coalesce(platform.knob_resolve(k.offer_knob_feature, k.offer_knob_key, v_org, v_me) #>> '{}', 'offer');
  v_plan := iam._audience_plan(p_kind, p_source_id, v_level::public.permission_level, v_me, '{}');
  return v_plan || jsonb_build_object('offer_mode', v_offer, 'default_level',
    coalesce(platform.knob_resolve(k.level_knob_feature, k.level_knob_key, v_org, v_me) #>> '{}', 'viewer'));
end;
$function$;

CREATE OR REPLACE FUNCTION iam._audience_plan(p_kind text, p_source_id uuid, p_level permission_level, p_actor uuid, p_exclude text[] DEFAULT '{}'::text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  k         record;
  v_org     uuid;
  v_title   text;
  v_href    text;
  v_assets  jsonb := '[]'::jsonb;
  v_people  jsonb := '[]'::jsonb;
  a         record;
  m         record;
  asset     jsonb;
  v_missing jsonb;
  v_removed boolean;
  v_state   text;
  v_key     text;
  v_ex      text[] := coalesce(array(select lower(x) from unnest(p_exclude) x), '{}');
  v_counts  jsonb;
begin
  select * into k from iam.audience_kinds() ak where ak.kind = p_kind;
  if not found then
    raise exception 'There is no audience called "%". The audiences are: %.',
      p_kind, (select string_agg(ak.kind, ', ') from iam.audience_kinds() ak)
      using errcode = '22023';
  end if;
  if p_source_id is null then
    raise exception 'Say which % to share from.', k.source_noun using errcode = '22023';
  end if;
  if p_level is null then
    raise exception 'A share has to say what the people may do: viewer, commenter, editor or admin.'
      using errcode = '22023';
  end if;
  if p_actor is null then
    raise exception 'Sign in first — a share is made by a person.' using errcode = '42501';
  end if;

  -- AUTHORITY FIRST, so a foreign id and an invented one get the same answer.
  if not (coalesce(iam.owner_of(k.source_token, p_source_id) = p_actor, false)
          or iam.has_access_for(p_actor, k.source_token, p_source_id, 'admin'::public.permission_level)) then
    raise exception 'Only the person who owns this %, or someone with Full access on it, can share it with %.',
      k.source_noun, k.label
      using errcode = '42501',
            hint = format('Ask the %s''s owner (for a meeting, its host or a co-host) to share it.', k.source_noun);
  end if;

  execute format('select organization_id, title, href from %s($1)', k.describe_fn)
    into v_org, v_title, v_href using p_source_id;
  if v_org is null then
    raise exception 'This % is no longer there, so there is nothing to share.', k.source_noun
      using errcode = 'P0002';
  end if;

  for a in execute format('select resource_type, resource_id, label from %s($1)', k.assets_fn)
             using p_source_id loop
    v_assets := v_assets || jsonb_build_object(
      'resource_type', a.resource_type, 'resource_id', a.resource_id, 'label', a.label);
  end loop;

  for m in execute format('select user_id, email, display_name, why from %s($1)', k.members_fn)
             using p_source_id loop
    if m.user_id is not null and m.user_id = p_actor then
      continue;  -- the person sharing
    end if;
    v_key := coalesce(m.user_id::text, m.email, 'guest:' || lower(coalesce(m.display_name, 'guest')));
    v_missing := '[]'::jsonb;
    v_removed := false;

    if m.user_id is not null then
      for asset in select * from jsonb_array_elements(v_assets) loop
        -- The base kernel, never iam.has_access_for: the file lane of that wrapper refuses to
        -- answer about ANOTHER person when the caller is signed in (files.has_access_for), so
        -- through the browser door every recording read as "missing" and was re-offered.
        if not iam.has_access_for_base(m.user_id, asset ->> 'resource_type',
                                       (asset ->> 'resource_id')::uuid, p_level) then
          if exists (select 1 from iam.permissions p
                      where p.resource_type = asset ->> 'resource_type'
                        and p.resource_id = (asset ->> 'resource_id')::uuid
                        and p.granted_to_user_id = m.user_id
                        and p.status in ('archived', 'rejected')) then
            v_removed := true;
          else
            v_missing := v_missing || asset;
          end if;
        end if;
      end loop;
      v_state := case
        when lower(v_key) = any (v_ex) then 'left_out'
        when v_removed then 'removed'
        when jsonb_array_length(v_missing) = 0 then 'has_access'
        else 'will_share' end;
    elsif m.email is not null then
      v_state := case
        when lower(v_key) = any (v_ex) then 'left_out'
        when exists (select 1 from iam.invitations i
                      where i.target_type = 'record_share'
                        and i.target_id = p_source_id
                        and lower(i.email) = m.email
                        and i.deleted_at is null
                        and i.status = 'pending'
                        and (i.expires_at is null or i.expires_at > now())
                        and coalesce((i.metadata ->> 'level')::public.permission_level, 'viewer') >= p_level)
          then 'invited'
        else 'invite_by_email' end;
      v_missing := v_assets;
    else
      v_state := 'unreachable';
    end if;

    v_people := v_people || jsonb_build_object(
      'key', v_key,
      'user_id', m.user_id,
      'email', m.email,
      'name', m.display_name,
      'why', m.why,
      'state', v_state,
      'missing', v_missing);
  end loop;

  select jsonb_build_object(
           'will_share',      count(*) filter (where p ->> 'state' = 'will_share'),
           'invite_by_email', count(*) filter (where p ->> 'state' = 'invite_by_email'),
           'invited',         count(*) filter (where p ->> 'state' = 'invited'),
           'has_access',      count(*) filter (where p ->> 'state' = 'has_access'),
           'removed',         count(*) filter (where p ->> 'state' = 'removed'),
           'left_out',        count(*) filter (where p ->> 'state' = 'left_out'),
           'unreachable',     count(*) filter (where p ->> 'state' = 'unreachable'))
    into v_counts
    from jsonb_array_elements(v_people) p;

  return jsonb_build_object(
    'kind', k.kind,
    'label', k.label,
    'source_token', k.source_token,
    'source_noun', k.source_noun,
    'source_id', p_source_id,
    'organization_id', v_org,
    'title', v_title,
    'href', v_href,
    'level', p_level::text,
    'means', iam.permission_means(p_level),
    'assets', v_assets,
    'people', v_people,
    'counts', v_counts);
end;
$function$;

CREATE OR REPLACE FUNCTION custom.work_approval_approvers(p_organization_id uuid, p_subject_id uuid, p_approver_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(user_id uuid, name text, why text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
begin
  -- THE ORGANIZATION WALL FIRST, always — this answers with the NAMES of an organization's
  -- members, which is exactly what `custom.share_people` asks the same question before doing.
  perform custom.assert_client_may_reach(p_organization_id, 'custom.work_approval_approvers');
  return query
  select m.user_id,
         coalesce(nullif(u.raw_user_meta_data ->> 'display_name', ''),
                  nullif(u.raw_user_meta_data ->> 'full_name', ''),
                  split_part(u.email::text, '@', 1))::text,
         case when m.user_id = p_approver_id then 'Asked for by name'
              when custom.effective_level(m.user_id, p_organization_id, p_subject_id, 'record')
                   = 'admin'::public.permission_level then 'Full access on this'
              else 'Owner or admin of this organization' end
    from iam.organization_member m
    join auth.users u on u.id = m.user_id
   where m.organization_id = p_organization_id
     and (m.user_id = p_approver_id
          or custom.effective_level(m.user_id, p_organization_id, p_subject_id, 'record')
             = 'admin'::public.permission_level
          or public.is_org_admin_for(m.user_id, p_organization_id))
   order by 3, 2;
end
$function$;

CREATE OR REPLACE FUNCTION custom.work_approval_request(p_organization_id uuid, p_subject_id uuid, p_change jsonb, p_note text DEFAULT NULL::text, p_approver_id uuid DEFAULT NULL::uuid, p_origin text DEFAULT 'person'::text, p_conversation_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_kind    text := lower(coalesce(p_change ->> 'kind', ''));
  v_origin  text := lower(coalesce(nullif(btrim(p_origin), ''), 'person'));
  v_me      uuid := custom.query_principal();
  v_subject custom.record;
  v_word    text;
  v_id      uuid;
  v_who     jsonb;
  v_home    text;
  v_refusal jsonb;
begin
  -- THE ORGANIZATION WALL, THE SWITCH, THEN THE RUNG - all three by name, all three on the one
  -- ladder, and all three before anything is read or written.
  perform custom.assert_client_may_reach(p_organization_id, 'custom.work_approval_request');
  perform custom.assert_store_door(p_organization_id, 'custom.work_approval_request');
  -- LANE7-W3B[q1]: A CHANGE TO A STANDARD ROW (a CRM person, …) is not a record of this store; it is
  -- filed by custom._entity_change_file, only after custom.entity_row_propose tried it as the caller.
  if v_kind = 'entity_row_change' then
    return custom._entity_change_file(p_organization_id, p_subject_id, p_change, p_note, p_approver_id,
                                      v_origin, p_conversation_id);
  end if;

  -- ASKING IS NOT CHANGING, AND THE RUNG SAYS SO. This door writes nothing on the subject: it
  -- files a request. `custom.work_approval_decide` is what applies the change, later, as the
  -- person who approved it and through the store's own doors, and the authority to decide is
  -- asked there. So the rung to ASK is the PARTICIPATION rung - commenter - which is what Jira
  -- and ServiceNow require to raise a change request on an item: enough standing to take part,
  -- never enough to make the change. A viewer is told exactly that, by name, rather than being
  -- told they have no access to something they can plainly read.
  if not (custom.query_is_store_owner()
          or custom.has_visibility(v_me, 'record', p_subject_id, 'commenter'::public.permission_level)) then
    if custom.has_visibility(v_me, 'record', p_subject_id, 'viewer'::public.permission_level) then
      raise exception 'You can read this, but asking for a change to it is for the people who work on it.'
        using errcode = '42501',
              hint = 'Raising a change takes Comment access or higher on it - the same access it takes to leave a comment. Ask somebody who has it to raise the change, or to share it with you.';
    end if;
    raise exception 'You do not have access to this record.'
      using errcode = '42501',
            hint = 'Nothing reads or files against a record around the one ladder. Ask somebody who holds it to share it with you.';
  end if;

  if v_origin not in ('person', 'agent') then
    raise exception 'An approval comes from a person or from an agent, and "%" is neither.', p_origin
      using errcode = '22023';
  end if;
  -- VISION-REACH W4 (d): AN AGENT'S REQUEST COMES FROM AN AGENT. `origin = 'agent'` is what lets the person
  -- the agent works for approve it themselves (custom.work_approval_decide waives the second pair of eyes
  -- only for an agent's request), so a person who called it an agent's could approve their own change and
  -- skip that second person. Who is writing is read off the connection (platform.declared_actor_tier: the
  -- server's declaration, or an agent client's header on the client channel), never off this argument.
  if v_origin = 'agent' and platform.declared_actor_tier() is distinct from 'agent' then
    raise exception 'This was asked for by a person, so it waits for somebody else to approve it, not as an agent''s request.'
      using errcode = '42501',
            hint = 'File it with origin "person". An agent''s request is filed by the agent itself.';
  end if;
  if not (v_kind = any (custom.work_approval_kinds())) then
    raise exception 'This store can hold a change to a record''s values, new records in a table, a new column on a table, a record being removed or put back, a record put back to an earlier version, notifications on a table, a new table in a home, and a copy or import the server runs into a table. It was asked to hold "%".',
                    coalesce(nullif(p_change ->> 'kind', ''), 'nothing')
      using errcode = '22023',
            hint = 'The kinds are ' || array_to_string(custom.work_approval_kinds(), ', ') ||
                   '. Anything else would be a change nobody could apply when they approved it.';
  end if;
  if v_kind = 'record_patch'
     and (jsonb_typeof(p_change -> 'patch') is distinct from 'object'
          or p_change -> 'patch' = '{}'::jsonb) then
    raise exception 'A change waiting for approval has to say what it would change.'
      using errcode = '22004';
  end if;
  -- A BATCH THAT CARRIES NO ROWS IS NOT A CHANGE. It would be approved and write nothing,
  -- which is the dead end in a smaller font.
  if v_kind = 'record_add'
     and (jsonb_typeof(p_change -> 'rows') is distinct from 'array'
          or jsonb_array_length(p_change -> 'rows') = 0) then
    raise exception 'Records waiting for approval have to say what would be written.'
      using errcode = '22004',
            hint = 'Send {"kind":"record_add","rows":[{...}]} with at least one record.';
  end if;
  if v_kind = 'field_add' and jsonb_typeof(p_change -> 'field') is distinct from 'object' then
    raise exception 'A new column waiting for approval has to carry the column it would add.'
      using errcode = '22004';
  end if;
  -- VISION-REACH W4 (c): A PUT-BACK NAMES THE VERSION, and a notification names who hears it. Approving
  -- runs the store's own restore door and subscription door with exactly these, so a request that does not
  -- carry them would be approved and do nothing.
  if v_kind = 'record_restore_version'
     and (jsonb_typeof(p_change -> 'to_version') is distinct from 'number'
          or (p_change ->> 'to_version')::numeric < 1
          or (p_change ->> 'to_version')::numeric <> trunc((p_change ->> 'to_version')::numeric)) then
    raise exception 'Putting a record back has to say which version it goes back to.'
      using errcode = '22004',
            hint = 'Send {"kind":"record_restore_version","to_version":3} (and "field_key" to put back one value only).';
  end if;
  if v_kind = 'subscription_add'
     and (jsonb_typeof(p_change -> 'tell') is distinct from 'array'
          or jsonb_array_length(p_change -> 'tell') = 0) then
    raise exception 'A notification waiting for approval has to say who hears it and how.'
      using errcode = '22004',
            hint = 'Send {"kind":"subscription_add","watch":{...},"tell":[{"channel":"in_app","cadence":"instant"}]}.';
  end if;
  -- HOST-RUN (2026-10-16): A BULK JOB SAYS WHAT IT WILL DO AND WHICH JOB IT IS. The queue never holds a mapped
  -- copy's rows (there may be thousands, read from the source when it runs); it holds the job's description for
  -- the card (`summary`), its type, the tables it writes and its FINGERPRINT — the server runs exactly the job
  -- whose fingerprint was approved, once, through custom.work_approval_host_run.
  if v_kind = 'host_run'
     and (jsonb_typeof(p_change -> 'job') is distinct from 'object'
          or nullif(p_change #>> '{job,type}', '') is null
          or nullif(p_change #>> '{job,fingerprint}', '') is null
          or nullif(btrim(coalesce(p_change ->> 'summary', '')), '') is null
          or (p_change #> '{job,tables}' is not null and jsonb_typeof(p_change #> '{job,tables}') is distinct from 'array')) then
    raise exception 'A job waiting for approval has to say what it will do and which job it is.'
      using errcode = '22004',
            hint = 'Send {"kind":"host_run","summary":"Copy 18 rows from … into …","job":{"type":"mapped_sync","fingerprint":"…","tables":["…"]}}.';
  end if;
  -- HOST-RUN-2 (2026-10-17): EVERY TABLE A JOB NAMES IS A LIVE TABLE OF THIS ORGANIZATION. The decide door asks
  -- the approver about each one and a yes trusts each one for the chat, so an id that is not a table here would
  -- make the approval impossible to decide (a bad cast) or hand out trust on something else.
  if v_kind = 'host_run' and exists (
       select 1 from jsonb_array_elements_text(coalesce(p_change #> '{job,tables}', '[]'::jsonb)) x
        where case when x !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then true  -- HOST-RUN-3: CASE, so
                   else not exists (select 1 from custom.record t                                         -- a non-id is never cast
                                     where t.organization_id = p_organization_id and t.id = x::uuid
                                       and t.table_id = custom.table_kernel_id() and t.deleted_at is null) end) then
    raise exception 'A job waiting for approval can only name tables of this organization, and one it names is not one.'
      using errcode = '22023',
            hint = 'Nothing was filed. Name the tables the job writes by their ids.';
  end if;
  -- A NEW TABLE CARRIES THE WHOLE SPEC, and its fields with it. A card that said "a table
  -- called Invoices" would ask a person to sign for something they were never shown, and an
  -- approval that had to guess the spec back would create a different table than the one
  -- that was refused.
  if v_kind = 'table_add' then
    if jsonb_typeof(p_change -> 'table') is distinct from 'object'
       or nullif(p_change #>> '{table,name}', '') is null then
      raise exception 'A new table waiting for approval has to carry the table it would create.'
        using errcode = '22004',
              hint = 'Send {"kind":"table_add","table":{...the spec custom.table_declare takes...},"fields":[...]}.';
    end if;
    if p_change ? 'fields' and jsonb_typeof(p_change -> 'fields') is distinct from 'array' then
      raise exception 'The columns of a new table waiting for approval have to be a list, even an empty one.'
        using errcode = '22004';
    end if;
  end if;

  -- THE SUBJECT. A record being PUT BACK is deleted by definition, so that one kind looks for
  -- it among the deleted rows; every other kind still requires a live subject.
  if v_kind = 'record_restore' then
    select r.* into v_subject from custom.record r
     where r.organization_id = p_organization_id and r.id = p_subject_id and r.deleted_at is not null;
    if v_subject.id is null then
      raise exception 'There is no deleted record in this organization with that id, so there is nothing to put back.'
        using errcode = '02000',
              hint = 'A record that is still here does not need restoring; one that was never here cannot be.';
    end if;
  else
    select r.* into v_subject from custom.record r
     where r.organization_id = p_organization_id and r.id = p_subject_id and r.deleted_at is null;
    if v_subject.id is null then
      raise exception 'There is no such record in this organization, so there is nothing to approve.'
        using errcode = '02000';
    end if;
  end if;
  -- LANE S5-PRIME: A RECORD IN AN ARCHIVED TABLE IS NOT A THING TO ASK ABOUT. Nobody would ever
  -- see the request (the inbox does not list it) and nobody could decide it (the decide door
  -- refuses it by name), so it is refused here, before it is filed. Put-back included: bringing a
  -- record back into a table that is itself archived restores it into nowhere.
  if v_subject.table_id is not null and v_subject.table_id <> custom.table_kernel_id() then
    select coalesce(nullif(t.data ->> 'name', ''), 'its table') into v_home
      from custom.record t
     where t.organization_id = p_organization_id and t.id = v_subject.table_id
       and t.deleted_at is not null;
    if v_home is not null then
      raise exception '% is in %, which is archived, so a change to it cannot be asked for.',
                      coalesce(custom.record_words(p_organization_id, p_subject_id), 'That record'), v_home
        using errcode = '55000',
              hint = 'Bring the table back from the archive first; then ask again.';
    end if;
  end if;
  v_word := case when v_subject.table_id = custom.table_kernel_id() then 'table' else 'record' end;
  if v_kind = 'field_add' and v_word <> 'table' then
    raise exception 'A new column is added to a table, and this is a %.', v_word
      using errcode = '22023';
  end if;
  -- VISION-REACH W4 (c): notifications are on a table; a version is a record's.
  if v_kind = 'subscription_add' and v_word <> 'table' then
    raise exception 'Notifications are set up on a table, and this is a %.', v_word
      using errcode = '22023';
  end if;
  if v_kind = 'record_restore_version' and v_word <> 'record' then
    raise exception 'Only a record is put back to an earlier version here, and this is a %.', v_word
      using errcode = '22023';
  end if;
  if v_kind = 'host_run' and v_word <> 'table' then
    raise exception 'A copy or import runs into a table, and this is a %.', v_word
      using errcode = '22023';
  end if;
  -- Records go IN a table. Filing them against a row would produce an approval whose yes
  -- nobody could carry out.
  if v_kind = 'record_add' and v_word <> 'table' then
    raise exception 'Records are added to a table, and this is a %.', v_word
      using errcode = '22023';
  end if;
  -- A DOCUMENT TEMPLATE IS THE TABLE'S OWN WORDING, so it waits on the TABLE, exactly as a
  -- new column does, and its approvers resolve on the same ladder. The card has to carry the
  -- whole template — name and body — because approving is `custom.doc_template_save` with
  -- these bytes and nothing re-derived: a person signs for the words they were shown.
  if v_kind = 'doc_template_add' then
    if v_word <> 'table' then
      raise exception 'A document template is written for a table, and this is a %.', v_word
        using errcode = '22023';
    end if;
    if jsonb_typeof(p_change -> 'template') is distinct from 'object'
       or nullif(p_change #>> '{template,name}', '') is null then
      raise exception 'A document template waiting for approval has to carry the template it would save.'
        using errcode = '22004',
              hint = 'Send {"kind":"doc_template_add","template":{"name":"…","body":"…","template_id":null}}.';
    end if;
  end if;
  -- A NEW TABLE HANGS ON ITS HOME, which is the record it would be made inside. That is what
  -- makes the wait answerable: `custom.work_approval_approvers` resolves the admins on that
  -- Home and then the organization's owners and admins, on the one ladder.
  if v_kind = 'table_add'
     and nullif(p_change #>> '{table,parent_id}', '') is distinct from p_subject_id::text then
    raise exception 'A new table waits on the home it would be made in, and this spec names a different one.'
      using errcode = '22023',
            hint = 'File the request against the record named by the spec''s parent_id.';
  end if;

  -- A CHANGE THE STORE WOULD REFUSE IS NEVER FILED (lane HANDOVER, 2026-09-28). Cedar Ridge
  -- Physical Therapy's workflow proposed a patient with Insurance "Blue Shield"; the wait was
  -- filed, the run paused, and only Approve found the store refuses that choice, so a person had
  -- been asked to sign for a change nobody could make. The change is now tried through the very
  -- doors approval uses, in a savepoint, and the store's own refusal is raised here instead.
  if v_kind in ('record_add', 'record_patch') then
    v_refusal := custom._held_change_refusal(p_organization_id, v_kind, p_subject_id, p_change);
    if v_refusal is not null then
      raise exception '%', v_refusal ->> 'message'
        using errcode = coalesce(nullif(v_refusal ->> 'code', ''), 'P0001'),
              hint = concat_ws(' ', nullif(v_refusal ->> 'hint', ''),
                               'Nothing was filed for approval: correct the change and ask again.');
    end if;
  end if;

  if p_approver_id is not null
     and not exists (select 1 from iam.organization_member m
                      where m.organization_id = p_organization_id and m.user_id = p_approver_id) then
    raise exception 'That person is not in this organization, so they cannot be asked to approve anything here.'
      using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('user_id', a.user_id, 'name', a.name, 'why', a.why)), '[]'::jsonb)
    into v_who
    from custom.work_approval_approvers(p_organization_id, p_subject_id, p_approver_id) a;

  if jsonb_array_length(v_who) = 0 then
    raise exception 'Nobody in this organization could approve that, so asking would leave it waiting forever.'
      using errcode = '42501',
            hint = 'Name an approver, or ask an owner of the organization to give somebody Full access on it. A request nobody can answer is worse than no request.';
  end if;

  -- HOST-RUN: THE SAME JOB ASKED AGAIN IS THE SAME WAIT. An agent that retries, or asks again before anybody
  -- decided, gets the approval already waiting — never a second card for one job.
  if v_kind = 'host_run' then
    -- HOST-RUN-2: two first asks at the same moment are one wait — the second waits for the first's insert.
    perform pg_advisory_xact_lock(hashtextextended('host_run:' || p_organization_id::text || ':'
                                                   || (p_change #>> '{job,fingerprint}'), 0));
    select r.id into v_id
      from custom.record r
     where r.organization_id = p_organization_id and r.data_class = 'work_approval' and r.deleted_at is null
       and r.data ->> 'state' = 'pending'
       and r.data #>> '{change,kind}' = 'host_run'
       and r.data #>> '{change,job,fingerprint}' = p_change #>> '{job,fingerprint}'
       and r.data ->> 'subject_id' = p_subject_id::text
       and (r.data ->> 'conversation_id') is not distinct from p_conversation_id::text
     order by r.created_at desc
     limit 1;
    if v_id is not null then
      return jsonb_build_object(
        'approval_id', v_id, 'state', 'pending', 'subject_id', p_subject_id, 'subject_kind', v_word,
        'origin', v_origin, 'approvers', v_who, 'already_waiting', true,
        'message', 'The same job is already waiting for a person.');
    end if;
  end if;

  perform set_config('custom.decision_door', 'work_approval:request', true);
  insert into custom.record (organization_id, table_id, data_class, data)
  values (p_organization_id, null, 'work_approval', jsonb_strip_nulls(jsonb_build_object(
    'subject_id',      p_subject_id::text,
    'subject_kind',    v_word,
    'subject_table_id', v_subject.table_id::text,
    'subject_title',   custom.record_words(p_organization_id, p_subject_id),
    'change',          p_change,
    'origin',          v_origin,
    'note',            nullif(btrim(coalesce(p_note, '')), ''),
    'approver_id',     p_approver_id::text,
    'conversation_id', p_conversation_id::text,
    'requested_by',    v_me::text,
    'requested_at',    to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'state',           'pending')))
  returning id into v_id;
  perform set_config('custom.decision_door', '', true);

  if p_approver_id is not null and not custom.query_is_store_owner() then
    perform custom.share_grant(p_organization_id, v_id, 'person', p_approver_id,
                               'admin'::public.permission_level);
  end if;

  return jsonb_build_object(
    'approval_id', v_id,
    'state',       'pending',
    'subject_id',  p_subject_id,
    'subject_kind', v_word,
    'origin',      v_origin,
    'approvers',   v_who,
    'message',     format('This is waiting for %s.',
                     case when jsonb_array_length(v_who) = 1
                          then coalesce(v_who -> 0 ->> 'name', 'somebody')
                          else format('%s people who can approve it', jsonb_array_length(v_who)) end));
end
$function$;

CREATE OR REPLACE FUNCTION public.revoke_resource_access(p_resource_type text, p_resource_id uuid, p_target_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid      uuid := auth.uid();
  v_resolved record;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated'); END IF;
  BEGIN
    SELECT * INTO STRICT v_resolved FROM public.resolve_shareable_resource(p_resource_type);
  EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', false, 'error', SQLERRM); END;

  IF NOT public.may_manage_sharing(v_resolved.resource_type, p_resource_id) THEN
    RETURN jsonb_build_object('success', false, 'error',
      'You need Full access on this to decide who else may see it. Ask whoever has it, or an owner of the organization.');
  END IF;
  IF v_resolved.schema_name = 'custom' THEN
    RETURN public.store_door_unshare(v_resolved.resource_type, p_resource_id, 'person', p_target_user_id);
  END IF;

  -- REVOCATION RULE (T-32e): the grant is archived, never deleted, and ends now; the remover is
  -- recorded, so no group share, invitation, request or other automated writer gives it back.
  RETURN iam.remove_grant(
    (SELECT p.id FROM iam.permissions p
      WHERE p.resource_type = v_resolved.resource_type AND p.resource_id = p_resource_id
        AND p.granted_to_user_id = p_target_user_id),
    v_uid, true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.revoke_resource_org_access(p_resource_type text, p_resource_id uuid, p_target_org_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid      uuid := auth.uid();
  v_resolved record;
  v_res      jsonb;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated'); END IF;
  BEGIN
    SELECT * INTO STRICT v_resolved FROM public.resolve_shareable_resource(p_resource_type);
  EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', false, 'error', SQLERRM); END;

  IF NOT public.may_manage_sharing(v_resolved.resource_type, p_resource_id) THEN
    RETURN jsonb_build_object('success', false, 'error',
      'You need Full access on this to decide who else may see it. Ask whoever has it, or an owner of the organization.');
  END IF;
  IF v_resolved.schema_name = 'custom' THEN
    RETURN public.store_door_unshare(v_resolved.resource_type, p_resource_id, 'organization', p_target_org_id);
  END IF;

  -- delete means archive (T-32g): the organization's grant is archived and ends now.
  v_res := iam.remove_grant(
    (SELECT p.id FROM iam.permissions p
      WHERE p.resource_type = v_resolved.resource_type AND p.resource_id = p_resource_id
        AND p.granted_to_organization_id = p_target_org_id),
    v_uid, true);
  IF NOT COALESCE((v_res ->> 'success')::boolean, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'No matching organization permission found');
  END IF;
  RETURN jsonb_build_object('success', true, 'message', 'Organization access revoked', 'outcome', v_res ->> 'outcome');
END;
$function$;
