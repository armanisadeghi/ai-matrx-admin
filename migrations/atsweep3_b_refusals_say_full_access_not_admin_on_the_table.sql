-- why: AT-SWEEP-3: seven more refusals said "an admin on the table" / "whoever holds Admin on this table" for the access ladder's top rung; the share screens and the vocabulary say Full access.
-- Proof: scripts/campaign-tests/atsweep3_a_the_ladder_refusal_names_the_action_not_the_door.sql (PART 2). Inverse: migrations/inverse/atsweep3_b_refusals_say_full_access_not_admin_on_the_table_down.sql
-- based-on: custom.enrich_land(uuid, uuid, jsonb, jsonb) 575fa6ddedfaac755cced1f9ff331930753900ef667ed0553f2dac97328b40c8
-- based-on: custom.promote_table(uuid, uuid) 31485e33bb55fde9784faea0f7238c1288cec8f1920fb9f88a1339755bdd0a1f
-- based-on: custom.subscription_preview(uuid, uuid) d3d4c3dd6c05661b4ce64a5d1fc13f547796b007cb8f1aadb9bd0c0a33a63366
-- based-on: custom.table_share_outside(uuid, uuid) d3aecf6850e3eeec22f1c7cd0eb4e47fffbeab7cf5be25eca2b9afa16638b484
-- based-on: custom.dashboard_target_field_assert(uuid, uuid, text) 9d6948a0b361fc4f7d2579dd36d42980c5861fa8e23e4563f9382a7928e28f11
-- based-on: custom.agg_fields_readable_assert(uuid, uuid, text[], text) c9ad9bf4beb48b10d84f39174f5f5f1250dcb37a19775e1226be1e19e599703a
-- based-on: content._document_guard_data_class() f0cf46644204c5cccf6feaf29af8ed1cce4486407d12f71aa1c7fa43dce3cc97
CREATE OR REPLACE FUNCTION custom.enrich_land(p_organization_id uuid, p_field_id uuid, p_results jsonb, p_run jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_table   uuid;
  v_key     text;
  v_cfg     jsonb;
  v_floor   numeric;
  v_obo     text;
  v_model   text;
  v_trig    text;
  v_cost    numeric;
  v_cap     numeric;
  v_spent   numeric;
  v_run_id  uuid;
  r         jsonb;
  v_rid     uuid;
  v_doc     jsonb;
  v_env     jsonb;
  v_alts    jsonb;
  a         jsonb;
  v_conf    numeric;
  v_src     jsonb;
  v_absent  text;
  v_level   public.permission_level;
  n_written integer := 0;
  n_absent  integer := 0;
  n_floor   integer := 0;
  n_pinned  integer := 0;
  n_refused integer := 0;
  v_out     jsonb := '[]'::jsonb;
  v_why     text;
begin
  perform custom.assert_store_door(p_organization_id, 'custom.enrich_land');
  perform custom.assert_client_may_reach(p_organization_id, 'custom.enrich_land');

  select (f.data ->> 'entity_definition_id')::uuid, f.data ->> 'key',
         coalesce(f.data -> 'source_config', '{}'::jsonb)
    into v_table, v_key, v_cfg
    from custom.record f
   where f.organization_id = p_organization_id
     and f.id = p_field_id
     and f.table_id = custom.field_kernel_id()
     and f.deleted_at is null
     and f.data ->> 'source' = 'agent';
  if v_table is null then
    raise exception 'There is no column here that a model fills in, so there is nothing to write into.'
      using errcode = '23503',
            hint = 'Set the enrichment up first with custom.enrich_declare. A field id from another organization reads as absent.';
  end if;

  -- THE ENABLE IS THE STANDING APPROVAL (AGT-4). An admin turning the enrichment on is the
  -- act that authorises every value it writes afterwards; without it there is no approval to
  -- stand on and nothing lands, however the run got here.
  if not coalesce((v_cfg ->> 'enabled')::boolean, false) then
    raise exception 'That column is set up to be filled in by a model, and it is switched off, so nothing was written.'
      using errcode = '42501',
            hint = 'Someone with Full access on the table turns it on with custom.enrich_declare({"enabled": true}). Turning it on is what authorises the agent to write, and every value it writes says so on the cell.';
  end if;

  v_obo := nullif(v_cfg ->> 'enabled_by', '');
  if v_obo is null then
    raise exception 'That enrichment does not say whose authority it runs on, so nothing was written.'
      using errcode = '22004',
            hint = 'VAL-8/AGT-N-4: every value an agent writes names the person it acted for. Turn the enrichment off and on again so it records who enabled it.';
  end if;

  v_floor := coalesce((v_cfg ->> 'confidence_floor')::numeric, 0.6);
  v_model := coalesce(nullif(p_run ->> 'model', ''), nullif(v_cfg ->> 'model', ''), 'unstated');
  v_trig  := lower(btrim(coalesce(nullif(p_run ->> 'trigger', ''), 'batch')));
  if not (v_trig = any (custom.enrich_triggers())) then
    raise exception '"%" is not a reason a run happens.', v_trig
      using errcode = '22023',
            hint = format('The reasons are %s.', array_to_string(custom.enrich_triggers(), ', '));
  end if;
  v_cost := greatest(coalesce((p_run ->> 'cost_cents')::numeric, 0), 0);

  -- THE COST CAP, ASKED AGAIN ON THE WAY OUT. custom.enrich_due asked it before the money
  -- was spent; this asks it before the money is recorded, so a run that overshoots is
  -- refused loudly here rather than discovered in a total next month.
  v_cap := coalesce((platform.knob_resolve('custom', 'enrichment_cost_cap_cents', p_organization_id) #>> '{}')::numeric, 2000);
  select coalesce(sum(coalesce((x.data ->> 'cost_cents')::numeric, 0)), 0) into v_spent
    from custom.record x
   where x.organization_id = p_organization_id
     and x.table_id = custom.organization_kernel_id()
     and x.data_class = custom.enrich_run_class()
     and x.deleted_at is null
     and x.created_at >= date_trunc('month', now());
  if v_spent + v_cost > v_cap then
    raise exception 'This run costs % cents, this organization has already spent % of its % cent budget this month, so nothing was written.',
                    round(v_cost, 2), round(v_spent, 2), v_cap
      using errcode = '53400',
            hint = 'The budget is custom/enrichment_cost_cap_cents and an organization may change it. Nothing landed and no run was recorded — raise the budget and run it again.';
  end if;

  if jsonb_typeof(coalesce(p_results, '[]'::jsonb)) is distinct from 'array' then
    raise exception 'The model''s answers are a list, one per record.'
      using errcode = '22004',
            hint = 'Send [] for a run that produced nothing; the run is still recorded with what it cost.';
  end if;

  for r in select e from jsonb_array_elements(coalesce(p_results, '[]'::jsonb)) e loop
    v_rid := nullif(r ->> 'record_id', '')::uuid;
    if v_rid is null then
      raise exception 'One of the model''s answers does not say which record it is about.'
        using errcode = '22004', hint = 'Every result carries record_id — the id custom.enrich_due handed out.';
    end if;

    select rec.data into v_doc
      from custom.record rec
     where rec.organization_id = p_organization_id
       and rec.id = v_rid
       and rec.table_id = v_table
       and rec.deleted_at is null;
    if v_doc is null then
      n_refused := n_refused + 1;
      v_out := v_out || jsonb_build_array(jsonb_build_object('record_id', v_rid, 'outcome', 'gone',
        'says', 'That record was deleted while the run was working, so nothing was written into it.'));
      continue;
    end if;

    -- THE PERSON'S OWN AUTHORITY, ROW BY ROW (AGT-N-4). An agent may write exactly where the
    -- person it acts for may write; a row they only hold at viewer is refused BY NAME instead
    -- of being written under the definer's privileges.
    v_level := custom.my_level(p_organization_id, v_rid, 'record');
    if v_level is null or v_level < 'editor'::public.permission_level then
      n_refused := n_refused + 1;
      v_out := v_out || jsonb_build_array(jsonb_build_object('record_id', v_rid, 'outcome', 'refused',
        'says', 'You cannot change that record, so the agent acting for you cannot either.'));
      continue;
    end if;

    -- A PINNED CELL IS A PERSON'S DECISION AND IT WINS. It is not overwritten, it is not
    -- versioned, and the run says so instead of reporting a success it did not have.
    if coalesce((v_doc -> '_values' -> v_key ->> 'pinned')::boolean, false) then
      n_pinned := n_pinned + 1;
      v_out := v_out || jsonb_build_array(jsonb_build_object('record_id', v_rid, 'outcome', 'pinned',
        'says', 'Somebody typed this one in themselves, so the model left it alone.'));
      continue;
    end if;

    v_conf := case when jsonb_typeof(r -> 'confidence') = 'number' then (r ->> 'confidence')::numeric end;
    v_src := jsonb_strip_nulls(jsonb_build_object(
      'kind',          'enrichment',
      'field_id',      p_field_id,
      'model',         v_model,
      'model_version', nullif(p_run ->> 'model_version', ''),
      'instruction',   nullif(v_cfg ->> 'instruction', ''),
      'read',          case when jsonb_typeof(r -> 'evidence' -> 'read') = 'array' then r -> 'evidence' -> 'read' end,
      'note',          nullif(r -> 'evidence' ->> 'note', ''),
      'confidence',    to_jsonb(v_conf),
      'at',            to_jsonb(now())));

    -- The candidates the model also considered, kept whatever happens (VAL-3/VAL-4): they
    -- live inside this record's one document, never as a row of their own.
    v_alts := '[]'::jsonb;
    if jsonb_typeof(r -> 'alternates') = 'array' then
      for a in select e from jsonb_array_elements(r -> 'alternates') e loop
        v_alts := v_alts || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
          'value', a -> 'value',
          'rank',  coalesce(a -> 'rank', to_jsonb(jsonb_array_length(v_alts) + 2)),
          'src',   coalesce(a -> 'evidence', v_src))));
      end loop;
    end if;

    v_absent := nullif(btrim(coalesce(r ->> 'absent', '')), '');

    if v_absent is null and (not (r ? 'value') or jsonb_typeof(r -> 'value') = 'null') then
      -- The model looked and there was nothing to find. VAL-2's word for that is `none`, and
      -- saying it is the whole point: a blank cell and a cell nobody asked about are
      -- different facts, and a person deciding what to do next needs to know which this is.
      v_absent := 'none';
    elsif v_absent is null and v_conf is not null and v_conf < v_floor then
      -- BELOW THE FLOOR. The model's best answer becomes the top-ranked CANDIDATE and the
      -- cell says `conflicting` — a guess never sits where a person reads a fact.
      n_floor := n_floor + 1;
      v_alts := jsonb_build_array(jsonb_build_object('value', r -> 'value', 'rank', 1, 'src', v_src))
                || (select coalesce(jsonb_agg(jsonb_set(e, '{rank}', to_jsonb(((e ->> 'rank')::int) + 1))), '[]'::jsonb)
                      from jsonb_array_elements(v_alts) e);
      v_absent := 'conflicting';
    end if;

    if v_absent is not null then
      if not (v_absent = any (custom.absence_reasons())) then
        raise exception '"%" is not a reason a value can be missing.', v_absent
          using errcode = '22023',
                hint = format('The reasons are %s.', array_to_string(custom.absence_reasons(), ', '));
      end if;
      v_env := jsonb_strip_nulls(jsonb_build_object(
        'absent', v_absent, 'src', v_src,
        'alternates', case when jsonb_array_length(v_alts) > 0 then v_alts end));
      v_doc := (v_doc - v_key)
               || jsonb_build_object('_values',
                    coalesce(v_doc -> '_values', '{}'::jsonb) || jsonb_build_object(v_key, v_env));
      if v_absent <> 'conflicting' then n_absent := n_absent + 1; end if;
      v_why := case v_absent
                 when 'none'        then 'The model looked and there was nothing to find.'
                 when 'refused'     then 'The model would not answer this one.'
                 when 'conflicting' then 'The model was not sure enough to write it, so its answer is kept as a candidate on the cell.'
                 else 'Nobody has asked about this one yet.' end;
    else
      v_env := jsonb_strip_nulls(jsonb_build_object(
        'src', v_src,
        'alternates', case when jsonb_array_length(v_alts) > 0 then v_alts end));
      v_doc := (v_doc - '_values' || jsonb_build_object(v_key, r -> 'value'))
               || jsonb_build_object('_values',
                    (coalesce(v_doc -> '_values', '{}'::jsonb) - v_key) || jsonb_build_object(v_key, v_env));
      n_written := n_written + 1;
      v_why := 'Filled in by the model.';
    end if;

    -- THE WRITE. `_actor` and `_on_behalf_of` are the store's reserved declaration: this is
    -- an AGENT write, acting for the person who enabled the enrichment, and custom._value_envelope
    -- refuses it if either half is missing. The badge on the cell is that fact, not a style.
    update custom.record
       set data = v_doc || jsonb_build_object('_actor', 'agent', '_on_behalf_of', v_obo),
           updated_at = now(),
           version = version + 1
     where organization_id = p_organization_id and id = v_rid and deleted_at is null;

    v_out := v_out || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
      'record_id', v_rid,
      'outcome', case when v_absent is null then 'written'
                      when v_absent = 'conflicting' then 'below the floor'
                      else 'absent' end,
      'absent', v_absent, 'confidence', to_jsonb(v_conf), 'says', v_why)));
  end loop;

  -- THE RUN, AND THE MONEY. One record, under the Organization kernel, in this same
  -- transaction — so "what has this column cost" is a sum over the organization's own
  -- records with no second ledger to keep level.
  insert into custom.record (organization_id, table_id, data_class, data)
  values (p_organization_id, custom.organization_kernel_id(), custom.enrich_run_class(),
          jsonb_strip_nulls(jsonb_build_object(
            'field_id',      p_field_id,
            'table_id',      v_table,
            'field_key',     v_key,
            'model',         v_model,
            'model_version', nullif(p_run ->> 'model_version', ''),
            'trigger',       v_trig,
            'started_at',    nullif(p_run ->> 'started_at', ''),
            'finished_at',   now()::text,
            'rows_seen',     jsonb_array_length(coalesce(p_results, '[]'::jsonb)),
            'rows_written',  n_written,
            'rows_absent',   n_absent,
            'rows_below_floor', n_floor,
            'rows_pinned',   n_pinned,
            'rows_refused',  n_refused,
            'cost_cents',    v_cost,
            'cost_per_row_cents', case when n_written + n_absent + n_floor > 0
                                       then round(v_cost / (n_written + n_absent + n_floor), 4) end,
            'tokens_in',     nullif(p_run ->> 'tokens_in', ''),
            'tokens_out',    nullif(p_run ->> 'tokens_out', ''),
            'on_behalf_of',  v_obo)))
  returning id into v_run_id;

  return jsonb_build_object(
    'run_id', v_run_id, 'field_id', p_field_id, 'field_key', v_key, 'table_id', v_table,
    'rows_seen', jsonb_array_length(coalesce(p_results, '[]'::jsonb)),
    'rows_written', n_written, 'rows_absent', n_absent, 'rows_below_floor', n_floor,
    'rows_pinned', n_pinned, 'rows_refused', n_refused,
    'cost_cents', v_cost,
    'cost_per_row_cents', case when n_written + n_absent + n_floor > 0
                               then round(v_cost / (n_written + n_absent + n_floor), 4) end,
    'budget_left_cents', round(v_cap - (v_spent + v_cost), 2),
    'results', v_out,
    'says', format('%s of %s filled in, %s left alone because somebody typed them in themselves, %s kept as candidates, %s with nothing to find. It cost %s cents.',
                   n_written, jsonb_array_length(coalesce(p_results, '[]'::jsonb)),
                   n_pinned, n_floor, n_absent, round(v_cost, 2)));
end;
$function$;

CREATE OR REPLACE FUNCTION custom.promote_table(p_organization_id uuid, p_table_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_moved  bigint;
  v_before bigint;
  v_after  bigint;
  v_was    text;
  v_owner  oid;
  f        record;
  v_built  jsonb := '[]'::jsonb;
begin
  perform custom.assert_store_door(p_organization_id, 'custom.promote_table');
  perform custom.assert_client_may_reach(p_organization_id, 'custom.promote_table');

  -- 🚨 ONE QUESTION MORE THAN THE OTHER DOORS, and it is because of what this one DOES:
  -- it builds indexes on `custom.record`, a sixteen-way hash-partitioned table shared by
  -- every organization. Moving a Table to fast storage is a storage decision, not an edit,
  -- so a member who may write records still may not make it — `admin` on the Table itself
  -- is what may, and that is the same ladder every other access answer in this store uses.
  select c.relowner into v_owner from pg_class c where c.oid = 'custom.record'::regclass;
  if not pg_has_role(custom.caller_role(), v_owner, 'member')
     and not custom.has_visibility(auth.uid(), 'record', p_table_id, 'admin'::public.permission_level) then
    raise exception 'Moving this table to fast storage is an administrator''s change, and you have not been given that on this table.'
      using errcode = '42501',
            hint = 'Promoting a table builds indexes across the whole store, so it asks for Full access on the table rather than Edit access. Ask somebody who has Full access on this table to do it.';
  end if;

  v_was := custom.table_storage(p_organization_id, p_table_id);
  if v_was is null then
    raise exception 'That is not a table of this organization, so there was nothing to move.'
      using errcode = '23503',
            hint = 'REC-4: promoting a Table is per Table and per organization. The store is keyed (organization_id, id), so a Table of another organization is not found by this one - and a Table that was deleted is not found either.';
  end if;
  select count(*) into v_before from custom.record r
   where r.organization_id = p_organization_id and r.table_id = p_table_id;

  -- 🚨 NO INDEX IS BUILT INSIDE THIS DOOR (lane FOLLOW-BATCH-3, the class of D357). custom.promote_field's
  -- route A ran CREATE INDEX on the partitioned custom.record here: a ShareLock on all sixteen partitions for
  -- the whole build, so every write in the store — every organization's — waited while one person promoted
  -- one Table. The door now (1) gives every UNIQUE promoted Field the store's own unique rule, which is what
  -- keeps its values apart from this moment (custom._unique_rule_holds: advisory lock, then EXISTS, then
  -- 23505), and (2) answers the non-blocking build as `indexes_owed`: custom.promoted_index_ddl's statements,
  -- one CONCURRENTLY per partition, which run outside any transaction — aidream
  -- `uv run python scripts/build_promoted_indexes.py --organization <id> --table <id>`. Until they run the
  -- Table reads as it always did, only without the faster index.
  for f in select * from custom.promoted_fields(p_organization_id, p_table_id) where indexable and is_unique loop
    update custom.record r
       set data = jsonb_set(r.data, '{rules}', coalesce(r.data -> 'rules', '[]'::jsonb) || '[{"kind": "unique"}]'::jsonb)
     where r.organization_id = p_organization_id and r.id = f.field_id and r.table_id = custom.field_kernel_id()
       and not (coalesce(r.data -> 'rules', '[]'::jsonb) @> '[{"kind": "unique"}]'::jsonb);
  end loop;
  select coalesce(jsonb_agg(jsonb_build_object('step', d.step, 'purpose', d.purpose, 'statement', d.statement)
                            order by d.step), '[]'::jsonb)
    into v_built
    from custom.promoted_index_ddl(p_organization_id, p_table_id) d;

  update custom.record
     set data = data || jsonb_build_object('storage', 'heavy')
   where organization_id = p_organization_id and id = p_table_id
     and table_id = custom.table_kernel_id();
  get diagnostics v_moved = row_count;
  if v_moved = 0 then
    raise exception 'Nothing was changed, so this table was not moved to fast storage.'
      using errcode = '42501',
            hint = 'REC-4: the table is there and readable, but this caller''s write did not reach it. Nothing was built and nothing was left half-done.';
  end if;

  select count(*) into v_after from custom.record r
   where r.organization_id = p_organization_id and r.table_id = p_table_id;

  return jsonb_build_object('was', v_was, 'now', custom.table_storage(p_organization_id, p_table_id),
                            'records_before', v_before, 'records_after', v_after,
                            'rows_moved', v_after - v_before, 'indexes', '[]'::jsonb,
                            'indexes_owed', v_built,
                            'says', 'Moved to fast storage. Its indexes are built without stopping anybody''s writes, outside this save: run the statements in indexes_owed one at a time (aidream scripts/build_promoted_indexes.py does). A unique field keeps its values apart from now on.',
                            'table_rows_changed', v_moved);
end $function$;

CREATE OR REPLACE FUNCTION custom.subscription_preview(p_organization_id uuid, p_rule_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_me    uuid := custom.query_principal();
  v_rule  custom.record;
  v_who   uuid;
begin
  perform custom.assert_client_may_reach(p_organization_id, 'custom.subscription_preview');
  select * into v_rule from custom.record r
   where r.organization_id = p_organization_id and r.id = p_rule_id
     and r.data_class = 'rule' and r.deleted_at is null;
  if not found or not (v_rule.data ? 'subscription') then
    raise exception 'There is no such subscription here.' using errcode = '23503',
            detail = jsonb_build_object('rule_id', p_rule_id)::text;
  end if;

  v_who := nullif(v_rule.data -> 'subscription' ->> 'recipient_user_id', '')::uuid;
  -- SHOWING SOMEBODY ELSE'S SUMMARY WOULD SHOW THEM THEIR RECORDS. The same rung
  -- muting takes: your own is yours, and somebody else's takes admin on the Table.
  if v_who is distinct from v_me
     and not custom.query_is_store_owner()
     and not custom.has_visibility(v_me, 'record', (v_rule.data ->> 'scope_table_id')::uuid,
                                   'admin'::public.permission_level) then
    raise exception 'That summary is addressed to somebody else, so it is not yours to read.'
      using errcode = '42501',
            hint = 'A summary is assembled under the person it is sent to, so reading one means reading their records. Ask whoever has Full access on the table.';
  end if;

  -- It ASSEMBLES and returns. Nothing is sent and nothing is recorded, so pressing
  -- "show me one now" does not move the watermark and does not cost somebody a text.
  return custom.agg_digest_assemble(p_organization_id, p_rule_id, null, now());
end;
$function$;

CREATE OR REPLACE FUNCTION custom.table_share_outside(p_organization_id uuid, p_table_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_lane   boolean;
  v_mine   boolean;
  v_rows   jsonb;
  v_who    text;
  v_role   text;
  v_mylvl  public.permission_level;
  v_levels jsonb;
  v_email  jsonb;
begin
  perform custom.assert_client_may_reach(p_organization_id, 'custom.table_share_outside');
  perform custom.assert_client_may_open(p_organization_id, p_table_id,
            'custom.table_share_outside', 'viewer'::public.permission_level, 'table');

  v_lane := coalesce((platform.knob_resolve('custom', 'external_principal_enabled', p_organization_id) #>> '{}')::boolean, false);
  v_mine := custom.may_invite_outside(p_organization_id, p_table_id);
  v_who  := coalesce(platform.knob_resolve('custom', 'outside_invite_who', p_organization_id) #>> '{}',
                     'org_admins_and_table_owners');

  select m.role into v_role
    from iam.organization_member m
   where m.organization_id = p_organization_id and m.user_id = custom.query_principal();

  v_mylvl := custom.effective_level(custom.query_principal(), p_organization_id, p_table_id, 'record');

  select coalesce(jsonb_agg(jsonb_build_object('level', l.level, 'label', l.label, 'means', l.means)
                            order by l.ordinal), '[]'::jsonb)
    into v_levels
    from custom.share_levels() l
   where v_mylvl is not null and l.level <= v_mylvl;

  v_email := communication.channel_readiness_say('email');

  select coalesce(jsonb_agg(jsonb_build_object(
           'invitation_id', i.id,
           'email',         i.email,
           'level',         coalesce(i.metadata ->> 'level', 'viewer'),
           'level_label',   iam.level_label('table', coalesce(i.metadata ->> 'level', 'viewer')::public.permission_level),
           'status',        i.status,
           'joined',        i.status = 'accepted',
           -- THE LINK, for the people who may hand it out and for the rows it still opens.
           'accept_path',   case when i.status <> 'accepted' and i.token is not null and v_mine
                                 then '/invitations/table/accept/' || i.token end,
           'say',           case
                              when i.status = 'accepted'
                                then format('%s can open this table as a %s.', i.email,
                                            coalesce(i.metadata ->> 'level', 'viewer'))
                              when i.expires_at is not null and i.expires_at <= now()
                                then format('%s was invited, and the invitation has run out. Resend it to give them a fresh link.', i.email)
                              else format('%s is invited and has not joined yet. They get access the moment they follow the link and the platform gives them an identity — until then this row holds nothing.', i.email)
                            end,
           'expires_at',    i.expires_at,
           'invited_at',    i.created_at,
           'expired',       i.expires_at is not null and i.expires_at <= now())
           order by i.created_at desc), '[]'::jsonb)
    into v_rows
    from iam.invitations i
   where i.target_type = 'custom_table'
     and i.target_id = p_table_id
     and i.organization_id = p_organization_id
     and i.deleted_at is null
     and i.status <> 'revoked';

  return jsonb_build_object(
    'lane_open',  v_lane,
    'may_invite', v_mine,
    'may_open_lane', coalesce(v_role in ('owner', 'admin'), false),
    'my_level',   v_mylvl::text,
    'levels',     v_levels,
    'who',        v_who,
    'invitations', v_rows,
    -- 🚨 WHAT THIS SERVER CAN ACTUALLY DO, so the screen never promises an email that
    -- will not go. `answer` is yes / no / unknown — never a boolean, because
    -- "we could not look" is not "no".
    'email_delivery', v_email,
    'email_say', case
      when (v_email ->> 'answer') = 'yes' then
        'They get an email with the link. You can also copy the link and send it yourself.'
      when (v_email ->> 'answer') = 'no' then
        'Email is not set up on this server, so nothing is emailed — copy the link and send it to them yourself.'
      else
        'We cannot tell whether email works on this server, so do not count on it arriving — copy the link and send it to them yourself.'
    end,
    'say', case
             when not v_lane and coalesce(v_role in ('owner', 'admin'), false) then
               'Sharing with people outside this organization is turned off. You can turn it on — it applies to the whole organization, and after that anyone who may share a table can invite an outside person to it.'
             when not v_lane then
               'Sharing with people outside this organization is turned off here. An owner or an administrator of this organization turns it on once, for everybody, and then anyone who may share a table can invite an outside person to it.'
             when not v_mine and v_who = 'org_admins' then
               'An owner or an administrator of this organization invites people from outside. Ask one of them, or share this table with a colleague here instead.'
             when not v_mine and v_who = 'table_admins' then
               'Whoever has Full access on this table invites people from outside it. Ask them, or share this table with a colleague here instead.'
             when not v_mine then
               'An owner or an administrator of this organization, or whoever has Full access on this table, invites people from outside. Ask one of them, or share this table with a colleague here instead.'
             else
               'Invite somebody outside this organization by email. They will see this table and nothing else here, at the level you choose.'
           end);
end;
$function$;

CREATE OR REPLACE FUNCTION custom.dashboard_target_field_assert(p_organization_id uuid, p_table_id uuid, p_field_key text)
 RETURNS void
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
-- SECURITY INVOKER on purpose: it only ever refuses, and its one caller (custom.dashboard_run)
-- is a definer, so it reads as that door does. Called directly, it runs as the caller under RLS
-- and can tell her nothing about a column she could not already ask about.
declare
  v_me    uuid := custom.query_principal();
  v_field uuid;
  v_label text;
  v_level public.permission_level;
begin
  -- The server lane carries no principal and reads every column, exactly as its aggregate does.
  if v_me is null then
    return;
  end if;
  select f.id, coalesce(nullif(f.data ->> 'label', ''), f.data ->> 'key')
    into v_field, v_label
    from custom.record f
   where f.organization_id = p_organization_id
     and f.table_id = custom.field_kernel_id()
     and f.deleted_at is null
     and (f.data ->> 'entity_definition_id')::uuid = p_table_id
     and f.data ->> 'key' = p_field_key
   limit 1;
  if v_field is null then
    raise exception 'This table has no column called "%", so a target cannot be read from it.', p_field_key
      using errcode = '22023', hint = 'Give the target a fixed value, or name a column this table has.';
  end if;
  -- The FLOOR of what this reader holds on the records the goal adds up: every one of them
  -- passed the aggregate's own `viewer` test, and the Table's level lifts them all. A column
  -- whose sensitivity asks for more than that is a column some of those records would hide.
  v_level := coalesce(custom.effective_level(v_me, p_organization_id, p_table_id), 'viewer'::public.permission_level);
  if not iam.may_touch_field(v_me, v_field, p_organization_id, v_level, 'read') then
    raise exception 'You cannot read the % column of this table, so it cannot be this block''s target.', v_label
      using errcode = '42501',
            hint = 'Ask somebody with Full access on the table to move you up, or give the target a fixed number.';
  end if;
end;
$function$;

CREATE OR REPLACE FUNCTION custom.agg_fields_readable_assert(p_organization_id uuid, p_table_id uuid, p_keys text[], p_required text DEFAULT 'viewer'::text)
 RETURNS void
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
-- SECURITY INVOKER on purpose: it only ever refuses, and its callers (custom.agg_sql,
-- custom.record_filter_sql) run inside definer doors, so it reads as those doors do.
-- AGG-WITHHELD: the refusal's DETAIL is `withheld:<field key>`, so the one door that answers a
-- withheld column as a state (custom.record_aggregate) knows WHICH column without reading a sentence.
declare
  v_me    uuid := custom.query_principal();
  v_level public.permission_level;
  v_label text;
  v_key   text;
  v_visible text[];
begin
  if v_me is null or p_keys is null or cardinality(p_keys) = 0 then
    return;
  end if;
  -- THE FLOOR of what this reader holds on the records the question reads: each passed the
  -- door's own `p_required` test, and the table's level lifts them all.
  v_level := greatest(coalesce(custom.effective_level(v_me, p_organization_id, p_table_id), 'viewer'::public.permission_level),
                      coalesce(nullif(p_required, ''), 'viewer')::public.permission_level);
  -- READ-MASK-ONCE: the columns this reader may read are the one mask's answer.
  select coalesce(array_agg(x #>> '{}'), '{}'::text[]) into v_visible
    from jsonb_array_elements(custom.read_mask_for(v_me, p_organization_id, p_table_id, v_level, 'read') -> 'visible') x;
  select coalesce(nullif(f.data ->> 'label', ''), f.data ->> 'key'), f.data ->> 'key'
    into v_label, v_key
    from custom.record f
   where f.organization_id = p_organization_id
     and f.table_id = custom.field_kernel_id()
     and f.deleted_at is null
     and (f.data ->> 'entity_definition_id')::uuid = p_table_id
     and f.data ->> 'key' = any (p_keys)
     and not (f.data ->> 'key' = any (v_visible))
   order by array_position(p_keys, f.data ->> 'key')
   limit 1;
  if v_label is not null then
    raise exception 'You cannot read the % column of this table, so it cannot be counted, added up, grouped or filtered here.', v_label
      using errcode = '42501',
            detail = 'withheld:' || v_key,
            hint = 'Leave that column out of this question, or ask somebody with Full access on the table to move you up.';
  end if;
end;
$function$;

CREATE OR REPLACE FUNCTION content._document_guard_data_class()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_slug     text;
  v_platform platform.data_class;
  v_resolved platform.data_class;
  v_floor    platform.data_class;
begin
  select c.slug into v_slug from platform.categories c where c.id = new.document_type_id;
  if v_slug is null then
    return new;   -- the type guard refuses this row with its own sentence
  end if;

  if content._capture_bypassed() then
    -- Access ladder T-11: a writer that names no visibility gets the one its class needs; who sees
    -- it in lists is the "Shown to by default" knob, never a row-security default.
    if tg_op = 'INSERT' and new.visibility is null then
      new.visibility := case when new.data_class in ('private', 'confidential')
                             then 'personal' else 'internal' end::platform.visibility;
    end if;
    return new;
  end if;
  select (k.value #>> '{}')::platform.data_class into v_platform
    from platform.feature_knob k
   where k.feature = 'content.document' and k.key = 'data_class.' || v_slug;
  if v_platform is null then
    raise exception using
      errcode = '55000',
      message = format('Document type %s has no class floor (knob content.document / data_class.%s is not seeded).', v_slug, v_slug),
      hint = 'Seed the knob in platform.feature_knob; a missing floor is never defaulted.';
  end if;
  v_resolved := (platform.knob_resolve('content.document', 'data_class.' || v_slug, new.organization_id, auth.uid()) #>> '{}')::platform.data_class;
  v_floor := least(v_platform, coalesce(v_resolved, v_platform));   -- enum order: private < confidential < organization < public

  if tg_op = 'INSERT' and new.data_class is null then
    new.data_class := v_floor;
  end if;
  -- Access ladder T-11: a writer that names no visibility gets the one its class needs; who sees
  -- it in lists is the "Shown to by default" knob, never a row-security default.
  if tg_op = 'INSERT' and new.visibility is null then
    new.visibility := case when new.data_class in ('private', 'confidential')
                           then 'personal' else 'internal' end::platform.visibility;
  end if;
  if new.data_class > v_floor then
    raise exception using
      errcode = '42501',
      message = format('A %s may not be classed %s: its floor is %s.', v_slug, new.data_class, v_floor),
      hint = format('Use %s or stricter.', v_floor);
  end if;
  if tg_op = 'UPDATE' and new.data_class is distinct from old.data_class
     and auth.uid() is not null
     and old.created_by is distinct from auth.uid()
     and not iam.has_access('document', new.id, 'admin') then
    raise exception using
      errcode = '42501',
      message = 'Only the owner of a document (or someone with Full access on it) can change its data class.',
      hint = 'Ask the owner to change it.';
  end if;
  if new.data_class = 'private' and new.visibility <> 'personal' then
    raise exception using
      errcode = '23514',
      message = format('A private-class %s can only be personal (visibility is %s).', v_slug, new.visibility),
      hint = 'Send visibility = ''personal'' (or none: the class default applies), or lower the class (not below its floor) before sharing.';
  end if;
  if new.visibility = 'public' and new.data_class not in ('organization', 'public') then
    raise exception using
      errcode = '23514',
      message = format('A %s-class document cannot be public.', new.data_class),
      hint = 'Lower the class to organization (if its floor allows) before making it public.';
  end if;
  return new;
end;
$function$;
