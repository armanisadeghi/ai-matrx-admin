-- chair-step: lane CLOSE-FORMULA (CD-FORMULA-08, VISION Rule 8 "Rules have versions … and History knows which one produced a Value"). ADDS the read door custom.formula_history(uuid, uuid, text, integer) and its helper custom._formula_value_then(uuid, uuid, jsonb, jsonb). Nothing is replaced, dropped or revoked; no row of any feature is written. Inverse: migrations/inverse/20261021190000_closeformula_a_a_formula_value_knows_which_formula_made_it_down.sql.
-- GRANT NAMED: EXECUTE on custom.formula_history(uuid, uuid, text, integer) to authenticated (declared in platform.client_callable_door in this file before the grant; it reads one record the caller may open and that record's one column, and writes nothing).
-- lane: close-formula
-- lock: custom
--
-- Before: a formula, rollup or lookup column keeps no value of its own, so custom.field_history answered NOTHING for it, and
-- nothing anywhere said which version of a formula produced a value. Now one record's worked-out column has a history:
-- every moment its answer changed (the record was written, or the formula was changed), the answer then, and the formula
-- version that produced it. Test: scripts/campaign-tests/closeformula_formula_history_green.sql (RED before: the door is absent).

set lock_timeout = '3s';
set statement_timeout = '60s';

CREATE OR REPLACE FUNCTION custom.formula_history(p_organization_id uuid, p_record_id uuid, p_field_key text, p_limit integer DEFAULT 100)
 RETURNS TABLE(occurred_at timestamp with time zone, cause text, record_version integer, formula_version integer,
               formula_text text, value jsonb, refused text, actor jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_table  uuid;
  v_field  uuid;
  v_fdata  jsonb;
  v_mask   jsonb;
  v_people jsonb;
  v_name   text;
begin
  -- CD-FORMULA-08 (VISION Rule 8: "Rules have versions … and History knows which one produced a Value"), lane CLOSE-FORMULA.
  -- A formula, rollup or lookup column keeps no value of its own, so custom.field_history answered nothing for it. This
  -- door answers ONE record's worked-out column over time: every moment its answer could have changed — the record was
  -- written, or the formula itself was changed — with the answer at that moment, worked out by custom.formula_value from
  -- the record's values AS THEY WERE and the formula AS IT WAS, and which version of the formula produced it. A formula's
  -- version counts changes to what it works out (its config, its words aside), never a rename of the column.
  perform custom.assert_client_may_reach(p_organization_id, 'custom.formula_history');
  perform custom.assert_client_may_open(p_organization_id, p_record_id, 'custom.formula_history',
                                        'viewer'::public.permission_level, 'record');

  select r.table_id into v_table
    from custom.record r
   where r.organization_id = p_organization_id and r.id = p_record_id;

  select f.id, f.data into v_field, v_fdata
    from custom.record f
   where f.organization_id = p_organization_id
     and f.table_id = custom.field_kernel_id()
     and f.deleted_at is null
     and (f.data ->> 'entity_definition_id')::uuid = v_table
     and f.data ->> 'key' = p_field_key;
  if v_field is null then
    raise exception 'This table has no column called "%", so there is no history of it.', p_field_key
      using errcode = '22023',
            hint = 'Check the column''s name on the table''s own settings panel. Nothing was read.';
  end if;
  v_name := custom.said(v_fdata ->> 'label', p_field_key);
  if coalesce(v_fdata ->> 'type', '') <> 'formula' then
    raise exception '"%" holds what was typed into it, so its history is the column''s own history.', v_name
      using errcode = '22023',
            hint = 'custom.field_history answers a column people type into. Nothing was read.';
  end if;

  v_mask := custom.read_mask(p_organization_id, p_record_id, 'read');
  if custom.mask_says_withheld(v_mask, p_field_key) then
    raise exception '"%" is withheld from you, so its history is too.', v_name
      using errcode = '42501', hint = 'Ask someone who may see the column. Nothing was read.';
  end if;

  select custom.history_people(
           p_organization_id,
           array(select distinct h.actor_id
                   from history.row_versions h
                  where h.entity_type = 'custom.record'
                    and h.organization_id = p_organization_id
                    and h.row_id in (p_record_id, v_field)
                    and h.actor_id is not null))
    into v_people;

  return query
  with fv as (
    -- The column's own versions; a new FORMULA version only when what it works out changed.
    select h.id, h.occurred_at, h.actor_id, h.actor_tier, h.operation_name, h.row_data -> 'data' as fdata,
           coalesce(h.row_data -> 'data' -> 'config', '{}'::jsonb) - 'formula_text' as rule,
           lag(coalesce(h.row_data -> 'data' -> 'config', '{}'::jsonb) - 'formula_text') over (order by h.id) as prev_rule
      from history.row_versions h
     where h.entity_type = 'custom.record' and h.organization_id = p_organization_id and h.row_id = v_field
       and h.operation <> 'SOFT_DELETE'
  ), fchg as (
    select fv.*, (row_number() over (order by fv.id))::integer as n
      from fv where fv.prev_rule is distinct from fv.rule
  ), rv as (
    select h.id, h.version, h.occurred_at, h.operation, h.operation_name, h.actor_id, h.actor_tier,
           h.row_data -> 'data' as data
      from history.row_versions h
     where h.entity_type = 'custom.record' and h.organization_id = p_organization_id and h.row_id = p_record_id
  ), ev as (
    select rv.id, 'record'::text as kind from rv
    union all
    select fchg.id, 'formula'::text from fchg where fchg.id > (select min(rv.id) from rv)
  ), at_each as (
    select ev.id, ev.kind, r.version as rver, r.data, r.operation, f.n, f.fdata,
           case when ev.kind = 'formula' then f.occurred_at else r.occurred_at end as at,
           case when ev.kind = 'formula' then f.actor_id else r.actor_id end as actor_id,
           case when ev.kind = 'formula' then f.actor_tier else r.actor_tier end as actor_tier,
           case when ev.kind = 'formula' then coalesce(f.fdata, '{}'::jsonb) else coalesce(r.data, '{}'::jsonb) end
             || jsonb_build_object('_operation', case when ev.kind = 'formula' then f.operation_name else r.operation_name end) as stamp
      from ev
      cross join lateral (select * from rv where rv.id <= ev.id order by rv.id desc limit 1) r
      cross join lateral (select * from fchg where fchg.id <= ev.id order by fchg.id desc limit 1) f
  ), worked as (
    select a.*, w.answer, w.refusal
      from at_each a
      cross join lateral custom._formula_value_then(p_organization_id, p_record_id, a.fdata, a.data) w
  ), changed as (
    select w.*, lag(w.answer) over (order by w.id) as prev_answer, lag(w.n) over (order by w.id) as prev_n,
           lag(w.refusal) over (order by w.id) as prev_refusal, row_number() over (order by w.id) as k
      from worked w
  )
  select c.at,
         case when c.kind = 'formula' then 'formula changed'
              when c.operation = 'INSERT' then 'record created'
              else 'record edited' end,
         c.rver,
         c.n,
         coalesce(c.fdata -> 'config' ->> 'formula_text', ''),
         c.answer,
         c.refusal,
         custom.history_actor(c.actor_tier, c.stamp, c.actor_id, v_people)
    from changed c
   where c.k = 1 or c.answer is distinct from c.prev_answer or c.n is distinct from c.prev_n
      or c.refusal is distinct from c.prev_refusal
   order by c.id desc
   limit custom.page_size(p_organization_id, 'custom.formula_history', p_limit, 100, 500);
end;
$function$;

CREATE OR REPLACE FUNCTION custom._formula_value_then(p_organization_id uuid, p_record_id uuid, p_field_data jsonb, p_values jsonb)
 RETURNS TABLE(answer jsonb, refusal text)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
begin
  -- One moment of custom.formula_history: the formula as it was over the values as they were. A formula that could not
  -- be worked out then says why (its own sentence), never an empty answer.
  begin
    answer := custom.formula_value(p_organization_id, p_record_id, p_field_data, coalesce(p_values, '{}'::jsonb));
    refusal := null;
  exception when others then
    answer := null;
    refusal := sqlerrm;
  end;
  return next;
end;
$function$;

INSERT INTO platform.client_callable_door
  (schema_name, function_name, identity_args, identity_argtypes, declared_by, reason, gate_predicate, anonymous_callers, signed_in_callers, argument_rules)
SELECT 'custom', 'formula_history', 'p_organization_id uuid, p_record_id uuid, p_field_key text, p_limit integer', ARRAY['uuid'::regtype, 'uuid'::regtype, 'text'::regtype, 'integer'::regtype]::oid[],
  '20261021190000_closeformula_a_a_formula_value_knows_which_formula_made_it.sql',
  'p_organization_id is checked through custom.assert_client_may_reach; p_record_id must be a record the caller may open at viewer (custom.assert_client_may_open); a column withheld from the caller by custom.read_mask is refused by name. Reads only that record''s and that column''s own versions and writes nothing.',
  null, false, true,
  '{"version": 1, "arguments": {"p_organization_id": {"type": "uuid", "position": 1, "optional": false, "foreign": {"bounded": true, "note": "custom.assert_client_may_reach gates the organization."}}, "p_record_id": {"type": "uuid", "position": 2, "optional": false, "foreign": {"bounded": true, "note": "custom.assert_client_may_open gates the record at viewer."}}, "p_field_key": {"type": "text", "position": 3, "optional": false}, "p_limit": {"type": "integer", "position": 4, "optional": true}}}'::jsonb
 WHERE NOT EXISTS (SELECT 1 FROM platform.client_callable_door d WHERE d.schema_name = 'custom' AND d.function_name = 'formula_history');

GRANT EXECUTE ON FUNCTION custom.formula_history(uuid, uuid, text, integer) TO authenticated;
