-- inverse of 20261018030000_w1store_c_a_bad_match_condition_writes_one_failed_run.sql
-- lane: W1-STORE
-- lock: custom
CREATE OR REPLACE FUNCTION custom._automation_fire()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  c_depth_max constant integer := 3;
  r         record;
  v_doc     jsonb;
  v_a       jsonb;
  v_spec    jsonb;
  v_trig    jsonb;
  v_on      text;
  v_kind    text;
  v_via     text;
  v_depth   integer := coalesce(nullif(current_setting('custom.automation_depth', true), '')::integer, 0);
  v_match   boolean;
  v_values  jsonb;
  v_byid    jsonb;
  v_ctx     jsonb;
  v_fields  jsonb;
  v_tfields jsonb;
  v_act     jsonb;
  v_n       integer;
  v_steps   jsonb;
  v_status  text;
  v_says    text;
  v_stepsay text;
  v_started timestamptz;
  v_me      uuid := custom.query_principal();
  v_cond_err text;
  v_patch   jsonb;
  k         text;
  v         jsonb;
  v_field   jsonb;
  v_rid     uuid;
  v_cand    uuid;
  v_cnt     integer;
  v_scan    integer;
  v_to      uuid;
  v_text    text;
  v_msg     text;
  v_hint    text;
  v_body    text;
  v_res     jsonb;
  v_run     uuid;
  -- AUTOMATIONS-AIRTABLE (2026-10-10)
  v_rule    jsonb;
  v_before  jsonb;
  v_now_ok  boolean;
begin
  for r in select o.* from new_rows o
            where o.event_key = 'records.changed' and o.table_id is not null
              and o.operation in ('created', 'updated') and o.deleted_at is null loop
    select t.data -> 'automations' into v_doc from custom.record t
     where t.organization_id = r.organization_id and t.id = r.table_id and t.data_class = 'table';
    continue when v_doc is null or jsonb_typeof(v_doc) <> 'array';

    -- NO AUTOMATION MAY REFUSE A PERSON'S WRITE: anything unforeseen below is a warning, and only this change's
    -- automations are rolled back with it. (Only a Table that HAS automations pays for the sub-transaction.)
    begin
    v_kind := r.metadata -> 'change' ->> 'kind';
    v_via  := r.metadata -> 'change' ->> 'via';
    v_values := null;

    for v_a in select e from jsonb_array_elements(v_doc) e loop
      continue when (v_a ->> 'archived_at') is not null or not coalesce((v_a ->> 'enabled')::boolean, false);
      v_spec := v_a -> 'spec';
      v_trig := v_spec -> 'trigger';
      v_on := v_trig ->> 'on';
      v_match := case
        when v_on = 'row_added' then r.operation = 'created' and coalesce(v_kind, 'create') = 'create'
        when v_on = 'form_answered' then r.operation = 'created' and coalesce(v_kind, 'create') = 'create' and v_via = 'form'
        when v_on = 'property_edited' then r.operation = 'updated' and r.changed_field_ids ? (v_trig ->> 'field')
        -- AUTOMATIONS-AIRTABLE: any of the watched properties edited (none named = any property).
        when v_on = 'record_updated' then r.operation = 'updated'
             and (jsonb_array_length(coalesce(v_trig -> 'fields', '[]'::jsonb)) = 0
                  or coalesce(r.changed_field_ids, '[]'::jsonb) ?| array(select jsonb_array_elements_text(v_trig -> 'fields')))
        -- AUTOMATIONS-AIRTABLE: worked out below, once the row's values are read.
        when v_on = 'record_matches' then (r.operation = 'created' and coalesce(v_kind, 'create') = 'create')
             or r.operation = 'updated'
        else false end;
      continue when not v_match;

      if v_values is null then
        v_values := custom.record_values(r.organization_id, r.record_id);
        v_ctx := coalesce(custom.rule_context(r.organization_id, r.record_id), '{}'::jsonb)
                 || jsonb_build_object('fx_self_id', r.record_id, 'fx_table_id', r.table_id);
        -- record_values is keyed by the Field's KEY; a spec names Fields by ID (REC-17), so read it both ways.
        if v_values is not null then
          v_fields := custom._automation_fields(r.organization_id, r.table_id);
          select coalesce(jsonb_object_agg(f.key, coalesce(v_values -> (f.value ->> 'key'), 'null'::jsonb)), '{}'::jsonb)
            into v_byid from jsonb_each(v_fields) f;
        end if;
      end if;
      continue when v_values is null;

      if v_on = 'property_edited' and v_trig ? 'to'
         and lower(btrim(coalesce((v_byid -> (v_trig ->> 'field')) #>> '{}', '')))
             is distinct from lower(btrim(coalesce((v_trig -> 'to') #>> '{}', ''))) then
        continue;
      end if;
      -- AUTOMATIONS-AIRTABLE: "when a record matches conditions" / "enters a view" fires when the row COMES TO match:
      -- added matching, or edited from not matching to matching (the values before the edit are this change's own
      -- `before`s). Staying matching never fires again; leaving and coming back does.
      if v_on = 'record_matches' then
        -- round 2: A WATCHED VIEW THAT WAS REMOVED IS NEVER SILENT. The automation writes ONE failed run saying so
        -- and is switched off with that reason (so it does not fail again on every edit); the panel shows both.
        if v_trig ? 'view_id' and not exists (select 1 from platform.saved_view sv
              where sv.id = (v_trig ->> 'view_id')::uuid and sv.organization_id = r.organization_id
                and sv.deleted_at is null and sv.surface_key = 'custom/records'
                and sv.definition ->> 'table_id' = r.table_id::text) then
          insert into custom.record (organization_id, table_id, data_class, data)
          values (r.organization_id, null, 'automation_run', jsonb_build_object(
                    'automation_id', v_a ->> 'id', 'automation', v_spec ->> 'name', 'table_id', r.table_id,
                    'record_id', r.record_id, 'change_id', r.id, 'status', 'failed',
                    'says', 'The view this automation watches was removed, so it was switched off. Pick another view.',
                    'trigger', jsonb_build_object('on', v_on, 'operation', r.operation, 'via', v_via,
                                                  'changed_field_ids', r.changed_field_ids),
                    'steps', '[]'::jsonb, 'ran_by', v_me, 'started_at', clock_timestamp(), 'finished_at', clock_timestamp()));
          update custom.record t
             set data = jsonb_set(t.data, '{automations}', (
                   select jsonb_agg(case when x ->> 'id' = v_a ->> 'id'
                                         then x || jsonb_build_object('enabled', false, 'updated_at', now(),
                                                   'disabled_reason', 'The view it watches was removed.')
                                         else x end order by n)
                     from jsonb_array_elements(t.data -> 'automations') with ordinality as e(x, n)))
           where t.organization_id = r.organization_id and t.id = r.table_id and t.table_id = custom.table_kernel_id();
          continue;
        end if;
        begin
          v_rule := case when v_trig ? 'view_id'
                         then custom._automation_view_rule(r.organization_id, r.table_id, (v_trig ->> 'view_id')::uuid)
                         else v_spec -> 'condition' end;
          v_now_ok := v_rule is null or coalesce(custom._fx_truthy(custom.rule_eval(r.organization_id,
                        custom._automation_bind(v_rule, v_byid), v_values, v_ctx)), false);
          if v_now_ok and r.operation = 'updated' then
            v_before := v_values || coalesce((select jsonb_object_agg(f.key, coalesce(f.value -> 'before', 'null'::jsonb))
                          from jsonb_each(case when jsonb_typeof(r.metadata -> 'change' -> 'fields') = 'object'
                                               then r.metadata -> 'change' -> 'fields' else '{}'::jsonb end) f), '{}'::jsonb);
            v_now_ok := not (v_rule is null or coalesce(custom._fx_truthy(custom.rule_eval(r.organization_id,
                          custom._automation_bind(v_rule, v_byid), v_before, v_ctx)), false));
          end if;
        exception when others then
          -- DEFECTS 4 follow-up: A CONDITION THAT CANNOT BE WORKED OUT IS NEVER SILENT. The edit that fired it still
          -- saves; the automation writes one failed run naming why, so its panel shows it.
          v_now_ok := false;
          v_cond_err := sqlerrm;
          begin
            insert into custom.record (organization_id, table_id, data_class, data)
            values (r.organization_id, null, 'automation_run', jsonb_build_object(
                      'automation_id', v_a ->> 'id', 'automation', v_spec ->> 'name', 'table_id', r.table_id,
                      'record_id', r.record_id, 'change_id', r.id, 'status', 'failed',
                      'says', format('The condition could not be worked out, so this did not run: %s', v_cond_err),
                      'trigger', jsonb_build_object('on', v_on, 'operation', r.operation, 'via', v_via,
                                                    'changed_field_ids', r.changed_field_ids),
                      'steps', '[]'::jsonb, 'ran_by', v_me, 'started_at', clock_timestamp(), 'finished_at', clock_timestamp()));
          exception when others then
            begin
              perform ops.record_system_error(jsonb_build_object(
                'kind', 'automation_condition_unreadable', 'error_type', 'automation_condition',
                'error_text', format('Automation %s: its condition could not be worked out (%s) and the failed run could not be written: %s',
                                     v_a ->> 'id', v_cond_err, sqlerrm),
                'source_app', 'database', 'source_feature', 'custom.automations', 'route', 'custom._automation_fire',
                'occurred_in_organization_id', r.organization_id,
                'context', jsonb_build_object('automation_id', v_a ->> 'id', 'record_id', r.record_id, 'table_id', r.table_id)));
            exception when others then
              raise warning 'custom._automation_fire: automation % condition unreadable (%), not recorded: %', v_a ->> 'id', v_cond_err, sqlerrm;
            end;
          end;
        end;
        continue when not v_now_ok;
      end if;
      if v_spec -> 'condition' is not null and jsonb_typeof(v_spec -> 'condition') = 'object' then
        begin
          continue when not custom._fx_truthy(custom.rule_eval(r.organization_id,
                           custom._automation_bind(v_spec -> 'condition', v_byid), v_values, v_ctx));
        exception when others then
          null;  -- a condition that cannot be worked out is a failed run, written below
        end;
      end if;

      -- NOTION-PROPS-2: one automation's run is custom._automation_run, shared with a button press.
      v_run := custom._automation_run(r.organization_id, r.table_id, r.record_id, v_a, v_byid, v_fields, r.id,
                 jsonb_build_object('on', v_on, 'operation', r.operation, 'via', v_via,
                                    'changed_field_ids', r.changed_field_ids));
    end loop;
    exception when others then
      perform set_config('custom.automation_depth', v_depth::text, true);
      raise warning 'custom._automation_fire: % (%): %', r.table_id, sqlstate, sqlerrm;
    end;
  end loop;
  return null;
end
$function$;
