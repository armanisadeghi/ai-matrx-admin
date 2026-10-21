-- INVERSE of migrations/campaign/20261021180000_closeagent_b_an_ai_column_refills_on_its_own.sql (lane CLOSE-AGENT):
-- custom.enrich_declare and custom.automation_time_tick back to their bodies before, and the refill tick gone.
-- chair-step: drops a function.
-- lock: custom
set lock_timeout = '3s';
set statement_timeout = '60s';
CREATE OR REPLACE FUNCTION custom.enrich_normalize(p_organization_id uuid, p_table_id uuid, p_field_key text, p_spec jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_spec    jsonb := coalesce(p_spec, '{}'::jsonb);
  v_instr   text;
  v_inputs  jsonb := '[]'::jsonb;
  v_keys    text[];
  v_key     text;
  v_ceiling text;
  v_rank    integer;
  v_floor   numeric;
  v_every   integer;
  v_policy  text;
  v_model   text;
  v_cap     integer;
  v_sens    text;
begin
  if jsonb_typeof(v_spec) is distinct from 'object' then
    raise exception 'An enrichment has to be written down before it can be saved.'
      using errcode = '22004',
            hint = 'AGT-6: an enrichment is {"instruction": "…", "inputs": ["company_name"], "review_interval_days": 30}.';
  end if;

  -- ── THE INSTRUCTION, IN PLAIN WORDS. It is the whole product: a person says what they
  -- want filled in and the platform carries it. A blank one is refused here rather than
  -- discovered by a model that then invents a job for itself.
  v_instr := nullif(btrim(coalesce(v_spec ->> 'instruction', '')), '');
  if v_instr is null then
    raise exception 'An enrichment has to say, in plain words, what to fill in.'
      using errcode = '22004',
            hint = 'For example: "the industry this company is in, in two or three words". That sentence is what the model is asked, so write it the way you would say it to a person.';
  end if;
  if length(v_instr) < 8 then
    raise exception 'The instruction "%" is too short to be an instruction.', v_instr
      using errcode = '22004',
            hint = 'Say what you want filled in and how you want it written — a few words is enough, but "yes" or "do it" is not something a model can act on.';
  end if;

  -- ── THE SENSITIVITY CEILING (AGT-7), asked ONCE for the whole declaration.
  v_ceiling := coalesce(nullif(btrim(platform.knob_resolve('custom', 'enrichment_sensitivity_ceiling',
                                                           p_organization_id) #>> '{}'), ''), 'internal');
  if custom.enrich_sensitivity_rank(v_ceiling) is null then
    raise exception 'This organization''s enrichment sensitivity ceiling is set to "%", which is not one of the four levels.', v_ceiling
      using errcode = '22023',
            hint = 'The levels, least to most, are public, internal, restricted, confidential. Fix custom/enrichment_sensitivity_ceiling for this organization.';
  end if;

  select f.data ->> 'sensitivity' into v_sens
    from custom.record f
   where f.organization_id = p_organization_id
     and f.table_id = custom.field_kernel_id()
     and f.deleted_at is null
     and (f.data ->> 'entity_definition_id')::uuid = p_table_id
     and f.data ->> 'key' = p_field_key;
  if custom.enrich_sensitivity_rank(coalesce(v_sens, 'internal')) > custom.enrich_sensitivity_rank(v_ceiling) then
    raise exception 'A model may not fill in "%" — that field is marked % and this organization lets an enrichment go no higher than %.',
                    p_field_key, coalesce(v_sens, 'internal'), v_ceiling
      using errcode = '42501',
            hint = 'AGT-7: either lower the field''s sensitivity, or raise custom/enrichment_sensitivity_ceiling for this organization. Nothing was saved.';
  end if;

  -- ── THE INPUTS: other Fields of the same record. Anything that is not one is refused by
  -- name with the real keys, because a typo here means an enrichment that reads nothing and
  -- answers anyway.
  select coalesce(array_agg(f.data ->> 'key' order by f.data ->> 'key'), '{}'::text[])
    into v_keys
    from custom.applicable_fields(p_organization_id, p_table_id, null) f
   where nullif(f.data ->> 'key', '') is not null;

  if jsonb_typeof(v_spec -> 'inputs') = 'array' then
    for v_key in select value from jsonb_array_elements_text(v_spec -> 'inputs') loop
      v_key := btrim(v_key);
      if v_key = p_field_key then
        raise exception 'An enrichment cannot read the very field it fills in.'
          using errcode = '22023',
                hint = format('"%s" is the field this enrichment writes. Give it the OTHER columns the answer can be worked out from.', p_field_key);
      end if;
      if not (v_key = any (v_keys)) then
        raise exception 'This table has no field called "%", so an enrichment cannot read it.', v_key
          using errcode = '22023',
                hint = format('The columns are %s.', array_to_string(v_keys, ', '));
      end if;
      select f.data ->> 'sensitivity' into v_sens
        from custom.record f
       where f.organization_id = p_organization_id
         and f.table_id = custom.field_kernel_id()
         and f.deleted_at is null
         and (f.data ->> 'entity_definition_id')::uuid = p_table_id
         and f.data ->> 'key' = v_key;
      if custom.enrich_sensitivity_rank(coalesce(v_sens, 'internal')) > custom.enrich_sensitivity_rank(v_ceiling) then
        raise exception 'An enrichment may not read "%" — that field is marked % and this organization lets an enrichment go no higher than %.',
                        v_key, coalesce(v_sens, 'internal'), v_ceiling
          using errcode = '42501',
                hint = 'AGT-7: a sensitive value is not fed to a model just because it is next door. Drop it from the inputs, lower its sensitivity, or raise custom/enrichment_sensitivity_ceiling. Nothing was saved.';
      end if;
      v_inputs := v_inputs || to_jsonb(v_key);
    end loop;
  end if;

  -- ── FRESHNESS (AGT-6). Absent means "fill it once and leave it alone", which is a real
  -- answer and not an omission, so it is kept as null rather than given a number nobody chose.
  if v_spec ? 'review_interval_days' and jsonb_typeof(v_spec -> 'review_interval_days') <> 'null' then
    if jsonb_typeof(v_spec -> 'review_interval_days') <> 'number'
       or (v_spec ->> 'review_interval_days')::numeric < 1
       or (v_spec ->> 'review_interval_days')::numeric <> floor((v_spec ->> 'review_interval_days')::numeric) then
      raise exception 'How often to check a value again is a whole number of days, 1 or more, and this says "%".',
                      v_spec ->> 'review_interval_days'
        using errcode = '22023',
              hint = 'AGT-6: 30 means "look at it again a month after it was written". Leave it out entirely to fill the column once and never re-check it.';
    end if;
    v_every := (v_spec ->> 'review_interval_days')::integer;
  end if;

  -- ── THE CONFIDENCE FLOOR.
  v_floor := coalesce(
    case when v_spec ? 'confidence_floor' and jsonb_typeof(v_spec -> 'confidence_floor') = 'number'
         then (v_spec ->> 'confidence_floor')::numeric end,
    (platform.knob_resolve('custom', 'enrichment_confidence_floor', p_organization_id) #>> '{}')::numeric,
    0.6);
  if v_floor < 0 or v_floor > 1 then
    raise exception 'How sure the model has to be is a number between 0 and 1, and this says "%".', v_floor
      using errcode = '22023',
            hint = '0.6 means "write it when the model is at least sixty percent sure, otherwise keep it as a candidate". 0 writes whatever it says; 1 writes almost nothing.';
  end if;

  -- ── THE WRITE POLICY (AGT-4). It inherits the organization's own agent-change setting,
  -- because "may an agent change my data without asking" is one question and not two.
  -- ONE READER OF THE SETTING (AGENTS-ON-DATA, found live 2026-10-05): the organization's answer
  -- comes from custom.agent_change_approval — the same never_ask / ask / always_ask the settings
  -- screen writes and the approval check reads. This used to read the raw knob and know only the
  -- old words, so an organization set to "Never ask" could not set up any column a model fills.
  v_policy := lower(btrim(coalesce(
    nullif(v_spec ->> 'write_policy', ''),
    case (custom.agent_change_approval(p_organization_id) ->> 'setting')
      when 'never_ask' then 'auto'
      else 'ask' end)));
  if v_policy not in ('auto', 'ask') then
    raise exception '"%" is not a way of deciding whether an agent may write this column.', v_policy
      using errcode = '22023',
            hint = 'AGT-4: it is auto (the enrichment writes as soon as an admin enables it) or ask (somebody answers a request first). It defaults to this organization''s custom/agent_schema_changes.';
  end if;

  -- THE MODEL IS THE MANDATE'S (AI-COLUMN, Arman 2026-10-19). A column stores a model only when a
  -- person picked one for it. Otherwise it stores none, and each row runs on the model of the
  -- agent bound to table.column_fill / table.column_fill_image (Haiku first; Sonnet or Opus only
  -- after tests prove the cheaper one fails). The retired knob custom.enrichment_model stamped
  -- claude-opus-5-5 onto every new column and overrode that agent.
  v_model := nullif(btrim(coalesce(v_spec ->> 'model', '')), '');

  v_cap := coalesce(
    case when v_spec ? 'cost_cap_cents' and jsonb_typeof(v_spec -> 'cost_cap_cents') = 'number'
         then (v_spec ->> 'cost_cap_cents')::integer end,
    (platform.knob_resolve('custom', 'enrichment_cost_cap_cents', p_organization_id) #>> '{}')::integer,
    2000);

  return jsonb_strip_nulls(jsonb_build_object(
    'instruction',      v_instr,
    'inputs',           v_inputs,
    'web_search',       coalesce((v_spec ->> 'web_search')::boolean, false),
    'connected_source', nullif(btrim(coalesce(v_spec ->> 'connected_source', '')), ''),
    'data_source',     custom.enrich_data_source(v_spec -> 'data_source', v_inputs),
    'model',            v_model,
    'confidence_floor', v_floor,
    'write_policy',     v_policy,
    'cost_cap_cents',   v_cap,
    'review_interval_days', v_every,
    'enabled',          coalesce((v_spec ->> 'enabled')::boolean, false),
    'enabled_by',       nullif(v_spec ->> 'enabled_by', ''),
    'enabled_at',       nullif(v_spec ->> 'enabled_at', ''),
    'declared_by',      nullif(v_spec ->> 'declared_by', ''),
    'declared_at',      nullif(v_spec ->> 'declared_at', '')));
end;
$function$;

CREATE OR REPLACE FUNCTION custom.enrich_declare(p_organization_id uuid, p_field_id uuid, p_spec jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_me      uuid := auth.uid();
  v_field   jsonb;
  v_table   uuid;
  v_key     text;
  v_cfg     jsonb;
  v_prior   jsonb;
  v_enabled boolean;
begin
  perform custom.assert_store_door(p_organization_id, 'custom.enrich_declare');
  perform custom.assert_client_may_reach(p_organization_id, 'custom.enrich_declare');

  select f.data, (f.data ->> 'entity_definition_id')::uuid, f.data ->> 'key'
    into v_field, v_table, v_key
    from custom.record f
   where f.organization_id = p_organization_id
     and f.id = p_field_id
     and f.table_id = custom.field_kernel_id()
     and f.deleted_at is null;
  if v_field is null then
    raise exception 'There is no such field in this organization, so nothing was changed.'
      using errcode = '23503', hint = 'REC-29: organizations are hard walls. A field id from another organization reads as absent.';
  end if;
  if v_table is null then
    raise exception 'That field does not belong to a table, so nothing can fill it in.'
      using errcode = '23503', hint = 'An enrichment fills a column of a Table; this Field record names none.';
  end if;

  perform custom.assert_client_may_change(p_organization_id, v_table, 'custom.enrich_declare',
                                          'admin'::public.permission_level, 'table');

  -- A WORKED-OUT COLUMN ALREADY HAS AN ANSWER. A formula, a rollup and a lookup are computed
  -- by the store from other values; asking a model to also fill them would put two writers on
  -- one cell and neither would be wrong on its own.
  if coalesce(v_field ->> 'parity_type', '') in ('formula', 'rollup', 'lookup') then
    raise exception '"%" is worked out from other columns already, so a model has nothing to fill in there.',
                    coalesce(v_field ->> 'label', v_key)
      using errcode = '22023',
            hint = 'REC-18: a formula, a rollup and a lookup are computed by the store. Put the enrichment on a column that holds a value of its own.';
  end if;

  v_prior := coalesce(v_field -> 'source_config', '{}'::jsonb);

  -- The declaration inherits what is already there, so turning one ON is
  -- `{"enabled": true}` and nothing else, and does not quietly reset the instruction.
  v_cfg := custom.enrich_normalize(
    p_organization_id, v_table, v_key,
    (case when (v_field ->> 'source') = 'agent' then v_prior else '{}'::jsonb end)
    || jsonb_strip_nulls(jsonb_build_object('review_interval_days',
         coalesce(p_spec -> 'review_interval_days', v_field -> 'review_interval_days')))
    || coalesce(p_spec, '{}'::jsonb));

  v_enabled := coalesce((v_cfg ->> 'enabled')::boolean, false);

  -- WHO IS ANSWERABLE FOR WHAT IT WRITES. Every value this enrichment lands afterwards says
  -- it was written by an agent ON BEHALF OF this person (VAL-8), so the enable has to name
  -- one and it is the person standing here, never an argument a caller supplies.
  if v_enabled and v_me is null then
    raise exception 'Nobody is signed in, so there is nobody for the agent to act on behalf of.'
      using errcode = '42501',
            hint = 'AGT-N-4: an agent carries the authority of the person who turned it on, and every value it writes names that person.';
  end if;
  if v_enabled then
    v_cfg := v_cfg || jsonb_build_object(
      'enabled_by', coalesce(v_cfg ->> 'enabled_by', v_me::text),
      'enabled_at', coalesce(v_cfg ->> 'enabled_at', now()::text));
  else
    v_cfg := v_cfg - 'enabled_by' - 'enabled_at';
  end if;
  v_cfg := v_cfg || jsonb_build_object(
    'declared_by', coalesce(v_cfg ->> 'declared_by', v_me::text),
    'declared_at', coalesce(v_cfg ->> 'declared_at', now()::text));

  -- THROUGH THE FIELD'S OWN DOOR, so History, the change feed and every guard on a Field
  -- change run exactly as they do for a label or a sensitivity. custom.field_update carries
  -- `source`, `source_config` and `review_interval_days` as of this lane's class fix.
  perform custom.field_update(p_organization_id, p_field_id, jsonb_strip_nulls(jsonb_build_object(
    'source',               'agent',
    'source_config',        v_cfg,
    'review_interval_days', v_cfg -> 'review_interval_days')));

  return jsonb_build_object(
    'field_id',   p_field_id,
    'table_id',   v_table,
    'field_key',  v_key,
    'label',      coalesce(v_field ->> 'label', v_key),
    'enrichment', v_cfg,
    'says', case when v_enabled
                 then format('"%s" is filled in by a model now. %s',
                             coalesce(v_field ->> 'label', v_key),
                             case when (v_cfg ->> 'review_interval_days') is null
                                  then 'It is filled once and then left alone until somebody asks again.'
                                  else format('Each value is looked at again %s days after it was written.',
                                              v_cfg ->> 'review_interval_days') end)
                 else format('"%s" is set up to be filled in by a model, and is switched off until somebody turns it on. Nothing will be written until then.',
                             coalesce(v_field ->> 'label', v_key)) end);
end;
$function$;

CREATE OR REPLACE FUNCTION custom.automation_time_tick()
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_now  timestamptz := custom._automation_now();
  t      record;
  v_a    jsonb;
  v_who  uuid;
  v_held text;
  v_ran  integer := 0;
  v_failed integer := 0;
  v_sync jsonb;
begin
  for t in
    select tb.organization_id, tb.id as table_id, tb.data -> 'automations' as autos
      from custom.record tb
      join iam.organizations g on g.id = tb.organization_id and g.archived_at is null
     where tb.data_class = 'table' and tb.deleted_at is null
       and jsonb_typeof(tb.data -> 'automations') = 'array'
       and (tb.data -> 'automations' @> '[{"spec":{"trigger":{"on":"date_arrives"}}}]'::jsonb
            or tb.data -> 'automations' @> '[{"spec":{"trigger":{"on":"schedule"}}}]'::jsonb)
  loop
    for v_a in select e from jsonb_array_elements(t.autos) e loop
      continue when (v_a ->> 'archived_at') is not null or not coalesce((v_a ->> 'enabled')::boolean, false)
                 or (v_a -> 'spec' -> 'trigger' ->> 'on') not in ('date_arrives', 'schedule');
      -- THE PRINCIPAL OF AN UNATTENDED RUN IS THE PERSON WHO SET IT UP.
      v_who := coalesce(nullif(v_a ->> 'created_by', '')::uuid, nullif(v_a ->> 'updated_by', '')::uuid);
      v_held := current_setting('request.jwt.claims', true);
      perform set_config('request.jwt.claims', jsonb_build_object('sub', v_who, 'role', 'authenticated')::text, true);
      begin
        v_ran := v_ran + custom._automation_time_item(t.organization_id, t.table_id, v_a, v_now);
      exception when others then
        v_failed := v_failed + 1;
        -- ONE AUTOMATION'S TROUBLE NEVER STOPS THE REST — and it is loud.
        raise warning 'custom.automation_time_tick: table % automation %: % (%)', t.table_id, v_a ->> 'id', sqlerrm, sqlstate;
      end;
      perform set_config('request.jwt.claims', coalesce(v_held, ''), true);
    end loop;
  end loop;
  -- LANE SYNC-AIRTABLE: synced tables ride this same tick (no schedule of their own).
  begin
    v_sync := custom.table_sync_due_tick();
  exception when others then
    raise warning 'custom.automation_time_tick: synced tables: % (%)', sqlerrm, sqlstate;
    v_sync := jsonb_build_object('error', sqlerrm);
  end;
  return jsonb_build_object('ran', v_ran, 'failed', v_failed, 'at', v_now, 'synced_tables', v_sync);
end
$function$;

drop function if exists custom.enrich_refill_due_tick();
