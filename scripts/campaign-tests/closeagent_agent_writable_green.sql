-- LANE CLOSE-AGENT — CD-AGENT-04 (VISION R17): a table is agent-writable by default and a person can turn that off per table.
-- RED before 20261021170000_closeagent_a (the setting door is absent and the agent's write into the closed table commits), GREEN after.
-- One transaction, always ROLLBACK: python3 scripts/campaign-tests/viewlink_run.py <this file> [<migration>]
-- Fixture: admin@admin.com's disposable tables "CL Clients 9ta" and "CL Vendors 9ta" (lane CLOSE-LINK) in the walk organization.
-- The agent is trusted with both tables for one conversation inside the transaction, so the organization's "ask" setting lets
-- it through and the only thing that can stop it is the per-table switch.
do $t$
declare
  c_admin constant text := '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated"}';
  c_me    constant uuid := '87a6e699-3622-4869-8843-d0867456c0dd';
  c_org   constant uuid := '884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f';
  c_closed constant uuid := '475d36ce-7e0e-4914-bb2e-f9372f999e48';
  c_open   constant uuid := '5f0c5f8d-4f56-4cf7-a66b-ea5c985eba92';
  c_conv  constant uuid := gen_random_uuid();
  v_id uuid; v_msg text; v_said jsonb;
begin
  perform set_config('request.jwt.claims', c_admin, true);
  insert into custom.agent_table_trust (organization_id, table_id, conversation_id, trusted_by)
  values (c_org, c_closed, c_conv, c_me), (c_org, c_open, c_conv, c_me);

  -- 1. Default: agent-writable. The agent writes into both tables.
  perform set_config('app.actor_tier', 'agent', true);
  perform set_config('app.conversation_id', c_conv::text, true);
  v_id := custom.record_write(c_org, c_closed, '{"name":"Agent row before"}');
  if v_id is null then raise exception '1: the agent could not write into a table nobody closed'; end if;

  -- 2. An agent cannot close (or open) a table to agents.
  v_msg := null;
  begin
    perform custom.table_agent_writable_set(c_org, c_closed, false);
  exception when others then v_msg := sqlerrm;
  end;
  if v_msg is null or v_msg not like 'Only a person%' then raise exception '2: an agent changed the switch, or was refused with the wrong words: %', v_msg; end if;

  -- 3. The person turns agent changes off for one table.
  perform set_config('app.actor_tier', 'user', true);
  v_said := custom.table_agent_writable_set(c_org, c_closed, false);
  if (v_said ->> 'agent_writable')::boolean is distinct from false then raise exception '3: the switch answered %', v_said; end if;

  -- 4. The agent is refused on that table, in a sentence naming it, even though the person trusted it.
  perform set_config('app.actor_tier', 'agent', true);
  v_msg := null;
  begin
    perform custom.record_write(c_org, c_closed, '{"name":"Agent row after"}');
  exception when others then v_msg := sqlerrm;
  end;
  if v_msg is null then raise exception '4: the agent wrote into a table closed to agents'; end if;
  if v_msg not like 'Agents may not change "CL Clients 9ta"%' then raise exception '4: wrong refusal: %', v_msg; end if;
  if exists (select 1 from custom.record r where r.table_id = c_closed and r.data ->> 'name' = 'Agent row after') then
    raise exception '4: the refused write left a row';
  end if;

  -- 5. Every other table is still writable.
  v_id := custom.record_write(c_org, c_open, '{"name":"Agent row elsewhere"}');
  if v_id is null then raise exception '5: the other table refused the agent'; end if;

  -- 6. A person still writes into the closed table, and turning it back on lets the agent in again.
  perform set_config('app.actor_tier', 'user', true);
  v_id := custom.record_write(c_org, c_closed, '{"name":"Person row"}');
  perform custom.table_agent_writable_set(c_org, c_closed, true);
  perform set_config('app.actor_tier', 'agent', true);
  v_id := custom.record_write(c_org, c_closed, '{"name":"Agent row reopened"}');
  if v_id is null then raise exception '6: reopening did not let the agent write'; end if;
  raise notice 'closeagent_agent_writable: all 6 checks passed';
end
$t$;
