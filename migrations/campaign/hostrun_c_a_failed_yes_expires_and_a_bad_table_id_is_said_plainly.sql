-- chair-step: replaces two bodies (same signatures, security and grants). custom.work_approval_request: the host_run table check casts an id only after it reads as one (CASE), so a non-id is refused in the plain sentence, never a cast error. custom.work_approval_host_run: an approved job whose run failed expires after `custom.host_run_approval_days` like one that never ran. Nothing else is touched.
-- lane: HOST-RUN
-- based-on: custom.work_approval_request(uuid, uuid, jsonb, text, uuid, text, uuid) aa047d53256e3c755c1a5ff0290a441e1788052218d82778558a679d5a179fe0
-- based-on: custom.work_approval_host_run(uuid, text, uuid, uuid) 1a27320c9a74b184320ef0900129cd86d63eca332f6ec24dcb326bac28a5d95b
--
-- HOST-RUN-3 (2026-10-17) — the second independent review of host_run (findings 4 and 5).
-- Inverse: migrations/inverse/hostrun_c_a_failed_yes_expires_and_a_bad_table_id_is_said_plainly_down.sql

CREATE OR REPLACE FUNCTION custom.work_approval_request(p_organization_id uuid, p_subject_id uuid, p_change jsonb, p_note text DEFAULT NULL::text, p_approver_id uuid DEFAULT NULL::uuid, p_origin text DEFAULT 'person'::text, p_conversation_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_kind    text := lower(coalesce(p_change ->> 'kind', ''));
  v_origin  text := lower(coalesce(nullif(btrim(p_origin), ''), 'person'));
  v_me      uuid := custom.query_principal();
  v_subject custom.record;
  v_word    text;
  v_id      uuid;
  v_who     jsonb;
  v_home    text;
  v_refusal jsonb;
begin
  -- THE ORGANIZATION WALL, THE SWITCH, THEN THE RUNG - all three by name, all three on the one
  -- ladder, and all three before anything is read or written.
  perform custom.assert_client_may_reach(p_organization_id, 'custom.work_approval_request');
  perform custom.assert_store_door(p_organization_id, 'custom.work_approval_request');
  -- LANE7-W3B[q1]: A CHANGE TO A STANDARD ROW (a CRM person, …) is not a record of this store; it is
  -- filed by custom._entity_change_file, only after custom.entity_row_propose tried it as the caller.
  if v_kind = 'entity_row_change' then
    return custom._entity_change_file(p_organization_id, p_subject_id, p_change, p_note, p_approver_id,
                                      v_origin, p_conversation_id);
  end if;

  -- ASKING IS NOT CHANGING, AND THE RUNG SAYS SO. This door writes nothing on the subject: it
  -- files a request. `custom.work_approval_decide` is what applies the change, later, as the
  -- person who approved it and through the store's own doors, and the authority to decide is
  -- asked there. So the rung to ASK is the PARTICIPATION rung - commenter - which is what Jira
  -- and ServiceNow require to raise a change request on an item: enough standing to take part,
  -- never enough to make the change. A viewer is told exactly that, by name, rather than being
  -- told they have no access to something they can plainly read.
  if not (custom.query_is_store_owner()
          or custom.has_visibility(v_me, 'record', p_subject_id, 'commenter'::public.permission_level)) then
    if custom.has_visibility(v_me, 'record', p_subject_id, 'viewer'::public.permission_level) then
      raise exception 'You can read this, but asking for a change to it is for the people who work on it.'
        using errcode = '42501',
              hint = 'Raising a change takes the commenter level or higher on it - the same level it takes to leave a comment. Ask somebody who holds it to raise the change, or to share it with you at that level.';
    end if;
    raise exception 'You do not have access to this record.'
      using errcode = '42501',
            hint = 'Nothing reads or files against a record around the one ladder. Ask somebody who holds it to share it with you.';
  end if;

  if v_origin not in ('person', 'agent') then
    raise exception 'An approval comes from a person or from an agent, and "%" is neither.', p_origin
      using errcode = '22023';
  end if;
  -- VISION-REACH W4 (d): AN AGENT'S REQUEST COMES FROM AN AGENT. `origin = 'agent'` is what lets the person
  -- the agent works for approve it themselves (custom.work_approval_decide waives the second pair of eyes
  -- only for an agent's request), so a person who called it an agent's could approve their own change and
  -- skip that second person. Who is writing is read off the connection (platform.declared_actor_tier: the
  -- server's declaration, or an agent client's header on the client channel), never off this argument.
  if v_origin = 'agent' and platform.declared_actor_tier() is distinct from 'agent' then
    raise exception 'This was asked for by a person, so it waits for somebody else to approve it, not as an agent''s request.'
      using errcode = '42501',
            hint = 'File it with origin "person". An agent''s request is filed by the agent itself.';
  end if;
  if not (v_kind = any (custom.work_approval_kinds())) then
    raise exception 'This store can hold a change to a record''s values, new records in a table, a new column on a table, a record being removed or put back, a record put back to an earlier version, notifications on a table, a new table in a home, and a copy or import the server runs into a table. It was asked to hold "%".',
                    coalesce(nullif(p_change ->> 'kind', ''), 'nothing')
      using errcode = '22023',
            hint = 'The kinds are ' || array_to_string(custom.work_approval_kinds(), ', ') ||
                   '. Anything else would be a change nobody could apply when they approved it.';
  end if;
  if v_kind = 'record_patch'
     and (jsonb_typeof(p_change -> 'patch') is distinct from 'object'
          or p_change -> 'patch' = '{}'::jsonb) then
    raise exception 'A change waiting for approval has to say what it would change.'
      using errcode = '22004';
  end if;
  -- A BATCH THAT CARRIES NO ROWS IS NOT A CHANGE. It would be approved and write nothing,
  -- which is the dead end in a smaller font.
  if v_kind = 'record_add'
     and (jsonb_typeof(p_change -> 'rows') is distinct from 'array'
          or jsonb_array_length(p_change -> 'rows') = 0) then
    raise exception 'Records waiting for approval have to say what would be written.'
      using errcode = '22004',
            hint = 'Send {"kind":"record_add","rows":[{...}]} with at least one record.';
  end if;
  if v_kind = 'field_add' and jsonb_typeof(p_change -> 'field') is distinct from 'object' then
    raise exception 'A new column waiting for approval has to carry the column it would add.'
      using errcode = '22004';
  end if;
  -- VISION-REACH W4 (c): A PUT-BACK NAMES THE VERSION, and a notification names who hears it. Approving
  -- runs the store's own restore door and subscription door with exactly these, so a request that does not
  -- carry them would be approved and do nothing.
  if v_kind = 'record_restore_version'
     and (jsonb_typeof(p_change -> 'to_version') is distinct from 'number'
          or (p_change ->> 'to_version')::numeric < 1
          or (p_change ->> 'to_version')::numeric <> trunc((p_change ->> 'to_version')::numeric)) then
    raise exception 'Putting a record back has to say which version it goes back to.'
      using errcode = '22004',
            hint = 'Send {"kind":"record_restore_version","to_version":3} (and "field_key" to put back one value only).';
  end if;
  if v_kind = 'subscription_add'
     and (jsonb_typeof(p_change -> 'tell') is distinct from 'array'
          or jsonb_array_length(p_change -> 'tell') = 0) then
    raise exception 'A notification waiting for approval has to say who hears it and how.'
      using errcode = '22004',
            hint = 'Send {"kind":"subscription_add","watch":{...},"tell":[{"channel":"in_app","cadence":"instant"}]}.';
  end if;
  -- HOST-RUN (2026-10-16): A BULK JOB SAYS WHAT IT WILL DO AND WHICH JOB IT IS. The queue never holds a mapped
  -- copy's rows (there may be thousands, read from the source when it runs); it holds the job's description for
  -- the card (`summary`), its type, the tables it writes and its FINGERPRINT — the server runs exactly the job
  -- whose fingerprint was approved, once, through custom.work_approval_host_run.
  if v_kind = 'host_run'
     and (jsonb_typeof(p_change -> 'job') is distinct from 'object'
          or nullif(p_change #>> '{job,type}', '') is null
          or nullif(p_change #>> '{job,fingerprint}', '') is null
          or nullif(btrim(coalesce(p_change ->> 'summary', '')), '') is null
          or (p_change #> '{job,tables}' is not null and jsonb_typeof(p_change #> '{job,tables}') is distinct from 'array')) then
    raise exception 'A job waiting for approval has to say what it will do and which job it is.'
      using errcode = '22004',
            hint = 'Send {"kind":"host_run","summary":"Copy 18 rows from … into …","job":{"type":"mapped_sync","fingerprint":"…","tables":["…"]}}.';
  end if;
  -- HOST-RUN-2 (2026-10-17): EVERY TABLE A JOB NAMES IS A LIVE TABLE OF THIS ORGANIZATION. The decide door asks
  -- the approver about each one and a yes trusts each one for the chat, so an id that is not a table here would
  -- make the approval impossible to decide (a bad cast) or hand out trust on something else.
  if v_kind = 'host_run' and exists (
       select 1 from jsonb_array_elements_text(coalesce(p_change #> '{job,tables}', '[]'::jsonb)) x
        where case when x !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then true  -- HOST-RUN-3: CASE, so
                   else not exists (select 1 from custom.record t                                         -- a non-id is never cast
                                     where t.organization_id = p_organization_id and t.id = x::uuid
                                       and t.table_id = custom.table_kernel_id() and t.deleted_at is null) end) then
    raise exception 'A job waiting for approval can only name tables of this organization, and one it names is not one.'
      using errcode = '22023',
            hint = 'Nothing was filed. Name the tables the job writes by their ids.';
  end if;
  -- A NEW TABLE CARRIES THE WHOLE SPEC, and its fields with it. A card that said "a table
  -- called Invoices" would ask a person to sign for something they were never shown, and an
  -- approval that had to guess the spec back would create a different table than the one
  -- that was refused.
  if v_kind = 'table_add' then
    if jsonb_typeof(p_change -> 'table') is distinct from 'object'
       or nullif(p_change #>> '{table,name}', '') is null then
      raise exception 'A new table waiting for approval has to carry the table it would create.'
        using errcode = '22004',
              hint = 'Send {"kind":"table_add","table":{...the spec custom.table_declare takes...},"fields":[...]}.';
    end if;
    if p_change ? 'fields' and jsonb_typeof(p_change -> 'fields') is distinct from 'array' then
      raise exception 'The columns of a new table waiting for approval have to be a list, even an empty one.'
        using errcode = '22004';
    end if;
  end if;

  -- THE SUBJECT. A record being PUT BACK is deleted by definition, so that one kind looks for
  -- it among the deleted rows; every other kind still requires a live subject.
  if v_kind = 'record_restore' then
    select r.* into v_subject from custom.record r
     where r.organization_id = p_organization_id and r.id = p_subject_id and r.deleted_at is not null;
    if v_subject.id is null then
      raise exception 'There is no deleted record in this organization with that id, so there is nothing to put back.'
        using errcode = '02000',
              hint = 'A record that is still here does not need restoring; one that was never here cannot be.';
    end if;
  else
    select r.* into v_subject from custom.record r
     where r.organization_id = p_organization_id and r.id = p_subject_id and r.deleted_at is null;
    if v_subject.id is null then
      raise exception 'There is no such record in this organization, so there is nothing to approve.'
        using errcode = '02000';
    end if;
  end if;
  -- LANE S5-PRIME: A RECORD IN AN ARCHIVED TABLE IS NOT A THING TO ASK ABOUT. Nobody would ever
  -- see the request (the inbox does not list it) and nobody could decide it (the decide door
  -- refuses it by name), so it is refused here, before it is filed. Put-back included: bringing a
  -- record back into a table that is itself archived restores it into nowhere.
  if v_subject.table_id is not null and v_subject.table_id <> custom.table_kernel_id() then
    select coalesce(nullif(t.data ->> 'name', ''), 'its table') into v_home
      from custom.record t
     where t.organization_id = p_organization_id and t.id = v_subject.table_id
       and t.deleted_at is not null;
    if v_home is not null then
      raise exception '% is in %, which is archived, so a change to it cannot be asked for.',
                      coalesce(custom.record_words(p_organization_id, p_subject_id), 'That record'), v_home
        using errcode = '55000',
              hint = 'Bring the table back from the archive first; then ask again.';
    end if;
  end if;
  v_word := case when v_subject.table_id = custom.table_kernel_id() then 'table' else 'record' end;
  if v_kind = 'field_add' and v_word <> 'table' then
    raise exception 'A new column is added to a table, and this is a %.', v_word
      using errcode = '22023';
  end if;
  -- VISION-REACH W4 (c): notifications are on a table; a version is a record's.
  if v_kind = 'subscription_add' and v_word <> 'table' then
    raise exception 'Notifications are set up on a table, and this is a %.', v_word
      using errcode = '22023';
  end if;
  if v_kind = 'record_restore_version' and v_word <> 'record' then
    raise exception 'Only a record is put back to an earlier version here, and this is a %.', v_word
      using errcode = '22023';
  end if;
  if v_kind = 'host_run' and v_word <> 'table' then
    raise exception 'A copy or import runs into a table, and this is a %.', v_word
      using errcode = '22023';
  end if;
  -- Records go IN a table. Filing them against a row would produce an approval whose yes
  -- nobody could carry out.
  if v_kind = 'record_add' and v_word <> 'table' then
    raise exception 'Records are added to a table, and this is a %.', v_word
      using errcode = '22023';
  end if;
  -- A DOCUMENT TEMPLATE IS THE TABLE'S OWN WORDING, so it waits on the TABLE, exactly as a
  -- new column does, and its approvers resolve on the same ladder. The card has to carry the
  -- whole template — name and body — because approving is `custom.doc_template_save` with
  -- these bytes and nothing re-derived: a person signs for the words they were shown.
  if v_kind = 'doc_template_add' then
    if v_word <> 'table' then
      raise exception 'A document template is written for a table, and this is a %.', v_word
        using errcode = '22023';
    end if;
    if jsonb_typeof(p_change -> 'template') is distinct from 'object'
       or nullif(p_change #>> '{template,name}', '') is null then
      raise exception 'A document template waiting for approval has to carry the template it would save.'
        using errcode = '22004',
              hint = 'Send {"kind":"doc_template_add","template":{"name":"…","body":"…","template_id":null}}.';
    end if;
  end if;
  -- A NEW TABLE HANGS ON ITS HOME, which is the record it would be made inside. That is what
  -- makes the wait answerable: `custom.work_approval_approvers` resolves the admins on that
  -- Home and then the organization's owners and admins, on the one ladder.
  if v_kind = 'table_add'
     and nullif(p_change #>> '{table,parent_id}', '') is distinct from p_subject_id::text then
    raise exception 'A new table waits on the home it would be made in, and this spec names a different one.'
      using errcode = '22023',
            hint = 'File the request against the record named by the spec''s parent_id.';
  end if;

  -- A CHANGE THE STORE WOULD REFUSE IS NEVER FILED (lane HANDOVER, 2026-09-28). Cedar Ridge
  -- Physical Therapy's workflow proposed a patient with Insurance "Blue Shield"; the wait was
  -- filed, the run paused, and only Approve found the store refuses that choice, so a person had
  -- been asked to sign for a change nobody could make. The change is now tried through the very
  -- doors approval uses, in a savepoint, and the store's own refusal is raised here instead.
  if v_kind in ('record_add', 'record_patch') then
    v_refusal := custom._held_change_refusal(p_organization_id, v_kind, p_subject_id, p_change);
    if v_refusal is not null then
      raise exception '%', v_refusal ->> 'message'
        using errcode = coalesce(nullif(v_refusal ->> 'code', ''), 'P0001'),
              hint = concat_ws(' ', nullif(v_refusal ->> 'hint', ''),
                               'Nothing was filed for approval: correct the change and ask again.');
    end if;
  end if;

  if p_approver_id is not null
     and not exists (select 1 from iam.organization_member m
                      where m.organization_id = p_organization_id and m.user_id = p_approver_id) then
    raise exception 'That person is not in this organization, so they cannot be asked to approve anything here.'
      using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('user_id', a.user_id, 'name', a.name, 'why', a.why)), '[]'::jsonb)
    into v_who
    from custom.work_approval_approvers(p_organization_id, p_subject_id, p_approver_id) a;

  if jsonb_array_length(v_who) = 0 then
    raise exception 'Nobody in this organization could approve that, so asking would leave it waiting forever.'
      using errcode = '42501',
            hint = 'Name an approver, or ask an owner of the organization to give somebody admin on it. A request nobody can answer is worse than no request.';
  end if;

  -- HOST-RUN: THE SAME JOB ASKED AGAIN IS THE SAME WAIT. An agent that retries, or asks again before anybody
  -- decided, gets the approval already waiting — never a second card for one job.
  if v_kind = 'host_run' then
    -- HOST-RUN-2: two first asks at the same moment are one wait — the second waits for the first's insert.
    perform pg_advisory_xact_lock(hashtextextended('host_run:' || p_organization_id::text || ':'
                                                   || (p_change #>> '{job,fingerprint}'), 0));
    select r.id into v_id
      from custom.record r
     where r.organization_id = p_organization_id and r.data_class = 'work_approval' and r.deleted_at is null
       and r.data ->> 'state' = 'pending'
       and r.data #>> '{change,kind}' = 'host_run'
       and r.data #>> '{change,job,fingerprint}' = p_change #>> '{job,fingerprint}'
       and r.data ->> 'subject_id' = p_subject_id::text
       and (r.data ->> 'conversation_id') is not distinct from p_conversation_id::text
     order by r.created_at desc
     limit 1;
    if v_id is not null then
      return jsonb_build_object(
        'approval_id', v_id, 'state', 'pending', 'subject_id', p_subject_id, 'subject_kind', v_word,
        'origin', v_origin, 'approvers', v_who, 'already_waiting', true,
        'message', 'The same job is already waiting for a person.');
    end if;
  end if;

  perform set_config('custom.decision_door', 'work_approval:request', true);
  insert into custom.record (organization_id, table_id, data_class, data)
  values (p_organization_id, null, 'work_approval', jsonb_strip_nulls(jsonb_build_object(
    'subject_id',      p_subject_id::text,
    'subject_kind',    v_word,
    'subject_table_id', v_subject.table_id::text,
    'subject_title',   custom.record_words(p_organization_id, p_subject_id),
    'change',          p_change,
    'origin',          v_origin,
    'note',            nullif(btrim(coalesce(p_note, '')), ''),
    'approver_id',     p_approver_id::text,
    'conversation_id', p_conversation_id::text,
    'requested_by',    v_me::text,
    'requested_at',    to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'state',           'pending')))
  returning id into v_id;
  perform set_config('custom.decision_door', '', true);

  if p_approver_id is not null and not custom.query_is_store_owner() then
    perform custom.share_grant(p_organization_id, v_id, 'person', p_approver_id,
                               'admin'::public.permission_level);
  end if;

  return jsonb_build_object(
    'approval_id', v_id,
    'state',       'pending',
    'subject_id',  p_subject_id,
    'subject_kind', v_word,
    'origin',      v_origin,
    'approvers',   v_who,
    'message',     format('This is waiting for %s.',
                     case when jsonb_array_length(v_who) = 1
                          then coalesce(v_who -> 0 ->> 'name', 'somebody')
                          else format('%s people who can approve it', jsonb_array_length(v_who)) end));
end
$function$;

CREATE OR REPLACE FUNCTION custom.work_approval_host_run(p_organization_id uuid, p_fingerprint text, p_conversation_id uuid DEFAULT NULL::uuid, p_approval_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_me   uuid := custom.query_principal();
  v_row  custom.record;
  v_run  text;
  v_days integer;
begin
  -- HOST-RUN (2026-10-16): MAY THE SERVER RUN THIS JOB NOW? A bulk job into a table that already existed (a mapped
  -- copy from a connected app, a file import) waits as ONE host_run approval; custom.work_approval_decide records
  -- the yes and applies nothing. The server that asked calls this door before it writes a single row, and runs
  -- only on `state = 'run'` — which this door answers ONCE per approval, claiming it in the same statement:
  --   run       approved, same organization, same fingerprint (same job, same tables), not yet run → claimed
  --   pending   still waiting for a person (the same approval: the server never files a second one)
  --   declined / withdrawn  a person said no, or the table was archived — nothing runs
  --   done      it already ran; its outcome is returned and nothing runs again
  --   running   another call is running it right now (a claim older than 30 minutes is taken over: a mapped
  --             copy matches rows by key, so a rerun after a crash writes nothing twice)
  --   none      nothing was approved for this job (with p_approval_id: refused, by name)
  --   expired   HOST-RUN-2: the yes is older than the organization's `custom.host_run_approval_days` and was never
  --             run — an old yes is not carried into today's data; the job asks again
  --   background HOST-RUN-2: it was started as a background run (`report.run_id`); the server reads that run and
  --             records its end through custom.work_approval_host_run_done, which also re-opens it if it failed
  -- The 30-minute takeover is safe by construction: a foreground copy stops at its own time budget (13 minutes)
  -- and resumes by key, and a file import runs inside one transaction, so no live run is ever taken over.
  -- A failed run (custom.work_approval_host_run_done with ok = false) may be claimed again.
  perform custom.assert_client_may_reach(p_organization_id, 'custom.work_approval_host_run');
  perform custom.assert_store_door(p_organization_id, 'custom.work_approval_host_run');
  if nullif(btrim(coalesce(p_fingerprint, '')), '') is null then
    raise exception 'A job is run by its fingerprint, and none was given.' using errcode = '22004';
  end if;

  if p_approval_id is not null then
    select r.* into v_row from custom.record r
     where r.organization_id = p_organization_id and r.id = p_approval_id
       and r.data_class = 'work_approval' and r.deleted_at is null
     for update;
    if v_row.id is null then
      raise exception 'There is no such approval in this organization.' using errcode = '02000';
    end if;
    if v_row.data #>> '{change,kind}' is distinct from 'host_run' then
      raise exception 'That approval is for a change the store applies itself, not a job the server runs.'
        using errcode = '22023';
    end if;
    if v_row.data #>> '{change,job,fingerprint}' is distinct from p_fingerprint then
      raise exception 'That approval was for a different job: the mapping, the tables or the file changed since it was asked for.'
        using errcode = '42501',
              hint = 'Nothing was written. Ask again with the job as it is now, and the person approves that one.';
    end if;
  else
    -- The newest approval for this job in this conversation that is not finished.
    select r.* into v_row from custom.record r
     where r.organization_id = p_organization_id and r.data_class = 'work_approval' and r.deleted_at is null
       and r.data #>> '{change,kind}' = 'host_run'
       and r.data #>> '{change,job,fingerprint}' = p_fingerprint
       and (r.data ->> 'conversation_id') is not distinct from p_conversation_id::text
       and r.data ->> 'state' in ('pending', 'approved')
       and coalesce(r.data ->> 'run_state', '') <> 'done'
     order by r.created_at desc
     limit 1
     for update;
    if v_row.id is null then
      return jsonb_build_object('state', 'none');
    end if;
  end if;

  if nullif(v_row.data ->> 'requested_by', '')::uuid is distinct from v_me
     and not custom.work_approval_may_decide(p_organization_id, v_row.id) then
    raise exception 'That job was asked for by somebody else, so it is not yours to run.' using errcode = '42501';
  end if;

  if v_row.data ->> 'state' = 'pending' then
    return jsonb_build_object('state', 'pending', 'approval_id', v_row.id);
  end if;
  if v_row.data ->> 'state' in ('declined', 'withdrawn') then
    return jsonb_build_object('state', v_row.data ->> 'state', 'approval_id', v_row.id,
                              'outcome', coalesce(v_row.data ->> 'outcome', v_row.data ->> 'withdrawn_reason'));
  end if;
  v_run := coalesce(v_row.data ->> 'run_state', '');
  if v_run = 'background' then
    return jsonb_build_object('state', 'background', 'approval_id', v_row.id, 'report', v_row.data -> 'run_report');
  end if;
  v_days := coalesce(nullif(platform.knob_resolve('custom', 'host_run_approval_days', p_organization_id) #>> '{}', '')::integer, 7);
  -- HOST-RUN-3: a yes whose run FAILED expires the same way — a month-old yes never runs on today's data.
  if v_run in ('', 'failed') and nullif(v_row.data ->> 'decided_at', '')::timestamptz < now() - make_interval(days => v_days) then
    return jsonb_build_object('state', 'expired', 'approval_id', v_row.id, 'days', v_days);
  end if;
  if v_run = 'done' then
    return jsonb_build_object('state', 'done', 'approval_id', v_row.id, 'outcome', v_row.data ->> 'run_outcome',
                              'report', v_row.data -> 'run_report');
  end if;
  if v_run = 'running'
     and nullif(v_row.data ->> 'run_claimed_at', '')::timestamptz > now() - interval '30 minutes' then
    return jsonb_build_object('state', 'running', 'approval_id', v_row.id);
  end if;

  perform set_config('custom.decision_door', 'work_approval:run', true);
  update custom.record r
     set data = r.data || jsonb_build_object(
           'run_state',      'running',
           'run_claimed_at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
           'run_claimed_by', v_me::text,
           'run_count',      coalesce((r.data ->> 'run_count')::int, 0) + 1)
   where r.organization_id = p_organization_id and r.id = v_row.id;
  perform set_config('custom.decision_door', '', true);
  return jsonb_build_object('state', 'run', 'approval_id', v_row.id, 'change', v_row.data -> 'change',
                            'subject_id', v_row.data ->> 'subject_id', 'decided_by', v_row.data ->> 'decided_by');
end
$function$;
