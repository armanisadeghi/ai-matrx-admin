-- target: branch,production
-- additive: yes
-- guard: custom/system_enabled
-- lane: COPY-EXTRAS
-- lock: custom,platform
--
-- ONE HOME for "a copy of a table carries its automations (switched OFF) and its pages". The step existed twice: TypeScript
-- copyExtras (@ai-matrx/records base.ts, the browser's small-base path) and Python copy_extras (matrx_records base_extras.py,
-- the big base-move job). Both are deleted; both now call custom.copy_table_extras.
--
-- custom.copy_table_extras(p_organization_id, p_pairs {source table id: its copy's id}) -> jsonb
--   {"automations": n, "pages": n, "extras_refused": ["<one sentence each>"]}
--   * every id the copy renamed is pointed at the copy's own, in ONE pass: each table (the pairs), each column (matched by
--     its key, which a copy keeps) and each view (matched by name). A spec that kept the original's column or view id would
--     watch the wrong table.
--   * each automation of a source table is declared on its copy through custom.automation_declare, then switched OFF through
--     custom.automation_set_enabled: a copy never runs. A refusal (the store's own _errors sentences, or a door that raised)
--     is NAMED in extras_refused; a read the person may not make is named too. Nothing is dropped silently.
--   * each page (dashboard) of a source table is declared on its copy through custom.dashboard_declare.
--   * same rule as custom.base_copy_finish: only a copy THIS person made by custom.table_duplicate from that source
--     (history.migration_log) is touched; any other pair is refused 42501 and nothing changes.
-- A query cancel / serialization failure / deadlock is never caught: the caller's one transaction rolls back whole.
-- Inverse: migrations/inverse/20261020000000_copyextras_a_one_function_copies_a_tables_automations_and_pages_down.sql

set local lock_timeout = '3s';
set local statement_timeout = '60s';

create function custom._point_at_copies(p_doc jsonb, p_ids jsonb)
 returns jsonb
 language plpgsql
 immutable
 set search_path to 'pg_catalog'
as $function$
declare
  v_text text;
  v_tag  text;
  v_keys text[];
  v_n    integer;
begin
  if p_doc is null or p_ids is null or p_ids = '{}'::jsonb then return p_doc; end if;
  v_text := p_doc::text;
  v_tag := '@@' || md5(v_text || p_ids::text) || '_';
  v_keys := array(select k from jsonb_object_keys(p_ids) k order by k);
  -- ONE pass: every old id first becomes a numbered tag, then each tag becomes its new id, so a copy's new id is
  -- never itself rewritten by a later pair.
  for v_n in 1 .. coalesce(array_length(v_keys, 1), 0) loop
    v_text := replace(v_text, v_keys[v_n], v_tag || v_n::text || '@');
  end loop;
  for v_n in 1 .. coalesce(array_length(v_keys, 1), 0) loop
    v_text := replace(v_text, v_tag || v_n::text || '@', p_ids ->> v_keys[v_n]);
  end loop;
  return v_text::jsonb;
end
$function$;

create function custom.copy_table_extras(p_organization_id uuid, p_pairs jsonb)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'pg_catalog'
as $function$
declare
  v_me        uuid := custom.query_principal();
  v_ids       jsonb;
  v_src       text;
  v_copy      uuid;
  v_name      text;
  v_old       uuid;
  v_new       uuid;
  v_key       text;
  v_made      jsonb;
  v_off       jsonb;
  v_automations integer := 0;
  v_pages     integer := 0;
  v_refused   jsonb := '[]'::jsonb;
  a           jsonb;
  d           record;
  f           record;
  w           record;
begin
  if v_me is null then raise exception 'Sign in to copy a table''s automations and pages.' using errcode = '42501'; end if;
  if p_organization_id is null or p_pairs is null or jsonb_typeof(p_pairs) <> 'object' then
    raise exception 'Say the organization and which tables were copied.' using errcode = '22004';
  end if;
  perform custom.assert_client_may_reach(p_organization_id, 'custom.copy_table_extras');
  perform custom.assert_store_door(p_organization_id, 'custom.copy_table_extras');
  if not iam.is_org_member(v_me, p_organization_id) then
    raise exception 'You are not a member of that organization.' using errcode = '42501';
  end if;
  for v_src, v_copy in select k, (v #>> '{}')::uuid from jsonb_each(p_pairs) e(k, v) loop
    if not exists (select 1 from history.migration_log m
                    where m.organization_id = p_organization_id and m.verb = 'duplicate' and m.target_kind = 'table'
                      and m.target_id = v_copy and m.inverse ->> 'by' = v_me::text and m.inverse ->> 'duplicated_from' = v_src) then
      raise exception 'That table is not a copy you made, so its automations and pages were left alone.' using errcode = '42501';
    end if;
  end loop;

  -- every id a copy renamed, old -> new: the tables, each column (by key) and each view (by name)
  v_ids := p_pairs;
  for v_src, v_copy in select k, (v #>> '{}')::uuid from jsonb_each(p_pairs) e(k, v) loop
    for f in select r.id as old_id, r.data ->> 'key' as k
               from custom.applicable_fields(p_organization_id, v_src::uuid, null) r where r.data ->> 'key' is not null loop
      select n.id into v_new from custom.applicable_fields(p_organization_id, v_copy, null) n
       where n.data ->> 'key' = f.k order by n.id limit 1;
      if v_new is not null and v_new <> f.old_id then v_ids := v_ids || jsonb_build_object(f.old_id::text, v_new::text); end if;
    end loop;
    for w in select vw.view_id as old_id, vw.name as nm from custom.views(p_organization_id, v_src::uuid) vw loop
      select n.view_id into v_new from custom.views(p_organization_id, v_copy) n
       where n.name = w.nm order by n.view_id limit 1;
      if v_new is not null and v_new <> w.old_id then v_ids := v_ids || jsonb_build_object(w.old_id::text, v_new::text); end if;
    end loop;
  end loop;

  for v_src, v_copy in select k, (v #>> '{}')::uuid from jsonb_each(p_pairs) e(k, v) loop
    select coalesce(t.data ->> 'name', v_src) into v_name from custom.record t
     where t.id = v_src::uuid and t.table_id = custom.table_kernel_id() and t.deleted_at is null limit 1;
    v_name := coalesce(v_name, v_src);

    begin
      for a in select x from jsonb_array_elements(
                 coalesce(custom.automations(v_src::uuid, p_organization_id, false) -> 'automations', '[]'::jsonb)) x loop
        begin
          v_made := custom.automation_declare(p_organization_id, v_copy, custom._point_at_copies(a -> 'spec', v_ids), null);
          if coalesce(v_made ->> 'ok', 'false') = 'true' and v_made ->> 'automation_id' is not null then
            v_off := custom.automation_set_enabled(p_organization_id, (v_made ->> 'automation_id')::uuid, false);
            v_automations := v_automations + 1;
          else
            v_refused := v_refused || to_jsonb(format('Automation "%s" on %s was not copied: %s', a ->> 'name', v_name,
              coalesce((select string_agg(e.key || ': ' || (e.value #>> '{}'), '; ')
                          from jsonb_each(case when jsonb_typeof(v_made -> '_errors') = 'object' then v_made -> '_errors' else '{}'::jsonb end) e),
                       'the store gave no reason.')));
          end if;
        exception when others then
          if sqlstate in ('40001', '40P01') then raise; end if;
          v_refused := v_refused || to_jsonb(format('Automation "%s" on %s was not copied: %s', a ->> 'name', v_name, sqlerrm));
        end;
      end loop;
    exception when others then
      if sqlstate in ('40001', '40P01') then raise; end if;
      v_refused := v_refused || to_jsonb(format('The automations of %s could not be read: %s', v_name, sqlerrm));
    end;

    begin
      for d in select * from custom.dashboards(p_organization_id, v_src::uuid) loop
        begin
          perform custom.dashboard_declare(p_organization_id, v_copy, d.name,
                    custom._point_at_copies(d.blocks, v_ids), custom._point_at_copies(d.presentation, v_ids), null);
          v_pages := v_pages + 1;
        exception when others then
          if sqlstate in ('40001', '40P01') then raise; end if;
          v_refused := v_refused || to_jsonb(format('Page "%s" on %s was not copied: %s', d.name, v_name, sqlerrm));
        end;
      end loop;
    exception when others then
      if sqlstate in ('40001', '40P01') then raise; end if;
      v_refused := v_refused || to_jsonb(format('The pages of %s could not be read: %s', v_name, sqlerrm));
    end;
  end loop;

  return jsonb_build_object('automations', v_automations, 'pages', v_pages, 'extras_refused', v_refused);
end
$function$;

-- grants are the door row's: platform.reopen_declared_doors opens exactly the lanes it declares.

insert into platform.client_callable_door
  (schema_name, function_name, identity_args, identity_argtypes, reason, declared_by, non_client_lane, signed_in_callers, anonymous_callers, argument_rules)
values
 ('custom', 'copy_table_extras', 'p_organization_id uuid, p_pairs jsonb',
  array['uuid'::regtype::oid, 'jsonb'::regtype::oid],
  'the last step of copying tables: each copy gets its source''s automations (switched off) and pages, with column and view ids pointed at the copy''s own. Touches only tables this person copied (the migration log says so).',
  '20261020000000_copyextras_a_one_function_copies_a_tables_automations_and_pages.sql',
  null, true, false,
  jsonb_build_object('version', 1, 'declared_by', '20261020000000_copyextras_a_one_function_copies_a_tables_automations_and_pages.sql',
    'declared_at', '2026-10-20 lane COPY-EXTRAS, read from the body',
    'arguments', jsonb_build_object(
      'p_organization_id', jsonb_build_object('position', 1, 'type', 'uuid', 'entity', 'organization', 'optional', false,
        'check', 'the caller must be a member (iam.is_org_member) and the store door open for it, else 42501',
        'null_rule', jsonb_build_object('means', 'refused, 22004'),
        'foreign', jsonb_build_object('note', 'a stranger organization answers 42501, the same as an organization that does not exist', 'same_as_invented', true),
        'verified', 'pending: rolled-back proof (draft)'),
      'p_pairs', jsonb_build_object('position', 2, 'type', 'jsonb', 'entity', 'custom_record', 'optional', false,
        'check', 'an object {source table id: its copy''s id}; every pair must be a copy THIS person made by custom.table_duplicate from that source (history.migration_log), else 42501 and nothing changes',
        'null_rule', jsonb_build_object('means', 'refused, 22004'),
        'foreign', jsonb_build_object('note', 'a table id that is not this person''s copy is refused with the same sentence whether it exists or not', 'same_as_invented', true),
        'verified', 'pending: rolled-back proof (draft)'))));
