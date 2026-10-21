-- chair-step: lane CLOSE-AGENT (CD-AGENT-04, VISION R17 "A custom table is agent-writable by default; an organization can turn it off per table"). REPLACES custom._agent_change_gate(uuid, uuid, text, uuid) by body (same signature, same callers): a table whose document says agent_writable = false refuses every agent change, before the organization's approval setting is asked, in one sentence naming the table. ADDS the door custom.table_agent_writable_set(uuid, uuid, boolean) that a person (never an agent) uses to turn agent changes off or on for one table. Inverse: migrations/inverse/20261021170000_closeagent_a_a_table_can_be_closed_to_agents_down.sql.
-- GRANT NAMED: EXECUTE on custom.table_agent_writable_set(uuid, uuid, boolean) to authenticated (declared in platform.client_callable_door in this file before the grant; it writes one key of one table the caller made or holds full access to, and refuses an agent caller).
-- lane: close-agent
-- lock: custom
-- based-on: custom._agent_change_gate(uuid, uuid, text, uuid) abc729e9e6d586ed440170bfb36ea62ef4888ce40ef5fc410e0ccdc62203647c
--
-- Before: agent_writable sat on every table document (default true) and the agent's own context printed "READ ONLY" for a
-- table that said false, but no door read it: an agent writing into such a table was let through whenever the
-- organization's setting allowed, and nobody could set it. Test: scripts/campaign-tests/closeagent_agent_writable_green.sql
-- (RED before: the agent's write into a closed table commits, and the setting door does not exist).

set lock_timeout = '3s';
set statement_timeout = '60s';

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
  v_closed text;
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
    -- CD-AGENT-04 / R17: A TABLE CLOSED TO AGENTS. A person turned agent changes off for this one table
    -- (custom.table_agent_writable_set), so no organization setting, approval or trust opens it.
    select coalesce(nullif(t.data ->> 'name', ''), 'this table') into v_closed
      from custom.record t
     where t.organization_id = p_organization_id and t.id = v_table and t.data_class = 'table'
       and lower(coalesce(t.data ->> 'agent_writable', 'true')) = 'false';
    if found then
      raise exception 'Agents may not change "%": a person turned agent changes off for this table.', v_closed
        using errcode = '42501',
              hint = 'Nothing was changed. Someone with full access to the table turns agent changes back on in the table''s Settings, under Agents.',
              detail = jsonb_build_object('door', p_door, 'reason', 'table_closed_to_agents', 'table_id', v_table)::text;
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

CREATE OR REPLACE FUNCTION custom.table_agent_writable_set(p_organization_id uuid, p_table_id uuid, p_agent_writable boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_me    uuid := custom.query_principal();
  v_owner uuid;
  v_name  text;
begin
  perform custom.assert_store_door(p_organization_id, 'custom.table_agent_writable_set');
  perform custom.assert_client_may_reach(p_organization_id, 'custom.table_agent_writable_set');
  if p_agent_writable is null then
    raise exception 'Say whether agents may change this table: true or false.' using errcode = '22004',
      hint = 'Nothing was written.';
  end if;
  -- A PERSON'S DECISION. An agent cannot open (or close) a table to agents; it asks the person instead.
  if platform.declared_actor_tier() = 'agent' then
    raise exception 'Only a person can change whether agents may change a table.' using errcode = '42501',
      hint = 'Nothing was written. Ask someone with full access to the table to change it in the table''s Settings.';
  end if;
  select t.created_by, coalesce(nullif(t.data ->> 'name', ''), 'this table') into v_owner, v_name
    from custom.record t
   where t.organization_id = p_organization_id and t.id = p_table_id
     and t.table_id = custom.table_kernel_id() and t.deleted_at is null
   for update;
  if not found then
    raise exception 'That table is not in this organization.' using errcode = '02000',
      hint = 'The store is keyed (organization_id, id): open the table from its own organization. Nothing was written.';
  end if;
  if not (custom.query_is_store_owner() or v_owner = v_me
          or iam.has_access('record', p_table_id, 'admin'::public.permission_level)) then
    raise exception 'Only the person who made "%" (or someone with full access to it) can change whether agents may change it.', v_name
      using errcode = '42501', hint = 'Nothing was written. Ask an owner of the table to change it, or to give you full access.';
  end if;
  update custom.record
     set data = data || jsonb_build_object('agent_writable', p_agent_writable)
   where organization_id = p_organization_id and id = p_table_id and table_id = custom.table_kernel_id()
     and coalesce((data ->> 'agent_writable')::boolean, true) is distinct from p_agent_writable;
  return jsonb_build_object('table_id', p_table_id, 'agent_writable', p_agent_writable);
end
$function$;

INSERT INTO platform.client_callable_door
  (schema_name, function_name, identity_args, identity_argtypes, declared_by, reason, gate_predicate, anonymous_callers, signed_in_callers, argument_rules)
SELECT 'custom', 'table_agent_writable_set', 'p_organization_id uuid, p_table_id uuid, p_agent_writable boolean', ARRAY['uuid'::regtype, 'uuid'::regtype, 'boolean'::regtype]::oid[],
  '20261021170000_closeagent_a_a_table_can_be_closed_to_agents.sql',
  'p_organization_id is checked through custom.assert_store_door and custom.assert_client_may_reach; p_table_id must be a live table of that organization that the caller made or holds admin access to (iam.has_access record admin); an agent caller (app.actor_tier agent) is refused. Writes only the agent_writable key of that one table document and returns it.',
  null, false, true,
  '{"version": 1, "arguments": {"p_organization_id": {"type": "uuid", "position": 1, "optional": false, "foreign": {"bounded": true, "note": "custom.assert_client_may_reach gates the organization."}}, "p_table_id": {"type": "uuid", "position": 2, "optional": false, "foreign": {"bounded": true, "note": "the table must belong to the organization and the caller must own it or hold admin on it."}}, "p_agent_writable": {"type": "boolean", "position": 3, "optional": false}}}'::jsonb
 WHERE NOT EXISTS (SELECT 1 FROM platform.client_callable_door d WHERE d.schema_name = 'custom' AND d.function_name = 'table_agent_writable_set');

GRANT EXECUTE ON FUNCTION custom.table_agent_writable_set(uuid, uuid, boolean) TO authenticated;
