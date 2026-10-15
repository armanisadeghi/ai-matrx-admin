-- chair-step: the inverse of notionauto_a_a_plain_column_becomes_automatic_keeping_its_values.sql. It restores the three
-- function bodies that file replaced (custom._fx_autonumber, custom.autonumber_backfill, custom.formula_value)
-- exactly as they were live before it, drops custom.field_make_automatic and deletes its
-- platform.client_callable_door row. WHAT IT DOES NOT UNDO: columns already converted stay converted and the
-- numbers and moments they kept stay on their records.


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
$function$

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
     order by r.created_at, r.id
  loop
    update custom.record set updated_at = now()
     where organization_id = p_organization_id and id = v_id;
    v_n := v_n + 1;
  end loop;
  select max(nullif(r.data -> '_derived' -> v_key ->> 'value', '')::numeric) into v_last
    from custom.record r where r.organization_id = p_organization_id and r.table_id = v_table;
  return jsonb_build_object('field_id', p_field_id, 'numbered', v_n, 'highest', v_last,
    'says', format('%s record(s) were numbered in the order they were created; the next new record gets %s.', v_n, coalesce(v_last, 0) + 1));
end
$function$

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
$function$

drop function if exists custom.field_make_automatic(uuid, uuid, text);

delete from platform.client_callable_door
 where schema_name = 'custom'
   and declared_by = 'notionauto_a_a_plain_column_becomes_automatic_keeping_its_values.sql';
