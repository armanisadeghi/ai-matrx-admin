-- target: branch,production
-- additive: yes
-- guard: custom/system_enabled
-- lane: ACCEPT-FIX
-- lock: custom
-- based-on: custom.automation_claim_pending(text, integer, integer) cac3f3205973df49815e829e68c5e7d79ca3963f52d467cac4f530b4b6f0cf5d
--
-- ACCEPT-FIX 1 - a claimed step carries HOW ITS RUN STARTED (the run row's trigger.on: button_pressed, test, row_added,
-- schedule, webhook...). The server's step worker reads it to tell a person's press from an automated start, so the
-- protected-account guard refuses only the automated ones. Only an added key in the answer; nothing else changes.
create or replace function custom.automation_claim_pending(p_worker text, p_limit integer default 5, p_lease_seconds integer default 180)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'pg_catalog'
as $function$
declare
  x      record;
  v_out  jsonb := '[]'::jsonb;
  v_p    jsonb;
begin
  if auth.uid() is not null or not iam.is_trusted_backend() then
    raise exception 'Only the platform server claims automation steps.' using errcode = '42501';
  end if;
  for x in
    select r.id, r.organization_id, r.data from custom.record r
     where r.data_class = 'automation_run' and r.deleted_at is null and r.table_id is null
       and r.data ? 'pending' and r.data ->> 'status' = 'waiting'
       and coalesce((r.data -> 'pending' ->> 'lease_until')::timestamptz, '-infinity') < now()
     order by r.created_at
     limit least(greatest(coalesce(p_limit, 5), 1), 50)
     for update skip locked
  loop
    v_p := x.data -> 'pending';
    if coalesce((v_p ->> 'attempts')::integer, 0) >= 3 then
      perform custom.automation_resume(x.id, null, 'The server could not run this step after 3 tries.', null);
      continue;
    end if;
    v_p := v_p || jsonb_build_object('lease_until', now() + make_interval(secs => greatest(coalesce(p_lease_seconds, 180), 30)),
                                     'worker', left(coalesce(p_worker, 'worker'), 80),
                                     'attempts', coalesce((v_p ->> 'attempts')::integer, 0) + 1);
    update custom.record set data = jsonb_set(data, '{pending}', v_p) where id = x.id;
    v_out := v_out || jsonb_build_array(jsonb_build_object('run_id', x.id, 'organization_id', x.organization_id,
               'table_id', x.data ->> 'table_id', 'automation_id', x.data ->> 'automation_id',
               'automation', x.data ->> 'automation',
               'principal', x.data -> 'state' ->> 'principal', 'trigger_on', x.data -> 'trigger' ->> 'on', 'pending', v_p));
  end loop;
  return v_out;
end
$function$;
