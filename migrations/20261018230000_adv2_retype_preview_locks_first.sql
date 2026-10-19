-- lane: ADV-2-D
-- lock: custom
-- based-on: custom.field_retype_preview(uuid, uuid, jsonb) 8c8d64760c2e1a977bd39f8ce2870ab171efa2f89f5b66dceaa59328e2c2c8f7
--
-- ADV-2 D1/D2/D3 (2026-10-18). custom.field_retype_preview (a) locks the column's rows up front, in id order,
-- with NOWAIT, so a concurrent real save never deadlocks against the preview (and deadlock_detected answers
-- "busy" too); (b) is not run when the column stores more than 2 MB (answers limited / why "large"); (c) no
-- longer saves/restores a statement_timeout it never set. The change itself is unchanged.
-- Inverse: migrations/inverse/20261018230000_adv2_retype_preview_locks_first_down.sql
set local lock_timeout = '3s';
set local statement_timeout = '120s';

CREATE OR REPLACE FUNCTION custom.field_retype_preview(p_organization_id uuid, p_field_id uuid, p_patch jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
-- F2 D11 (2026-10-17): WHAT A CHANGE OF KIND WILL DO, ANSWERED BY THE CHANGE ITSELF. The panel used to
-- count with a client-side mirror of the conversion, judged by the behaviour word alone — so Choice,
-- Email, Phone, Link, Money, Percentage and Date (all "a text" or "a number" to the mirror) were
-- promised as converting while the store kept them aside. This runs the very same custom.field_update
-- (its checks, its trigger, its choice-making) inside a subtransaction, counts what it did, and
-- rolls every row of it back. The preview cannot disagree with the change because it IS the change.
declare
  v_key     text;
  v_table   uuid;
  v_before  integer;
  v_out     jsonb;
  v_opts    uuid;
  v_cap     constant integer := 100;    -- a column holding more values than this is not run: nothing is locked
  v_lock0   text;
  v_bytes   bigint;
  v_bytecap constant bigint := 2000000;  -- a column storing more than ~2 MB is not run: the preview rewrites each value twice
begin
  perform custom.assert_client_may_reach(p_organization_id, 'custom.field_retype_preview');
  select f.data ->> 'key', nullif(f.data ->> 'entity_definition_id', '')::uuid into v_key, v_table
    from custom.record f
   where f.organization_id = p_organization_id and f.id = p_field_id
     and f.table_id = custom.field_kernel_id() and f.deleted_at is null;
  if v_key is null or v_table is null then
    raise exception 'There is no such column here.' using errcode = '02000';
  end if;
  select count(*), coalesce(sum(pg_column_size(x.data -> v_key)), 0) into v_before, v_bytes from custom.record x
   where x.organization_id = p_organization_id and x.table_id = v_table and x.deleted_at is null
     and x.data ? v_key and jsonb_typeof(x.data -> v_key) <> 'null';
  -- ADV-1 F8 (2026-10-18): THE PREVIEW CAN NEVER HOLD A BIG TABLE. It used to run the real change on every
  -- record, holding row locks on the whole table until the rollback, and the panel asked on every pick.
  -- A column holding more than v_cap values is not run at all (the answer says "limited" and gives the
  -- count held), and a smaller one runs under a short lock cap, so a busy table
  -- answers "limited" too instead of making other editors wait. The change itself is unchanged.
  if v_before > v_cap or v_bytes > v_bytecap then
    return jsonb_build_object('held_before', v_before, 'converts', null, 'kept_aside', null,
                              'examples', '[]'::jsonb, 'choices_added', 0, 'limited', true, 'why', 'large');
  end if;
  v_lock0 := current_setting('lock_timeout');
  perform set_config('lock_timeout', '1s', true);
  begin
    -- ADV-2 D1: take every row the change will touch FIRST, in id order, without waiting. A real save or
    -- bulk edit holding any of them answers "busy" at once; once all are ours the change takes no new
    -- row lock, so it cannot deadlock a concurrent writer that locks the same rows in another order.
    perform 1 from custom.record x
     where x.organization_id = p_organization_id and x.table_id = v_table and x.deleted_at is null
       and x.data ? v_key and jsonb_typeof(x.data -> v_key) <> 'null'
     order by x.id for update nowait;
    perform custom.field_update(p_organization_id, p_field_id, p_patch);
    select nullif(f.data -> 'config' ->> 'options_table_id', '')::uuid into v_opts
      from custom.record f where f.organization_id = p_organization_id and f.id = p_field_id;
    with kept as (
      select e.value as v
        from custom.record x
        cross join lateral jsonb_array_elements(case when jsonb_typeof(x.data -> '_retired') = 'array'
                                                     then x.data -> '_retired' else '[]'::jsonb end) e
       where x.organization_id = p_organization_id and x.table_id = v_table and x.deleted_at is null
         and e.value ->> 'key' = v_key
         and not (e.value ? 'was_an_alternate_ranked')
         and e.value ->> 'at' = (to_jsonb(now()) #>> '{}'))
    select jsonb_build_object(
      'held_before', v_before,
      'converts', (select count(*) from custom.record x
                    where x.organization_id = p_organization_id and x.table_id = v_table and x.deleted_at is null
                      and x.data ? v_key and jsonb_typeof(x.data -> v_key) <> 'null'),
      'kept_aside', (select count(*) from kept),
      'examples', coalesce((select jsonb_agg(d.w) from (select distinct left(k.v -> 'value' #>> '{}', 80) as w from kept k limit 5) d), '[]'::jsonb),
      'choices_added', case when v_opts is null then 0 else
                         (select count(*) from custom.record o
                           where o.organization_id = p_organization_id and o.table_id = v_opts
                             and o.deleted_at is null and o.created_at >= now()) end)
      into v_out;
    raise exception using errcode = 'MXPV1', message = 'the preview is rolled back';
  exception
    when sqlstate 'MXPV1' then
      null;                                 -- every row the change wrote is gone; v_out is what it did
    when lock_not_available or deadlock_detected then
      v_out := jsonb_build_object('held_before', v_before, 'converts', null, 'kept_aside', null,
                                  'examples', '[]'::jsonb, 'choices_added', 0, 'limited', true, 'why', 'busy');
    when query_canceled then
      v_out := jsonb_build_object('held_before', v_before, 'converts', null, 'kept_aside', null,
                                  'examples', '[]'::jsonb, 'choices_added', 0, 'limited', true, 'why', 'slow');
  end;
  perform set_config('lock_timeout', v_lock0, true);
  return v_out;
end;
$function$;

