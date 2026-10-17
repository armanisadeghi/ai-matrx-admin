-- chair-step: replaces five bodies (same signatures, security and grants) and adds two doors. custom.work_approval_kinds() adds `host_run`; custom.work_approval_request checks its shape (a summary, a job type, a fingerprint, the tables) and that its subject is a table, and answers the approval already pending for the same job instead of filing a second; custom.work_approval_decide records a host_run yes or no and APPLIES NOTHING (and refuses a yes from somebody who may not approve every table the job names); custom._workdoors_approval_guard lets the new `run` door mark an approved host_run as claimed/finished and nothing else; custom.agent_change_trust covers every table a host_run names. New: custom.work_approval_host_run (claim an approved job exactly once) and custom.work_approval_host_run_done (what it did). No table, trigger, policy or row is touched.
-- lane: HOST-RUN
-- based-on: production bodies read 2026-10-16 (pg_get_functiondef), each replaced by an asserted exact edit.
--
-- HOST-RUN (2026-10-16) — AN AGENT'S BULK COPY INTO AN EXISTING TABLE WAITS AS ONE CARD THAT RUNS IT.
-- MEASURED BEFORE THIS FILE (production, a real chat, default `ask`): the records tool's notion_sync / data_sync into
-- tables that already existed refused and told the person to "press Sync now" (no such button for a mapped copy);
-- import_propose into an existing table filed {"kind":"record_add","rows":[]} — approving it wrote nothing.
-- Inverse: migrations/inverse/hostrun_a_an_approved_bulk_job_runs_once_down.sql

CREATE OR REPLACE FUNCTION custom.work_approval_kinds()
 RETURNS text[]
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'pg_catalog'
AS $function$
  -- EVERY KIND THE ONE QUEUE CAN HOLD, AND THE ONLY PLACE THE SET IS WRITTEN.
  -- A kind here has an arm in custom.work_approval_decide; a kind without one would be
  -- approved and then do nothing, which is the dead end this store keeps refusing.
  -- VISION-REACH W4 (c): `record_restore_version` (a record, or one value, put back to an earlier version)
  -- and `subscription_add` (a saved view and the notifications on it) — the agent client filed both and this
  -- list refused them (22023), so the agent's change was neither applied nor waiting. Both have an arm now.
  -- `signature_request` stays out on purpose: its link is shown once to whoever makes it, so approving
  -- could hand it to nobody; the client now tells the person to ask for the signature themselves.
  -- LANE7-W3B: `entity_row_change` — an agent's change to a STANDARD row (a CRM person, …), filed only by
  -- custom.entity_row_propose and applied by custom.entity_row_write.
  -- HOST-RUN (2026-10-16): `host_run` — a bulk job the server runs (a mapped copy from a connected app, a file
  -- import) into a table that already existed. Its arm in custom.work_approval_decide records the yes and applies
  -- nothing; the server that asked runs the job ONCE through custom.work_approval_host_run.
  select array['record_patch', 'record_add', 'field_add',
               'record_delete', 'record_restore', 'table_add',
               'doc_template_add', 'record_restore_version', 'subscription_add',
               'entity_row_change', 'host_run']::text[];
$function$;

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

CREATE OR REPLACE FUNCTION custom.work_approval_decide(p_organization_id uuid, p_approval_id uuid, p_approve boolean, p_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_me      uuid := custom.query_principal();
  v_row     custom.record;
  v_change  jsonb;
  v_kind    text;
  v_subject uuid;
  v_outcome text;
  v_key     text;
  v_fields  jsonb;
  v_spec    jsonb;
  v_field   uuid;
  v_version integer;
  v_written uuid[] := '{}';
  v_one     uuid;
  v_doc     jsonb;
  v_table   uuid;
  v_conv    uuid;
  v_at      timestamptz;
  v_why     text;
  v_by_name text;
  v_fill    jsonb;
  v_by      uuid;      -- VISION-REACH W4 (b): who asked (for an agent, the person it worked for)
  v_credit  boolean := false;
  v_view    uuid;      -- VISION-REACH W4 (c): the saved view a subscription_add watches
  v_tell    jsonb;
begin
  perform custom.assert_store_door(p_organization_id, 'custom.work_approval_decide');
  perform custom.assert_client_may_reach(p_organization_id, 'custom.work_approval_decide');

  select r.* into v_row from custom.record r
   where r.organization_id = p_organization_id and r.id = p_approval_id
     and r.data_class = 'work_approval' and r.deleted_at is null;
  if v_row.id is null then
    raise exception 'There is no such approval in this organization.' using errcode = '02000';
  end if;
  -- LANE S5-PRIME: A WITHDRAWN APPROVAL SAYS WHY. Nobody decided it; the store closed it when the
  -- thing it would change was archived, and the reason is on the approval itself.
  if v_row.data ->> 'state' = 'withdrawn' then
    -- HANDOVER (2026-09-27): no clock in the sentence. WHEN it closed is a fact for the reader's
    -- own clock, so it rides in DETAIL (ISO 8601) and the screen says it in the reader's words.
    raise exception 'That was withdrawn. %', coalesce(v_row.data ->> 'withdrawn_reason', '')
      using errcode = '23505',
            hint = 'A withdrawn approval is closed. Bring the record back from the archive and ask again if the change still needs making.',
            detail = jsonb_build_object('state', 'withdrawn',
                                        'decided_at', nullif(v_row.data ->> 'decided_at', ''))::text;
  end if;
  if coalesce(v_row.data ->> 'state', 'pending') <> 'pending' then
    -- HANDOVER (2026-09-27): WHO in the sentence, WHEN in DETAIL. The sentence read "That was
    -- already approved, on 2026-09-28T01:23:12.271Z." on a person's screen; the time is now a
    -- structured fact (state, decided_at, decided_by, decided_by_name) the card says as
    -- "Approved by admin 12 minutes ago."
    v_by_name := (select coalesce(nullif(u.raw_user_meta_data ->> 'display_name', ''),
                                   nullif(u.raw_user_meta_data ->> 'full_name', ''),
                                   split_part(u.email::text, '@', 1))::text
                      from auth.users u where u.id = nullif(v_row.data ->> 'decided_by', '')::uuid);
    raise exception 'That was already % by %.', v_row.data ->> 'state', coalesce(v_by_name, 'somebody')
      using errcode = '23505',
            hint = 'An approval is decided once. Ask for the change again if it still needs making.',
            detail = jsonb_build_object('state', v_row.data ->> 'state',
                                        'decided_at', nullif(v_row.data ->> 'decided_at', ''),
                                        'decided_by', nullif(v_row.data ->> 'decided_by', ''),
                                        'decided_by_name', v_by_name)::text;
  end if;

  -- VISION-REACH W4 (d): A PERSON DECIDES. An agent working for somebody who may approve would otherwise
  -- approve its own request in their name, which is exactly the yes the organization's setting asks a
  -- person for.
  if platform.declared_actor_tier() = 'agent' then
    raise exception 'An agent does not approve or decline changes; a person does.'
      using errcode = '42501',
            hint = 'Nothing was decided. The person it is waiting for decides it from the approval card or the inbox.';
  end if;
  if not custom.work_approval_may_decide(p_organization_id, p_approval_id) then
    raise exception 'You are not one of the people who can approve this.'
      using errcode = '42501',
            hint = 'AGT-4: an approval is decided by the person it was addressed to, by anybody with admin on the thing being changed, or by an owner or admin of this organization. Ask one of them.';
  end if;
  -- THE SECOND PAIR OF EYES IS FOR A PERSON'S REQUEST. An agent's call runs as the person it
  -- is working for, so `requested_by` on an agent request names THAT person — the very one
  -- `ask` exists to consult. Holding the bar there would have made every agent wait
  -- undecidable by the only person looking at it. It still holds for `origin = 'person'`.
  if v_me is not null and nullif(v_row.data ->> 'requested_by', '')::uuid = v_me
     and coalesce(v_row.data ->> 'origin', 'person') <> 'agent'
     and not custom.query_is_store_owner() then
    raise exception 'You asked for this change, so somebody else approves it.'
      using errcode = '42501',
            hint = 'The point of asking is that a second person says yes. If nobody else needs to, make the change directly instead.';
  end if;

  -- LANE S5-PRIME: NOTHING IS DECIDED ABOUT AN ARCHIVED THING. Archiving withdraws the
  -- approvals waiting on it (custom._work_approvals_withdraw_on_archive); this is the door's own
  -- refusal for any that reach it anyway, in the store's words, before anything is applied.
  v_why := custom.work_approval_withdrawal(p_organization_id, v_row.data);
  if v_why is not null then
    raise exception '%', v_why
      using errcode = '55000',
            hint = 'Nothing was changed. Bring it back from the archive first; then ask for the change again.';
  end if;

  v_subject := nullif(v_row.data ->> 'subject_id', '')::uuid;
  v_change  := v_row.data -> 'change';
  v_kind    := lower(coalesce(v_change ->> 'kind', ''));
  v_conv    := nullif(v_row.data ->> 'conversation_id', '')::uuid;
  v_by      := nullif(v_row.data ->> 'requested_by', '')::uuid;

  -- VISION-REACH W4 (b): AN APPROVED AGENT CHANGE IS THE AGENT'S, APPROVED BY THIS PERSON. The doors below
  -- run as the person deciding (that is what lets a yes through the organization's own setting), so on
  -- their own they would record the person as the author. For an agent's request the values written carry
  -- the agent and the person it worked for (`_actor` / `_on_behalf_of`, the store's own envelope keys),
  -- and every version this decision writes is marked `approved agent change`, which custom.history_actor
  -- reads to name the approver beside the agent. The mark belongs to this one decision: it is cleared the
  -- moment the change is applied, and a person's own request is never marked.
  v_credit := coalesce(p_approve, false)
              and coalesce(v_row.data ->> 'origin', 'person') = 'agent'
              and v_kind in ('record_add', 'record_patch', 'field_add', 'table_add',
                             'record_restore_version', 'subscription_add',
                             'entity_row_change');   -- LANE7-W3B[d1]
  if v_credit then
    perform set_config('history.mark_at',   statement_timestamp()::text, true);
    perform set_config('history.mark_id',   '',                           true);
    perform set_config('history.mark_verb', 'approved agent change',      true);
  elsif coalesce(current_setting('history.mark_verb', true), '') = 'approved agent change' then
    perform set_config('history.mark_at', '', true);   -- a batch's earlier agent decision never marks this one
  end if;

  -- HOST-RUN (2026-10-16): A JOB THAT WRITES SEVERAL TABLES IS APPROVED BY SOMEBODY WHO MAY APPROVE EACH. The
  -- queue resolved the approvers on the first table (the subject); every other table the job names is asked here.
  if coalesce(p_approve, false) and v_kind = 'host_run' and not custom.query_is_store_owner() then
    select coalesce(string_agg(coalesce(custom.record_words(p_organization_id, t.id), 'another table'), ', '), '')
      into v_why
      from (select distinct x::uuid as id
              from jsonb_array_elements_text(coalesce(v_change #> '{job,tables}', '[]'::jsonb)) x
             where x::uuid is distinct from v_subject) t
     where not custom.work_approval_is_approver(p_organization_id, t.id,
                 nullif(v_row.data ->> 'approver_id', '')::uuid, v_me);
    if v_why <> '' then
      raise exception 'This job also writes %, and you are not one of the people who can approve changes there.', v_why
        using errcode = '42501',
              hint = 'Nothing was decided. An owner or admin of the organization, or an admin of those tables, can approve it.';
    end if;
    v_why := null;
  end if;

  if p_approve then
    if v_kind = 'host_run' then
      -- HOST-RUN: THE YES IS RECORDED AND NOTHING IS APPLIED HERE. The rows are read from the source when the job
      -- runs; the server that asked runs exactly this job (its fingerprint) once, through
      -- custom.work_approval_host_run, as the person the agent works for.
      v_outcome := format('Approved: %s.', rtrim(btrim(v_change ->> 'summary'), '.'));
    elsif v_kind = 'record_patch' then
      -- STAGE-RULES: THE GATE THAT ASKED FOR THIS APPROVAL STEPS ASIDE FOR THIS ONE WRITE.
      -- A stage gate whose on_fail is `require_approval` refuses the write by raising, which
      -- is HOW this change got into the queue at all. Applying the yes has to get past the
      -- same gate, and it gets past it by NAMING THE RECORD it is applying an approved
      -- change to, for the length of that one statement and no longer. Every plain refusal,
      -- every other validator and the whole value envelope still run, so an approver is
      -- never told yes over a write the store itself would refuse.
      perform set_config('custom.applying_approval_for', v_subject::text, true);
      v_version := custom.record_update(p_organization_id, v_subject,
                     (v_change -> 'patch') || case when v_credit
                                                   then jsonb_build_object('_actor', 'agent', '_on_behalf_of', v_by::text)
                                                   else '{}'::jsonb end,
                     null);
      perform set_config('custom.applying_approval_for', '', true);
      v_outcome := format('Applied. %s is now at version %s.',
                          coalesce(v_row.data ->> 'subject_title', 'That record'), v_version);
    elsif v_kind = 'record_add' then
      -- THE SAME DOOR THE UNATTENDED PATH USES, once per row, in THIS transaction. Every
      -- guard, every validator and the value envelope run per row exactly as they would for
      -- an agent that was never asked; the difference is whose name is on the history row.
      -- One refused row rolls the whole decision back, which is what a person means by
      -- saying yes to a batch.
      for v_doc in select value from jsonb_array_elements(v_change -> 'rows')
      loop
        v_one := custom.record_write(p_organization_id, v_subject,
                   v_doc || case when v_credit
                                 then jsonb_build_object('_actor', 'agent', '_on_behalf_of', v_by::text)
                                 else '{}'::jsonb end);
        v_written := v_written || v_one;
      end loop;
      v_outcome := format('Applied. %s %s now in %s.',
                          cardinality(v_written),
                          case when cardinality(v_written) = 1 then 'record is' else 'records are' end,
                          coalesce(v_row.data ->> 'subject_title', 'that table'));
    elsif v_kind = 'record_delete' then
      -- THE STORE'S OWN DELETE, AS THE APPROVER, IN THIS TRANSACTION. custom.record_delete
      -- runs custom.delete_rule first, so a record something still reads is refused here in
      -- the store's own words and the decision rolls back — an approver is never told yes
      -- over a delete the store would have refused.
      v_at := custom.record_delete(p_organization_id, v_subject);
      v_outcome := format('Removed. %s was deleted on %s and can be put back.',
                          coalesce(v_row.data ->> 'subject_title', 'That record'),
                          to_char(v_at at time zone 'utc', 'YYYY-MM-DD HH24:MI'));
    elsif v_kind = 'record_restore' then
      perform custom.record_restore(p_organization_id, v_subject);
      v_outcome := format('Put back. %s is here again.',
                          coalesce(v_row.data ->> 'subject_title', 'That record'));
    elsif v_kind = 'table_add' then
      -- EXACTLY WHAT THE DIRECT PATH RUNS, IN EXACTLY THAT ORDER: custom.table_declare with
      -- the spec that was shown, then custom.field_declare once per column. Not a re-derived
      -- spec and not a second way of making a table — the same two doors, so an approved
      -- table and an unasked one are the same bytes.
      v_table := custom.table_declare(p_organization_id, v_change -> 'table');
      for v_doc in select value from jsonb_array_elements(coalesce(v_change -> 'fields', '[]'::jsonb))
      loop
        v_field := custom.field_declare(p_organization_id, v_table, v_doc);
      end loop;
      -- THE CONVERSATION'S CLAIM TRAVELS WITH THE APPROVAL. A table a person said yes to is
      -- still the table this conversation made, so the agent's next change to it is not a
      -- change to somebody's pre-existing table.
      if v_conv is not null then
        perform custom.agent_table_claim(p_organization_id, v_table, v_conv);
      end if;
      v_field := null;
      v_outcome := format('Created. %s is now a table in %s, with %s column%s.',
                          coalesce(nullif(v_change #>> '{table,name}', ''), 'That table'),
                          coalesce(v_row.data ->> 'subject_title', 'this organization'),
                          jsonb_array_length(coalesce(v_change -> 'fields', '[]'::jsonb)),
                          case when jsonb_array_length(coalesce(v_change -> 'fields', '[]'::jsonb)) = 1
                               then '' else 's' end);
    elsif v_kind = 'record_restore_version' then
      -- VISION-REACH W4 (c): THE STORE'S OWN RESTORE, AS THE APPROVER. The record (or the one value the
      -- request named) goes back to that version through custom.record_restore_version /
      -- custom.value_restore — a NEW version, nothing erased — and an agent's request is written as the
      -- agent's, for the person it worked for.
      v_doc := case when v_credit then jsonb_build_object('_actor', 'agent', '_on_behalf_of', v_by::text) end;
      if nullif(v_change ->> 'field_key', '') is not null then
        v_fill := custom.value_restore(p_organization_id, v_subject, v_change ->> 'field_key',
                                       (v_change ->> 'to_version')::integer, v_doc);
      else
        v_fill := custom.record_restore_version(p_organization_id, v_subject,
                                                (v_change ->> 'to_version')::integer, v_doc);
      end if;
      v_version := nullif(v_fill ->> 'version', '')::integer;
      v_fill := null;
      v_outcome := format('Put back. %s now says what it said at version %s%s.',
                          coalesce(v_row.data ->> 'subject_title', 'That record'),
                          v_change ->> 'to_version',
                          case when nullif(v_change ->> 'field_key', '') is not null
                               then format(' (%s only)', v_change ->> 'field_key') else '' end);
    elsif v_kind = 'subscription_add' then
      -- VISION-REACH W4 (c): EXACTLY WHAT THE UNASKED PATH RUNS (RecordStore.subscription_propose): the
      -- saved view that decides what counts (the one named, or `watch` saved as a new one), then one
      -- custom.subscription_declare per entry of `tell`, each telling the person who asked unless the
      -- entry names somebody. Every refusal is the subscription door's own.
      v_view := nullif(v_change ->> 'view_id', '')::uuid;
      if v_view is null then
        v_view := custom.view_declare(p_organization_id, v_subject, jsonb_build_object(
                    'name', coalesce(nullif(v_change ->> 'view_name', ''),
                                     (select 'Where ' || string_agg(format('%s is %s', w.key, w.value #>> '{}'), ', ')
                                        from jsonb_each(coalesce(v_change -> 'watch', '{}'::jsonb)) w),
                                     'Everything'),
                    'filters', coalesce(v_change -> 'watch', '{}'::jsonb)));
      end if;
      for v_tell in select value from jsonb_array_elements(v_change -> 'tell')
      loop
        v_one := custom.subscription_declare(p_organization_id, v_subject, jsonb_strip_nulls(jsonb_build_object(
                   'name', coalesce(nullif(v_tell ->> 'name', ''),
                                    format('%s — %s', coalesce(nullif(v_change ->> 'view_name', ''), 'This view'),
                                           case when coalesce(v_tell ->> 'cadence', 'instant') = 'instant'
                                                then 'as it happens'
                                                else (v_tell ->> 'cadence') || ' summary' end)),
                   'saved_view_id',     v_view,
                   'cadence',           coalesce(nullif(v_tell ->> 'cadence', ''), 'instant'),
                   'channel',           coalesce(nullif(v_tell ->> 'channel', ''), 'in_app'),
                   'schedule',          v_tell -> 'schedule',
                   'quiet_hours',       v_tell -> 'quiet_hours',
                   'recipient_user_id', coalesce(nullif(v_tell ->> 'recipient_user_id', ''), v_by::text))));
        v_written := v_written || v_one;
      end loop;
      v_outcome := format('Set up. %s notification%s on %s.',
                          cardinality(v_written), case when cardinality(v_written) = 1 then '' else 's' end,
                          coalesce(v_row.data ->> 'subject_title', 'that table'));
    elsif v_kind = 'entity_row_change' then
      -- LANE7-W3B[d2]: A STANDARD ROW, THROUGH ITS ONE WRITE DOOR, IN THIS TRANSACTION. The custom-field
      -- guard judges the values for the person deciding; a stale version or a refused value rolls the
      -- decision back in the store's own words.
      v_fill := custom.entity_row_write(p_organization_id, v_change ->> 'token', v_subject,
                  coalesce(v_change -> 'columns', '{}'::jsonb), coalesce(v_change -> 'custom', '{}'::jsonb),
                  nullif(v_change ->> 'expected_version', '')::integer,
                  case when jsonb_typeof(v_change -> 'archive') = 'boolean' then (v_change ->> 'archive')::boolean end);
      v_fill := null;
      v_written := array[v_subject];
      v_outcome := case when jsonb_typeof(v_change -> 'archive') = 'boolean' and (v_change ->> 'archive')::boolean
                        then format('Archived. %s can be put back.', coalesce(v_row.data ->> 'subject_title', 'That record'))
                        when jsonb_typeof(v_change -> 'archive') = 'boolean'
                        then format('Put back. %s is here again.', coalesce(v_row.data ->> 'subject_title', 'That record'))
                        else format('Applied. %s has the new values.', coalesce(v_row.data ->> 'subject_title', 'That record')) end;
    elsif v_kind = 'doc_template_add' then
      -- THE SAME DOOR THE UNASKED PATH USES, with the bytes that were shown on the card.
      -- `custom.doc_template_save` re-runs every one of its own refusals here, as the
      -- approver — including the one that names a token pointing at no column — so an
      -- approved template and one written directly are the same template.
      v_written := array[custom.doc_template_save(
                           p_organization_id, v_subject,
                           v_change #>> '{template,name}',
                           coalesce(v_change #>> '{template,body}', ''),
                           nullif(v_change #>> '{template,template_id}', '')::uuid)];
      v_outcome := format('Saved. %s is now a document template on %s.',
                          coalesce(nullif(v_change #>> '{template,name}', ''), 'That template'),
                          coalesce(v_row.data ->> 'subject_title', 'that table'));
    else
      v_spec := v_change -> 'field';
      v_key  := coalesce(nullif(v_spec ->> 'key', ''), nullif(v_spec ->> 'name', ''));
      if v_key is null then
        raise exception 'That column has no name, so it cannot be added.' using errcode = '22004';
      end if;
      -- ── FIELD-TRUTH 2026-09-21: THE NAME AND THE DEFINITION GO ON TOGETHER. ─────────
      -- This used to write the NAME into the table's `fields` list in one statement and
      -- then define the column in the next. Between those two statements the table claimed
      -- a column that no Field record backed — a name with no type, no rules and no
      -- validation, which `custom.applicable_fields` never answers with and no grid can
      -- draw. `custom.assert_columns_are_defined` refuses exactly that shape now, and it
      -- refused this door: *"Estimates says it has a column called "rate_card", and there
      -- is no such field"* when an agent's Rate card proposal was approved.
      -- The pre-add was also REDUNDANT: `custom.field_declare` appends the name to the
      -- table's list itself, in the same call that writes the definition, which is the
      -- whole point of there being one door for a column.
      v_field := custom.field_declare(p_organization_id, v_subject,
                   v_spec || jsonb_build_object('key', v_key));
      v_outcome := format('%s is now a column on %s.',
                          coalesce(nullif(v_spec ->> 'label', ''), v_key),
                          coalesce(v_row.data ->> 'subject_title', 'that table'));
      -- B4-03 (2026-09-30): A COLUMN AN IMPORT ASKED FOR ARRIVES WITH ITS VALUES, in this
      -- transaction and as the approver, through the one update door.
      if jsonb_typeof(v_change -> 'fill') = 'object' then
        v_fill := custom._io_fill_held_column(p_organization_id, v_subject, v_field,
                    nullif(v_change #>> '{fill,import_id}', '')::uuid, v_change #>> '{fill,column}');
        v_outcome := v_outcome || ' ' || (v_fill ->> 'message');
      end if;
    end if;
    if v_credit then
      perform set_config('history.mark_at', '', true);   -- the decision's own row below is the person's
    end if;
  else
    v_outcome := case
                   when v_kind = 'field_add'
                     then format('The column %s was not added.',
                                 coalesce(nullif(v_change #>> '{field,label}', ''),
                                          nullif(v_change #>> '{field,key}', ''), 'asked for'))
                   when v_kind = 'record_add'
                     then format('%s %s not written to %s.',
                                 jsonb_array_length(coalesce(v_change -> 'rows', '[]'::jsonb)),
                                 case when jsonb_array_length(coalesce(v_change -> 'rows', '[]'::jsonb)) = 1
                                      then 'record was' else 'records were' end,
                                 coalesce(v_row.data ->> 'subject_title', 'that table'))
                   when v_kind = 'record_delete'
                     then format('%s was not deleted, and is still here.',
                                 coalesce(v_row.data ->> 'subject_title', 'That record'))
                   when v_kind = 'record_restore'
                     then format('%s was not put back, and is still deleted.',
                                 coalesce(v_row.data ->> 'subject_title', 'That record'))
                   when v_kind = 'table_add'
                     then format('The table %s was not created.',
                                 coalesce(nullif(v_change #>> '{table,name}', ''), 'asked for'))
                   when v_kind = 'record_restore_version'
                     then format('%s was not put back, and still says what it says now.',
                                 coalesce(v_row.data ->> 'subject_title', 'That record'))
                   when v_kind = 'subscription_add'
                     then format('No notification was set up on %s.',
                                 coalesce(v_row.data ->> 'subject_title', 'that table'))
                   when v_kind = 'host_run'
                     then format('Not run: %s. Nothing was written.', rtrim(btrim(v_change ->> 'summary'), '.'))
                   when v_kind = 'doc_template_add'
                     then format('The document template %s was not saved.',
                                 coalesce(nullif(v_change #>> '{template,name}', ''), 'asked for'))
                   else format('%s was left as it was.',
                               coalesce(v_row.data ->> 'subject_title', 'That record')) end;
  end if;

  perform set_config('custom.decision_door', 'work_approval:decide', true);
  update custom.record r
     set data = r.data || jsonb_strip_nulls(jsonb_build_object(
           'state',         case when p_approve then 'approved' else 'declined' end,
           'decided_by',    v_me::text,
           'decided_at',    to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
           'decision_note', nullif(btrim(coalesce(p_note, '')), ''),
           'applied_field_id', v_field::text,
           'applied_table_id', v_table::text,
           'applied_record_ids', case when cardinality(v_written) > 0
                                      then to_jsonb(v_written) end,
           'outcome',       v_outcome))
   where r.organization_id = p_organization_id and r.id = p_approval_id;
  perform set_config('custom.decision_door', '', true);

  return jsonb_build_object(
    'approval_id', p_approval_id,
    'state',       case when p_approve then 'approved' else 'declined' end,
    'subject_id',  v_subject,
    'applied',     coalesce(p_approve, false),
    'field_id',    v_field,
    'table_id',    v_table,
    'record_ids',  case when cardinality(v_written) > 0 then to_jsonb(v_written) end,
    'version',     v_version,
    'message',     v_outcome);
end
$function$;

CREATE OR REPLACE FUNCTION custom._workdoors_approval_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog'
AS $function$
declare
  d       jsonb := new.data;
  v_class text;
  v_door  text := coalesce(current_setting('custom.decision_door', true), '');
  v_verb  text;
  v_from  text;
  v_to    text;
begin
  -- CHAIR-SELF-APPROVAL (2026-10-03): A DECISION IS MADE AT ITS OWN DOOR, AND NOWHERE ELSE.
  -- Proven on the clone as a signed-in member: custom.work_approval_request filed an approval, then
  -- custom.record_update(org, id, {"state":"approved","decided_at":…,"decided_by":me}) went through and
  -- work_approval_read showed it approved — skipping custom.work_approval_decide's agent refusal,
  -- may_decide and the second pair of eyes. The same write could flip `origin` to agent (so the
  -- requester may approve their own request at the real door), swap `change` after it was filed,
  -- rename `requested_by`, or put a declined approval back to pending through record_restore_version.
  -- A signature request had the same hole: `signed_at` written by record_update reads as signed.
  --
  -- THE RULE. A work_approval or sign_request row's `data` (and its data_class) changes only while one
  -- of its own doors holds the transaction-local mark `custom.decision_door` = '<class>:<door>' around
  -- the one statement it writes — the pattern of platform.final_switch_acting and
  -- custom.applying_approval_for: set_config is no client door, so no record write, batch, graph,
  -- import, restore, REST or MCP call can carry it. This trigger sits on custom.record, so every path
  -- that reaches the row passes here. Archive and restore (deleted_at alone) are not decisions and
  -- pass as before. The doors, each named for the one transition it may make:
  --   work_approval: request (insert, pending) · decide (pending → approved|declined, decided_by set)
  --                  · withdraw (pending → withdrawn) · return (withdrawn → pending)
  --   sign_request:  create (insert) · sign · decline · view · cancel · remind · resolve · withdraw · return
  v_class := case
               when new.data_class in ('work_approval', 'sign_request') then new.data_class
               when tg_op = 'UPDATE' and old.data_class in ('work_approval', 'sign_request') then old.data_class
             end;
  if v_class is null then
    return new;
  end if;

  if tg_op = 'INSERT'
     or old.data is distinct from new.data
     or old.data_class is distinct from new.data_class then
    if split_part(v_door, ':', 1) <> v_class then
      if v_class = 'work_approval' then
        raise exception 'An approval is decided at its own door, never by writing the record.'
          using errcode = '42501',
                hint = 'Nothing was changed. Approve or decline it from the approval card or the inbox (custom.work_approval_decide). A record write, batch, import or restore cannot decide, reopen or rewrite an approval.';
      end if;
      raise exception 'A signature request is answered through its signing link, never by writing the record.'
        using errcode = '42501',
              hint = 'Nothing was changed. Send, remind, cancel or sign it through its own doors (custom.sign_request_*). A record write, batch, import or restore cannot sign, decline or rewrite a signature request.';
    end if;
    v_verb := split_part(v_door, ':', 2);
    if v_class = 'work_approval' then
      -- THE DOOR MAY MAKE ONLY ITS OWN TRANSITION. A mark that is held while the wrong change
      -- goes through is a door with a hole in it, and is refused by name.
      v_from := case when tg_op = 'UPDATE' then lower(coalesce(old.data ->> 'state', 'pending')) end;
      v_to   := lower(coalesce(d ->> 'state', ''));
      if not (   (v_verb = 'request'  and tg_op = 'INSERT' and v_to = 'pending'
                  and nullif(d ->> 'decided_at', '') is null and nullif(d ->> 'decided_by', '') is null)
              or (v_verb = 'decide'   and tg_op = 'UPDATE' and v_from = 'pending'
                  and v_to in ('approved', 'declined') and nullif(d ->> 'decided_by', '') is not null)
              or (v_verb = 'withdraw' and tg_op = 'UPDATE' and v_from = 'pending'   and v_to = 'withdrawn')
              or (v_verb = 'return'   and tg_op = 'UPDATE' and v_from = 'withdrawn' and v_to = 'pending')
              -- HOST-RUN (2026-10-16): run marks an APPROVED host_run as claimed / finished, and changes nothing else.
              or (v_verb = 'run'      and tg_op = 'UPDATE' and v_from = 'approved'  and v_to = 'approved'
                  and old.data #>> '{change,kind}' = 'host_run'
                  and (old.data - array['run_state', 'run_claimed_at', 'run_claimed_by', 'run_finished_at',
                                        'run_outcome', 'run_report', 'run_count'])
                    = (new.data - array['run_state', 'run_claimed_at', 'run_claimed_by', 'run_finished_at',
                                        'run_outcome', 'run_report', 'run_count']))) then
        raise exception 'The approval door "%" does not make the change % → %.', v_verb, coalesce(v_from, 'nothing'), coalesce(nullif(v_to, ''), 'nothing')
          using errcode = '42501',
                hint = 'Nothing was changed. request files a pending approval; decide takes pending to approved or declined; withdraw takes pending to withdrawn; return takes withdrawn back to pending; run marks an approved job as run.';
      end if;
    elsif not (   (v_verb = 'create' and tg_op = 'INSERT')
               or (v_verb in ('sign', 'decline', 'view', 'cancel', 'remind', 'resolve', 'withdraw', 'return') and tg_op = 'UPDATE')) then
      raise exception 'The signature door "%" does not % a signature request.', v_verb, lower(tg_op)
        using errcode = '42501',
              hint = 'Nothing was changed. create inserts a request; every other door updates one that exists.';
    end if;
  end if;

  if v_class = 'sign_request' then
    return new;
  end if;

  perform custom.assert_store_door(new.organization_id, 'custom.record');
  if nullif(d ->> 'subject_id', '') is null then
    raise exception 'an approval has to say what it is about'
      using errcode = '23514', hint = 'A decision with no subject is a decision nobody could apply.';
  end if;
  if not (lower(coalesce(d #>> '{change,kind}', '')) = any (custom.work_approval_kinds())) then
    raise exception 'an approval has to carry a change somebody could actually apply'
      using errcode = '23514',
            hint = 'One of ' || array_to_string(custom.work_approval_kinds(), ', ') ||
                   '. Anything else would be approved and then do nothing.';
  end if;
  -- LANE S5-PRIME: `withdrawn` is the fourth state. Nobody decided it; the thing it would have
  -- changed was archived, and the store closed it with the reason (`withdrawn_reason`).
  if lower(coalesce(d ->> 'state', '')) not in ('pending', 'approved', 'declined', 'withdrawn') then
    raise exception 'an approval is pending, approved, declined or withdrawn, and this one says %',
                    coalesce(nullif(d ->> 'state', ''), 'nothing')
      using errcode = '23514';
  end if;
  if lower(coalesce(d ->> 'state', '')) = 'withdrawn' and nullif(d ->> 'withdrawn_reason', '') is null then
    raise exception 'a withdrawn approval has to say why it was withdrawn'
      using errcode = '23514', hint = 'The person who asked, and the person it was waiting on, both read that sentence.';
  end if;
  if lower(coalesce(d ->> 'state', '')) <> 'pending' and nullif(d ->> 'decided_at', '') is null then
    raise exception 'a decided approval has to say when it was decided'
      using errcode = '23514', hint = 'Otherwise the queue cannot tell a fresh decision from an old one.';
  end if;
  return new;
end
$function$;

CREATE OR REPLACE FUNCTION custom.agent_change_trust(p_organization_id uuid, p_approval_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_me    uuid := custom.query_principal();
  v_row   custom.record;
  v_table uuid;
  v_conv  uuid;
begin
  perform custom.assert_client_may_reach(p_organization_id, 'custom.agent_change_trust');
  if not custom.work_approval_may_decide(p_organization_id, p_approval_id) then
    raise exception 'Only a person who can decide this change can allow the rest of this chat''s changes to that table.'
      using errcode = '42501';
  end if;
  select r.* into v_row from custom.record r
   where r.organization_id = p_organization_id and r.id = p_approval_id
     and r.data_class = 'work_approval' and r.deleted_at is null;
  -- A change TO a table (a column, its name) names the table itself as its subject, filed in the
  -- table-of-tables; a change to a row names the row, filed in the person's table.
  v_table := case when v_row.data ->> 'subject_kind' = 'table'
                  then nullif(v_row.data ->> 'subject_id', '')::uuid
                  else nullif(v_row.data ->> 'subject_table_id', '')::uuid end;
  v_conv  := nullif(v_row.data ->> 'conversation_id', '')::uuid;
  if v_table is null or v_conv is null then
    raise exception 'This change did not come from an agent in a chat about one table, so there is nothing further to allow.'
      using errcode = '22023';
  end if;
  insert into custom.agent_table_trust (organization_id, table_id, conversation_id, trusted_by, approval_id)
  values (p_organization_id, v_table, v_conv, coalesce(v_me, '00000000-0000-0000-0000-000000000000'::uuid), p_approval_id)
  on conflict (organization_id, table_id, conversation_id)
  do update set revoked_at = null, trusted_by = excluded.trusted_by, approval_id = excluded.approval_id,
                trusted_at = now();
  -- HOST-RUN (2026-10-16): a job that writes several tables was approved for each of them (custom.work_approval_decide
  -- asked), so allowing the rest of the chat covers every table it names.
  if v_row.data #>> '{change,kind}' = 'host_run' then
    insert into custom.agent_table_trust (organization_id, table_id, conversation_id, trusted_by, approval_id)
    select distinct p_organization_id, x::uuid, v_conv,
           coalesce(v_me, '00000000-0000-0000-0000-000000000000'::uuid), p_approval_id
      from jsonb_array_elements_text(coalesce(v_row.data #> '{change,job,tables}', '[]'::jsonb)) x
     where x::uuid is distinct from v_table
    on conflict (organization_id, table_id, conversation_id)
    do update set revoked_at = null, trusted_by = excluded.trusted_by, approval_id = excluded.approval_id,
                  trusted_at = now();
  end if;
  return jsonb_build_object('table_id', v_table, 'conversation_id', v_conv);
end
$function$;

-- ── HOST-RUN: the server runs an approved job exactly once ────────────────────────────────

CREATE OR REPLACE FUNCTION custom.work_approval_host_run(p_organization_id uuid, p_fingerprint text, p_conversation_id uuid DEFAULT NULL::uuid, p_approval_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_me  uuid := custom.query_principal();
  v_row custom.record;
  v_run text;
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

CREATE OR REPLACE FUNCTION custom.work_approval_host_run_done(p_organization_id uuid, p_approval_id uuid, p_ok boolean, p_outcome text, p_report jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_me  uuid := custom.query_principal();
  v_row custom.record;
begin
  -- HOST-RUN (2026-10-16): what the approved job did. `ok = true` closes it (it never runs again); `ok = false`
  -- leaves it approved and claimable, so a job that failed part-way can be run again without asking again.
  perform custom.assert_client_may_reach(p_organization_id, 'custom.work_approval_host_run_done');
  select r.* into v_row from custom.record r
   where r.organization_id = p_organization_id and r.id = p_approval_id
     and r.data_class = 'work_approval' and r.deleted_at is null
   for update;
  if v_row.id is null or v_row.data #>> '{change,kind}' is distinct from 'host_run' then
    raise exception 'There is no such job approval in this organization.' using errcode = '02000';
  end if;
  if coalesce(v_row.data ->> 'run_state', '') <> 'running' then
    raise exception 'That job is not running, so there is no run to finish.' using errcode = '55000';
  end if;
  if nullif(v_row.data ->> 'run_claimed_by', '')::uuid is distinct from v_me
     and not custom.work_approval_may_decide(p_organization_id, p_approval_id) then
    raise exception 'That run was started by somebody else.' using errcode = '42501';
  end if;
  perform set_config('custom.decision_door', 'work_approval:run', true);
  update custom.record r
     set data = r.data || jsonb_strip_nulls(jsonb_build_object(
           'run_state',       case when coalesce(p_ok, false) then 'done' else 'failed' end,
           'run_finished_at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
           'run_outcome',     nullif(btrim(coalesce(p_outcome, '')), ''),
           'run_report',      p_report))
   where r.organization_id = p_organization_id and r.id = p_approval_id;
  perform set_config('custom.decision_door', '', true);
  return jsonb_build_object('approval_id', p_approval_id,
                            'run_state', case when coalesce(p_ok, false) then 'done' else 'failed' end);
end
$function$;

REVOKE ALL ON FUNCTION custom.work_approval_host_run(uuid, text, uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION custom.work_approval_host_run_done(uuid, uuid, boolean, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION custom.work_approval_host_run(uuid, text, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION custom.work_approval_host_run_done(uuid, uuid, boolean, text, jsonb) TO authenticated;
