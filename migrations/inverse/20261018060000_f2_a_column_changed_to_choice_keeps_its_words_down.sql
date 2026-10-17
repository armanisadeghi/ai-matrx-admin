-- chair-step: F2 D11 down — puts back the conversion trigger, the retire/retype/merge bodies as they were, and removes custom.field_retype_preview and its door row.

CREATE OR REPLACE FUNCTION custom._field_type_converts_values()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_key       text;
  v_label     text;
  v_table     uuid;
  v_was       text;
  v_now       text;
  v_converted integer := 0;
  v_retired_n integer := 0;
  r           record;
  v_val       jsonb;
  v_new       jsonb;
  v_data      jsonb;
  v_retired   jsonb;
  v_alts      jsonb;
  v_keep_alts jsonb;
  v_alt       jsonb;
  v_conv_alt  jsonb;
  v_alts_retired integer := 0;
  -- DATA-V2-BASICS-2: values an earlier change set aside that fit again.
  v_back_n    integer := 0;
  v_entry     jsonb;
  v_ord       bigint;
  -- DATA-V2-BASICS-2: the column as it was, enough to read a choice's key as its words later.
  v_then      jsonb;
begin
  -- THE DOOR. custom.assert_store_door resolves custom/system_enabled and, while it is false,
  -- this store takes writes only from the role that owns custom.record. The switch never
  -- removes a check: everything below runs exactly as before.
  if not custom.store_is_open(new.organization_id) then
    perform custom.assert_store_door(new.organization_id, 'custom.record');
  end if;

  if new.table_id is distinct from custom.field_kernel_id() or new.data_class = 'kernel' then
    return null;
  end if;

  v_was := custom.field_behaviour(old.data);
  v_now := custom.field_behaviour(new.data);
  if v_was is not distinct from v_now then
    -- LANE 10 P4 round 3 (V11 #1): A RULE THAT TIGHTENS NEVER LOCKS A RECORD. The column still holds
    -- the same kind of thing, but what it accepts moved (a Rule, a setting, a unit): every value it
    -- now refuses is kept in `_retired` with its reason, the way a change of kind keeps one.
    if (old.data -> 'rules') is distinct from (new.data -> 'rules')
       or (old.data -> 'config') is distinct from (new.data -> 'config')
       or (old.data ->> 'unit') is distinct from (new.data ->> 'unit') then
      perform custom._retire_values_the_field_refuses(new.organization_id, new.id, new.data, old.data);
    end if;
    return null;                          -- the Field still asks for the same thing
  end if;

  v_key   := new.data ->> 'key';
  v_then  := jsonb_strip_nulls(jsonb_build_object('type', old.data -> 'type', 'multi', old.data -> 'multi',
               'config', case when old.data ->> 'type' = 'list'
                              then jsonb_build_object('options_table_id', old.data -> 'config' -> 'options_table_id') end));
  v_label := coalesce(nullif(new.data ->> 'label', ''), v_key, 'this field');
  v_table := nullif(new.data ->> 'entity_definition_id', '')::uuid;
  if v_key is null or v_table is null then
    return null;
  end if;

  for r in
    select x.id, x.data from custom.record x
     where x.organization_id = new.organization_id
       and x.table_id = v_table
       and x.deleted_at is null
       and x.data ? v_key
  loop
    v_val := r.data -> v_key;
    if v_val is null or jsonb_typeof(v_val) = 'null' then
      continue;
    end if;
    -- DATA-V2-BASICS-2: a choice goes by its words, and words find their choice (custom._field_value_carry).
    v_new := custom._field_value_carry(new.organization_id, old.data, new.data, v_val);

    if v_new is not null then
      -- THE ALTERNATES COME TOO. VAL-3: an alternate is a candidate for the SAME field, so
      -- custom.validate_value_envelope judges it by the SAME behaviour — and a converted value
      -- sitting beside an unconverted alternate is a document that cannot be written at all.
      -- (Measured: converting Phone to a number while a merge's "222" alternate stayed a
      -- string failed the very write that was doing the converting.) One that does not convert
      -- is kept in _retired as what it was, with its rank and its source.
      v_data := r.data;
      v_alts := coalesce(v_data -> '_values' -> v_key -> 'alternates', '[]'::jsonb);
      if jsonb_typeof(v_alts) = 'array' and jsonb_array_length(v_alts) > 0 then
        v_keep_alts := '[]'::jsonb;
        v_retired   := coalesce(v_data -> '_retired', '[]'::jsonb);
        if jsonb_typeof(v_retired) <> 'array' then
          v_retired := '[]'::jsonb;
        end if;
        for v_alt in select e from jsonb_array_elements(v_alts) e loop
          v_conv_alt := custom._field_value_carry(new.organization_id, old.data, new.data, v_alt -> 'value');
          if v_conv_alt is not null then
            v_keep_alts := v_keep_alts || jsonb_build_array(v_alt || jsonb_build_object('value', v_conv_alt));
          else
            v_retired := v_retired || jsonb_build_object(
              'key', v_key, 'label', v_label, 'value', v_alt -> 'value',
              'was_an_alternate_ranked', v_alt -> 'rank', 'envelope', v_alt -> 'src',
              'field_then', v_then,
              'reason', format('%s changed what it holds and this other candidate for it does not convert, so it is kept here as it was (FLD-4 / T12)', v_label),
              'at', to_jsonb(now()));
            v_alts_retired := v_alts_retired + 1;
          end if;
        end loop;
        if jsonb_array_length(v_keep_alts) > 0 then
          v_data := jsonb_set(v_data, array['_values', v_key, 'alternates'], v_keep_alts);
        else
          v_data := jsonb_set(v_data, array['_values', v_key],
                              (v_data -> '_values' -> v_key) - 'alternates');
        end if;
        if jsonb_array_length(v_retired) > 0 then
          v_data := v_data || jsonb_build_object('_retired', v_retired);
        end if;
      end if;
      if v_new is distinct from v_val then
        v_data := v_data || jsonb_build_object(v_key, v_new);
        v_converted := v_converted + 1;
      end if;
      if v_data is distinct from r.data then
        update custom.record x set data = v_data
         where x.organization_id = new.organization_id and x.id = r.id;
      end if;
    else
      -- IT DOES NOT CONVERT. The same place, the same shape and the same reason T8's retype
      -- already uses: the value and its envelope are kept in `_retired`, and the key leaves
      -- the document so the record can be written again.
      v_data    := r.data;
      v_retired := coalesce(v_data -> '_retired', '[]'::jsonb);
      if jsonb_typeof(v_retired) <> 'array' then
        v_retired := '[]'::jsonb;
      end if;
      v_retired := v_retired || jsonb_build_object(
        'key',      v_key,
        'label',    v_label,
        'value',    v_val,
        'envelope', v_data -> '_values' -> v_key,
        -- What the column was when this was set aside, so a choice's key comes back as its words.
        'field_then', v_then,
        'reason',   format('%s now holds %s, and %s is not one — this value was kept here when the field changed, neither coerced nor deleted (FLD-4 / T12)',
                           v_label,
                           case when new.data ->> 'type' = 'range'
                                     and custom.said(new.data -> 'config' ->> 'kind', 'number') in ('date','datetime')
                                then 'dates'
                                when new.data ->> 'type' = 'range' then 'numbers'
                                when new.data ->> 'type' = 'boolean' then 'a tick or nothing'
                                when new.data ->> 'type' = 'text' then 'words'
                                when new.data ->> 'type' = 'list' then 'one of its choices'
                                when new.data ->> 'type' = 'relation' then 'a link to a record'
                                else custom.said(new.data ->> 'type', 'something else') end,
                           coalesce('"' || (v_val #>> '{}') || '"', 'that value')),
        'at',       to_jsonb(now()));
      v_data := v_data - v_key;
      if jsonb_typeof(v_data -> '_values') = 'object' then
        v_data := jsonb_set(v_data, '{_values}', (v_data -> '_values') - v_key);
      end if;
      v_data := v_data || jsonb_build_object('_retired', v_retired);
      update custom.record x set data = v_data
       where x.organization_id = new.organization_id and x.id = r.id;
      v_retired_n := v_retired_n + 1;
    end if;
  end loop;

  -- ── DATA-V2-BASICS-2 (2026-09-27): A VALUE SET ASIDE COMES BACK WHEN IT FITS AGAIN. ──────
  -- MEASURED on Harbor Dental's "Operatory Supply Orders": Operatory (Op 1 · Op 2 · Op 3) changed to
  -- a Number set all three aside in `_retired`, and changing it back to Text — by hand or by the
  -- migration's own undo — brought none of them back: the undo patches the Field and this trigger
  -- converted only the values still in place. Now a record with no value for this column takes back
  -- the newest value an earlier change set aside for it, when that value fits what the column now
  -- holds; it leaves `_retired`. Alternates keep their own path above.
  for r in
    select x.id, x.data from custom.record x
     where x.organization_id = new.organization_id
       and x.table_id = v_table
       and x.deleted_at is null
       and not (x.data ? v_key)
       and jsonb_typeof(x.data -> '_retired') = 'array'
       and exists (select 1 from jsonb_array_elements(x.data -> '_retired') e
                    where e ->> 'key' = v_key and not (e ? 'was_an_alternate_ranked'))
  loop
    select t.e, t.ord into v_entry, v_ord
      from jsonb_array_elements(r.data -> '_retired') with ordinality t(e, ord)
     where t.e ->> 'key' = v_key and not (t.e ? 'was_an_alternate_ranked')
     order by t.ord desc
     limit 1;
    v_new := custom._field_value_carry(new.organization_id, coalesce(v_entry -> 'field_then', '{}'::jsonb), new.data, v_entry -> 'value');
    if v_new is null or jsonb_typeof(v_new) = 'null' then
      continue;
    end if;
    v_retired := (select coalesce(jsonb_agg(t.e order by t.ord), '[]'::jsonb)
                    from jsonb_array_elements(r.data -> '_retired') with ordinality t(e, ord)
                   where t.ord <> v_ord);
    v_data := r.data || jsonb_build_object(v_key, v_new);
    v_data := case when jsonb_array_length(v_retired) = 0 then v_data - '_retired'
                   else jsonb_set(v_data, '{_retired}', v_retired) end;
    update custom.record x set data = v_data
     where x.organization_id = new.organization_id and x.id = r.id;
    v_back_n := v_back_n + 1;
  end loop;
  if v_back_n > 0 then
    raise notice 'custom: "%" took back % value(s) an earlier change had set aside, because they fit again.', v_label, v_back_n;
  end if;

  -- 🚨 VIS-2 (2026-09-19) — AND IT WRITES ITS MIGRATION ROW, IN THIS SAME TRANSACTION.
  -- MEASURED: `custom.migrate_retype` records a `history.migration_log` row before it patches
  -- the Field, but the CONVERSION is this trigger's, and this trigger is what runs when the
  -- same Field is retyped through the ordinary write door. So a type change made the normal
  -- way rewrote every value of the table, moved what would not convert into `_retired`, and
  -- left NOTHING in the migration log: HIS-8's undo did not exist for it and the Migrations
  -- screen did not know it had happened. The row is written here, where the rewrite is, so
  -- both routes leave the same trace.
  --
  -- The inverse is the Field's own previous shape, which is a `patch` on the Field record -
  -- the identical inverse `custom.migrate_retype` stores, and `custom.record_update` on the
  -- Field is what puts it back, firing this trigger again to convert the values the other way.
  --
  -- ONE ROW, NOT TWO. When `custom.migrate_retype` is the caller it has already recorded its
  -- row a few statements earlier IN THIS TRANSACTION, and `now()` is the transaction
  -- timestamp, so `applied_at >= now()` is exactly "recorded by this transaction" - it cannot
  -- match an older row and there are no newer ones.
  if not exists (select 1 from history.migration_log m
                  where m.organization_id = new.organization_id
                    and m.verb = 'retype'
                    and m.target_kind = 'field'
                    and m.target_id = new.id
                    and m.applied_at >= now()) then
    perform history.migration_record(
      new.organization_id, 'retype', 'field', new.id,
      jsonb_build_object(
        'kind', 'patch',
        'record_id', new.id::text,
        -- PERSON-UNDO: the WHOLE shape the column had (kind, settings, format, rules, what a relation
        -- points at), so putting it back restores a Person column from an Email one. A key the old shape
        -- did not have is set to null, so the change's own additions come off.
        'patch', jsonb_strip_nulls(jsonb_build_object(
                   'type',   old.data ->> 'type',
                   'config', old.data -> 'config'))
                 || coalesce((select jsonb_object_agg(k, case when old.data ? k then old.data -> k else 'null'::jsonb end)
                                from unnest(array['format', 'rules', 'parity_type', 'relation_target', 'relation_max', 'on_target_delete']) k
                               where old.data ? k or new.data ? k), '{}'::jsonb)),
      format('%s behaves as %s instead of %s; %s value(s) converted, %s kept in _retired with the reason, %s other candidate(s) kept too. Recorded by the conversion itself, so a retype through the ordinary write door leaves the same trace as one through custom.migrate_retype (FLD-4 / T12 / HIS-8).',
             v_label, v_now, v_was, v_converted, v_retired_n, v_alts_retired));
  end if;

  if v_converted > 0 or v_retired_n > 0 or v_alts_retired > 0 then
    raise notice 'custom: "%" changed what it holds (% -> %): % value(s) converted, % kept in _retired with the reason, % other candidate(s) kept too.',
      v_label, v_was, v_now, v_converted, v_retired_n, v_alts_retired;
  end if;
  return null;
end;
$function$;

CREATE OR REPLACE FUNCTION custom._retire_values_the_field_refuses(p_organization_id uuid, p_field_id uuid, p_field_data jsonb, p_field_then jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_key     text := p_field_data ->> 'key';
  v_label   text := coalesce(nullif(p_field_data ->> 'label', ''), p_field_data ->> 'key', 'this field');
  v_table   uuid := nullif(p_field_data ->> 'entity_definition_id', '')::uuid;
  r         record;
  v_val     jsonb;
  v_data    jsonb;
  v_retired jsonb;
  v_n       integer := 0;
begin
  if v_key is null or v_table is null or p_field_data ->> 'type' = 'formula' then
    return 0;
  end if;
  for r in
    select x.id, x.data from custom.record x
     where x.organization_id = p_organization_id
       and x.table_id = v_table
       and x.deleted_at is null
       and x.data ? v_key
       and jsonb_typeof(x.data -> v_key) <> 'null'
  loop
    v_val := r.data -> v_key;
    if custom._value_fits_field(p_organization_id, p_field_id, p_field_data, v_val) then
      continue;
    end if;
    v_data    := r.data;
    v_retired := case when jsonb_typeof(v_data -> '_retired') = 'array' then v_data -> '_retired' else '[]'::jsonb end;
    v_retired := v_retired || jsonb_build_object(
      'key',        v_key,
      'label',      v_label,
      'value',      v_val,
      'envelope',   v_data -> '_values' -> v_key,
      'field_then', jsonb_strip_nulls(jsonb_build_object('type', p_field_then -> 'type', 'multi', p_field_then -> 'multi',
                      'rules', p_field_then -> 'rules', 'format', p_field_then -> 'format')),
      'reason',     format('%s changed what it accepts, and %s no longer fits — this value was kept here when the column changed, neither changed nor deleted (FLD-4)',
                           v_label, coalesce('"' || left(v_val #>> '{}', 80) || '"', 'this value')),
      'at',         to_jsonb(now()));
    v_data := v_data - v_key;
    if jsonb_typeof(v_data -> '_values') = 'object' then
      v_data := jsonb_set(v_data, '{_values}', (v_data -> '_values') - v_key);
    end if;
    v_data := v_data || jsonb_build_object('_retired', v_retired);
    update custom.record x set data = v_data
     where x.organization_id = p_organization_id and x.id = r.id;
    v_n := v_n + 1;
  end loop;
  if v_n > 0 then
    raise notice 'custom: "%" changed what it accepts: % value(s) no longer fit and are kept in _retired with the reason.', v_label, v_n;
  end if;
  return v_n;
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
  perform custom.assert_client_may_change(p_organization_id, p_id, 'custom.migrate_retype', 'admin'::public.permission_level, 'record');
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
               coalesce(p_note, format('%s behaves as %s instead of %s; values that fit are converted and values that do not are kept in _retired with the reason, neither coerced nor deleted (FLD-4)', coalesce(v_row.data ->> 'label', v_row.data ->> 'key'), p_to, v_was)));
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
                              'values', 'converted where they convert; kept in _retired with the reason where they do not (FLD-4 / T12)',
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

CREATE OR REPLACE FUNCTION custom.migrate_merge(p_organization_id uuid, p_winner_id uuid, p_loser_id uuid, p_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_win      custom.record%rowtype;
  v_lose     custom.record%rowtype;
  v_log      uuid;
  v_moved    integer := 0;
  v_alts_n   integer := 0;
  v_copied   integer := 0;
  v_retired_n integer := 0;
  v_retargeted integer := 0;
  v_detached integer := 0;
  v_data     jsonb;
  v_vals     jsonb;
  v_env      jsonb;
  v_alts     jsonb;
  v_retired  jsonb;
  v_key      text;
  v_val      jsonb;
  v_declared text[];
  v_rtype    text;
  v_typefld  text;
  v_after    jsonb;
  v_checked  text[] := '{}';
  a          record;
  v_retargeted_ids uuid[] := '{}';
  v_detached_ids   uuid[] := '{}';
  v_reparented_ids uuid[] := '{}';
  v_win_after      jsonb;
  -- AT-MERGE: the winner's table's RELATION columns, the keys a merge unions, and every
  -- document a merge rewrote so that a link's value and its edge move together (REL-11).
  v_relf           jsonb;
  v_union_keys     text[] := '{}';
  v_rel_rewrites   jsonb := '[]'::jsonb;
  v_w_ids          text[];
  v_l_ids          text[];
  v_new_ids        text[];
  v_max            integer;
  v_src            record;
  v_sdoc           jsonb;
  v_sval           jsonb;
  v_snew           jsonb;
  v_rel_moved      integer := 0;
begin
  -- THE CALLER AND THE TWO ROWS, decided on the one ladder — lane REACH's prologue, kept
  -- verbatim: this verb became a client door while DOOR-FIX 2 was landing, and a merge that
  -- skipped the access question would be a door with no lock. Then the switch:
  -- custom.assert_store_door resolves custom/system_enabled and, while it is false, this
  -- store takes writes only from the role that owns custom.record.
  perform custom.assert_client_may_reach(p_organization_id, 'custom.migrate_merge');
  perform custom.assert_client_may_change(p_organization_id, p_winner_id, 'custom.migrate_merge', 'admin'::public.permission_level, 'record');
  perform custom.assert_client_may_change(p_organization_id, p_loser_id, 'custom.migrate_merge', 'admin'::public.permission_level, 'record');
  perform custom.assert_store_door(p_organization_id, 'custom.migrate_merge');

  if p_winner_id = p_loser_id then
    raise exception 'A record cannot be merged into itself.'
      using errcode = '22023', hint = 'REC-21: nothing was changed.';
  end if;

  select * into v_win  from custom.record r
   where r.organization_id = p_organization_id and r.id = p_winner_id and r.deleted_at is null;
  select * into v_lose from custom.record r
   where r.organization_id = p_organization_id and r.id = p_loser_id and r.deleted_at is null;
  if v_win.id is null or v_lose.id is null then
    raise exception 'Both records have to be here to merge them, and % is not.',
                    coalesce(case when v_win.id is null then p_winner_id else p_loser_id end)
      using errcode = '02000';
  end if;

  -- THE INVERSE, BEFORE ANYTHING MOVES: the loser's whole document, so undo can put both
  -- records and both ids back exactly (T5's last sentence). `unalias` is what
  -- history.migration_undo revokes, so the loser's id stops resolving to the winner.
  v_log := history.migration_record(p_organization_id, 'merge', v_lose.data_class, p_loser_id,
             jsonb_build_object('kind', 'restore', 'record_id', p_loser_id::text,
                                'unalias', p_loser_id::text,
                                'document', v_lose.data),
             coalesce(p_note, format('merged into %s', p_winner_id)));

  -- WHICH KEYS MAY CARRY AN ENVELOPE. VAL-1: a declared Field of the winner's table, chosen
  -- by the winner's own type field where its table has one.
  v_typefld := custom.table_type_field(p_organization_id, v_win.table_id);
  if v_typefld is not null then
    v_rtype := v_win.data ->> v_typefld;
  end if;
  select coalesce(array_agg(f.data ->> 'key'), '{}') into v_declared
    from custom.applicable_fields(p_organization_id, v_win.table_id, v_rtype) f;

  -- AT-MERGE: WHICH KEYS ARE RELATIONS, and whether each holds one id or a list. The merge
  -- used to treat a link as a scalar, so a list column kept the winner's list and parked the
  -- loser's links in an alternate no reader follows; the links were lost, not merged.
  select coalesce(jsonb_object_agg(coalesce(nullif(f.data ->> 'key', ''), f.data ->> 'name'),
                                   jsonb_build_object(
                                     'multi', coalesce((f.data ->> 'multi')::boolean, false),
                                     'max', nullif(f.data ->> 'relation_max', ''))),
                  '{}'::jsonb)
    into v_relf
    from custom.record f
   where f.organization_id = p_organization_id
     and f.table_id = custom.field_kernel_id()
     and f.data_class <> 'kernel'
     and f.deleted_at is null
     and nullif(f.data ->> 'entity_definition_id', '')::uuid = v_win.table_id
     and f.data ->> 'type' = 'relation';

  v_data    := v_win.data;
  v_retired := coalesce(v_data -> '_retired', '[]'::jsonb);
  if jsonb_typeof(v_retired) <> 'array' then
    v_retired := '[]'::jsonb;
  end if;

  for v_key, v_val in select * from jsonb_each(v_lose.data) loop
    if left(v_key, 1) = '_' or v_key in ('parent_id') then
      continue;
    end if;

    if not (v_data ? v_key) then
      -- The winner did not hold this at all: it simply moves across.
      v_data := v_data || jsonb_build_object(v_key, v_val);
      v_copied := v_copied + 1;
      v_moved := v_moved + 1;
      v_checked := v_checked || v_key;

    elsif (v_data -> v_key) is distinct from v_val and v_relf ? v_key
          and coalesce((v_relf -> v_key ->> 'multi')::boolean, false) then
      -- AT-MERGE: A LIST OF LINKS UNITES. Both records' ids, the winner's first, each once, held
      -- in the winner's own document; the store's triggers write the edges from it, so value and
      -- edge land together. Past the column's own limit the overflow is kept aside with its
      -- reason, never dropped and never written where the column refuses it.
      select coalesce(array_agg(x.v order by x.o), '{}') into v_w_ids
        from jsonb_array_elements_text(case jsonb_typeof(v_data -> v_key)
               when 'array' then v_data -> v_key
               when 'string' then jsonb_build_array(v_data -> v_key)
               else '[]'::jsonb end) with ordinality x(v, o);
      select coalesce(array_agg(x.v order by x.o), '{}') into v_l_ids
        from jsonb_array_elements_text(case jsonb_typeof(v_val)
               when 'array' then v_val
               when 'string' then jsonb_build_array(v_val)
               else '[]'::jsonb end) with ordinality x(v, o);
      v_new_ids := v_w_ids || coalesce((
        select array_agg(t.u order by t.o)
          from (select u, min(o) as o from unnest(v_l_ids) with ordinality q(u, o)
                 where not (u = any (v_w_ids)) group by u) t), '{}');
      v_max := nullif(v_relf -> v_key ->> 'max', '')::integer;
      if v_max is not null and v_max > 0 and cardinality(v_new_ids) > v_max then
        v_retired := v_retired || jsonb_build_object(
          'key', v_key,
          'value', to_jsonb(v_new_ids[v_max + 1:]),
          'reason', format('merged from record %s; "%s" holds at most %s links, so the rest are kept here rather than written past that limit', p_loser_id, v_key, v_max),
          'at', to_jsonb(now()));
        v_retired_n := v_retired_n + 1;
        v_new_ids := v_new_ids[1:v_max];
      end if;
      if v_new_ids is distinct from v_w_ids then
        v_data := v_data || jsonb_build_object(v_key, to_jsonb(v_new_ids));
        v_moved := v_moved + 1;
        v_checked := v_checked || v_key;
        v_union_keys := v_union_keys || v_key;
      end if;

    elsif (v_data -> v_key) is distinct from v_val then
      if v_key = any (v_declared) then
        -- T5: the two phone numbers become ALTERNATES inside the winner's one document, each
        -- with its source — never a second record, and never a value quietly overwritten.
        -- BUILT, not poked: jsonb_set cannot create `_values` when it is absent, which is how
        -- this value used to disappear while being counted as taken.
        v_vals := coalesce(v_data -> '_values', '{}'::jsonb);
        if jsonb_typeof(v_vals) <> 'object' then
          v_vals := '{}'::jsonb;
        end if;
        v_env := coalesce(v_vals -> v_key, '{}'::jsonb);
        if jsonb_typeof(v_env) <> 'object' then
          v_env := '{}'::jsonb;
        end if;
        v_alts := coalesce(v_env -> 'alternates', '[]'::jsonb);
        if jsonb_typeof(v_alts) <> 'array' then
          v_alts := '[]'::jsonb;
        end if;
        -- VAL-4: THE RANK IS THE ARRIVAL ORDER, which is the only ordering a merge knows. The
        -- winner's own value is the trusted one and holds no rank; the first record merged in
        -- ranks 1, the next 2. Never a score, never a confidence.
        v_alts := v_alts || jsonb_build_array(jsonb_build_object(
                    'value', v_val,
                    'rank', jsonb_array_length(v_alts) + 1,
                    -- The SOURCE, written as a source. custom.intern_provenance interns it to
                    -- a pointer and files the description in _sources; a caller that wrote the
                    -- pointer itself would be naming something this store owns (VAL-1).
                    'src', jsonb_build_object('kind', 'record', 'id', p_loser_id::text)));
        v_env  := v_env  || jsonb_build_object('alternates', v_alts);
        v_vals := v_vals || jsonb_build_object(v_key, v_env);
        v_data := v_data || jsonb_build_object('_values', v_vals);
        v_alts_n := v_alts_n + 1;
        v_moved := v_moved + 1;
        v_checked := v_checked || v_key;
      else
        -- NOT A DECLARED FIELD OF THIS TABLE, so it cannot carry an envelope (VAL-1) and
        -- cannot become an alternate. It is kept with its reason rather than dropped.
        v_retired := v_retired || jsonb_build_object(
          'key', v_key,
          'value', v_val,
          'envelope', v_lose.data -> '_values' -> v_key,
          'reason', format('merged from record %s; "%s" is not a declared field of this table, so its other value is kept here rather than as an alternate (VAL-1)', p_loser_id, v_key),
          'at', to_jsonb(now()));
        v_retired_n := v_retired_n + 1;
        v_moved := v_moved + 1;
      end if;
    end if;
  end loop;

  if jsonb_array_length(v_retired) > 0 then
    v_data := v_data || jsonb_build_object('_retired', v_retired);
  end if;

  perform custom.record_update(p_organization_id, p_winner_id, v_data);

  -- THE READ-BACK. A merge that says it took a value and wrote nothing is the exact defect
  -- this file exists to close, so it is asserted against the stored document rather than
  -- trusted.
  select r.data into v_after from custom.record r
   where r.organization_id = p_organization_id and r.id = p_winner_id;
  foreach v_key in array v_checked loop
    if not (v_after ? v_key) then
      raise exception 'The merge says it took "%" from the other record and the winner does not hold it. Nothing was merged.', v_key
        using errcode = '23514',
              hint = 'T5 / VAL-4: a value taken in a merge is in the winner''s one document — as the value itself, or as a ranked alternate with its source.';
    end if;
  end loop;
  foreach v_key in array v_checked loop
    if (v_win.data ? v_key) and (v_win.data -> v_key) is distinct from (v_lose.data -> v_key)
       and (v_lose.data ? v_key)
       and v_key = any (v_declared)
       and not (v_key = any (v_union_keys))
       and not exists (select 1 from jsonb_array_elements(
                         coalesce(v_after -> '_values' -> v_key -> 'alternates', '[]'::jsonb)) x
                        where x -> 'value' = v_lose.data -> v_key) then
      raise exception 'The merge says "%" had another value on the other record and the winner carries no alternate for it. Nothing was merged.', v_key
        using errcode = '23514',
              hint = 'T5 / VAL-4: the losing value is kept as a ranked alternate with its source, never overwritten and never dropped.';
    end if;
  end loop;

  -- Everything the loser contained now hangs off the winner, or the merge would orphan it —
  -- and, since the delete door honours containment, would take it with the loser.
  -- TABLE-EXPERIENCE (v7 item 3): which children moved is kept, so an undo moves them back.
  with moved as (
    update custom.record r
       set data = r.data || jsonb_build_object('parent_id', p_winner_id::text)
     where r.organization_id = p_organization_id
       and r.deleted_at is null
       and nullif(r.data ->> 'parent_id', '')::uuid = p_loser_id
    returning r.id)
  select coalesce(array_agg(id), '{}') into v_reparented_ids from moved;

  -- WHAT POINTED AT THE LOSER POINTS AT THE WINNER. REC-21's "forever" for relations, not
  -- only for readers who remember to resolve the id.
  --
  -- AT-MERGE: A RELATION LINK IS A VALUE FIRST. Its edge is written by the store from the
  -- source record's own document (REL-11) and the two may never disagree, so moving only the
  -- edge — what this loop did to every association — left a document naming the loser beside an
  -- edge naming the winner, which the commit-time guard refused: "a relation's ASSOCIATION landed
  -- with no value beside it". The source's document is rewritten instead, the loser's id replaced
  -- by the winner's (once, in place), and the store's triggers move the edge from that. What each
  -- document held before is kept for the undo.
  for v_src in
    select distinct x.source_id, x.role
      from platform.associations x
     where x.organization_id = p_organization_id
       and x.target_id = p_loser_id and x.deleted_at is null
       and x.source_type = 'record' and x.target_type = 'record'
       and x.relation_field_id is not null
  loop
    select r.data into v_sdoc from custom.record r
     where r.organization_id = p_organization_id and r.id = v_src.source_id and r.deleted_at is null;
    if v_sdoc is null or not (v_sdoc ? v_src.role) then
      continue;
    end if;
    v_sval := v_sdoc -> v_src.role;
    if jsonb_typeof(v_sval) = 'array' then
      select coalesce(jsonb_agg(to_jsonb(y.v) order by y.o), '[]'::jsonb) into v_snew
        from (select z.v, min(z.o) as o
                from (select case when t.v = p_loser_id::text then p_winner_id::text else t.v end as v, t.o
                        from jsonb_array_elements_text(v_sval) with ordinality t(v, o)) z
               group by z.v) y;
    elsif jsonb_typeof(v_sval) = 'string' and (v_sval #>> '{}') = p_loser_id::text then
      v_snew := to_jsonb(p_winner_id::text);
    else
      continue;
    end if;
    if v_snew is distinct from v_sval then
      update custom.record r
         set data = r.data || jsonb_build_object(v_src.role, v_snew)
       where r.organization_id = p_organization_id and r.id = v_src.source_id;
      v_rel_rewrites := v_rel_rewrites || jsonb_build_object(
        'source_id', v_src.source_id::text, 'key', v_src.role, 'before', v_sval, 'after', v_snew);
      v_rel_moved := v_rel_moved + 1;
    end if;
  end loop;

  for a in
    select x.id, x.source_type, x.source_id, x.role
      from platform.associations x
     where x.organization_id = p_organization_id
       and x.target_id = p_loser_id and x.deleted_at is null
       and x.relation_field_id is null
  loop
    if exists (select 1 from platform.associations y
                where y.source_type = a.source_type and y.source_id = a.source_id
                  and y.target_id = p_winner_id and y.role is not distinct from a.role
                  and y.id <> a.id) then
      update platform.associations set deleted_at = now() where id = a.id;
      v_detached := v_detached + 1;
      v_detached_ids := v_detached_ids || a.id;
    else
      update platform.associations set target_id = p_winner_id where id = a.id;
      v_retargeted := v_retargeted + 1;
      v_retargeted_ids := v_retargeted_ids || a.id;
    end if;
  end loop;

  -- REC-21: FOREVER. The alias goes in BEFORE the loser is deleted, so there is no instant in
  -- which the id resolves to nothing. `revoked_at` is cleared, because an id merged again
  -- after an undo resolves again.
  insert into custom.record_alias (organization_id, old_id, new_id, verb, reason, migration_id)
  values (p_organization_id, p_loser_id, p_winner_id, 'merge',
          coalesce(p_note, 'merged'), v_log)
  on conflict (organization_id, old_id) do update
        set new_id = excluded.new_id, verb = excluded.verb,
            reason = excluded.reason, migration_id = excluded.migration_id,
            revoked_at = null;

  perform custom.record_delete(p_organization_id, p_loser_id);

  -- TABLE-EXPERIENCE (v7 item 3) — EVERYTHING THE MERGE DID, FOR ITS UNDO. The loser's own
  -- document was stored before anything moved; what the merge did to the WINNER and to what
  -- pointed at the loser is only known now, so it joins the same inverse. `custom.migrate_undo`
  -- reads `merge_undo`: the winner's keys as they were (put back only while the winner is still
  -- exactly as the merge left it), the links moved to the winner, the duplicate links withdrawn,
  -- and the children re-parented.
  select r.data into v_win_after from custom.record r
   where r.organization_id = p_organization_id and r.id = p_winner_id;
  update history.migration_log l
     set inverse = l.inverse || jsonb_build_object('merge_undo', jsonb_build_object(
           'winner_id', p_winner_id::text,
           'winner_before', (select coalesce(jsonb_object_agg(k, coalesce(v_win.data -> k, 'null'::jsonb)), '{}'::jsonb)
                               from unnest(v_checked || array['_values', '_retired']) k),
           'winner_after', v_win_after,
           'retargeted', to_jsonb(v_retargeted_ids),
           'detached', to_jsonb(v_detached_ids),
           'relation_rewrites', v_rel_rewrites,
           'reparented', to_jsonb(v_reparented_ids)))
   where l.organization_id = p_organization_id and l.id = v_log;

  return jsonb_build_object('verb', 'merge', 'winner', p_winner_id, 'loser', p_loser_id,
                            'migration_id', v_log, 'values_taken', v_moved,
                            'values_copied', v_copied, 'alternates_added', v_alts_n,
                            'values_retired', v_retired_n,
                            'relations_retargeted', v_retargeted + v_rel_moved,
                            'relations_detached_as_duplicates', v_detached,
                            'resolves_to', custom.resolve_id(p_organization_id, p_loser_id),
                            'at', now());
end;
$function$;

delete from platform.client_callable_door where schema_name = 'custom' and function_name = 'field_retype_preview';
drop function if exists custom.field_retype_preview(uuid, uuid, jsonb);
