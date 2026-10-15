-- target: branch,production
-- additive: yes
-- NOTION-AUTO (2026-10-14) — A PLAIN COLUMN BECOMES AUTOMATIC KEEPING ITS VALUES, AND AN AUTO NUMBER
-- BACKFILL FINALLY MOVES THE COUNTER.
--
-- ROOT CAUSE 1 ("six rows numbered, the next new row got 1"): `custom.autonumber_backfill` numbered the
-- rows already there by saving each once with `update custom.record set updated_at = now()`. Since
-- writeperf / datadefects4 gave `custom_record_zz_derived_fields` a WHEN list (data, table,
-- organization, metadata, custom_fields, the access list), that statement changes nothing the trigger
-- watches, so the trigger never ran, no `_derived.<key>` number was ever stored, and the counter
-- (`custom._fx_autonumber` = one past the highest stored number) started from nothing. The report
-- said "numbered 6" because it counted its own loop. The save now changes `data` for real (it names
-- the column's answer, which the trigger replaces with the worked-out number; UI-FIX-18 keeps the
-- row's version and updated_at).
--
-- WHAT IT ADDS: `custom.field_make_automatic(org, field, kind)` — the in-place conversion. A time kind moves
-- each record's old value onto the record's own stamp (created_at / updated_at) and removes the key; an
-- autonumber keeps each record's whole-number value (the retype sets it aside in `_retired`, and
-- `custom._fx_autonumber` takes it back when nobody else holds it), then numbers the rest after the
-- highest; Created by / Last changed by keep the imported person (a Person record or words) in
-- `_retired` and `custom.formula_value` answers it — for Created by always, for Last changed by until a
-- real user changes the record. Replaces custom._fx_autonumber, custom.autonumber_backfill,
-- custom.formula_value bodies (inverse restores the live ones); no table, column, trigger or grant moves.
-- Inverse: migrations/inverse/notionauto_a_a_plain_column_becomes_automatic_keeping_its_values_down.sql
-- guard: custom/system_enabled
-- lock: custom,platform
-- lane: NOTION-AUTO
-- based-on: custom._fx_autonumber(uuid, uuid, text, uuid) b4cddffca1e62579bd406193faa1955ed4ba1e9b8da14d92664409ec5c74fdaa
-- based-on: custom.autonumber_backfill(uuid, uuid) 09965947f8ebd8f84ee33da16c8c29a57a804aebd8c9aa3d990e1684d1e34e66
-- based-on: custom.formula_value(uuid, uuid, jsonb, jsonb) a37a3d5d71bff2011ba099b6a022a184885e7999b6f792a278217ddeb46af9b8


CREATE OR REPLACE FUNCTION custom._fx_autonumber(p_organization_id uuid, p_table_id uuid, p_key text, p_self_id uuid)
 RETURNS numeric
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_have numeric;
  v_next numeric;
begin
  if p_table_id is null or p_key is null then
    return null;
  end if;
  -- A record keeps the number it was given: every later write of it answers the same number.
  if p_self_id is not null then
    select nullif(r.data -> '_derived' -> p_key ->> 'value', '')::numeric into v_have
      from custom.record r
     where r.organization_id = p_organization_id and r.id = p_self_id;
    if v_have is not null then
      return v_have;
    end if;
  end if;
  -- NOTION-AUTO: A NUMBER THE COLUMN WAS GIVEN BEFORE IT BECAME AN AUTONUMBER COLUMN IS KEPT.
  -- `custom.field_make_automatic` turns a plain column (Notion's ID, said as numbers) into an
  -- autonumber one; the retype sets each record's old value aside in `_retired` under this key.
  -- A record with no number of its own takes the whole-number value its old column held, when no
  -- other record of the table already holds that number, so imported IDs survive and the next new
  -- record still gets one past the highest.
  if p_self_id is not null then
    select (e.value ->> 'value')::numeric into v_have
      from custom.record r,
           jsonb_array_elements(case when jsonb_typeof(r.data -> '_retired') = 'array' then r.data -> '_retired' else '[]'::jsonb end) with ordinality e(value, ord)
     where r.organization_id = p_organization_id and r.id = p_self_id
       and e.value ->> 'key' = p_key
       and (e.value ->> 'value') ~ '^[0-9]{1,18}$'
       and (e.value ->> 'value')::numeric >= 1
     order by e.ord desc
     limit 1;
    if v_have is not null then
      perform pg_advisory_xact_lock(hashtextextended('custom_autonumber:' || p_table_id::text || ':' || p_key, 0));
      if not exists (select 1 from custom.record o
                      where o.organization_id = p_organization_id and o.table_id = p_table_id
                        and o.data_class = 'record' and o.id <> p_self_id
                        and (o.data -> '_derived' -> p_key ->> 'value') = v_have::text) then
        return v_have;
      end if;
    end if;
  end if;
  -- One writer at a time per column, and the count includes archived records, so a number is
  -- never handed out twice — the older grid's `_udt_autonumber` rule. VOLATILE on purpose: each
  -- statement below sees what a writer that held the lock before us committed.
  perform pg_advisory_xact_lock(hashtextextended('custom_autonumber:' || p_table_id::text || ':' || p_key, 0));
  select coalesce(max(nullif(r.data -> '_derived' -> p_key ->> 'value', '')::numeric), 0) + 1 into v_next
    from custom.record r
   where r.organization_id = p_organization_id
     and r.table_id = p_table_id
     and r.data_class = 'record'
     and (r.data -> '_derived' -> p_key ->> 'value') ~ '^[0-9]{1,18}$';
  return v_next;
end
$function$;

CREATE OR REPLACE FUNCTION custom.autonumber_backfill(p_organization_id uuid, p_field_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_field jsonb;
  v_table uuid;
  v_key   text;
  v_id    uuid;
  v_n     integer := 0;
  v_last  numeric;
begin
  perform custom.assert_store_door(p_organization_id, 'custom.autonumber_backfill');
  perform custom.assert_client_may_reach(p_organization_id, 'custom.autonumber_backfill');
  select f.data, (f.data ->> 'entity_definition_id')::uuid into v_field, v_table
    from custom.record f
   where f.organization_id = p_organization_id and f.id = p_field_id
     and f.table_id = custom.field_kernel_id() and f.deleted_at is null;
  if v_field is null or coalesce(v_field -> 'config' ->> 'system', '') <> 'autonumber' then
    raise exception 'That column is not an autonumber column of this organization.'
      using errcode = '23503', hint = 'Declare one with type "autonumber" first. Nothing was changed.';
  end if;
  -- The older door's rung: editor on the Table (public.udt_backfill_autonumber).
  perform custom.assert_client_may_change(p_organization_id, v_table, 'custom.autonumber_backfill',
                                          'editor'::public.permission_level, 'table');
  v_key := v_field ->> 'key';
  -- In the order they were created, each record is saved once through the write path, and the
  -- store's own fx.autonumber gives it the next number — the same rule a new record gets.
  for v_id in
    select r.id from custom.record r
     where r.organization_id = p_organization_id and r.table_id = v_table
       and r.data_class = 'record' and r.deleted_at is null
       and not coalesce((r.data -> '_derived' -> v_key ->> 'value') ~ '^[0-9]{1,18}$', false)
     -- NOTION-AUTO: a record that holds a number from before the column existed goes first, so
     -- nobody else is handed the number it is about to take; then the rest in creation order.
     order by (select min((e ->> 'value')::numeric)
                 from jsonb_array_elements(case when jsonb_typeof(r.data -> '_retired') = 'array' then r.data -> '_retired' else '[]'::jsonb end) e
                where e ->> 'key' = v_key and (e ->> 'value') ~ '^[0-9]{1,18}$') nulls last,
              r.created_at, r.id
  loop
    -- NOTION-AUTO (root cause of "the next new row got 1"): `update ... set updated_at = now()`
    -- changes no column the row trigger watches (its WHEN list is data, table, organization,
    -- metadata, custom_fields, the access list - writeperf / datadefects4), so custom._derived_fields
    -- never ran, no number was stored, and the next row counted from nothing. The save now
    -- touches `data` for real: it names this column's answer (null), which the trigger replaces
    -- with the worked-out number and which UI-FIX-18 keeps from counting as an edit.
    update custom.record
       set data = jsonb_set(data, '{_derived}', coalesce(case when jsonb_typeof(data -> '_derived') = 'object' then data -> '_derived' end, '{}'::jsonb)
                                                 || jsonb_build_object(v_key, 'null'::jsonb))
     where organization_id = p_organization_id and id = v_id;
    v_n := v_n + 1;
  end loop;
  select max(nullif(r.data -> '_derived' -> v_key ->> 'value', '')::numeric) into v_last
    from custom.record r where r.organization_id = p_organization_id and r.table_id = v_table;
  return jsonb_build_object('field_id', p_field_id, 'numbered', v_n, 'highest', v_last,
    'says', format('%s record(s) were numbered in the order they were created; the next new record gets %s.', v_n, coalesce(v_last, 0) + 1));
end
$function$;

CREATE OR REPLACE FUNCTION custom.formula_value(p_organization_id uuid, p_record_id uuid, p_field_data jsonb, p_values jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_values jsonb;
  v_who    uuid;
  v_env    jsonb;
  v_born   timestamptz;
  v_rec    custom.record;
  v_rtype  text;
  v_tf     text;
  v_key    text;
  v_keys   text[];
  v_imp    jsonb;
  v_upd    timestamptz;
  v_val    jsonb;
  v_txt    text;
  v_person jsonb;
begin
  -- LANE 10 P4: WHO MADE IT AND WHO LAST CHANGED IT, the way Created time and Last changed time
  -- are filled: from the record's own stamps (custom.record.created_by / updated_by, which
  -- platform._stamp_actor writes from the writing actor), on read, never typed. The value is
  -- {id, name, actor}: the name is the organization's own (custom.history_people, the namer
  -- comments and history use), null for somebody who is not a member of it.
  -- V8 #4: WHO WROTE IS ALSO WHICH KIND OF WRITER. A system or an agent write leaves
  -- custom.record.updated_by naming the person before it; the write's own tier is on its values'
  -- envelopes (`_values.<key>.actor`: user, agent or system, with `on_behalf_of` for an agent).
  -- Last changed by reads the latest envelope; Created by the envelope stamped when the record was
  -- made. A system write answers {id: null, name: null, actor: "system"}; an agent's answers
  -- actor "agent" with the person it wrote for.
  if (p_field_data -> 'config' ->> 'system') in ('created_by', 'modified_by') then
    select case when (p_field_data -> 'config' ->> 'system') = 'created_by' then r.created_by else r.updated_by end,
           r.created_at,
           (select e.value from jsonb_each(case when jsonb_typeof(r.data -> '_values') = 'object' then r.data -> '_values' else '{}'::jsonb end) e
             where jsonb_typeof(e.value) = 'object' and e.value ? 'actor' and e.value ? 'at'
               -- Created by: a value first written (ver 1), the earliest. Last changed by: the latest
               -- write, and of writes in one moment the one with the most versions behind it.
               and ((p_field_data -> 'config' ->> 'system') = 'modified_by' or coalesce(e.value ->> 'ver', '1') = '1')
             order by case when (p_field_data -> 'config' ->> 'system') = 'created_by' then (e.value ->> 'at')::timestamptz end asc,
                      case when (p_field_data -> 'config' ->> 'system') = 'modified_by' then (e.value ->> 'at')::timestamptz end desc,
                      case when (p_field_data -> 'config' ->> 'system') = 'modified_by' then coalesce((e.value ->> 'ver')::numeric, 1) end desc
             limit 1)
      into v_who, v_born, v_env
      from custom.record r
     where r.organization_id = p_organization_id
       and r.id = p_record_id;
    -- NOTION-AUTO: A COLUMN MADE AUTOMATIC KEEPING ITS VALUES (custom.field_make_automatic) set the
    -- imported person aside in `_retired` under this key. Created by answers it for good (a record
    -- is created once); Last changed by answers it until somebody changes the record, then the real
    -- person. The person is a member's or an unmatched guest's Person record, or plain words.
    select e.value, r.updated_at into v_imp, v_upd
      from custom.record r,
           jsonb_array_elements(case when jsonb_typeof(r.data -> '_retired') = 'array' then r.data -> '_retired' else '[]'::jsonb end) with ordinality e(value, ord)
     where r.organization_id = p_organization_id and r.id = p_record_id
       and e.value ->> 'key' = p_field_data ->> 'key'
       and jsonb_typeof(e.value -> 'value') <> 'null'
     order by e.ord desc
     limit 1;
    if v_imp is not null
       and ((p_field_data -> 'config' ->> 'system') = 'created_by'
            or v_upd <= (v_imp ->> 'at')::timestamptz) then
      v_val := v_imp -> 'value';
      if jsonb_typeof(v_val) = 'array' then
        v_val := v_val -> 0;
      end if;
      if jsonb_typeof(v_val) = 'object' then
        v_val := coalesce(v_val -> 'id', v_val -> 'name', v_val -> 'email');
      end if;
      v_txt := v_val #>> '{}';
      if v_txt is not null and v_txt ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
        select p.data into v_person from custom.record p
         where p.organization_id = p_organization_id and p.id = v_txt::uuid;
        return jsonb_strip_nulls(jsonb_build_object('id', v_txt, 'actor', 'user', 'imported', true,
          'name', coalesce(v_person ->> 'name', v_person ->> 'full_name', v_person ->> 'email'),
          'email', v_person ->> 'email'));
      elsif v_txt is not null and btrim(v_txt) <> '' then
        return jsonb_build_object('id', null, 'actor', 'user', 'imported', true, 'name', v_txt);
      end if;
    end if;
    -- A Created by envelope counts only when it was stamped as the record was made.
    if (p_field_data -> 'config' ->> 'system') = 'created_by' and v_env is not null
       and abs(extract(epoch from ((v_env ->> 'at')::timestamptz - v_born))) > 5 then
      v_env := null;
    end if;
    if v_env ->> 'actor' = 'system' then
      -- V11 #6: A SYSTEM WRITE NAMES WHO SET IT GOING, when the store knows: the envelope's
      -- on_behalf_of, else — for Created by — the record's own creator stamp (platform._stamp_actor
      -- writes the signed-in person there). Last changed by never borrows updated_by for a system
      -- write: that stamp still names whoever wrote before it.
      v_who := coalesce(nullif(v_env ->> 'on_behalf_of', '')::uuid,
                        case when (p_field_data -> 'config' ->> 'system') = 'created_by' then v_who end);
      return jsonb_build_object('id', v_who, 'actor', 'system',
                                'name', case when v_who is not null then custom.history_people(p_organization_id, array[v_who]) -> v_who::text -> 'name' end);
    end if;
    if v_env ->> 'actor' = 'agent' then
      v_who := coalesce(nullif(v_env ->> 'on_behalf_of', '')::uuid, v_who);
      return jsonb_build_object('id', v_who, 'actor', 'agent',
                                'name', case when v_who is not null then custom.history_people(p_organization_id, array[v_who]) -> v_who::text -> 'name' end);
    end if;
    if v_who is null then
      return 'null'::jsonb;
    end if;
    return jsonb_build_object('id', v_who, 'actor', 'user',
                              'name', custom.history_people(p_organization_id, array[v_who]) -> v_who::text -> 'name');
  end if;
  v_values := coalesce(p_values, custom.record_values(p_organization_id, p_record_id));
  -- REC-15's evaluator, not a second one: every Rule node, every refusal and REC-17's
  -- "by id, never by name" still come from custom.rule_eval, which custom.formula_eval hands
  -- them to unchanged. GRID-PRIMITIVES G3 adds the formula language's own `fx.*` nodes, and
  -- the three facts only a formula about ITS OWN record can use (its id, its column, its table:
  -- autonumber and the created / modified stamps). They ride under fx_* keys so no Rule node
  -- that reads the context (stage_count, sibling_count read `table_id`) answers differently.
  --
  -- CHAIR-MATH (a): A WORKED-OUT COLUMN THIS FORMULA READS IS WORKED OUT FIRST. The values a
  -- caller hands in are the stored row, the Rule layer's block and what was stamped at write
  -- time; a roll-up, a lookup or another read-time formula is none of those, so its key is
  -- absent and the evaluator read it as blank (0). Each such key is resolved here through
  -- custom.far_value — the one reader that refuses a circle by sentence instead of recursing —
  -- and only when it is absent, so a caller that already worked it out (custom.derived_values_of
  -- in dependency order) pays nothing more.
  if p_values is not null and p_record_id is not null then
    v_keys := custom.formula_field_keys(p_organization_id, p_field_data -> 'config' -> 'expr');
    if cardinality(v_keys) > 0 then
      select * into v_rec from custom.record
       where organization_id = p_organization_id and id = p_record_id;
      if v_rec.id is not null and v_rec.table_id is not null
         and v_rec.data_class not in ('kernel', 'relation') then
        v_tf := custom.table_type_field(v_rec.organization_id, v_rec.table_id);
        if v_tf is not null then
          v_rtype := v_rec.data ->> v_tf;
        end if;
        for v_key in
          select a.data ->> 'key'
            from custom.applicable_fields(v_rec.organization_id, v_rec.table_id, v_rtype) a
           where (a.data ->> 'key') = any (v_keys)
             and (a.data ->> 'key') is distinct from (p_field_data ->> 'key')
             and custom.parity_type(a.data) in ('lookup', 'rollup', 'formula')
             and coalesce(a.data ->> 'compute_on', '') = 'read'
             and not (v_values ? (a.data ->> 'key'))
        loop
          v_values := v_values || jsonb_build_object(v_key,
                        custom.far_value(p_organization_id, p_record_id, v_key, p_field_data));
        end loop;
      end if;
    end if;
  end if;

  return custom.formula_eval(p_organization_id, p_field_data -> 'config' -> 'expr',
                             v_values,
                             coalesce(custom.rule_context(p_organization_id, p_record_id), '{}'::jsonb)
                             || jsonb_build_object('fx_self_id', p_record_id,
                                                   'fx_field_key', p_field_data ->> 'key',
                                                   'fx_table_id', p_field_data ->> 'entity_definition_id'));
end;
$function$;

create function custom.field_make_automatic(p_organization_id uuid, p_field_id uuid, p_kind text)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog'
as $fn$
declare
  v_field   jsonb;
  v_table   uuid;
  v_key     text;
  v_kind    text := lower(btrim(coalesce(p_kind, '')));
  v_was_gun text := nullif(current_setting('app.relabel_keeps_updated_at', true), '');
  r         record;
  v_ts      timestamptz;
  v_raw     text;
  v_kept    integer := 0;
  v_left    integer := 0;
  v_back    jsonb := '{}'::jsonb;
  v_imported integer := 0;
begin
  perform custom.assert_store_door(p_organization_id, 'custom.field_make_automatic');
  perform custom.assert_client_may_reach(p_organization_id, 'custom.field_make_automatic');
  v_kind := case v_kind when 'created' then 'created_time' when 'last_edited_time' then 'modified_time'
                        when 'last_modified_time' then 'modified_time' when 'modified' then 'modified_time'
                        when 'last_edited_by' then 'modified_by' when 'last_modified_by' then 'modified_by'
                        when 'auto_number' then 'autonumber' when 'unique_id' then 'autonumber' else v_kind end;
  if v_kind not in ('autonumber', 'created_time', 'modified_time', 'created_by', 'modified_by') then
    raise exception '"%" is not a column that fills itself in.', coalesce(p_kind, '')
      using errcode = '23514', hint = 'Say autonumber, created_time, modified_time, created_by or modified_by. Nothing was changed.';
  end if;
  select f.data, (f.data ->> 'entity_definition_id')::uuid into v_field, v_table
    from custom.record f
   where f.organization_id = p_organization_id and f.id = p_field_id
     and f.table_id = custom.field_kernel_id() and f.deleted_at is null;
  if v_field is null then
    raise exception 'That column is not a column of this organization.'
      using errcode = '23503', hint = 'Nothing was changed.';
  end if;
  perform custom.assert_client_may_change(p_organization_id, v_table, 'custom.field_make_automatic',
                                          'editor'::public.permission_level, 'table');
  v_key := v_field ->> 'key';
  if custom.field_kind_of(v_field) = v_kind then
    return jsonb_build_object('field_id', p_field_id, 'kind', v_kind, 'changed', false,
      'says', 'That column already fills itself in that way; nothing was changed.');
  end if;
  if coalesce(v_field -> 'config' ->> 'system', '') <> '' or custom.parity_type(v_field) in ('lookup', 'rollup', 'formula', 'count') then
    raise exception '"%" is already worked out by the store, so it cannot be converted.',
                    coalesce(nullif(v_field ->> 'label', ''), v_key)
      using errcode = '23514', hint = 'Add a new column of that kind instead. Nothing was changed.';
  end if;

  -- Converting a column is not an edit of any record: updated_at stays where it was (and a
  -- Last edited time column takes its value from the old column below).
  perform set_config('app.relabel_keeps_updated_at', 'on', true);

  -- The two stamps live on the record itself: the old column's value moves there, the key leaves
  -- the record. A value that is not a moment stays in the record, and the retype below sets it
  -- aside in `_retired`, neither coerced nor lost.
  if v_kind in ('created_time', 'modified_time') then
    for r in
      select x.id, x.data from custom.record x
       where x.organization_id = p_organization_id and x.table_id = v_table
         and x.data_class = 'record' and x.data ? v_key
    loop
      v_raw := case jsonb_typeof(r.data -> v_key)
                 when 'object' then r.data -> v_key ->> 'start'
                 when 'string' then r.data ->> v_key
                 else null end;
      v_ts := null;
      begin
        v_ts := v_raw::timestamptz;
      exception when others then
        v_ts := null;
      end;
      if v_ts is null then
        v_left := v_left + 1;
        continue;
      end if;
      if v_kind = 'created_time' then
        update custom.record
           set created_at = v_ts,
               data = case when jsonb_typeof(data -> '_values') = 'object'
                           then jsonb_set(data - v_key, '{_values}', (data -> '_values') - v_key) else data - v_key end
         where organization_id = p_organization_id and id = r.id;
      else
        update custom.record
           set updated_at = v_ts,
               data = case when jsonb_typeof(data -> '_values') = 'object'
                           then jsonb_set(data - v_key, '{_values}', (data -> '_values') - v_key) else data - v_key end
         where organization_id = p_organization_id and id = r.id;
      end if;
      v_kept := v_kept + 1;
    end loop;
  end if;

  -- An ID keeps its number: the retype numbers every record in the same write that sets its old
  -- value aside, so the whole-number value is set aside FIRST, where custom._fx_autonumber finds it.
  if v_kind = 'autonumber' then
    update custom.record x
       set data = x.data || jsonb_build_object('_retired',
             (case when jsonb_typeof(x.data -> '_retired') = 'array' then x.data -> '_retired' else '[]'::jsonb end)
             || jsonb_build_object('key', v_key, 'label', v_field ->> 'label', 'value', x.data -> v_key,
                  'reason', 'this was the number the record already had when its column became an automatic ID', 'at', to_jsonb(now())))
     where x.organization_id = p_organization_id and x.table_id = v_table and x.data_class = 'record'
       and jsonb_typeof(x.data -> v_key) in ('number', 'string')
       and (x.data ->> v_key) ~ '^[0-9]{1,18}$';
  end if;

  -- The column itself: the same door a person's retype uses, so every guard it passes, this passes.
  perform custom.field_update(p_organization_id, p_field_id, jsonb_build_object('type', v_kind));

  if v_kind = 'autonumber' then
    -- Each record takes the whole number its old column held; the rest are numbered after them.
    v_back := custom.autonumber_backfill(p_organization_id, p_field_id);
    select count(*) into v_imported
      from custom.record x
     where x.organization_id = p_organization_id and x.table_id = v_table and x.data_class = 'record'
       and exists (select 1 from jsonb_array_elements(case when jsonb_typeof(x.data -> '_retired') = 'array' then x.data -> '_retired' else '[]'::jsonb end) e
                    where e ->> 'key' = v_key and (e ->> 'value') = (x.data -> '_derived' -> v_key ->> 'value'));
    v_kept := v_imported;
  elsif v_kind in ('created_by', 'modified_by') then
    select count(*) into v_kept
      from custom.record x
     where x.organization_id = p_organization_id and x.table_id = v_table and x.data_class = 'record'
       and exists (select 1 from jsonb_array_elements(case when jsonb_typeof(x.data -> '_retired') = 'array' then x.data -> '_retired' else '[]'::jsonb end) e
                    where e ->> 'key' = v_key);
  end if;

  perform set_config('app.relabel_keeps_updated_at', coalesce(v_was_gun, ''), true);
  return jsonb_build_object('field_id', p_field_id, 'kind', v_kind, 'changed', true, 'kept', v_kept,
    'left_as_they_were', v_left, 'highest', v_back -> 'highest',
    'says', format('%s record(s) kept the value the old column held; the column now fills itself in%s.', v_kept,
      case v_kind when 'autonumber' then format(', and the next new record gets %s', coalesce((v_back ->> 'highest')::numeric, 0) + 1)
                  when 'created_time' then ' and stays as it was written'
                  when 'modified_time' then ' and moves when a record is edited'
                  else ' and names the real person from now on' end));
end
$fn$;

comment on function custom.field_make_automatic(uuid, uuid, text) is
  'NOTION-AUTO: turn a plain column into autonumber / created_time / modified_time / created_by / modified_by IN PLACE, keeping each record''s value (an ID kept as its number, a time moved onto the record''s own created / updated stamp, a person kept for Created by / Last changed by until a real user writes). Editor on the Table. Notion''s Created time, Last edited time, Created by, Last edited by and unique ID columns.';

insert into platform.client_callable_door
  (schema_name, function_name, identity_args, identity_argtypes, reason, declared_by,
   non_client_lane, signed_in_callers, anonymous_callers, argument_rules)
values ('custom', 'field_make_automatic',
        'p_organization_id uuid, p_field_id uuid, p_kind text',
        array['uuid'::regtype, 'uuid'::regtype, 'text'::regtype]::oid[],
        'p_organization_id is checked by custom.assert_store_door and custom.assert_client_may_reach first; p_field_id is read only inside this organization and only as a plain Field, and its Table is then asked custom.assert_client_may_change at editor before any record is touched; p_kind is matched against five fixed words and anything else is refused. It changes only that Table''s records and that one Field, through custom.field_update and the ordinary row write path.',
        'notionauto_a_a_plain_column_becomes_automatic_keeping_its_values.sql', null, true, false,
        jsonb_build_object('version', 1,
          'declared_by', 'notionauto_a_a_plain_column_becomes_automatic_keeping_its_values.sql',
          'declared_at', '2026-10-14 lane NOTION-AUTO',
          'arguments', jsonb_build_object(
            'p_organization_id', jsonb_build_object('type', 'uuid', 'position', 1, 'entity', 'organization',
              'check', 'this body decides it with custom.assert_store_door(arg1), custom.assert_client_may_reach(arg1) — the organization wall — a non-member is refused before anything is read, and that call stands before every other use of this argument in the body.',
              'foreign', jsonb_build_object('sqlstate', '42501', 'same_as_invented', true),
              'verified', '2026-10-14 lane NOTION-AUTO — written with this body'),
            'p_field_id', jsonb_build_object('type', 'uuid', 'position', 2, 'entity', 'custom_record',
              'check', 'read only where organization_id = arg1 as a Field of the field kernel; its Table is then asked custom.assert_client_may_change at editor; outside that it raises the same 23503 an invented id does.',
              'foreign', jsonb_build_object('sqlstate', '23503', 'same_as_invented', true),
              'verified', '2026-10-14 lane NOTION-AUTO — written with this body'),
            'p_kind', jsonb_build_object('type', 'text', 'position', 3, 'entity', 'none',
              'check', 'folded to lower case and matched against autonumber, created_time, modified_time, created_by, modified_by (and their Notion names); any other word raises 23514 before anything is read or changed.',
              'foreign', jsonb_build_object('sqlstate', '23514', 'same_as_invented', true),
              'verified', '2026-10-14 lane NOTION-AUTO — written with this body'))))
on conflict do nothing;
