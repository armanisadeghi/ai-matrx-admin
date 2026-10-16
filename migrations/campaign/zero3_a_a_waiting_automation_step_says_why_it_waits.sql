-- ZERO-3: a script step that waits for a sandbox to start (or for room under the plan's box limit) said only
-- "Waiting for the server to run step 1 (script)" for as long as it took. The server now writes the reason on the
-- run through this one door, so a person reads "Starting your sandbox…" instead of a silent wait.
create or replace function custom.automation_note(p_run_id uuid, p_says text)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
declare
  d      jsonb;
  v_n    integer;
  v_says text := left(coalesce(nullif(btrim(p_says), ''), 'Waiting for the server.'), 400);
begin
  if auth.uid() is not null or not iam.is_trusted_backend() then
    raise exception 'Only the platform server notes an automation step.' using errcode = '42501';
  end if;
  select r.data into d from custom.record r
   where r.id = p_run_id and r.data_class = 'automation_run' and r.deleted_at is null for update;
  if d is null or not d ? 'pending' then
    return jsonb_build_object('ok', false, 'says', 'That run is not waiting for the server.');
  end if;
  v_n := (d -> 'pending' ->> 'n')::integer;
  update custom.record set data = jsonb_set(
      jsonb_set(d, '{says}', to_jsonb(v_says)),
      '{steps}',
      (select coalesce(jsonb_agg(case when (e ->> 'n')::integer = v_n and e ->> 'status' = 'waiting'
                                      then e || jsonb_build_object('says', v_says) else e end order by o), '[]'::jsonb)
         from jsonb_array_elements(coalesce(d -> 'steps', '[]'::jsonb)) with ordinality x(e, o)))
   where id = p_run_id;
  return jsonb_build_object('ok', true);
end
$function$;
revoke all on function custom.automation_note(uuid, text) from public, anon, authenticated;

insert into platform.client_callable_door (schema_name, function_name, identity_args, identity_argtypes, reason, declared_by, non_client_lane, signed_in_callers, anonymous_callers)
values ('custom', 'automation_note', 'p_run_id uuid, p_says text', array['uuid'::regtype, 'text'::regtype]::oid[],
        'p_run_id must be a run waiting on a server step; anything else answers ok=false. Refuses any caller with an auth.uid() or not a trusted backend.',
        'zero3_a_a_waiting_automation_step_says_why_it_waits.sql',
        'server_only: aidream''s automation step worker writes why a claimed step is still waiting (sandbox starting, no room); a browser never does.',
        false, false);
