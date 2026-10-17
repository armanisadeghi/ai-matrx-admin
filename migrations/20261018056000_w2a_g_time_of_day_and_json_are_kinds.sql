-- lane: W2-A
-- lock: custom
-- based-on: custom.field_kinds() 0ac661dec79cf29ebc26ba0b656a6e11df0c00001f8ac883660d36f1ad79e8cf
-- based-on: custom._field_document_for(uuid, uuid, jsonb) 7df4654aae61d0828ed89bb72cfc0f919f3e482ac852753962f1a40167bdaf25
-- based-on: custom.field_kind_of(jsonb) 6fcc0ecc391da971215d63d08b5fc136b743b818b101232f5977b42107792495
-- based-on: custom._kind_value_ok(jsonb, text, jsonb) edbc50fa5f30cfaab7b733c4d0368e99eccf1d5b6d47a626ed2fd48ba72b09d1
-- based-on: custom.validate_values(uuid, custom.record[], jsonb, text) 920ca18f26f579405d377c9288fd8bd0f4edf5921df905caecfbfcf8c75a970b
-- based-on: custom._kind_value_fit(jsonb, jsonb, jsonb) fd56935bce8dc2408cb1a45a5889f35426afb78104cec3445bbbf52563af5bd9
-- based-on: custom._fx_ext(uuid, text, jsonb[], jsonb) 95d97825b5345561f7204706b3b1e743a82eb7cb8e5b20e521706aea2d1e7dd5
--
-- W2-A 1 (AIRTABLE-PARITY row 100). A time of day was plain text wearing a look and there was no JSON kind. Both are now
-- kinds (custom.field_kinds): text behaviour with format time (24-hour HH:MM[:SS], zero-padded, so text order is time
-- order for sort and filter; HOUR/MINUTE/SECOND read it) and format json (any JSON value, judged whole).
CREATE OR REPLACE FUNCTION custom.field_kinds()
 RETURNS TABLE(kind text, behavior text, parity boolean, made_of text)
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE
 SET search_path TO 'pg_catalog'
AS $function$
  select t.parity_type, t.behavior, true, t.made_of
    from custom.parity_field_types() t
  union all
  select * from (values
    ('text',      'text',     false, 'plain text: behaviour text with no format — it carries no parity type, which is exactly what custom.parity_type answers for it'),
    ('long_text', 'text',     false, 'behaviour text with format long and config.multiline, for several lines rather than one'),
    ('number',    'range',    false, 'a plain number: behaviour range with no date kind and neither the currency nor the percent format'),
    ('relation',  'relation', false, 'REL / FLD-11: a relation a person aims themselves — relation_target names a Table of this organization, and it is a BEHAVIOUR, never a parity type of its own'),
    ('signature', 'text',     false, 'VAL-10: behaviour text whose format is signature — the one shape custom.doc_sign accepts, sealed by custom.doc_signature_write and checked by custom.doc_signature_intact'),
    ('entity_reference', 'relation', false, 'SC-R / P12: a relation whose target mode is any (REL-8), restricted by config.allowed_types to the platform kinds it may name (custom.entity_reference_kinds() — agents, notes, web sites, workbooks, datasets, conversations …); each value is {token, id}, the edge a platform.associations row record → <token>. File and Person stay relations to their kernel Tables'),
    -- LANE 10 P4 (2026-10-02): nine kinds from Airtable's and SmartSuite's field lists. Each is an
    -- existing behaviour wearing a format (FLD-1's closed set holds); custom.field_kind_of reads
    -- each back; custom._field_kind_shape_ok and custom._kind_value_ok judge them.
    ('rating',      'range',    false, 'P4: behaviour range, format rating; a whole number of stars from 0 to its max Rule (1 to 10, default 5), shown as stars'),
    ('duration',    'range',    false, 'P4: behaviour range, format duration, unit seconds; a length of time kept as seconds, never below zero'),
    ('created_by',  'formula',  false, 'P4: a formula Field whose config.system is created_by: who made the record, {id, name}, filled by the store from the record''s writer on read and never typed'),
    ('modified_by', 'formula',  false, 'P4: a formula Field whose config.system is modified_by: who last changed the record, {id, name}, filled by the store on read and never typed'),
    ('status',      'list',     false, 'P4: a single-choice list with format status; config.status_groups puts each choice key in todo, in_progress or done (Notion''s Status)'),
    ('address',     'text',     false, 'P4: behaviour text, format address; the value is {street, city, region, postal_code, country}, every part optional, at least one filled'),
    ('barcode',     'text',     false, 'P4: behaviour text, format barcode; one printable line a scanner reads, config.symbology optional (custom.barcode_symbologies()), EAN/UPC digits and check digit enforced'),
    ('rich_text',   'text',     false, 'P4: behaviour text, format rich_text; Markdown with no raw HTML and no script links, shown formatted'),
    ('count',       'formula',  false, 'P4: a roll-up whose config.agg is count, with format count: how many records a many-relation points at, as a number of its own'),
    -- NOTION-PROPS-2 (2026-10-08): Notion's and Airtable's Button.
    ('button',      'text',     false, 'NOTION-PROPS-2: behaviour text, format button; holds no value. config.button says what a press does through custom.button_press: open_url (url, {{field id}} filled from the row), run_automation (one of the table''s automations, on this row) or run_action (one of its row actions, which sets fields), or add_row (a new row in this table or table_id''s, prefilled from this row by prefill, opened); a button with no do yet is a label only')
    -- W2-A 1 (AIRTABLE-PARITY row 100): a time of day and a JSON value, each a text behaviour wearing a format.
    ,('time',      'text',     false, 'W2-A: behaviour text, format time; a time of day with no date kept as 24-hour HH:MM or HH:MM:SS (zero-padded, so its text order is its time order); HOUR, MINUTE and SECOND read it')
    ,('json',      'text',     false, 'W2-A: behaviour text, format json; any JSON value (object, list, number, words, yes/no) kept as jsonb, shown collapsed')
  ) as extra(kind, behavior, parity, made_of);
$function$;

CREATE OR REPLACE FUNCTION custom._field_document_for(p_organization_id uuid, p_table_id uuid, p_spec jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  d        jsonb;
  v_parity text := nullif(p_spec ->> 'parity_type', '');
  v_key    text := nullif(p_spec ->> 'key', '');
  -- ── LIMITS-FIX 2026-09-21: ONE WORD FOR WHAT A PERSON READS ON THE COLUMN. ──────────
  -- A table spec's inline field says `name` (`custom._table_shape_guard` demands it) and
  -- this door said `label`, so the same concept had two words one call apart and a caller
  -- that used the table's word was told "A field needs a name" while holding one. Real-data
  -- crew D hit this on 2026-09-21 declaring a podcast episode pipeline. Both words are read
  -- here; `label` still wins when a caller sends both, so no existing caller changes.
  v_label  text := coalesce(nullif(p_spec ->> 'label', ''), nullif(p_spec ->> 'name', ''));
  v_multi  boolean := coalesce((p_spec ->> 'multi')::boolean, false);
  v_config jsonb := coalesce(p_spec -> 'config', '{}'::jsonb);
  -- DEFECTS 7: `unique: true` is the plain way to say the unique rule (declareTable already sent it as a rule;
  -- fieldDeclare, field_update and every other door sent the flag, and it was dropped in silence).
  v_rules  jsonb := coalesce(p_spec -> 'rules', '[]'::jsonb)
                    || case when lower(coalesce(p_spec ->> 'unique', '')) in ('true', 't', '1', 'yes')
                                 and not coalesce(p_spec -> 'rules', '[]'::jsonb) @> '[{"kind": "unique"}]'::jsonb
                            then '[{"kind": "unique"}]'::jsonb else '[]'::jsonb end;
  v_plain  text := coalesce(nullif(p_spec ->> 'plain', ''), 'text');
  v_alias  text := lower(btrim(coalesce(p_spec ->> 'type', '')));
  -- FIX-10B-F6: the caller said the word `signature`. It is one of the kinds
  -- `custom.field_kinds()` publishes and it is NOT a parity type — it is plain
  -- text wearing the one format `custom.doc_sign` accepts — so it is resolved
  -- here, beside the other words, and carried into the plain-text arm below.
  v_signature boolean := false;
  -- GRID-PRIMITIVES G5: the three column kinds the store fills in itself.
  v_system text := null;
  -- GRID-PRIMITIVES G3: a formula a person TYPED, parsed by the store.
  v_parsed jsonb := null;
  v_relation uuid := null;   -- SEAT-SUITES: the Table a caller's own relation column points at
  -- SC-R / P12, 2026-09-24: a column that points at a PLATFORM thing — an agent, a note, a web
  -- site, a workbook — rather than at a record of one of this organization's Tables.
  v_entity  boolean := false;
  -- LANE 10 P4: which of the nine kinds the caller's word named (rating, duration, address,
  -- barcode, rich_text, status, count); created_by and modified_by ride v_system.
  v_kind    text := null;
  v_max     numeric;
  v_allowed jsonb   := null;
  -- LIMITS-FIX 2026-09-21: the same one-word rule for the relation's target. Real-data crew E
  -- reported that no client door could declare a table-to-table relation; the door could, and
  -- has since 2026-09-19 — it only ever answered to `relation_target`, and a caller reaching
  -- for `target_table` got "A column that points at other records is a Person column or a File
  -- column", which describes a different mistake entirely.
  v_target text := coalesce(nullif(p_spec ->> 'relation_target', ''), nullif(p_spec ->> 'target_table', ''));
  v_deps   jsonb := case when jsonb_typeof(p_spec -> 'depends_on') = 'array'
                         then p_spec -> 'depends_on' else '[]'::jsonb end;
begin
  -- ── STORE-T: `type` IS THE WORD EVERY CALLER REACHES FOR, AND IT WAS THROWN AWAY. ──────
  -- Measured on 2026-09-20: `{"type":"number"}` produced a TEXT column and `{"type":"banana"}`
  -- was ACCEPTED, silently, as text. Only `parity_type` and `plain` were ever read, so every
  -- agent, script and other client that said "type" got a text column and was never told.
  -- Now it is read as what it plainly means, and a word that means nothing is refused BY NAME
  -- with the list — nothing is guessed and nothing is silently dropped.
  if v_alias <> '' and v_parity is null and nullif(p_spec ->> 'plain', '') is null then
    if exists (select 1 from custom.parity_field_types() t where t.parity_type = v_alias) then
      v_parity := v_alias;
    elsif v_alias in ('number', 'range', 'integer', 'decimal', 'float') then
      v_plain := 'number';
    elsif v_alias in ('long_text', 'longtext', 'long text', 'paragraph') then
      v_plain := 'long_text';
    elsif v_alias in ('text', 'string') then
      v_plain := 'text';
    elsif v_alias in ('boolean', 'bool', 'checkbox', 'check_box', 'tick', 'tickbox',
                      'yes_no', 'yesno', 'yes/no', 'toggle', 'switch') then
      -- LIMITS-FIX: every word a person, an agent or a spreadsheet reaches for when they
      -- mean a tick box lands on the one type that is one.
      v_parity := 'checkbox';
    elsif v_alias = 'list' then
      v_parity := 'select';
    elsif v_alias in ('signature', 'sign', 'e_signature', 'esignature') then
      -- ── FIX-10B-F6, 2026-09-22: THE E-SIGN HALF OF DOCUMENTS COULD NOT BE REACHED. ──────
      -- `custom.doc_sign` accepts exactly one field — text whose format is `signature` — and
      -- this door would write that format only when a caller sent `format: signature`
      -- alongside a plain text type. No screen sends a format: the add-a-column panel
      -- collects an INTENTION and the store answers the behaviour, the format and the unit.
      -- So the sentence under a rendered document ("Crews needs a signature column - a text
      -- column whose format is signature") named a precondition no screen could meet, and
      -- every sign request, expiring link and sealed hash behind it was unreachable.
      -- VERIFIER-10 F6, measured from the admin seat on Rincon Plumbing's Crews table.
      -- A signature is now a WORD like every other kind, published by
      -- `custom.field_kinds()`, and the panel that offers it sends the word.
      v_plain := 'text';
      v_signature := true;
    elsif v_alias in ('autonumber', 'created_time', 'modified_time', 'auto_number',
                      'created', 'modified', 'last_modified', 'last_modified_time') then
      -- ── GRID-PRIMITIVES G5, 2026-09-22: THE STORE'S OWN STAMPS AS COLUMNS. ──────────────
      -- The older grid has an Autonumber, a Created time and a Last modified time column,
      -- and none of the three is typed: the database assigns the number and the row carries
      -- its own stamps. Here each is a formula Field whose expression is the system node —
      -- fx.autonumber is worked out ONCE, on write, and kept; the two stamps on read — so
      -- every reader that serves a worked-out value serves these with nothing new, and a
      -- hand-typed value is refused exactly as it is for any formula (FLD-9).
      v_parity := 'formula';
      v_system := case when v_alias in ('autonumber', 'auto_number') then 'autonumber'
                       when v_alias in ('created_time', 'created') then 'created_time'
                       else 'modified_time' end;
    -- ── LANE 10 P4, 2026-10-02: NINE MORE KINDS, EACH AN EXISTING BEHAVIOUR WEARING A FORMAT. ──
    -- Airtable's and SmartSuite's field lists, measured against field_kinds(): rating, duration,
    -- created by, last modified by, status, address, barcode, rich text and count were missing.
    -- None is a behaviour of its own (FLD-1's set stays closed): a rating and a duration are
    -- numbers, an address, a barcode and rich text are words, a status is a choice, a count is a
    -- roll-up, and who made or last changed a record is a formula the store fills in.
    elsif v_alias in ('rating', 'stars', 'star_rating') then
      v_kind := 'rating';  v_plain := 'number';
    elsif v_alias in ('duration', 'time_spent', 'length_of_time') then
      v_kind := 'duration'; v_plain := 'number';
    elsif v_alias in ('address', 'postal_address', 'location_address') then
      v_kind := 'address'; v_plain := 'text';
    -- W2-A 1: a time of day and a JSON value are words wearing a format.
    elsif v_alias in ('time', 'time_of_day', 'timeofday') then
      v_kind := 'time'; v_plain := 'text';
    elsif v_alias in ('json', 'json_value', 'object') then
      v_kind := 'json'; v_plain := 'text';
    elsif v_alias in ('barcode', 'bar_code', 'scan_code') then
      v_kind := 'barcode'; v_plain := 'text';
    -- NOTION-PROPS-2: a BUTTON is words that are never written — a label and what a press does.
    elsif v_alias in ('button', 'action_button') then
      v_kind := 'button'; v_plain := 'text';
    elsif v_alias in ('rich_text', 'richtext', 'rich text', 'formatted_text', 'markdown') then
      v_kind := 'rich_text'; v_plain := 'text';
    elsif v_alias in ('status', 'status_with_groups') then
      v_kind := 'status'; v_parity := 'select';
    elsif v_alias in ('count', 'count_of_linked', 'link_count') then
      v_kind := 'count'; v_parity := 'rollup';
    elsif v_alias in ('created_by', 'creator', 'made_by') then
      v_parity := 'formula'; v_system := 'created_by';
      if coalesce(jsonb_typeof(p_spec -> 'display_format'), 'null') = 'null' then
        p_spec := p_spec || jsonb_build_object('display_format', jsonb_build_object('id', 'person'));
      end if;
    elsif v_alias in ('modified_by', 'last_modified_by', 'updated_by', 'changed_by') then
      v_parity := 'formula'; v_system := 'modified_by';
      if coalesce(jsonb_typeof(p_spec -> 'display_format'), 'null') = 'null' then
        p_spec := p_spec || jsonb_build_object('display_format', jsonb_build_object('id', 'person'));
      end if;
    elsif v_alias in ('entity_reference', 'entity', 'entity_ref', 'reference', 'platform_reference') then
      -- ── SC-R / P12, 2026-09-24: A RECORD POINTING AT SOMETHING THAT IS NOT A RECORD. ─────
      -- The scope system let a client's column point at its web site, its intake note or the
      -- agent that works it (16 such columns live on the main database), and the store could
      -- not: a relation reached one Table of this organization or the kernel File / Person
      -- Table and nothing else, so the mover had to refuse all sixteen. An entity reference is
      -- a RELATION (FLD-1's closed set of five behaviours holds) whose target mode is `any`
      -- (REL-8), restricted to the kinds it names in `allowed_types` — the scope system's own
      -- word `allowed_reference_types` is read too. Each kind must be one
      -- custom.entity_reference_kinds() lists; custom._field_shape_guard says which is not.
      v_entity := true;
      v_allowed := coalesce(
        case when jsonb_typeof(p_spec -> 'allowed_types') = 'array' then p_spec -> 'allowed_types' end,
        case when jsonb_typeof(v_config -> 'allowed_types') = 'array' then v_config -> 'allowed_types' end,
        case when jsonb_typeof(p_spec -> 'allowed_reference_types') = 'array' then p_spec -> 'allowed_reference_types' end,
        case when jsonb_typeof(p_spec -> 'allowed_types') = 'string'
             then jsonb_build_array(p_spec -> 'allowed_types') end);
      select coalesce(jsonb_agg(w order by first_at), '[]'::jsonb) into v_allowed
        from (select lower(btrim(x #>> '{}')) as w, min(o) as first_at
                from jsonb_array_elements(coalesce(v_allowed, '[]'::jsonb)) with ordinality as a(x, o)
               where jsonb_typeof(x) = 'string' and btrim(x #>> '{}') <> ''
               group by 1) s;
      if jsonb_array_length(v_allowed) = 0 then
        raise exception 'A column that points at things on the platform has to say which kinds of thing, and "%" names none.', coalesce(v_label, v_key, 'this column')
          using errcode = '23514',
                hint = 'SC-R / P12: send allowed_types, a list such as ["note", "web_site"]; select token, label from custom.entity_reference_kinds() lists every kind. A file is a File column and a person a Person column. Nothing was created.';
      end if;
    elsif v_alias = 'relation' then
      -- ── SEAT-SUITES, 2026-09-19: A COLUMN POINTING AT ANOTHER OF YOUR OWN TABLES COULD
      -- NOT BE MADE AT ALL. ────────────────────────────────────────────────────────────
      -- `member` points at the kernel Person Table and `attachment` at the kernel File
      -- Table, and those were the ONLY two relations this door could build. A person with
      -- an Invoice Table and a Line Table could not give Invoice a Lines column through any
      -- door, although the store holds exactly that shape already: the parity-floor
      -- fixture's own `lines` field is a plain relation at a custom Table, and every guard,
      -- every edge, every rollup and `custom.record_relation_edges` handle it. Only the
      -- door refused, and it refused EVEN WHEN THE CALLER SAID WHICH TABLE.
      -- THE RULE: a caller that NAMES its target gets the relation it asked for; a caller
      -- that names nothing still gets the old sentence, because a relation with no target
      -- is the thing that sentence is actually about.
      if v_target is null then
        raise exception 'A column that points at other records is a Person column or a File column, and "%" does not say which.', v_alias
          using errcode = '23514',
                hint = 'FLD-11: say member for a person or attachment for a file, or name the Table this column points at in relation_target. Nothing was created.';
      end if;
      v_relation := v_target::uuid;
      -- ── RELATION-DECLARE, 2026-09-20: A COLUMN COULD POINT AT SOMETHING THAT IS NOT A
      -- TABLE, AND NOBODY WAS TOLD. ────────────────────────────────────────────────────────
      -- This arm took the caller's uuid and wrote it down unread. A uuid naming NOTHING at
      -- all was accepted; a uuid naming a RECORD instead of a Table was accepted. The column
      -- then points at a thing with no records to pick from and no title field to make a chip
      -- out of, and every reader downstream has to guess what that means. Measured from the
      -- seat `authenticated` on the main database, 2026-09-20. (A Table in ANOTHER
      -- organization was already refused by custom._field_shape_guard; that stands.)
      if not exists (select 1 from custom.record t
                      where t.id = v_relation
                        and t.deleted_at is null
                        and t.table_id = custom.table_kernel_id()
                        and (t.organization_id = p_organization_id or t.data_class = 'kernel')) then
        raise exception 'A column that points at other records has to point at a TABLE, and the one it names is not one of this organization''s tables.' using errcode = '23503',
                hint = 'FLD-11 / REL-8: relation_target names the Table whose records this column may point at - open the Table you meant and use its id. Nothing was created.',
            detail = jsonb_build_object('relation', v_relation)::text;
      end if;
    else
      raise exception 'There is no kind of column called "%".', p_spec ->> 'type'
        using errcode = '23514',
              hint = format('FLD-11: %s. Nothing was created.', custom._field_kinds_sentence());
    end if;
  end if;
  -- LANE 10 P4 round 3 (V11 #8): A SETTING A KIND CANNOT KEEP IS REFUSED, NEVER DROPPED. A rating,
  -- a length of time, an address, a piece of formatted text, a count and who wrote a record hold one
  -- value each; only a number of some sort has a unit.
  if (v_kind in ('rating', 'duration', 'address', 'rich_text', 'count') or v_system in ('created_by', 'modified_by'))
     and coalesce((p_spec ->> 'multi')::boolean, false) then
    raise exception '"%" holds one % per record, so it cannot hold several.', coalesce(v_label, v_key, 'This column'),
                    case coalesce(v_kind, v_system) when 'rating' then 'rating' when 'duration' then 'length of time'
                         when 'address' then 'address' when 'rich_text' then 'piece of formatted text' when 'count' then 'count'
                         else 'writer' end
      using errcode = '23514', hint = 'P4: leave multi out, or send false. Nothing was created.';
  end if;
  if (v_kind in ('rating', 'address', 'barcode', 'rich_text', 'status', 'count') or v_system in ('created_by', 'modified_by'))
     and nullif(btrim(coalesce(p_spec ->> 'unit', '')), '') is not null then
    raise exception '"%" has no unit, so it cannot be kept in %.', coalesce(v_label, v_key, 'This column'), p_spec ->> 'unit'
      using errcode = '23514', hint = 'P4: only a number, an amount of money or a percentage has a unit. Nothing was created.';
  end if;
  if v_kind = 'duration' and nullif(btrim(coalesce(p_spec ->> 'unit', '')), '') is not null
     and lower(btrim(p_spec ->> 'unit')) not in ('seconds', 'second', 's', 'sec', 'secs') then
    raise exception 'A duration is kept in seconds, so "%" cannot be kept in %. Leave the unit out; it shows as hours and minutes.', coalesce(v_label, v_key, 'This column'), p_spec ->> 'unit'
      using errcode = '23514', hint = 'P4: a duration''s unit is seconds. Nothing was created.';
  end if;

  if v_label is null then
    raise exception 'A field needs a name - it is what a person reads on the column.'
      using errcode = '23514', hint = 'Give the field a name (a table spec''s own word) or a label - they mean the same thing here. Everything else this door can work out.';
  end if;
  if v_key is null then
    -- The panel derives the key from the label; a caller that did not is not
    -- refused for a machine token it never meant to think about.
    v_key := regexp_replace(lower(btrim(v_label)), '[^a-z0-9]+', '_', 'g');
    v_key := regexp_replace(v_key, '^_+|_+$', '', 'g');
    if v_key !~ '^[a-z]' then v_key := 'f_' || v_key; end if;
    v_key := left(v_key, 48);
  end if;
  if v_key !~ '^[a-z][a-z0-9_]*$' then
    raise exception 'A field''s key is made of lower-case letters, digits and underscores, and this one is "%".', v_key
      using errcode = '23514', hint = 'FLD-13: leave the key out and the store makes one from the name.';
  end if;

  -- THE FLOOR EVERY FIELD STANDS ON. Every key the guards demand is written,
  -- always, so no caller can omit one by accident.
  d := jsonb_build_object(
    'key',                  v_key,
    'label',                v_label,
    'multi',                v_multi,
    'dated',                coalesce((p_spec ->> 'dated')::boolean, false),
    'required',             coalesce((p_spec ->> 'required')::boolean, false),
    'sort',                 coalesce((p_spec ->> 'sort')::numeric, 100),
    'source',               coalesce(nullif(p_spec ->> 'source', ''), 'manual'),
    'source_config',        coalesce(p_spec -> 'source_config', '{}'::jsonb),
    'sensitivity',          coalesce(nullif(p_spec ->> 'sensitivity', ''), 'internal'),
    'context_policy',       coalesce(nullif(p_spec ->> 'context_policy', ''), 'include'),
    'applies_to_types',     coalesce(p_spec -> 'applies_to_types', '[]'::jsonb),
    -- STORE-T / T7: THE CALLER'S OWN DEPENDENCY LIST, KEPT. It used to be hard-coded to the
    -- empty list here, so NO client-made formula ever had dependencies, `custom.field_dependants`
    -- could never name one, and REC-18's refusal — "this field is used by …" — could not fire for
    -- anything a person or an agent built. That is the third half of T7.
    'depends_on',           v_deps,
    'entity_definition_id', p_table_id);

  -- SEAT-SUITES 2026-09-19: two properties `custom.field` has always projected and this door
  -- silently dropped, so a person could read them and never set them. They are carried only
  -- when the caller names them, so no existing field's document changes shape.
  if nullif(p_spec ->> 'review_interval_days', '') is not null then
    d := d || jsonb_build_object('review_interval_days', (p_spec ->> 'review_interval_days')::integer);
  end if;
  if p_spec ? 'default' then
    d := d || jsonb_build_object('default', p_spec -> 'default');
  end if;

  -- SC-R / P12: THE ENTITY REFERENCE (see its arm above). A relation with no Table target: its
  -- target mode is `any` and `allowed_types` says which platform kinds it may name. No display
  -- spec — its words are each thing's own title, read by platform.relation_label.
  if v_entity then
    d := d || jsonb_build_object(
      'type',             'relation',
      'relation_max',     coalesce((p_spec ->> 'relation_max')::integer, case when v_multi then 25 else 1 end),
      'on_target_delete', case when nullif(p_spec ->> 'on_target_delete', '') in ('restrict','set_null','cascade')
                               then p_spec ->> 'on_target_delete' else 'set_null' end,
      'rules',            v_rules,
      'config',           (v_config - 'allowed_types' - 'target_tables')
                          || jsonb_build_object('target_mode', 'any', 'allowed_types', v_allowed));
    return custom._with_display_format(d, p_spec - 'display');
  end if;

  -- THE RELATION A CALLER NAMED ITSELF (see the `relation` arm above). It carries no parity
  -- type — `custom.parity_type` answers nothing for it, exactly as it answers nothing for
  -- plain text and plain numbers — and every relation property is the caller's to declare.
  if v_relation is not null then
    d := d || jsonb_build_object(
      'type',             'relation',
      'relation_target',  v_relation,
      'relation_max',     coalesce((p_spec ->> 'relation_max')::integer, case when v_multi then 25 else 1 end),
      'on_target_delete', case when nullif(p_spec ->> 'on_target_delete', '') in ('restrict','set_null','cascade')
                               then p_spec ->> 'on_target_delete' else 'set_null' end,
      'rules',            v_rules,
      'config',           v_config);
    if nullif(p_spec ->> 'inverse_key', '') is not null then
      d := d || jsonb_build_object('inverse_key', p_spec ->> 'inverse_key');
    end if;
    return custom._with_display_format(custom._with_display(p_organization_id, d, p_spec - 'display_format'), p_spec);
  end if;

  if v_parity is null then
    -- The three behaviours a person picks that are NOT one of the parity types:
    -- plain text, a long text and a plain number. They carry no parity type,
    -- which is exactly what `custom.parity_type` answers for them.
    if v_plain = 'number' then
      d := d || jsonb_build_object('type', 'range', 'config', v_config, 'rules', v_rules);
      if nullif(p_spec ->> 'unit', '') is not null then
        d := d || jsonb_build_object('unit', p_spec ->> 'unit');
      end if;
      -- LANE 10 P4: A RATING. Its top star is a max Rule (FLD-3 - a constraint is a Rule, never a
      -- config key), 1 to 10, from the caller's `max`, else the Rule it already carries, else 5.
      -- Its bottom is a min Rule of 0. It shows as stars out of that max.
      if v_kind = 'rating' then
        -- V8 #6: a top star that is not a number is refused, never quietly made 5.
        if nullif(btrim(coalesce(p_spec ->> 'max', '')), '') is not null
           and (p_spec ->> 'max') !~ '^-?[0-9]+(\.[0-9]+)?$' then
          raise exception 'A rating goes up to a whole number of stars from 1 to 10, and "%" asks for "%", which is not a number.', v_label, p_spec ->> 'max'
            using errcode = '23514', hint = 'P4: send max as a number between 1 and 10, or leave it out for 5. Nothing was created.';
        end if;
        v_max := coalesce(case when (p_spec ->> 'max') ~ '^-?[0-9]+(\.[0-9]+)?$' then (p_spec ->> 'max')::numeric end,
                          (select max((r ->> 'value')::numeric) from jsonb_array_elements(v_rules) r
                            where r ->> 'kind' = 'max' and (r ->> 'value') ~ '^-?[0-9]+(\.[0-9]+)?$'),
                          5);
        if v_max <> trunc(v_max) or v_max < 1 or v_max > 10 then
          raise exception 'A rating goes up to a whole number of stars from 1 to 10, and "%" asks for %.', v_label, v_max
            using errcode = '23514', hint = 'P4: send max between 1 and 10, or leave it out for 5. Nothing was created.';
        end if;
        d := (d - 'unit') || jsonb_build_object(
          'format', 'rating', 'multi', false,
          'rules', coalesce((select jsonb_agg(r) from jsonb_array_elements(v_rules) r
                              where coalesce(r ->> 'kind', '') not in ('min', 'max')), '[]'::jsonb)
                   || jsonb_build_array(jsonb_build_object('kind', 'min', 'value', 0),
                                        jsonb_build_object('kind', 'max', 'value', v_max)));
        if coalesce(jsonb_typeof(p_spec -> 'display_format'), 'null') = 'null'
           or (p_spec -> 'display_format' ->> 'id') = 'rating' then
          p_spec := p_spec || jsonb_build_object('display_format', jsonb_build_object(
                      'id', 'rating', 'options', jsonb_build_object('ratingMax', v_max)));
        end if;
      -- LANE 10 P4: A DURATION is a number of seconds, never below zero, shown as hours and minutes.
      elsif v_kind = 'duration' then
        -- V8 #6: a duration is kept in seconds; a caller asking for another unit of time is told so,
        -- never quietly given seconds.
        if lower(btrim(coalesce(p_spec ->> 'unit', ''))) in ('minutes', 'minute', 'min', 'mins', 'hours', 'hour', 'h', 'hr', 'hrs',
                                                              'days', 'day', 'ms', 'milliseconds', 'millisecond', 'weeks', 'week') then
          raise exception 'A duration is kept in seconds, so "%" cannot be kept in %. Leave the unit out; it shows as hours and minutes.', v_label, p_spec ->> 'unit'
            using errcode = '23514', hint = 'P4: a duration''s unit is seconds. Nothing was created.';
        end if;
        d := d || jsonb_build_object('format', 'duration', 'unit', 'seconds',
          'rules', case when exists (select 1 from jsonb_array_elements(v_rules) r where r ->> 'kind' = 'min')
                        then v_rules
                        else v_rules || jsonb_build_array(jsonb_build_object('kind', 'min', 'value', 0)) end);
        if coalesce(jsonb_typeof(p_spec -> 'display_format'), 'null') = 'null' then
          p_spec := p_spec || jsonb_build_object('display_format', jsonb_build_object(
                      'id', 'duration', 'options', jsonb_build_object('durationUnit', 'seconds')));
        end if;
      end if;
    elsif v_plain = 'long_text' then
      d := d || jsonb_build_object('type', 'text', 'format', 'long',
                                   'config', v_config || jsonb_build_object('multiline', true),
                                   'rules', v_rules);
    else
      d := d || jsonb_build_object('type', 'text', 'config', v_config, 'rules', v_rules);
      -- ── SEAT-SUITES, 2026-09-19: A SIGNATURE FIELD COULD NOT BE DECLARED BY ANYBODY. ────
      -- `custom.doc_signature_field_ok` accepts exactly one shape — a text field whose
      -- `format` is `signature` — and `custom.doc_sign` refuses every other field by name.
      -- No door wrote that `format`: this branch dropped it, and the parity types
      -- have no signature among them. So `custom.doc_sign`, which IS granted to
      -- `authenticated`, could never be used by a signed-in person at all: the one field it
      -- accepts had no way to exist outside an INSERT straight into `custom.record`, which
      -- needs a table privilege nobody has. Measured from the seat on the main database on
      -- 2026-09-19 while converting `scripts/campaign-tests/w3_doc_c43.sql`.
      -- A plain text field may now SAY it holds a signature, and nothing else changes: a
      -- field that does not ask for it is written exactly as before.
      if v_signature or nullif(p_spec ->> 'format', '') = 'signature' then
        d := d || jsonb_build_object('format', 'signature');
      end if;
      -- LANE 10 P4: three kinds of words. An ADDRESS is one value in parts
      -- ({street, city, region, postal_code, country}); a BARCODE is one line a scanner reads,
      -- naming its symbology when the caller did; RICH TEXT is Markdown with no raw HTML, kept
      -- on several lines. Each shows in its own format.
      if v_kind = 'address' then
        d := d || jsonb_build_object('format', 'address', 'multi', false);
        if coalesce(jsonb_typeof(p_spec -> 'display_format'), 'null') = 'null' then
          p_spec := p_spec || jsonb_build_object('display_format', jsonb_build_object('id', 'address'));
        end if;
      elsif v_kind in ('time', 'json') then
        d := d || jsonb_build_object('format', v_kind, 'multi', false);
        if coalesce(jsonb_typeof(p_spec -> 'display_format'), 'null') = 'null' then
          p_spec := p_spec || jsonb_build_object('display_format', jsonb_build_object('id', v_kind));
        end if;
      elsif v_kind = 'barcode' then
        d := d || jsonb_build_object('format', 'barcode',
          'config', (v_config - 'symbology') || jsonb_strip_nulls(jsonb_build_object('symbology',
                      nullif(lower(btrim(coalesce(p_spec ->> 'symbology', v_config ->> 'symbology', ''))), ''))));
        if coalesce(jsonb_typeof(p_spec -> 'display_format'), 'null') = 'null' then
          p_spec := p_spec || jsonb_build_object('display_format', jsonb_build_object('id', 'barcode'));
        end if;
      elsif v_kind = 'button' then
        -- NOTION-PROPS-2: config.button = {label, do?, url?, automation_id?, action_id?, color?}; a caller
        -- may send it as `button` beside the spec or inside config. The label defaults to the column's.
        d := d || jsonb_build_object('format', 'button', 'multi', false,
          'config', (v_config - 'button') || jsonb_build_object('button',
             jsonb_build_object('label', v_label)
             || jsonb_strip_nulls(coalesce(case when jsonb_typeof(p_spec -> 'button') = 'object' then p_spec -> 'button' end,
                                           case when jsonb_typeof(v_config -> 'button') = 'object' then v_config -> 'button' end,
                                           '{}'::jsonb))));
      elsif v_kind = 'rich_text' then
        d := d || jsonb_build_object('format', 'rich_text', 'multi', false,
                                     'config', v_config || jsonb_build_object('multiline', true));
        if coalesce(jsonb_typeof(p_spec -> 'display_format'), 'null') = 'null' then
          p_spec := p_spec || jsonb_build_object('display_format', jsonb_build_object('id', 'markdown'));
        end if;
      end if;
    end if;
    return custom._with_display_format(custom._with_display(p_organization_id, d, p_spec - 'display_format'), p_spec);
  end if;

  if not exists (select 1 from custom.parity_field_types() t where t.parity_type = v_parity) then
    raise exception 'There is no field type called "%" in this system.', v_parity
      using errcode = '23514',
            hint = format('FLD-11: %s.', custom._parity_types_sentence());
  end if;

  d := d || jsonb_build_object('parity_type', v_parity);

  -- LANE7-SEC-ARCHIVE (2026-10-03): a standard table (no Table id: custom.entity_field_declare /
  -- entity_field_update) takes no worked-out field, said in field words BEFORE a formula is parsed
  -- against columns it does not have. custom._field_shape_guard holds the same line for every
  -- other way a definition is written.
  if p_table_id is null and (v_parity in ('formula', 'lookup', 'rollup') or v_system is not null) then
    raise exception 'A field on a standard table cannot be worked out from other values yet, so "%" cannot be a formula, lookup, rollup, count, record number or time stamp here; add it to a custom table instead.',
                    coalesce(v_label, v_key, 'this field')
      using errcode = '23514',
            hint = 'LANE7-SEC-ARCHIVE: worked-out fields run only through the store''s record doors. Nothing was written.';
  end if;

  -- LANE 10 P4: A COUNT is a roll-up that counts, whatever else it was sent: no `of`, agg count.
  if v_kind = 'count' then
    p_spec := (p_spec - 'of') || jsonb_build_object('agg', 'count');
    v_config := v_config - 'of' - 'agg';
    if coalesce(jsonb_typeof(p_spec -> 'display_format'), 'null') = 'null' then
      p_spec := p_spec || jsonb_build_object('display_format', jsonb_build_object('id', 'integer'));
    end if;
  end if;

  case v_parity
    -- ── the two list types ───────────────────────────────────────────────────
    when 'select', 'multi_select' then
      d := d || jsonb_build_object(
        'type',   'list',
        'multi',  v_parity = 'multi_select',
        'rules',  v_rules,
        'config', v_config || jsonb_build_object(
                    'options_table_id', coalesce(nullif(p_spec ->> 'options_table_id', ''),
                                                nullif(v_config ->> 'options_table_id', ''))));

    -- ── the two relation types a person names by what they hold ─────────────
    when 'member' then
      d := d || jsonb_build_object(
        'type',             'relation',
        'relation_target',  custom.person_kernel_id(),
        'relation_max',     coalesce((p_spec ->> 'relation_max')::integer, case when v_multi then 25 else 1 end),
        -- STORE-T / T7 (REL-2): what happens to this record when the thing it points at is
        -- deleted is the CALLER'S to declare — restrict, set_null or cascade. It was hard-coded
        -- to set_null, so no client could ever declare the `restrict` T7 asks for and every
        -- delete of a pointed-at record was accepted. set_null stays the default.
        'on_target_delete', case when nullif(p_spec ->> 'on_target_delete', '') in ('restrict','set_null','cascade')
                                 then p_spec ->> 'on_target_delete' else 'set_null' end,
        'rules',            v_rules,
        'config',           v_config);
    when 'attachment' then
      d := d || jsonb_build_object(
        'type',             'relation',
        'relation_target',  custom.file_kernel_id(),
        'relation_max',     coalesce((p_spec ->> 'relation_max')::integer, case when v_multi then 25 else 1 end),
        -- REC-31: removing the file removes the attachment, never the record — so `cascade` is
        -- the one answer this field may not give, and custom._field_type_parity_guard refuses it
        -- by name. restrict is a caller's to choose.
        'on_target_delete', case when nullif(p_spec ->> 'on_target_delete', '') in ('restrict','set_null','cascade')
                                 then p_spec ->> 'on_target_delete' else 'set_null' end,
        'rules',            v_rules,
        'config',           v_config);

    -- ── the three worked-out types ──────────────────────────────────────────
    when 'lookup' then
      d := d || jsonb_build_object(
        'type',       'formula',
        'source',     'formula',
        'compute_on', coalesce(nullif(p_spec ->> 'compute_on', ''), 'read'),
        'rules',      v_rules,
        'config',     v_config || jsonb_strip_nulls(jsonb_build_object(
                        'via',  nullif(p_spec ->> 'via', ''),
                        'pick', nullif(p_spec ->> 'pick', ''))));
    when 'rollup' then
      d := d || jsonb_build_object(
        'type',       'formula',
        'source',     'formula',
        -- FLD-11: a rollup that stamped itself at write time would be stale the
        -- moment a contained record changed, and the store refuses that — so the
        -- only answer this door can give is the right one.
        'compute_on', 'read',
        'rules',      v_rules,
        'config',     v_config || jsonb_strip_nulls(jsonb_build_object(
                        'via', nullif(p_spec ->> 'via', ''),
                        'agg', nullif(p_spec ->> 'agg', ''),
                        'of',  nullif(p_spec ->> 'of', ''),
                        -- CHAIR-MATH (b): WHICH of the linked records it adds up. The same shape a
                        -- saved view's filter has (custom.record_filter_sql: a flat map of far-side
                        -- column keys, or a Rule expression over far-side field ids); validated
                        -- against the far table by custom._field_type_parity_guard on write.
                        -- Carried whenever it was sent (any shape but JSON null): a shape that is
                        -- not a set of conditions is REFUSED by the guard, never dropped here.
                        'filter', case when p_spec ? 'filter' and jsonb_typeof(p_spec -> 'filter') <> 'null'
                                       then p_spec -> 'filter' end)));
    when 'formula' then
      -- ── GRID-PRIMITIVES G3 / G5, 2026-09-22. ────────────────────────────────────────────
      -- A system kind carries its system expression and says which it is; nothing else it
      -- was sent can change what it works out. A formula a person TYPED (`formula_text`, the
      -- older grid's language) is parsed here by custom.formula_parse, against this Table's
      -- own columns; a mistake is refused in the parser's own words with where it is, and
      -- the text is kept beside the expression so the person edits text and never JSON.
      if v_system is not null then
        v_config := (v_config - 'formula_text') || jsonb_build_object('system', v_system);
        d := d || jsonb_build_object(
          'type',       'formula',
          'source',     'formula',
          'compute_on', case when v_system = 'autonumber' then 'write' else 'read' end,
          'rules',      v_rules,
          'config',     v_config || jsonb_build_object('expr', jsonb_build_object('op', 'fx.' || v_system)));
        if coalesce(jsonb_typeof(p_spec -> 'display_format'), 'null') = 'null' then
          p_spec := p_spec || jsonb_build_object('display_format', jsonb_build_object('id', v_system));
        end if;
      else
        if nullif(btrim(coalesce(p_spec ->> 'formula_text', '')), '') is not null then
          v_parsed := custom.formula_parse(p_organization_id, p_table_id, p_spec ->> 'formula_text');
          if not coalesce((v_parsed ->> 'ok')::boolean, false) then
            raise exception 'The formula for "%" cannot be worked out: % (at character %).',
                            v_label, v_parsed ->> 'error', coalesce((v_parsed ->> 'position')::integer, 0) + 1
              using errcode = '23514',
                    hint = 'GRID-PRIMITIVES G3: a formula names columns in braces, like {Visit fee} - {Deposit taken}; select signature, says from custom.formula_node_kinds() lists every function. Nothing was written.';
          end if;
          v_config := v_config || jsonb_build_object('formula_text', p_spec ->> 'formula_text',
                                                     'expr', v_parsed -> 'expr');
        elsif p_spec ? 'expr' then
          -- An expression written by hand no longer matches any text it came with.
          v_config := v_config - 'formula_text';
        end if;
        d := d || jsonb_build_object(
          'type',       'formula',
          'source',     'formula',
          'compute_on', coalesce(nullif(p_spec ->> 'compute_on', ''), 'read'),
          'rules',      v_rules,
          'config',     v_config || jsonb_build_object('expr',
                          coalesce(v_parsed -> 'expr', p_spec -> 'expr', v_config -> 'expr')));
      end if;

    -- ── the three formatted texts. The format says how to SHOW it; the
    --    pattern Rule is what makes it enforceable (FLD-3 / FLD-11), so the
    --    door writes the Rule rather than leaving a label on an empty box.
    when 'url' then
      d := d || jsonb_build_object('type', 'text', 'format', 'url', 'config', v_config,
        'rules', case when exists (select 1 from jsonb_array_elements(v_rules) r where r ->> 'kind' = 'pattern')
                      then v_rules
                      else v_rules || jsonb_build_array(jsonb_build_object(
                             'kind', 'pattern', 'value', '^https?://[^\s]+$')) end);
    when 'email' then
      d := d || jsonb_build_object('type', 'text', 'format', 'email', 'config', v_config,
        'rules', case when exists (select 1 from jsonb_array_elements(v_rules) r where r ->> 'kind' = 'pattern')
                      then v_rules
                      else v_rules || jsonb_build_array(jsonb_build_object(
                             'kind', 'pattern', 'value', '^[^@\s]+@[^@\s]+\.[^@\s]+$')) end);
    when 'phone' then
      d := d || jsonb_build_object('type', 'text', 'format', 'phone', 'config', v_config,
        'rules', case when exists (select 1 from jsonb_array_elements(v_rules) r where r ->> 'kind' = 'pattern')
                      then v_rules
                      else v_rules || jsonb_build_array(jsonb_build_object(
                             'kind', 'pattern', 'value', custom.phone_pattern())) end);

    -- ── the three numbers and dates ─────────────────────────────────────────
    when 'currency' then
      d := d || jsonb_build_object(
        'type', 'range', 'format', 'currency',
        'unit', coalesce(nullif(p_spec ->> 'unit', ''), '$'),
        'config', v_config, 'rules', v_rules);
    when 'percent' then
      d := d || jsonb_build_object(
        'type', 'range', 'format', 'percent', 'unit', '%', 'config', v_config,
        -- FLD-3 / FLD-11: a percent field that takes -40 is a percent in name only.
        'rules', case when exists (select 1 from jsonb_array_elements(v_rules) r
                                    where r ->> 'kind' in ('min', 'max'))
                      then v_rules
                      else v_rules || jsonb_build_array(
                             jsonb_build_object('kind', 'min', 'value', 0),
                             jsonb_build_object('kind', 'max', 'value', 100)) end);
    -- ── the tick box ────────────────────────────────────────────────────────
    -- No format, no unit, no options Table and no Rule: what it holds IS the
    -- behaviour. A default is carried when the caller named one (above), which is
    -- how a column can start life ticked.
    when 'checkbox' then
      d := d || jsonb_build_object('type', 'boolean', 'config', v_config, 'rules', v_rules);

    when 'datetime' then
      d := d || jsonb_build_object(
        'type', 'range', 'rules', v_rules,
        'config', v_config || jsonb_build_object(
                    'kind', case when coalesce(p_spec ->> 'kind', v_config ->> 'kind') = 'datetime'
                                 then 'datetime' else 'date' end));
      if coalesce(p_spec ->> 'kind', v_config ->> 'kind') = 'datetime' then
        d := d || jsonb_build_object('format', 'datetime');
      end if;
    else
      raise exception 'The field type "%" is known but this store does not yet know what it is made of.', v_parity
        using errcode = '23514',
              hint = 'custom._field_document_for has an arm per parity type; this one is missing. Nothing was written.';
  end case;

  -- LANE 10 P4: A STATUS is a single choice whose choices sit in To do, In progress and Done
  -- (custom.status_groups_of keeps one shape: choice key -> group); A COUNT says so in its format.
  if v_kind = 'status' then
    -- V8 #6: a status is one choice at a time; a caller asking for several is told so.
    if coalesce((p_spec ->> 'multi')::boolean, false) then
      raise exception 'A status is one choice at a time, so "%" cannot hold several. Use Several choices for that.', v_label
        using errcode = '23514', hint = 'P4: send multi false, or leave it out. Nothing was created.';
    end if;
    d := d || jsonb_build_object('format', 'status', 'multi', false,
                                 'config', (d -> 'config') || jsonb_build_object('status_groups',
                                   custom.status_groups_of(coalesce(p_spec -> 'status_groups', v_config -> 'status_groups'))));
  elsif v_kind = 'count' then
    d := d || jsonb_build_object('format', 'count');
  end if;

  return custom._with_display_format(custom._with_display(p_organization_id, d, p_spec - 'display_format'), p_spec);
end
$function$;

CREATE OR REPLACE FUNCTION custom.field_kind_of(p_field_data jsonb)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE
 SET search_path TO 'pg_catalog'
AS $function$
  select case
    when p_field_data ->> 'type' = 'range' and p_field_data ->> 'format' = 'rating'   then 'rating'
    when p_field_data ->> 'type' = 'range' and p_field_data ->> 'format' = 'duration' then 'duration'
    when p_field_data ->> 'type' = 'text'  and p_field_data ->> 'format' = 'address'  then 'address'
    when p_field_data ->> 'type' = 'text'  and p_field_data ->> 'format' = 'barcode'  then 'barcode'
    when p_field_data ->> 'type' = 'text'  and p_field_data ->> 'format' = 'time'     then 'time'
    when p_field_data ->> 'type' = 'text'  and p_field_data ->> 'format' = 'json'     then 'json'
    when p_field_data ->> 'type' = 'text'  and p_field_data ->> 'format' = 'rich_text' then 'rich_text'
    when p_field_data ->> 'type' = 'text'  and p_field_data ->> 'format' = 'signature' then 'signature'
    when p_field_data ->> 'type' = 'text'  and p_field_data ->> 'format' = 'button'   then 'button'
    when p_field_data ->> 'type' = 'list'  and p_field_data ->> 'format' = 'status'   then 'status'
    when p_field_data ->> 'type' = 'formula' and p_field_data ->> 'format' = 'count'
         and p_field_data -> 'config' ->> 'agg' = 'count'                               then 'count'
    when p_field_data ->> 'type' = 'formula'
         and p_field_data -> 'config' ->> 'system' in ('created_by', 'modified_by', 'autonumber',
                                                       'created_time', 'modified_time')
      then p_field_data -> 'config' ->> 'system'
    when p_field_data ->> 'type' = 'relation'
         and jsonb_typeof(p_field_data -> 'config' -> 'allowed_types') = 'array'        then 'entity_reference'
    else coalesce(custom.parity_type(p_field_data),
                  case p_field_data ->> 'type'
                    when 'text' then case when p_field_data ->> 'format' = 'long'
                                            or (p_field_data -> 'config' ->> 'multiline') = 'true'
                                          then 'long_text' else 'text' end
                    when 'range' then 'number'
                    when 'relation' then 'relation'
                  end)
  end;
$function$;

CREATE OR REPLACE FUNCTION custom._kind_value_ok(d jsonb, p_label text, v jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_format text := d ->> 'format';
  v_max    numeric;
  v_text   text;
  v_bad    text;
  v_sym    text;
begin
  -- W2-A 1: A TIME OF DAY is 24-hour HH:MM or HH:MM:SS, zero-padded, so sorting and comparing its text is
  -- sorting and comparing the time. A JSON value is any JSON; it is judged whole (never as words).
  if v_format = 'time' then
    if jsonb_typeof(v) <> 'string' or (v #>> '{}') !~ '^([01][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$' then
      raise exception '% takes a time of day like 09:30 or 17:45:10, and it was given %.', p_label,
                      case jsonb_typeof(v) when 'string' then '"' || left(v #>> '{}', 40) || '"' else 'a ' || jsonb_typeof(v) end
        using errcode = '23514', hint = 'W2-A: 24-hour HH:MM or HH:MM:SS, two digits each.';
    end if;
    return true;
  elsif v_format = 'json' then
    return true;
  end if;
  if v_format = 'address' then
    if jsonb_typeof(v) <> 'object' then
      raise exception '% takes an address in parts - street, city, region, postal code and country - and it was given %.', p_label,
                      case jsonb_typeof(v) when 'string' then 'one line of words' else 'a ' || jsonb_typeof(v) end
        using errcode = '23514',
              hint = 'P4: {"street": "…", "city": "…", "region": "…", "postal_code": "…", "country": "…"}; every part is optional, at least one is filled.';
    end if;
    select string_agg(k, ', ' order by k) into v_bad
      from jsonb_object_keys(v) k
     where k not in ('street', 'city', 'region', 'postal_code', 'country');
    if v_bad is not null then
      raise exception '% is an address, and an address has no part called %.', p_label, v_bad
        using errcode = '23514', hint = 'P4: the parts are street, city, region, postal_code and country.';
    end if;
    if exists (select 1 from jsonb_each(v) e where jsonb_typeof(e.value) not in ('string', 'null')) then
      raise exception 'Each part of the address in % is words.', p_label using errcode = '23514';
    end if;
    if exists (select 1 from jsonb_each_text(v) e where length(e.value) > 200) then
      raise exception 'A part of the address in % is longer than 200 characters.', p_label using errcode = '23514';
    end if;
    if not exists (select 1 from jsonb_each_text(v) e where btrim(coalesce(e.value, '')) <> '') then
      raise exception '% was given an address with nothing in it.', p_label
        using errcode = '23514', hint = 'P4: leave the value out for no address.';
    end if;
    return true;
  elsif v_format = 'rating' then
    select max((r ->> 'value')::numeric) into v_max
      from jsonb_array_elements(coalesce(d -> 'rules', '[]'::jsonb)) r
     where r ->> 'kind' = 'max' and (r ->> 'value') ~ '^-?[0-9]+(\.[0-9]+)?$';
    if jsonb_typeof(v) <> 'number' or (v #>> '{}')::numeric <> trunc((v #>> '{}')::numeric)
       or (v #>> '{}')::numeric < 0 or (v #>> '{}')::numeric > coalesce(v_max, 5) then
      raise exception '% is a whole number of stars from 0 to %, and it was given %.', p_label, coalesce(v_max, 5),
                      case when jsonb_typeof(v) in ('number', 'string') then v #>> '{}' else 'a ' || jsonb_typeof(v) end
        using errcode = '23514', hint = 'P4: a rating.';
    end if;
    return false;
  elsif v_format = 'duration' then
    if jsonb_typeof(v) = 'number' and (v #>> '{}')::numeric < 0 then
      raise exception '% is a length of time, and a length of time is never below zero.', p_label
        using errcode = '23514', hint = 'P4: a duration is a number of seconds.';
    end if;
    -- Ten years (365.25 days each) is the longest length of time a record here holds.
    if jsonb_typeof(v) = 'number' and (v #>> '{}')::numeric > 315576000 then
      raise exception '% is longer than ten years, and a length of time here is at most ten years.', p_label
        using errcode = '23514', hint = 'P4: a duration is a number of seconds, at most 315576000.';
    end if;
    return false;
  elsif v_format = 'button' then
    -- NOTION-PROPS-2: a button is pressed, never written.
    if v is not null and jsonb_typeof(v) <> 'null' then
      raise exception '% is a button: it is pressed, and holds no value.', p_label
        using errcode = '23514', hint = 'NOTION-PROPS-2: leave the button out of the write; custom.button_press runs it.';
    end if;
    return true;
  elsif v_format = 'barcode' then
    if jsonb_typeof(v) <> 'string' then
      return false;   -- the text behaviour says "takes words"
    end if;
    v_text := v #>> '{}';
    -- Line and paragraph separators and the invisible format characters (soft hyphen, zero-width
    -- spaces and joiners, direction marks, word joiner, byte-order mark) are no part of a code.
    if btrim(v_text) = '' or v_text ~ '[[:cntrl:]]' or length(v_text) > 256
       or v_text ~ '[\u00AD\u061C\u180E\u200B-\u200F\u2028\u2029\u202A-\u202E\u2060-\u2064\u2066-\u206F\uFEFF]'
       -- V11 #9: tag characters, interlinear annotation marks, a no-break space, combining marks
       -- and private-use characters are no part of a code a scanner reads either.
       or v_text ~ '[\U000E0000-\U000E007F\uFFF9-\uFFFB\u00A0\u0300-\u036F\u1AB0-\u1AFF\u1DC0-\u1DFF\u20D0-\u20FF\uFE20-\uFE2F\uE000-\uF8FF\U000F0000-\U0010FFFF]' then
      raise exception '% is a barcode: one line of up to 256 characters a scanner reads, with no line breaks or hidden characters.', p_label
        using errcode = '23514', hint = 'P4: a barcode.';
    end if;
    v_sym := d -> 'config' ->> 'symbology';
    if v_sym in ('ean13', 'ean8', 'upc_a') then
      if v_text !~ (case v_sym when 'ean13' then '^[0-9]{13}$' when 'ean8' then '^[0-9]{8}$' else '^[0-9]{12}$' end) then
        raise exception '% is a % barcode, which is % digits, and "%" is not.', p_label,
                        case v_sym when 'ean13' then 'EAN-13' when 'ean8' then 'EAN-8' else 'UPC-A' end,
                        case v_sym when 'ean13' then 13 when 'ean8' then 8 else 12 end, v_text
          using errcode = '23514', hint = 'P4: a barcode.';
      end if;
      if not custom._gs1_check_ok(v_text) then
        raise exception 'The last digit of "%" does not check out, so % was probably misread or mistyped.', v_text, p_label
          using errcode = '23514', hint = 'P4: EAN and UPC codes end in a check digit.';
      end if;
    end if;
    return false;
  elsif v_format = 'rich_text' then
    if jsonb_typeof(v) <> 'string' then
      return false;
    end if;
    v_text := v #>> '{}';
    -- THE SANITISED SUBSET (custom._rich_text_problem, read the CommonMark way): Markdown with no
    -- raw HTML and links only to a web page, an email address or a phone number. Refused rather
    -- than stripped, so what is stored is exactly what was written.
    v_bad := custom._rich_text_problem(v_text);
    if v_bad = 'html' then
      raise exception '% keeps formatted text as Markdown, and it was given HTML.', p_label
        using errcode = '23514', hint = 'P4: write **bold**, _italic_, [a link](https://…), - lists and # headings.';
    end if;
    if v_bad = 'link' then
      raise exception '% has a link that is not a web page, an email address or a phone number.', p_label
        using errcode = '23514', hint = 'P4: links start with https://, http://, mailto: or tel:.';
    end if;
    return false;
  end if;
  return false;
end;
$function$;

CREATE OR REPLACE FUNCTION custom.validate_values(p_organization_id uuid, p_fields custom.record[], p_values jsonb, p_record_type text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  f        custom.record;
  d        jsonb;
  v_label  text;
  v_key    text;
  v_type   text;
  v_multi  boolean;
  v_val    jsonb;
  v_one    jsonb;
  v_items  jsonb;
  v_n      integer;
  v_rule   jsonb;
  v_kind   text;
  v_other  jsonb;
  v_table  uuid;
  v_map    jsonb;
  v_field  jsonb;
  v_types  text[];
begin
  if p_fields is null or array_length(p_fields, 1) is null then
    return;
  end if;

  -- CHOICE-VALUE. The type field's value is the option's KEY now, and `applies_to_types` was
  -- written by whoever declared the Field or the Rule - in words, in keys, or (before this
  -- lane) in option ids. All three name the same choice, so all three are asked. This is what
  -- keeps T8's Square rule attached to the square.
  -- THE MAP IS BUILT FROM THE FIELDS THEMSELVES, not from a Table id. MEASURED 2026-09-20
  -- 07:27Z: the fields of a STANDARD entity's `custom_fields` (REC-40) carry `table_token` and
  -- no `entity_definition_id` at all, so asking `custom.choice_field_map` for a Table produced
  -- an empty map and every valid choice on `crm.party` was refused. Each list Field already
  -- names the Table its choices come from; that is the only thing this needs.
  select coalesce(jsonb_object_agg(f2.data ->> 'key', jsonb_build_object(
           'label',   coalesce(nullif(f2.data ->> 'label', ''), f2.data ->> 'key'),
           'options', custom.choice_options(p_organization_id,
                        (f2.data -> 'config' ->> 'options_table_id')::uuid))), '{}'::jsonb)
    into v_map
    from unnest(p_fields) f2
   where f2.data ->> 'type' = 'list'
     and nullif(f2.data -> 'config' ->> 'options_table_id', '') is not null;

  v_types := case when p_record_type is null then '{}'::text[]
                  else custom.choice_synonyms_in(v_map, p_record_type) end;

  foreach f in array p_fields loop
    d       := f.data;
    v_key   := d ->> 'key';
    v_label := coalesce(nullif(d ->> 'label', ''), v_key);
    v_type  := d ->> 'type';
    v_multi := coalesce((d ->> 'multi')::boolean, false);
    v_val   := p_values -> v_key;

    -- REQUIRED. An absent key and a null value are the same absence and are said the same way.
    if v_val is null or jsonb_typeof(v_val) = 'null'
       or (v_multi and jsonb_typeof(v_val) = 'array' and jsonb_array_length(v_val) = 0) then
      -- A RESTORE IS NOT AN EDIT (TABLE-ACTIONS ruling, 2026-10-03): a row brought back exactly as
      -- it was archived is never refused by a `required` declared after it went (a bookings page's
      -- "Appointment"); custom._record_field_validation names that write in custom.validating_restore.
      -- V11 #1: TURNING "REQUIRED" ON NEVER LOCKS A RECORD. A record that already had no value
      -- here when this write began is not refused for it — that blank is not this write's doing,
      -- and the record stays editable; a NEW record, or a write that clears the value, still is.
      if coalesce((d ->> 'required')::boolean, false)
         and coalesce(current_setting('custom.validating_restore', true), '') <> '1'
         and not (nullif(current_setting('custom.validating_record', true), '') is not null
                  and exists (select 1 from custom.record s
                               where s.organization_id = p_organization_id
                                 and s.id = nullif(current_setting('custom.validating_record', true), '')::uuid
                                 and (s.data -> v_key is null or jsonb_typeof(s.data -> v_key) = 'null'
                                      or (jsonb_typeof(s.data -> v_key) = 'array' and jsonb_array_length(s.data -> v_key) = 0)))) then
        raise exception '% is required', v_label
          using errcode = '23514', hint = format('REC-51: the field %s of this table.', v_key);
      end if;
      continue;
    end if;

    -- A FORMULA IS NEVER WRITTEN BY HAND (FLD-9): the declaration says who computes it.
    if v_type = 'formula' then
      raise exception '% is worked out by the system, so it cannot be typed in', v_label
        using errcode = '23514',
              hint = format('FLD-9: this formula computes on %s.', coalesce(d ->> 'compute_on', 'write'));
    end if;

    -- A RELATION'S CARDINALITY IS `relation_max`, AND ONE TARGET IS A LIST OF ONE (REL-7,
    -- lane STORE-TXN-3 2026-09-22). FLD-2's `multi` and FLD-13's `relation_max` are two words
    -- for one fact and the store let them disagree: `custom._field_document_for` DERIVES
    -- relation_max from multi but never the reverse, so a caller that declared
    -- `relation_max: 50` and said nothing about multi got a column whose declaration reads
    -- "many" (`platform.relation_declaration` answers cardinality `many` off relation_max) and
    -- whose value shape was refused as "holds one value, and it was given a list". Measured
    -- 2026-09-22 on the field `matrx_records`' own `field_propose` declares for the keyword
    -- research graph. REL-7 already settles it in words — *"a relation points at at most one
    -- thing, or at many — both are written as a list, so the shape never has to change when
    -- the cardinality does. One target is a list of one."* — so for a relation the shape is
    -- read here, a scalar is a list of one, and the CEILING below is the only limit.
    if v_type = 'relation' then
      v_items := case when jsonb_typeof(v_val) = 'array'
                      then v_val else jsonb_build_array(v_val) end;
    -- W2-A 1: a JSON column's value is ONE value whatever its shape, a list included.
    elsif (d ->> 'format') = 'json' then
      v_items := jsonb_build_array(v_val);
    elsif v_multi then
      if jsonb_typeof(v_val) <> 'array' then
        raise exception '% holds many values, so it takes a list', v_label
          using errcode = '23514', hint = 'FLD-2: the multi modifier.';
      end if;
      v_items := v_val;
    else
      if jsonb_typeof(v_val) = 'array' then
        raise exception '% holds one value, and it was given a list', v_label
          using errcode = '23514', hint = 'FLD-2: multi is off for this field.';
      end if;
      v_items := jsonb_build_array(v_val);
    end if;

    for v_one in select e from jsonb_array_elements(v_items) e loop
      -- LANE 10 P4: a value of one of the newer kinds is judged by its kind first. An address is
      -- judged whole (it is a set of parts, not words); the others go on to their behaviour's
      -- check and their Rules below.
      -- NOTION-PROPS-2: a button is pressed, never written, so any value it is given is refused there.
      if (d ->> 'format') in ('address', 'rating', 'duration', 'barcode', 'rich_text', 'button', 'time', 'json')
         and custom._kind_value_ok(d, v_label, v_one) then
        continue;
      end if;
      -- TYPE.
      if v_type = 'boolean' then
        -- LIMITS-FIX: a tick is a REAL boolean. A record that never answered carries no key
        -- at all and left through the absence branch above, so `false` arriving here is a
        -- person SAYING no — a different fact from never having been asked, and the store
        -- keeps the two apart rather than flattening them into one empty box.
        if jsonb_typeof(v_one) <> 'boolean' then
          raise exception '% is ticked or left unticked, and it was given a %', v_label, jsonb_typeof(v_one)
            using errcode = '23514',
                  hint = 'FLD-1: boolean. Write true or false. The WORDS "Yes" and "No" are a choice list, which is a different kind of column.';
        end if;
      elsif v_type = 'text' then
        if jsonb_typeof(v_one) <> 'string' then
          raise exception '% takes words, and it was given a %', v_label, jsonb_typeof(v_one)
            using errcode = '23514', hint = 'FLD-1: text.';
        end if;
      elsif v_type = 'range' then
        if jsonb_typeof(v_one) = 'number' then
          null;
        elsif jsonb_typeof(v_one) = 'string'
              and coalesce(d -> 'config' ->> 'kind', 'number') in ('date', 'datetime') then
          begin
            perform (v_one #>> '{}')::timestamptz;
          exception when others then
            raise exception '% takes a date, and % is not one', v_label, v_one #>> '{}'
              using errcode = '23514', hint = 'FLD-1: range, of kind date.';
          end;
        else
          raise exception '% takes a number, and it was given a %', v_label, jsonb_typeof(v_one)
            using errcode = '23514', hint = 'FLD-1: range.';
        end if;
      elsif v_type = 'list' then
        if jsonb_typeof(v_one) <> 'string' then
          raise exception '% takes one of its choices, and it was given a %', v_label, jsonb_typeof(v_one)
            using errcode = '23514',
                  hint = 'FLD-5 / FLD-6: a list field stores the option''s own KEY - a short stable word - because every pick-list is already a Table.';
        end if;
        -- OPTION MEMBERSHIP. The value is the KEY of an option of this Field's own Table.
        -- A RETIRED option's key passes here ON PURPOSE: a record that already holds one has
        -- to stay editable when somebody changes a different column. Picking a retired choice
        -- ANEW is refused by custom._resolve_choice_words, which is the only place that can
        -- tell a new pick from a value that was already there.
        -- A TOKEN THAT NAMES ONE OF THE CHOICES. The KEY is the contract and is what
        -- `custom._resolve_choice_words` stores; the label and the option's own id are
        -- accepted too, because a surface with no normaliser in front of it (a standard
        -- entity's `custom_fields`) writes what its caller sent and must not be refused for
        -- naming the right choice a different way.
        v_field := v_map -> v_key;
        -- LIST-COPY-PERMISSIVE (2026-09-26): a column that takes other values
        -- (`config.allow_other`) holds a word that is none of its choices as an other value;
        -- custom._resolve_choice_words keeps it as typed, and it passes here.
        if v_field is null
           or (custom.choice_key_of(v_field, v_one #>> '{}') is null
               and not coalesce((d -> 'config' ->> 'allow_other')::boolean, false)) then
          raise exception '% was given a choice that is not one of its choices', v_label
            using errcode = '23514',
                  hint = format('REC-51: option membership. The choices for %s are %s.', v_label,
                                coalesce(custom.choice_words(coalesce(v_field, '{}'::jsonb)),
                                         'the records of its own table, and it has none yet'));
        end if;
      elsif v_type = 'relation'
            and jsonb_typeof(d -> 'config' -> 'allowed_types') = 'array'
            and jsonb_array_length(d -> 'config' -> 'allowed_types') > 0 then
        -- ── SC-R / P12: AN ENTITY REFERENCE. Each value is {token, id}: which kind of platform
        -- thing, and which one. The kind is one this Field allows; the thing is live and the
        -- writer may open it (custom._entity_reference_target_ok, the relation rule asked of a
        -- platform entity). Missing and forbidden say the same sentence.
        if jsonb_typeof(v_one) <> 'object'
           or nullif(btrim(coalesce(v_one ->> 'token', '')), '') is null
           or coalesce(v_one ->> 'id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
          raise exception '% points at something on the platform, and it was given %', v_label,
                          case when jsonb_typeof(v_one) = 'object' then 'something with no kind or no id'
                               else 'a ' || jsonb_typeof(v_one) end
            using errcode = '23514',
                  hint = format('SC-R / P12: each value of %s is {"token": "<kind>", "id": "<uuid>"} — the kind is one of %s.',
                                v_label, (select string_agg(x #>> '{}', ', ') from jsonb_array_elements(d -> 'config' -> 'allowed_types') x));
        end if;
        if not ((d -> 'config' -> 'allowed_types') ? lower(btrim(v_one ->> 'token'))) then
          raise exception '% points at %, and it can only point at %', v_label,
                          coalesce((select e.label from platform.entity_types e where e.token = lower(btrim(v_one ->> 'token'))),
                                   v_one ->> 'token'),
                          (select string_agg(coalesce(e.label, x #>> '{}'), ', ' order by o)
                             from jsonb_array_elements(d -> 'config' -> 'allowed_types') with ordinality as a(x, o)
                             left join platform.entity_types e on e.token = x #>> '{}')
            using errcode = '23514',
                  hint = 'SC-R / P12: config.allowed_types is what this column may name. Point it at one of those, or widen the column.';
        end if;
        if not custom._entity_reference_target_ok(p_organization_id, lower(btrim(v_one ->> 'token')), (v_one ->> 'id')::uuid) then
          raise exception '% points at something that is not there', v_label
            using errcode = '23514',
                  hint = 'SC-R / P12 / REC-51: an entity reference points at a live thing the person writing it may open. It was deleted, it never existed, or it has not been shared with you.';
        end if;
        continue;   -- an entity reference carries no value Rules; its ceiling is asked below
      elsif v_type = 'relation' then
        if jsonb_typeof(v_one) <> 'string' then
          raise exception '% points at a record, and it was given a %', v_label, jsonb_typeof(v_one)
            using errcode = '23514', hint = 'FLD-1: relation.';
        end if;
        -- RELATION RULES. The target is a live record the relation's DECLARATION allows —
        -- `custom.relation_value_target_ok`, which asks what platform.enforce_relation_edge
        -- asks of the association beside it: the declared table (or `several`'s list, or
        -- `any`), and another organization only through the REC-29 opening both have made.
        -- The id SHAPE first, for the same reason as the list branch above.
        if (v_one #>> '{}') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
          raise exception '% points at something that is not there', v_label
            using errcode = '23514',
                  hint = format('REC-51: %s stores the id of a record, and what it was given is not an id at all.', v_label);
        end if;
        if not custom.relation_value_target_ok(p_organization_id, f.id, d, (v_one #>> '{}')::uuid)
           -- A REFERENCE KEPT ON AN ARCHIVED RECORD (lane REFERENCE-KEEPS-ARCHIVED, chair ruling B3-21,
           -- 2026-10-01). An archive keeps every pointer at what it archived, so a record may hold one
           -- while its target sits in Archived items. That pointer is not a new link: when the row
           -- being changed (custom._record_field_validation names it) ALREADY holds this id under this
           -- key and the target is an archived record of this organization, the value stands, and the
           -- rest of the record stays editable. A NEW pointer at an archived record is still refused.
           and not (
             nullif(current_setting('custom.validating_record', true), '') is not null
             and exists (select 1 from custom.record t
                          where t.organization_id = p_organization_id
                            and t.id = (v_one #>> '{}')::uuid
                            and t.deleted_at is not null)
             and exists (select 1 from custom.record s
                          where s.organization_id = p_organization_id
                            and s.id = nullif(current_setting('custom.validating_record', true), '')::uuid
                            and (s.data -> v_key = v_one
                                 or (jsonb_typeof(s.data -> v_key) = 'array'
                                     and s.data -> v_key @> jsonb_build_array(v_one)))))
           -- A POINTER MOVED IN FROM THE OLD STORE AT A RECORD THAT IS NOW ARCHIVED (CHAIR-DOORS-3A,
           -- asked by lane 9, scopes-b ruling 1). References survive an archive: the old scope value
           -- named a scope that was archived afterwards, and a copy that lands the value AFTER the
           -- archive is not making a new link, it is carrying one that existed. So when this key's
           -- value envelope names a source of kind `move` (the copy's own provenance, interned in
           -- the record's `_sources`), a pointer at an ARCHIVED record of this organization, in the
           -- one table this relation points at, stands. A person's write carries no such source and is
           -- refused a new pointer at an archived record exactly as before.
           and not (
             -- the source as the writer handed it (an object), or as the store interned it (a pointer)
             -- (coalesced to false: with no envelope at all this must be FALSE, never NULL, or the
             --  whole refusal below would be skipped by three-valued logic)
             coalesce(coalesce(case when jsonb_typeof(p_values -> '_values' -> v_key -> 'src') = 'object'
                                    then p_values -> '_values' -> v_key -> 'src' ->> 'kind' end,
                               p_values -> '_sources' -> (p_values -> '_values' -> v_key ->> 'src') ->> 'kind') = 'move',
                      false)
             and exists (select 1 from custom.record t
                          where t.organization_id = p_organization_id
                            and t.id = (v_one #>> '{}')::uuid
                            and t.deleted_at is not null
                            and t.table_id = nullif(d ->> 'relation_target', '')::uuid)) then
          raise exception '% points at something that is not there', v_label
            using errcode = '23514',
                  hint = 'REC-51 / REL-8 / REC-29: a relation field points at a live record of a table it declares — or, across organizations, only where the table allows it and both organizations have turned on links to other organizations.';
        end if;
      end if;

      -- FLD-3: the attached validation Rules, read through the ONE seam.
      -- FLD-10 says the type field selects which Fields AND RULES apply, so a Rule carries
      -- its own applies_to_types: T8's Width applies to a rectangle and to a square, and the
      -- "the sides are equal" Rule attached to it applies to the SQUARE alone. A Rule with an
      -- empty list applies wherever its Field does.
      -- A RESTORE IS NOT AN EDIT: the value rules (at least, at most, length, pattern…) judge what a
      -- write changes; a row brought back exactly as it was is not judged by them again.
      for v_rule in select r from jsonb_array_elements(coalesce(d -> 'rules', '[]'::jsonb)) r
                     where coalesce(current_setting('custom.validating_restore', true), '') <> '1' loop
        if jsonb_array_length(coalesce(v_rule -> 'applies_to_types', '[]'::jsonb)) > 0
           and not (p_record_type is not null and (v_rule -> 'applies_to_types') ?| v_types) then
          continue;
        end if;
        v_kind := v_rule ->> 'kind';
        if v_kind = 'min' and jsonb_typeof(v_one) = 'number'
           and (v_one #>> '{}')::numeric < (v_rule ->> 'value')::numeric then
          raise exception '% has to be at least %', v_label, v_rule ->> 'value'
            using errcode = '23514', hint = 'FLD-3: an attached validation Rule, not a behavior.';
        elsif v_kind = 'max' and jsonb_typeof(v_one) = 'number'
              and (v_one #>> '{}')::numeric > (v_rule ->> 'value')::numeric then
          raise exception '% cannot be more than %', v_label, v_rule ->> 'value'
            using errcode = '23514', hint = 'FLD-3: an attached validation Rule, not a behavior.';
        elsif v_kind = 'length' and jsonb_typeof(v_one) = 'string'
              and coalesce(v_rule ->> 'value', '') <> ''
              and length(v_one #>> '{}') > (v_rule ->> 'value')::integer then
          raise exception '% is longer than % characters', v_label, v_rule ->> 'value'
            using errcode = '23514', hint = 'FLD-3.';
        -- STORE-RULE-GAPS (3): the SHORTEST, beside the longest. An empty string is a blank,
        -- not a short answer - whether a blank is allowed is `required`'s question, as it
        -- was in the older grid, so it is not asked twice.
        elsif v_kind = 'length' and jsonb_typeof(v_one) = 'string'
              and coalesce(v_rule ->> 'min', '') <> ''
              and (v_one #>> '{}') <> ''
              and length(v_one #>> '{}') < (v_rule ->> 'min')::integer then
          raise exception '% has to be at least % characters long', v_label, v_rule ->> 'min'
            using errcode = '23514', hint = 'FLD-3.',
                  detail = jsonb_build_object('field_key', v_key, 'rule', 'length',
                                              'min', (v_rule ->> 'min')::integer)::text;
        -- STORE-RULE-GAPS (1): a pattern that carries an example SAYS it — the remedy is the
        -- shape a person should type, and the example travels in `detail` as well so the one
        -- refusal builder reads it as data rather than fishing it out of a sentence.
        elsif v_kind = 'pattern' and jsonb_typeof(v_one) = 'string'
              and (v_one #>> '{}') !~ (v_rule ->> 'value') then
          if coalesce(btrim(v_rule ->> 'example'), '') <> '' then
            raise exception '% is not written the way this field expects', v_label
              using errcode = '23514',
                    hint = format('Enter it like %s.', btrim(v_rule ->> 'example')),
                    detail = jsonb_build_object('field_key', v_key, 'rule', 'pattern',
                                                'example', btrim(v_rule ->> 'example'))::text;
          end if;
          raise exception '% is not written the way this field expects', v_label
            using errcode = '23514', hint = 'FLD-3.';
        elsif v_kind = 'equals_field' then
          v_other := p_values -> (v_rule ->> 'value');
          if v_other is not null and jsonb_typeof(v_other) <> 'null' and v_other <> v_one then
            raise exception '% and % have to be the same', v_label, v_rule ->> 'value'
              using errcode = '23514',
                    hint = 'FLD-3 / T8: a constraint across two fields is a Rule attached to one of them, never a behavior.';
          end if;
        elsif v_kind = 'differs_from_field' then
          v_other := p_values -> (v_rule ->> 'value');
          if v_other is not null and v_other = v_one then
            raise exception '% and % have to be different', v_label, v_rule ->> 'value'
              using errcode = '23514', hint = 'FLD-3.';
          end if;
        end if;
      end loop;
    end loop;

    -- RELATION MAX, once per field rather than once per item. Asked of EVERY relation now,
    -- not only of the ones that also said `multi`: it is the cardinality, so a single relation
    -- handed two targets is refused here by the column's own name rather than being let
    -- through because a second word was missing.
    if v_type = 'relation' then
      v_n := jsonb_array_length(v_items);
      if v_n > coalesce((d ->> 'relation_max')::integer, v_n) then
        raise exception '% points at % things, and it can point at % at most',
                        v_label, v_n, d ->> 'relation_max'
          using errcode = '23514', hint = 'REC-51: relation_max.';
      end if;
    end if;
  end loop;
end;
$function$;

CREATE OR REPLACE FUNCTION custom._kind_value_fit(p_to jsonb, p_original jsonb, p_value jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_format text := p_to ->> 'format';
  v_out    jsonb := p_value;
  v_items  jsonb;
  v_one    jsonb;
  v_secs   numeric;
begin
  if coalesce(v_format, '') not in ('address', 'rating', 'duration', 'barcode', 'rich_text', 'time', 'json') then
    return p_value;
  end if;
  -- V11 #5: WORDS BECOME A LENGTH OF TIME BY THE EDITOR'S RULE (custom._duration_seconds_of; the
  -- client's readTypedDuration): a bare "4" is four minutes, exactly as typed into a cell — never
  -- the 4 seconds the plain number reading would make of it.
  if v_format = 'duration' and jsonb_typeof(p_original) = 'string' then
    p_value := null;
  end if;
  if p_value is null then
    if v_format = 'duration' and jsonb_typeof(p_original) = 'string' then
      v_secs := custom._duration_seconds_of(p_original #>> '{}');
      if v_secs is null then return null; end if;
      v_out := to_jsonb(v_secs);
    else
      return null;
    end if;
  end if;
  if jsonb_typeof(v_out) = 'null' then
    return v_out;
  end if;
  -- W2-A 1: words that are a time ("9:30") become its zero-padded text; a JSON column keeps any value as it is.
  if v_format = 'json' then return v_out; end if;
  if v_format = 'time' and jsonb_typeof(v_out) = 'string' and btrim(v_out #>> '{}') ~ '^[0-9]:[0-5][0-9](:[0-5][0-9])?$' then
    v_out := to_jsonb('0' || btrim(v_out #>> '{}'));
  end if;
  if v_format = 'address' and jsonb_typeof(v_out) = 'string' then
    if btrim(v_out #>> '{}') = '' then return 'null'::jsonb; end if;
    v_out := jsonb_build_object('street', left(btrim(v_out #>> '{}'), 200));
  end if;
  v_items := case when jsonb_typeof(v_out) = 'array' then v_out else jsonb_build_array(v_out) end;
  for v_one in select x from jsonb_array_elements(v_items) x loop
    if v_format in ('rich_text', 'barcode') and jsonb_typeof(v_one) <> 'string' then
      return null;
    end if;
    if v_format in ('rating', 'duration') and jsonb_typeof(v_one) <> 'number' then
      return null;
    end if;
    begin
      perform custom._kind_value_ok(p_to, coalesce(nullif(p_to ->> 'label', ''), 'this column'), v_one);
    exception when sqlstate '23514' then
      return null;
    end;
  end loop;
  return v_out;
end;
$function$;

CREATE OR REPLACE FUNCTION custom._fx_ext(p_organization_id uuid, p_op text, p_vals jsonb[], p_context jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_n   integer := coalesce(cardinality(p_vals), 0);
  v_a   jsonb := case when v_n >= 1 then p_vals[1] end;
  v_b   jsonb := case when v_n >= 2 then p_vals[2] end;
  v_c   jsonb := case when v_n >= 3 then p_vals[3] end;
  v_x   numeric;
  v_y   numeric;
  v_z   numeric;
  v_s   text;
  v_t   text;
  v_u   text;
  v_d1  record;
  v_d2  record;
  v_ts  timestamp;
  v_ts2 timestamp;
  v_items jsonb;
  v_k   integer;
  v_i   integer;
  v_len integer;
  v_start integer;
  v_end   integer;
  v_fn  text := upper(substr(p_op, 4));
  v_str text;
begin
  case p_op
    when 'fx.true' then return 'true'::jsonb;
    when 'fx.false' then return 'false'::jsonb;
    when 'fx.error' then
      raise exception 'This formula returned ERROR().' using errcode = '22023';
    when 'fx.ceiling', 'fx.floor' then
      v_x := custom._fx_num(v_a, format('`%s`', v_fn));
      v_y := case when v_n > 1 then custom._fx_num(v_b, format('`%s`', v_fn)) else 1 end;
      if v_y = 0 then raise exception '`%` needs a significance other than 0.', v_fn using errcode = '22023'; end if;
      return to_jsonb(trim_scale((case when p_op = 'fx.ceiling' then ceil(v_x / v_y) else floor(v_x / v_y) end) * v_y));
    when 'fx.int' then
      return to_jsonb(floor(custom._fx_num(v_a, '`INT`')));
    when 'fx.power' then
      v_x := custom._fx_num(v_a, '`POWER`'); v_y := custom._fx_num(v_b, '`POWER`');
      begin
        return to_jsonb(trim_scale(round(power(v_x, v_y), 12)));
      exception when others then
        raise exception '`POWER` cannot raise % to %.', custom._fx_num_text(v_x), custom._fx_num_text(v_y) using errcode = '22023';
      end;
    when 'fx.sqrt' then
      v_x := custom._fx_num(v_a, '`SQRT`');
      if v_x < 0 then raise exception '`SQRT` needs a number of 0 or more, but got %.', custom._fx_num_text(v_x) using errcode = '22023'; end if;
      return to_jsonb(trim_scale(round(sqrt(v_x), 12)));
    when 'fx.exp' then
      v_x := custom._fx_num(v_a, '`EXP`');
      begin
        return to_jsonb(trim_scale(round(exp(v_x), 12)));
      exception when others then
        raise exception '`EXP` of % is too large to show.', custom._fx_num_text(v_x) using errcode = '22023';
      end;
    when 'fx.log' then
      v_x := custom._fx_num(v_a, '`LOG`');
      v_y := case when v_n > 1 then custom._fx_num(v_b, '`LOG`') else 10 end;
      if v_x <= 0 or v_y <= 0 or v_y = 1 then
        raise exception '`LOG` needs a number above 0 and a base above 0 other than 1.' using errcode = '22023';
      end if;
      return to_jsonb(trim_scale(round(log(v_y, v_x), 12)));
    when 'fx.roundup', 'fx.rounddown' then
      v_x := custom._fx_num(v_a, format('`%s`', v_fn));
      v_y := case when v_n > 1 then trunc(custom._fx_num(v_b, format('`%s`', v_fn))) else 0 end;
      v_z := power(10::numeric, v_y);
      return to_jsonb(trim_scale(sign(v_x) * (case when p_op = 'fx.roundup' then ceil(abs(v_x) * v_z) else floor(abs(v_x) * v_z) end) / v_z));
    when 'fx.even' then
      v_x := custom._fx_num(v_a, '`EVEN`');
      return to_jsonb(sign(v_x) * ceil(abs(v_x) / 2) * 2);
    when 'fx.odd' then
      v_x := custom._fx_num(v_a, '`ODD`');
      v_y := ceil(abs(v_x));
      if v_y % 2 = 0 then v_y := v_y + 1; end if;
      return to_jsonb(case when v_x < 0 then -v_y else v_y end);
    when 'fx.count' then
      return to_jsonb((select count(*) from jsonb_array_elements(custom._fx_flat(p_vals)) e
                        where not custom._fx_blank(e) and jsonb_typeof(e) <> 'boolean' and custom._fx_loose(e) is not null));
    when 'fx.counta' then
      return to_jsonb((select count(*) from jsonb_array_elements(custom._fx_flat(p_vals)) e where not custom._fx_blank(e)));
    when 'fx.countall' then
      return to_jsonb((select coalesce(sum(case when custom._fx_blank(v) then 1 else jsonb_array_length(custom._fx_arr(v)) end), 0)
                         from unnest(p_vals) v));
    when 'fx.value' then
      return to_jsonb(trim_scale(custom._fx_num(v_a, '`VALUE`')));
    when 'fx.mid' then
      v_x := trunc(custom._fx_num(v_b, '`MID`')); v_y := trunc(custom._fx_num(v_c, '`MID`'));
      -- Airtable's own page: MID("quick brown fox", 6, 5) is brown, so the start place counts from 0 (as FIND's start does)
      return to_jsonb(substr(custom._fx_text(v_a), greatest(v_x, 0)::integer + 1, greatest(v_y, 0)::integer));
    when 'fx.replace' then
      v_s := custom._fx_text(v_a);
      v_x := greatest(trunc(custom._fx_num(v_b, '`REPLACE`')), 1); v_y := greatest(trunc(custom._fx_num(v_c, '`REPLACE`')), 0);
      return to_jsonb(left(v_s, v_x::integer - 1) || custom._fx_text(p_vals[4]) || substr(v_s, (v_x + v_y)::integer));
    when 'fx.rept' then
      v_s := custom._fx_text(v_a);
      v_x := greatest(trunc(custom._fx_num(v_b, '`REPT`')), 0);
      if v_x * char_length(v_s) > 100000 then
        raise exception '`REPT` makes at most 100000 characters.' using errcode = '22023';
      end if;
      return to_jsonb(repeat(v_s, v_x::integer));
    when 'fx.search' then
      v_s := lower(custom._fx_text(v_a)); v_t := lower(custom._fx_text(v_b));
      v_x := case when v_n > 2 then greatest(trunc(custom._fx_num(v_c, '`SEARCH`')), 0) else 0 end;
      v_x := least(v_x, char_length(v_t));
      v_k := strpos(substr(v_t, v_x::integer + 1), v_s);
      if v_s = '' then return to_jsonb(v_x + 1); end if;
      return case when v_k = 0 then 'null'::jsonb else to_jsonb(v_k + v_x::integer) end;
    when 'fx.t' then
      return case when jsonb_typeof(v_a) = 'string' then v_a else 'null'::jsonb end;
    when 'fx.encode_url_component' then
      v_s := custom._fx_text(v_a);
      v_str := '';
      for v_i in 1 .. char_length(v_s) loop
        v_t := substr(v_s, v_i, 1);
        if v_t ~ '^[A-Za-z0-9_.!~*''()-]$' then
          v_str := v_str || v_t;
        else
          v_str := v_str || regexp_replace(upper(encode(convert_to(v_t, 'UTF8'), 'hex')), '(..)', '%\1', 'g');
        end if;
      end loop;
      return to_jsonb(v_str);
    when 'fx.xor' then
      return to_jsonb((select count(*) from jsonb_array_elements(custom._fx_flat(p_vals)) e where custom._fx_truthy(e)) % 2 = 1);
    when 'fx.is_before', 'fx.is_after' then
      select * into v_d1 from custom._fx_dl(v_a, format('`%s`', v_fn));
      select * into v_d2 from custom._fx_dl(v_b, format('`%s`', v_fn));
      return to_jsonb(case when p_op = 'fx.is_before' then v_d1.ts < v_d2.ts else v_d1.ts > v_d2.ts end);
    when 'fx.is_same' then
      select * into v_d1 from custom._fx_dl(v_a, '`IS_SAME`');
      select * into v_d2 from custom._fx_dl(v_b, '`IS_SAME`');
      v_u := case when v_n > 2 then custom._fx_unit_norm(v_c, 'IS_SAME') else 'second' end;
      if v_u = 'week' then
        return to_jsonb(date_trunc('week', v_d1.ts + interval '1 day') = date_trunc('week', v_d2.ts + interval '1 day'));
      end if;
      return to_jsonb(date_trunc(v_u, v_d1.ts) = date_trunc(v_u, v_d2.ts));
    when 'fx.hour', 'fx.minute', 'fx.second' then
      -- W2-A 1: a time of day (a time column's HH:MM[:SS]) is read as itself.
      if jsonb_typeof(v_a) = 'string' and (v_a #>> '{}') ~ '^[0-9]{1,2}:[0-5][0-9](:[0-5][0-9])?$' then
        return to_jsonb(split_part(v_a #>> '{}', ':', case p_op when 'fx.hour' then 1 when 'fx.minute' then 2 else 3 end)::integer
                        * case when p_op = 'fx.second' and split_part(v_a #>> '{}', ':', 3) = '' then 0 else 1 end);
      end if;
      select * into v_d1 from custom._fx_dl(v_a, format('`%s`', v_fn));
      return to_jsonb(case p_op when 'fx.hour' then extract(hour from v_d1.ts)::integer
                                when 'fx.minute' then extract(minute from v_d1.ts)::integer
                                else floor(extract(second from v_d1.ts))::integer end);
    when 'fx.weekday' then
      select * into v_d1 from custom._fx_dl(v_a, '`WEEKDAY`');
      v_k := coalesce((select i - 1 from unnest(array['sunday','monday','tuesday','wednesday','thursday','friday','saturday'])
                          with ordinality d(n, i) where d.n = lower(btrim(custom._fx_text(v_b)))), 0);
      return to_jsonb((extract(dow from v_d1.ts)::integer - v_k + 7) % 7);
    when 'fx.weeknum' then
      select * into v_d1 from custom._fx_dl(v_a, '`WEEKNUM`');
      v_k := coalesce((select i - 1 from unnest(array['sunday','monday','tuesday','wednesday','thursday','friday','saturday'])
                          with ordinality d(n, i) where d.n = lower(btrim(custom._fx_text(v_b)))), 0);
      v_i := (extract(dow from date_trunc('year', v_d1.ts))::integer - v_k + 7) % 7;   -- how far into its week 1 January falls
      return to_jsonb((extract(doy from v_d1.ts)::integer - 1 + v_i) / 7 + 1);
    when 'fx.workday_diff' then
      select * into v_d1 from custom._fx_dl(v_a, '`WORKDAY_DIFF`');
      select * into v_d2 from custom._fx_dl(v_b, '`WORKDAY_DIFF`');
      declare
        v_hol date[] := '{}';
        v_h text;
        v_hd record;
        v_lo date := least(v_d1.ts::date, v_d2.ts::date);
        v_hi date := greatest(v_d1.ts::date, v_d2.ts::date);
      begin
        if v_n > 2 and not custom._fx_blank(v_c) then
          for v_h in select btrim(x, ' "[]') from unnest(string_to_array(case when jsonb_typeof(v_c) = 'array'
                       then (select string_agg(e #>> '{}', ',') from jsonb_array_elements(v_c) e)
                       else custom._fx_text(v_c) end, ',')) x loop
            continue when v_h = '';
            select * into v_hd from custom._fx_dl(to_jsonb(v_h), '`WORKDAY_DIFF`');
            v_hol := v_hol || v_hd.ts::date;
          end loop;
        end if;
        v_k := (select count(*) from generate_series(v_lo, v_hi, interval '1 day') g
                 where extract(isodow from g) < 6 and not (g::date = any (v_hol)));
        return to_jsonb(case when v_d2.ts::date >= v_d1.ts::date then v_k else -v_k end);
      end;
    when 'fx.datestr' then
      select * into v_d1 from custom._fx_dl(v_a, '`DATESTR`');
      return to_jsonb(to_char(v_d1.ts, 'YYYY-MM-DD'));
    when 'fx.timestr' then
      select * into v_d1 from custom._fx_dl(v_a, '`TIMESTR`');
      return to_jsonb(to_char(v_d1.ts, 'HH24:MI:SS'));
    when 'fx.datetime_parse' then
      if custom._fx_blank(v_a) then raise exception '`DATETIME_PARSE` needs a date, but that value is empty.' using errcode = '22023'; end if;
      if v_n > 1 and btrim(custom._fx_text(v_b)) <> '' then
        return to_jsonb(custom._fx_iso(custom._fx_datetime_parse(custom._fx_text(v_a), custom._fx_text(v_b)), false));
      end if;
      select * into v_d1 from custom._fx_dl(v_a, '`DATETIME_PARSE`');
      return to_jsonb(custom._fx_iso(v_d1.ts, false));
    when 'fx.datetime_diff' then
      select * into v_d1 from custom._fx_dl(v_a, '`DATETIME_DIFF`');
      select * into v_d2 from custom._fx_dl(v_b, '`DATETIME_DIFF`');
      v_u := case when v_n > 2 then custom._fx_unit_norm(v_c, 'DATETIME_DIFF') else 'second' end;
      if v_u in ('month', 'quarter', 'year') then
        v_k := custom._fx_months_between(v_d1.ts, v_d2.ts);
        return to_jsonb(trunc(v_k::numeric / case v_u when 'month' then 1 when 'quarter' then 3 else 12 end));
      end if;
      return to_jsonb(trunc(extract(epoch from (v_d1.ts - v_d2.ts)) * 1000
                            / case v_u when 'millisecond' then 1 when 'second' then 1000 when 'minute' then 60000
                                       when 'hour' then 3600000 when 'day' then 86400000 else 604800000 end));
    when 'fx.tonow', 'fx.fromnow' then
      -- TONOW(date) is how far the date is from now (negative once it is past); FROMNOW(date) is how long ago it was.
      select * into v_d1 from custom._fx_dl(v_a, format('`%s`', v_fn));
      v_u := case when v_n > 1 then custom._fx_unit_norm(v_b, v_fn) else 'day' end;
      v_ts := now() at time zone 'UTC';
      if v_u in ('month', 'quarter', 'year') then
        v_k := case when p_op = 'fx.tonow' then custom._fx_months_between(v_d1.ts, v_ts) else custom._fx_months_between(v_ts, v_d1.ts) end;
        return to_jsonb(trunc(v_k::numeric / case v_u when 'month' then 1 when 'quarter' then 3 else 12 end));
      end if;
      v_x := extract(epoch from (case when p_op = 'fx.tonow' then v_d1.ts - v_ts else v_ts - v_d1.ts end)) * 1000
             / case v_u when 'millisecond' then 1 when 'second' then 1000 when 'minute' then 60000
                        when 'hour' then 3600000 when 'day' then 86400000 else 604800000 end;
      return to_jsonb(trunc(v_x));
    when 'fx.set_timezone' then
      -- The instant, written as the wall clock of that zone with its offset. DATETIME_FORMAT writes that wall clock.
      select * into v_d1 from custom._fx_dl(v_a, '`SET_TIMEZONE`');
      v_s := btrim(custom._fx_text(v_b));
      begin
        v_ts := (v_d1.ts at time zone 'UTC') at time zone v_s;
      exception when others then
        raise exception '`SET_TIMEZONE` does not know the time zone "%".', v_s using errcode = '22023';
      end;
      return to_jsonb(to_char(v_ts, 'YYYY-MM-DD"T"HH24:MI:SS.MS') ||
                      (select case when o < interval '0' then '-' else '+' end || to_char(abs(extract(epoch from o))::integer / 3600, 'FM00') || ':' ||
                              to_char(abs(extract(epoch from o))::integer % 3600 / 60, 'FM00')
                         from (select ((v_ts - v_d1.ts)) as o) q));
    when 'fx.set_locale' then
      v_s := lower(btrim(custom._fx_text(v_b)));
      if v_s <> '' and v_s !~ '^en($|[-_])' then
        raise exception '`SET_LOCALE` has the English locale only; "%" is not available yet.', v_s using errcode = '22023';
      end if;
      return v_a;
    when 'fx.arrayunique' then
      return coalesce((select jsonb_agg(u.x order by u.i) from (select x, min(i) i from jsonb_array_elements(custom._fx_arr(v_a)) with ordinality t(x, i) group by x) u), '[]'::jsonb);
    when 'fx.arrayflatten' then
      return custom._fx_flatten(custom._fx_arr(v_a));
    when 'fx.arrayslice' then
      v_items := custom._fx_arr(v_a);
      v_len := jsonb_array_length(v_items);
      v_x := trunc(custom._fx_num(v_b, '`ARRAYSLICE`'));
      v_start := case when v_x > 0 then v_x::integer when v_x < 0 then v_len + v_x::integer + 1 else 1 end;
      if v_n > 2 then
        v_y := trunc(custom._fx_num(v_c, '`ARRAYSLICE`'));
        v_end := case when v_y > 0 then v_y::integer when v_y < 0 then v_len + v_y::integer + 1 else 0 end;
      else
        v_end := v_len;
      end if;
      v_start := greatest(v_start, 1); v_end := least(v_end, v_len);
      return coalesce((select jsonb_agg(u.x order by u.i) from jsonb_array_elements(v_items) with ordinality u(x, i)
                        where u.i between v_start and v_end), '[]'::jsonb);
    when 'fx.regex_extract' then
      v_t := custom._fx_regex(custom._fx_text(v_b), 'REGEX_EXTRACT');
      begin
        v_s := substring(custom._fx_text(v_a) from v_t);
      exception when invalid_regular_expression then
        raise exception '`REGEX_EXTRACT` cannot read the pattern "%".', custom._fx_text(v_b) using errcode = '22023';
      end;
      return case when v_s is null then 'null'::jsonb else to_jsonb(v_s) end;
    when 'fx.regex_replace' then
      v_t := custom._fx_regex(custom._fx_text(v_b), 'REGEX_REPLACE');
      begin
        return to_jsonb(regexp_replace(custom._fx_text(v_a), v_t,
                          regexp_replace(custom._fx_text(v_c), '\$([0-9])', '\\\1', 'g'), 'g'));
      exception when invalid_regular_expression then
        raise exception '`REGEX_REPLACE` cannot read the pattern "%".', custom._fx_text(v_b) using errcode = '22023';
      end;
    else
      raise exception 'The formula language lists % and custom._fx_ext does not work it out.', p_op using errcode = '22023';
  end case;
end
$function$;
