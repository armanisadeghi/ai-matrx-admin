-- LANE BUILD-HIST (BH-) — ACCEPTANCE TEST 14, END TO END: PRUNING VERSUS UNDO.
--
-- Arman, 2026-09-11 (inbox/processed/2026-09/data-model-rules-and-tests.md § 14): "A light Table at
-- the retention floor of thirty days. An organization attempting to set retention to ten days is
-- refused. Merge two of its records. Sixty days later, undo the merge. It works, and the pruned value
-- history is the only thing missing."
--
-- w3_hist_c17.sql PART 3 proves the floor and the prune door; it never merges, ages the merge past
-- the floor, prunes and THEN undoes. This suite is that sentence, clause by clause, from the client
-- seat (`authenticated`, admin@admin.com as owner of a throwaway organization). Sixty days are made
-- by moving the stored clocks back (row_versions.occurred_at, migration_log.applied_at) as the
-- connected owner, which asserts nothing.
--
-- RED on the store before migration 20261022180000_bh_hist_a: (d) fails, "the prune took nothing" —
-- history.prune treated every version under any Migration's row_version_hi as evidence, so one merge
-- pinned the organization's whole value history. RED by mutation (`-v red=1`): the versions the merge
-- wrote and its log row are pruned too (HIS-4 ignored) and (e), the undo, must then fail.
-- GREEN: every clause passes on the live store. Runs inside ONE transaction that ROLLS BACK.
--
-- Run: psql "<main dsn>" -X -v ON_ERROR_STOP=1 -f scripts/campaign-tests/bh_t14_merge_undo_after_prune.sql
--      psql "<main dsn>" -X -v ON_ERROR_STOP=1 -v red=1 -f scripts/campaign-tests/bh_t14_merge_undo_after_prune.sql

\set ON_ERROR_STOP on
\timing off
\set suite 'bh_t14_merge_undo_after_prune.sql'
\set requires 'grant:authenticated:custom.migrate_merge'
\i scripts/campaign-tests/_preamble.sql
\if :matrx_skip
\quit
\endif
\if :{?red}
\else
\set red 0
\endif

begin;
set local statement_timeout = '120s';
select set_config('bh.red', :'red', true);

do $t$
declare
  c_admin   constant uuid := '87a6e699-3622-4869-8843-d0867456c0dd';
  c_admin_j constant text := '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated"}';
  v_org uuid := gen_random_uuid();
  v_boss text := current_user;
  v_home uuid; v_tbl uuid; v_a uuid; v_b uuid; v_mig uuid;
  v_res jsonb; v_doc jsonb; v_msg text; v_n bigint; v_before bigint; v_after bigint; v_pruned bigint;
begin
  perform set_config('app.actor_system', 'campaign-test/bh_t14', true);
  perform set_config('request.jwt.claims', c_admin_j, true);
  insert into iam.organizations (id, name, slug, abbreviation, created_by)
  values (v_org, 'BH- Tidewater Clinics', 'bh-tidewater-' || substr(v_org::text,1,8), 'BHT', c_admin);
  insert into iam.memberships (organization_id, container_type, container_id, user_id, role, status)
  values (v_org, 'organization', v_org, c_admin, 'owner', 'active');
  insert into platform.knob_override (feature, key, scope_kind, scope_id, organization_id, value, set_note)
  values ('custom', 'system_enabled', 'organization', v_org, v_org, 'true'::jsonb, 'campaign-test/bh_t14');
  insert into custom.record (organization_id, table_id, data)
  values (v_org, null, jsonb_build_object('name', 'BH- Tidewater — Main Office')) returning id into v_home;

  perform set_config('role', 'authenticated', true);
  if current_user <> 'authenticated' then raise exception '0: seat not taken'; end if;

  -- A LIGHT table AT the floor of thirty days.
  v_tbl := custom.table_declare(v_org, jsonb_build_object('name','BH- Patients','slug','bh_patients','type','entity',
    'label_singular','Patient','label_plural','Patients','title_field','pname','display','list','weight','light',
    'ordered',false,'row_order','sorted','default_sort','[]'::jsonb,'agent_writable',true,'retention_days',30,
    'fields', jsonb_build_array(jsonb_build_object('name','pname')),'parent_id', v_home::text));
  perform custom.field_declare(v_org, v_tbl, jsonb_build_object('key','phone','label','Phone','type','text'));

  -- (a) The floor reads thirty and the table keeps thirty.
  v_res := custom.history_retention(v_org, v_tbl);
  if (v_res ->> 'floor_days')::int <> 30 or (v_res ->> 'table_days')::int <> 30 then
    raise exception 'T14 (a): floor/table read % — expected 30/30', v_res::text;
  end if;

  -- (b) Ten days is REFUSED, naming the floor, and nothing changes.
  v_msg := null;
  begin
    perform custom.history_retention_set(v_org, v_tbl, 10);
  exception when check_violation then
    get stacked diagnostics v_msg = message_text;
  end;
  if v_msg is null then raise exception 'T14 (b): ten days was accepted under a thirty-day floor'; end if;
  if v_msg !~ '30' then raise exception 'T14 (b): the refusal did not name the floor — "%"', v_msg; end if;
  if (custom.history_retention(v_org, v_tbl) ->> 'table_days')::int <> 30 then
    raise exception 'T14 (b): the refused ten days changed the table anyway';
  end if;

  -- Two records of one patient, each edited so each has value history.
  v_a := custom.record_write(v_org, v_tbl, jsonb_build_object('pname','BH- Dana Ruiz','phone','555-0101','parent_id',v_home::text));
  v_b := custom.record_write(v_org, v_tbl, jsonb_build_object('pname','BH- Dana Ruiz (dup)','phone','555-0199','parent_id',v_home::text));
  perform custom.record_update(v_org, v_a, jsonb_build_object('phone','555-0102'));
  perform custom.record_update(v_org, v_a, jsonb_build_object('phone','555-0103'));
  perform custom.record_update(v_org, v_b, jsonb_build_object('phone','555-0198'));
  perform custom.record_update(v_org, v_b, jsonb_build_object('phone','555-0197'));

  -- (c) Merge them.
  v_res := custom.migrate_merge(v_org, v_a, v_b, 'BH- T14 merge');
  set constraints all immediate; set constraints all deferred;
  v_mig := (v_res ->> 'migration_id')::uuid;
  if v_mig is null then raise exception 'T14 (c): the merge returned no migration id — %', v_res::text; end if;

  -- SIXTY DAYS LATER: every clock this organization's history holds moves back sixty days.
  perform set_config('role', v_boss, true);
  update history.row_versions set occurred_at = occurred_at - interval '60 days'
   where organization_id = v_org and entity_type = 'custom.record';
  update history.migration_log set applied_at = applied_at - interval '60 days' where organization_id = v_org;
  select count(*) into v_before from history.row_versions where organization_id = v_org and entity_type = 'custom.record';
  perform set_config('role', 'authenticated', true);

  -- (d) The prune runs past the floor and takes value history.
  v_res := custom.history_prune(v_org, 'values', v_tbl, false);
  v_pruned := coalesce((v_res ->> 'rows_pruned')::bigint, 0);
  if v_pruned < 1 then raise exception 'T14 (d): sixty days past a thirty-day floor the prune took nothing — %', v_res::text; end if;
  if (v_res ->> 'retention_days')::int <> 30 then raise exception 'T14 (d): the prune used % days, not the table''s 30', v_res ->> 'retention_days'; end if;

  if current_setting('bh.red', true) = '1' then
    -- RED: a prune that ignored HIS-4 would also have taken the rows the Migration log names.
    perform set_config('role', v_boss, true);
    delete from history.row_versions v where v.organization_id = v_org and v.migration_id = v_mig;
    delete from history.migration_log where id = v_mig;
    perform set_config('role', 'authenticated', true);
    raise notice 'RED MUTATION APPLIED — the Migration log''s evidence was pruned too.';
  end if;

  -- (e) Undo the merge. It works: both records are back, each with its own last value.
  v_msg := null;
  begin
    perform custom.migrate_undo(v_org, v_mig);
    set constraints all immediate; set constraints all deferred;
  exception when others then
    get stacked diagnostics v_msg = message_text;
  end;
  if v_msg is not null then raise exception 'T14 (e): undo of the merge sixty days later failed — "%"', v_msg; end if;
  v_doc := custom.read_record(v_org, v_b, false);
  if v_doc is null or (v_doc ->> 'phone') is distinct from '555-0197' or (v_doc ->> 'pname') is distinct from 'BH- Dana Ruiz (dup)' then
    raise exception 'T14 (e): the merged-away record came back as %', coalesce(v_doc::text, 'nothing');
  end if;
  v_doc := custom.read_record(v_org, v_a, false);
  if (v_doc ->> 'phone') is distinct from '555-0103' then
    raise exception 'T14 (e): the surviving record reads phone %, expected its own 555-0103', v_doc ->> 'phone';
  end if;

  -- (f) The pruned value history is the only thing missing: fewer versions than before, and the
  --     two most recent of every row still there.
  perform set_config('role', v_boss, true);
  select count(*) into v_after from history.row_versions where organization_id = v_org and entity_type = 'custom.record'
     and occurred_at < now() - interval '30 days';
  perform set_config('role', 'authenticated', true);
  if v_after >= v_before then raise exception 'T14 (f): nothing older than the floor is missing (% before, % after)', v_before, v_after; end if;
  select count(*) into v_n from custom.io_revisions(v_org, v_a);
  if v_n < 2 then raise exception 'T14 (f): the survivor kept % versions; the two most recent always survive', v_n; end if;

  raise notice 'T14 PASSED — ten days refused naming 30; merge; sixty days later the prune took % value versions; undo restored both records with their own values; only pruned history is missing.', v_pruned;
end
$t$;

rollback;
