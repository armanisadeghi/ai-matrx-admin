-- INVERSE of migrations/campaign/20261021170000_closeagent_a_a_table_can_be_closed_to_agents.sql (lane CLOSE-AGENT):
-- the setting door and its registration gone, and custom._agent_change_gate back to its body before (no per-table switch).
-- chair-step: drops a function.
-- lock: custom
set lock_timeout = '3s';
set statement_timeout = '60s';
delete from platform.client_callable_door where schema_name = 'custom' and function_name = 'table_agent_writable_set';
drop function if exists custom.table_agent_writable_set(uuid, uuid, boolean);
CREATE OR REPLACE FUNCTION custom._agent_change_gate(p_organization_id uuid, p_table_id uuid, p_door text, p_record_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_table  uuid := p_table_id;
  v_row    record;
  v_stack  text;
  v_frames integer;
  v_said   jsonb;
begin
  if platform.declared_actor_tier() is distinct from 'agent' then
    return;
  end if;

  -- The door the caller called is frame 2 (this check is frame 1). A third frame that is a function of the
  -- database's own schemas means the door was reached from inside another door, which is judged at its own
  -- top. A caller's anonymous block or session-temporary helper is not a door and does not count.
  get diagnostics v_stack = pg_context;
  select count(*) into v_frames
    from regexp_split_to_table(coalesce(v_stack, ''), E'\n') l
   where l ~ '^(PL/pgSQL|SQL) function [a-z_][a-z0-9_]*\.'
     and l !~ '^(PL/pgSQL|SQL) function pg_temp';
  if v_frames > 2 then
    return;
  end if;

  -- WHAT IS BEING CHANGED, AS A TABLE. A record is changed on its table; a column on the table it belongs
  -- to; a table's own definition on itself.
  if p_record_id is not null then
    select r.data_class, r.table_id, r.data ->> 'entity_definition_id' as field_table
      into v_row
      from custom.record r
     where r.organization_id = p_organization_id and r.id = p_record_id;
    if not found then
      return;   -- the door says "no such record" in its own words
    end if;
    v_table := case v_row.data_class
                 when 'record' then v_row.table_id
                 when 'field'  then nullif(v_row.field_table, '')::uuid
                 when 'table'  then p_record_id
                 else null end;
    if v_table is null then
      return;   -- an approval, a rule, a view …: not a change to a business table
    end if;
  end if;

  if v_table is not null then
    -- The store's own definition tables (Table, Field, Organization/Home, Person, File, Rule …) are
    -- kernels, kept by the platform in its own organization: an agent making a Home for the table it
    -- was allowed to make is building, not changing somebody's data. Their shape checks guard them.
    if exists (select 1 from custom.record k where k.id = v_table and k.data_class = 'kernel') then
      return;
    end if;
    if exists (select 1 from custom.record t
                where t.organization_id = p_organization_id and t.id = v_table
                  and (t.created_at = now() or nullif(t.data ->> 'kept_for', '') is not null)) then
      return;
    end if;
  end if;

  v_said := custom.agent_change_approval(p_organization_id, custom.declared_conversation(), v_table);
  if coalesce((v_said ->> 'approval_required')::boolean, true) then
    raise exception '%', coalesce(nullif(v_said ->> 'why', ''), 'This organization asks a person before an agent makes this change.')
      using errcode = '42501',
            hint = coalesce(v_said ->> 'how_to_change', '') ||
                   ' Nothing was changed. An agent asks for this change instead (it waits in the approval queue for a person).',
            detail = jsonb_build_object('door', p_door, 'reason', v_said ->> 'reason',
                                        'setting', v_said ->> 'setting', 'table_id', v_table)::text;
  end if;
end
$function$;
