-- target: branch,production
-- additive: yes
-- guard: custom/system_enabled
-- lock: custom
-- lane: BASE-AUTO-FIX
-- based-on: custom.table_duplicate(uuid, boolean, text, uuid) 4495d6afc320134c70b27c39e253868390b4ff62f5994c95ee6dbca13db05c41
--
-- A COPY GETS ITS OWN AUTOMATIONS. custom.table_duplicate copied the source table's whole record, `automations` included,
-- so the copy held the ORIGINAL's automation ids. A Base copy / snapshot restore then declared the automations again on the
-- copy (custom.automation_declare answered the carried one: same spec, already there) and switched "the copy's" off by that
-- id, which custom._automation_home resolves to whichever table holds it first: the ORIGINAL went off, the copy stayed on.
-- Now the copy's automations are born with new ids, switched off, without the source's webhook secret.
-- REPLACES one body (custom.table_duplicate, same signature, same grants); no table, column, policy or stored row is touched.

CREATE OR REPLACE FUNCTION custom.table_duplicate(p_table_id uuid, p_with_records boolean DEFAULT false, p_name text DEFAULT NULL::text, p_organization_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  -- ONE CALL'S TIME BUDGET. A client call is cancelled at 8 s (authenticated's statement_timeout).
  -- This first call does the copy's one-time work (rights, what it carries, the job, the Table
  -- record), then at least one unit, and starts no new unit 1.5 s into the call. The client then
  -- calls custom.table_duplicate_continue until "done".
  c_budget     constant interval := interval '1.5 seconds';
  v_me         uuid := custom.query_principal();
  v_with       boolean := coalesce(p_with_records, false);
  v_opens      jsonb;
  v_id         uuid;
  v_from       uuid;
  v_to         uuid;
  v_src        custom.record;
  v_src_name   text;
  v_to_name    text;
  v_name       text;
  v_slug       text;
  v_base_slug  text;
  v_n          integer;
  v_k          integer;
  v_new        uuid := gen_random_uuid();
  v_map        jsonb;
  v_parent     uuid;
  v_data       jsonb;
  v_cross      record;
  v_event      uuid;
  v_seen       uuid[] := array[]::uuid[];
  v_level      public.permission_level;
  v_mask       jsonb;
  v_visible    text[];
  v_declared   text[];
  v_hidden     text[];
  v_job        jsonb;
  v_total      bigint := 0;
  v_handed     jsonb;
  v_not_handed jsonb;
  v_hidden_out jsonb := '{}'::jsonb;
  v_refs_out   jsonb := '[]'::jsonb;
begin
  if v_me is null then
    raise exception 'Sign in to duplicate a table.' using errcode = '42501';
  end if;
  if p_table_id is null then
    raise exception 'Say which table to duplicate.' using errcode = '22004';
  end if;

  -- READ ACCESS TO THE SOURCE: the store's one answer to "may this person open this id".
  v_opens := custom.where_id_opens(p_table_id);
  if v_opens is null or v_opens ->> 'kind' is distinct from 'table' then
    raise exception 'That table is not one you have been given, so nothing was copied.'
      using errcode = '42501',
            hint = 'The store says the same for a table you may not open and one that does not exist.';
  end if;
  v_from := (v_opens ->> 'organization_id')::uuid;
  v_id   := (v_opens ->> 'resolved_id')::uuid;
  perform custom.assert_client_may_reach(v_from, 'custom.table_duplicate');

  select r.* into v_src
    from custom.record r
   where r.organization_id = v_from and r.id = v_id;
  v_src_name := coalesce(nullif(btrim(v_src.data ->> 'name'), ''), 'This table');

  if v_src.data_class is distinct from 'table' then
    raise exception '% is part of how the record store is built, so it cannot be copied.', v_src_name
      using errcode = '42501';
  end if;
  if v_src.deleted_at is not null
     or exists (select 1 from history.migration_log a
                 where a.organization_id = v_from and a.verb = 'archive' and a.target_kind = 'table'
                   and a.target_id = v_id and a.undone_at is null
                   and coalesce((a.inverse ->> 'open')::boolean, false)) then
    raise exception '% is archived. Bring it back from the trash, then copy it.', v_src_name
      using errcode = '55000';
  end if;
  if coalesce(v_src.data ->> 'kept_for', '') = 'copying' then
    raise exception '% is still being copied itself. Wait for that copy to finish, then copy it.', v_src_name
      using errcode = '55000';
  end if;

  -- CREATE RIGHTS IN THE DESTINATION: a member of it, its record store open.
  v_to := coalesce(p_organization_id, v_from);
  select coalesce(nullif(btrim(o.name), ''), 'that organization') into v_to_name
    from iam.organizations o where o.id = v_to;
  if v_to_name is null or not iam.is_org_member(v_me, v_to) then
    raise exception 'You are not a member of that organization, so a copy of % cannot be made there.', v_src_name
      using errcode = '42501',
            hint = 'A table is copied only into an organization you belong to.';
  end if;
  perform custom.assert_client_may_reach(v_to, 'custom.table_duplicate');
  perform custom.assert_store_door(v_to, 'custom.table_duplicate');

  -- A COLUMN'S OWN TARGET NEVER CROSSES AN ORGANIZATION. Refused here, by name, before anything is made.
  if v_to <> v_from then
    select f.data ->> 'label' as label, coalesce(t.data ->> 'name', 'another table') as target
      into v_cross
      from custom.record f
      left join custom.record t
        on t.organization_id = v_from and t.id = nullif(f.data ->> 'relation_target', '')::uuid
     where f.organization_id = v_from
       and f.table_id = custom.field_kernel_id()
       and f.data_class <> 'kernel'
       and f.deleted_at is null
       and f.data ->> 'entity_definition_id' = v_id::text
       and nullif(f.data ->> 'relation_target', '') is not null
       and f.data ->> 'relation_target' <> v_id::text
     order by coalesce((f.data ->> 'sort')::integer, 0)
     limit 1;
    if found then
      raise exception '% links its column % to %, and a column cannot link across organizations. Copy it into %, or remove that column first.',
                      v_src_name, coalesce(v_cross.label, 'a link'), v_cross.target,
                      coalesce((select o.name from iam.organizations o where o.id = v_from), 'its own organization')
        using errcode = '55000';
    end if;
  end if;

  -- THE NAME. A name the person gave is used as given; otherwise "<name> (copy)", then
  -- "(copy 2)", "(copy 3)", … until no Table of the destination being used or copied carries it.
  v_name := nullif(btrim(p_name), '');
  if v_name is null then
    v_name := v_src_name || ' (copy)';
    v_n := 1;
    while exists (select 1 from custom.record t
                   where t.organization_id = v_to and t.table_id = custom.table_kernel_id()
                     and t.deleted_at is null and t.data ->> 'name' = v_name) loop
      v_n := v_n + 1;
      v_name := v_src_name || ' (copy ' || v_n || ')';
    end loop;
  end if;
  v_base_slug := regexp_replace(lower(v_name), '[^a-z0-9]+', '_', 'g');
  v_base_slug := regexp_replace(v_base_slug, '^_+|_+$', '', 'g');
  if v_base_slug !~ '^[a-z]' then v_base_slug := 't_' || v_base_slug; end if;
  v_base_slug := left(v_base_slug, 56);
  v_slug := v_base_slug;
  v_k := 1;
  while exists (select 1 from custom.record t
                 where t.organization_id = v_to and t.table_id = custom.table_kernel_id()
                   and t.deleted_at is null and t.data ->> 'slug' = v_slug) loop
    v_k := v_k + 1;
    v_slug := v_base_slug || '_' || v_k;
  end loop;

  if v_to = v_from then
    v_parent := nullif(v_src.data ->> 'parent_id', '')::uuid;
  else
    v_parent := (select h.id from custom.record h
                  where h.organization_id = v_to and h.table_id = custom.organization_kernel_id()
                    and h.deleted_at is null order by h.created_at, h.id limit 1);
    if v_parent is null then
      insert into custom.record (organization_id, table_id, data)
      values (v_to, custom.organization_kernel_id(), jsonb_build_object('name', v_to_name))
      returning id into v_parent;
    end if;
  end if;

  -- WHAT THE COPY CARRIES, FIXED NOW, ONCE: the columns and views live now, the choice lists they
  -- use, the read mask for this person (the same one custom.read_records asks), and with records,
  -- which live rows made by now this person is handed (custom.query_visible_ids at viewer: the
  -- ladder, then "Shown to"). Later passes read this from the job and never work it out again.
  v_level := custom.effective_level(v_me, v_from, v_id);
  v_mask  := custom.read_mask_for(v_me, v_from, v_id, v_level, 'read');
  select coalesce(array_agg(x #>> '{}'), '{}'::text[]) into v_visible from jsonb_array_elements(v_mask -> 'visible') x;
  select coalesce(array_agg(x #>> '{}'), '{}'::text[]) into v_declared from jsonb_array_elements(v_mask -> 'declared') x;
  select coalesce(array_agg(d), '{}'::text[]) into v_hidden from unnest(v_declared) d where not (d = any (v_visible));

  v_job := jsonb_build_object(
    'kind', 'none',
    'why_undo', 'A copy is undone by archiving it; the table it was copied from was never changed.',
    'duplicated_from', v_id,
    'duplicated_from_organization_id', v_from,
    'with_records', v_with,
    'by', v_me,
    'open', true,
    'state', 'copying',
    'table_shown_to', v_src.shown_to,
    'cutoff', clock_timestamp(),
    'mask_visible', to_jsonb(v_visible),
    'mask_declared', to_jsonb(v_declared),
    'mask_hidden', to_jsonb(v_hidden),
    'fields', coalesce((select jsonb_agg(f.id order by coalesce((f.data ->> 'sort')::integer, 0), f.created_at)
                          from custom.record f
                         where f.organization_id = v_from and f.table_id = custom.field_kernel_id()
                           and f.data_class <> 'kernel' and f.deleted_at is null
                           and f.data ->> 'entity_definition_id' = v_id::text), '[]'::jsonb),
    'choice_lists', coalesce((select jsonb_agg(distinct o.id)
                                from custom.record f
                                join custom.record o
                                  on o.organization_id = v_from and o.id = (f.data -> 'config' ->> 'options_table_id')::uuid
                                 and o.table_id = custom.table_kernel_id() and o.data_class = 'table'
                               where f.organization_id = v_from and f.table_id = custom.field_kernel_id()
                                 and f.data_class <> 'kernel' and f.deleted_at is null
                                 and f.data ->> 'entity_definition_id' = v_id::text
                                 and nullif(f.data -> 'config' ->> 'options_table_id', '') is not null), '[]'::jsonb),
    'views', coalesce((select jsonb_agg(sv.id)
                         from platform.saved_view sv
                        where sv.organization_id = v_from and sv.deleted_at is null and sv.surface_key = 'custom/records'
                          and coalesce(sv.subject_id, nullif(sv.definition ->> 'table_id', '')::uuid) = v_id
                          and (sv.shown_to is distinct from 'only_me' or sv.created_by = v_me)), '[]'::jsonb),
    'self_keys', coalesce((select jsonb_agg(f.data ->> 'key')
                             from custom.record f
                            where f.organization_id = v_from and f.table_id = custom.field_kernel_id()
                              and f.data_class <> 'kernel' and f.deleted_at is null
                              and f.data ->> 'entity_definition_id' = v_id::text
                              and f.data ->> 'relation_target' = v_id::text
                              and not (f.data ->> 'key' = any (v_hidden))), '[]'::jsonb),
    'dead_keys', coalesce((select jsonb_agg(distinct d.data ->> 'key')
                             from custom.record d
                            where d.organization_id = v_from and d.table_id = custom.field_kernel_id()
                              and d.data_class <> 'kernel' and d.deleted_at is not null
                              and d.data ->> 'entity_definition_id' = v_id::text
                              and not exists (select 1 from custom.record l
                                               where l.organization_id = v_from and l.table_id = custom.field_kernel_id()
                                                 and l.data_class <> 'kernel' and l.deleted_at is null
                                                 and l.data ->> 'entity_definition_id' = v_id::text
                                                 and l.data ->> 'key' = d.data ->> 'key')), '[]'::jsonb));
  if v_with then
    v_seen := array(select q from custom.query_visible_ids(v_from, v_id, 'viewer') q);
    select count(*) filter (where r.id = any (v_seen)),
           coalesce(jsonb_object_agg(r.id::text, true) filter (where r.id = any (v_seen)), '{}'::jsonb),
           coalesce(jsonb_object_agg(r.id::text, true) filter (where not (r.id = any (v_seen))), '{}'::jsonb)
      into v_total, v_handed, v_not_handed
      from custom.record r
     where r.organization_id = v_from and r.table_id = v_id and r.data_class = 'record'
       and r.deleted_at is null and coalesce(r.metadata ->> 'quarantine', 'false') <> 'true'
       and r.created_at <= (v_job ->> 'cutoff')::timestamptz;
    -- Whichever list is shorter is kept: for a member handed every row it is empty.
    if (select count(*) from jsonb_object_keys(v_handed)) <= (select count(*) from jsonb_object_keys(v_not_handed)) then
      v_job := v_job || jsonb_build_object('rows_handed', v_handed);
    else
      v_job := v_job || jsonb_build_object('rows_not_handed', v_not_handed);
    end if;
    v_job := v_job || jsonb_build_object('records_total', v_total);
    select coalesce(jsonb_object_agg(coalesce(nullif(f.data ->> 'label', ''), f.data ->> 'key'), n.c), '{}'::jsonb)
      into v_hidden_out
      from custom.record f
      cross join lateral (
        select count(*) as c from custom.record r
         where r.organization_id = v_from and r.table_id = v_id and r.id = any (v_seen)
           and r.data ? (f.data ->> 'key') and jsonb_typeof(r.data -> (f.data ->> 'key')) <> 'null') n
     where f.organization_id = v_from and f.table_id = custom.field_kernel_id()
       and f.data_class <> 'kernel' and f.deleted_at is null and f.data ->> 'entity_definition_id' = v_id::text
       and f.data ->> 'key' = any (v_hidden);
  end if;

  -- WHAT STAYS BEHIND, worked out now while every input is here, and handed back when done.
  v_map := jsonb_build_object(v_id::text, v_new::text)
           || coalesce((select jsonb_object_agg(f #>> '{}', custom._duplicate_id(v_new, (f #>> '{}')::uuid)::text)
                          from jsonb_array_elements(v_job -> 'fields') f), '{}'::jsonb);
  if custom._without_rows_of(custom._remap_rows(custom._uuid_remap(v_src.data, v_map), v_new, v_job), v_from, v_id)
     is distinct from custom._remap_rows(custom._uuid_remap(v_src.data, v_map), v_new, v_job) then
    v_refs_out := v_refs_out || jsonb_build_array('the table''s colours or row actions');
  end if;
  v_refs_out := v_refs_out || coalesce((
    select jsonb_agg('view ' || sv.name)
      from platform.saved_view sv
     where sv.organization_id = v_from and (v_job -> 'views') ? sv.id::text
       and (custom._without_rows_of(custom._remap_rows(custom._uuid_remap(sv.definition, v_map), v_new, v_job), v_from, v_id)
              is distinct from custom._remap_rows(custom._uuid_remap(sv.definition, v_map), v_new, v_job)
            or custom._without_rows_of(custom._remap_rows(custom._uuid_remap(coalesce(sv.metadata, '{}'::jsonb), v_map), v_new, v_job), v_from, v_id)
              is distinct from custom._remap_rows(custom._uuid_remap(coalesce(sv.metadata, '{}'::jsonb), v_map), v_new, v_job))), '[]'::jsonb);
  v_job := v_job || jsonb_build_object('left_behind', jsonb_build_object(
    'archived_fields', (select count(*) from custom.record f
                         where f.organization_id = v_from and f.table_id = custom.field_kernel_id()
                           and f.data_class <> 'kernel' and f.deleted_at is not null
                           and f.data ->> 'entity_definition_id' = v_id::text),
    'archived_records', case when v_with then (select count(*) from custom.record r
                         where r.organization_id = v_from and r.table_id = v_id and r.data_class = 'record'
                           and (r.deleted_at is not null or coalesce(r.metadata ->> 'quarantine', 'false') = 'true')) end,
    'records_not_yours_to_open', case when v_with then (select count(*) from jsonb_object_keys(coalesce(v_not_handed, '{}'::jsonb))) end,
    'hidden_columns', v_hidden_out,
    'private_views', (select count(*) from platform.saved_view sv
                       where sv.organization_id = v_from and sv.deleted_at is null and sv.surface_key = 'custom/records'
                         and coalesce(sv.subject_id, nullif(sv.definition ->> 'table_id', '')::uuid) = v_id
                         and sv.shown_to = 'only_me' and sv.created_by is distinct from v_me),
    -- A copied view is born as every new view is (the house door). Where the source view was
    -- "only me" the copy keeps "Shown to: only me" but is an organization view underneath: the
    -- retiring row column cannot be carried by name (T-13). Those views are named here.
    'views_shared_as_new_views', coalesce((
        select jsonb_agg(sv.name) from platform.saved_view sv
         where sv.organization_id = v_from and (v_job -> 'views') ? sv.id::text and sv.shown_to = 'only_me'), '[]'::jsonb),
    'row_references_dropped', v_refs_out,
    'not_copied', jsonb_build_array('history', 'forms', 'booking pages', 'portals', 'dashboards',
                                    'capture sheets', 'rules', 'webhooks', 'tables inside its rows',
                                    'sharing', 'comments', 'published to the web')));

  -- THE ONE HISTORY ROW, ON THE NEW TABLE: it is also the job.
  v_event := history.migration_record(v_to, 'duplicate', 'table', v_new, v_job,
                                      format('Duplicated from %s', v_src_name));

  -- THE TABLE RECORD. While it is being made it is the app's (kept_for "copying"): kept out of
  -- every table list (custom.table_kept_out_of_lists) and refused by every open, read, view and
  -- write door to anyone but its maker (custom._copy_in_progress_guard). The last pass hands it over.
  perform set_config('custom.table_duplicate_into', v_new::text, true);
  v_data := coalesce(custom._without_rows_of(custom._remap_rows(custom._uuid_remap(v_src.data, v_map), v_new, v_job), v_from, v_id), '{}'::jsonb)
            || jsonb_build_object('name', v_name, 'slug', v_slug, 'kept_by_the_app', true, 'kept_for', 'copying');
  -- BASE-AUTO-FIX (2026-10-15): the copy is a NEW table, so each automation it carries is a NEW automation: its own id, saved
  -- OFF, no inherited webhook secret. Carrying the original's ids made the copy and the original share one id, so switching
  -- the copy's off (the one-home lookup takes whichever table holds the id) could switch the ORIGINAL off.
  if jsonb_typeof(v_data -> 'automations') = 'array' then
    v_data := jsonb_set(v_data, '{automations}', coalesce((
      select jsonb_agg((a.e || jsonb_build_object('id', gen_random_uuid()::text, 'enabled', false)) - 'webhook_secret' order by a.n)
        from jsonb_array_elements(v_data -> 'automations') with ordinality a(e, n)), '[]'::jsonb));
  end if;
  if v_parent is not null then
    v_data := v_data || jsonb_build_object('parent_id', v_parent::text);
  end if;
  -- "Shown to: only me" while it is being made, so even a list that asks for the app's own
  -- tables does not show another person a half copy; the source's own "Shown to" comes back at
  -- handover.
  insert into custom.record (id, organization_id, table_id, data_class, data, metadata, shown_to)
  values (v_new, v_to, custom.table_kernel_id(), 'table', v_data,
          custom._copied_metadata(v_src.metadata), 'only_me');
  perform set_config('custom.table_duplicate_into', '', true);

  return jsonb_build_object(
    'duplicated', true,
    'table', jsonb_build_object('id', v_new, 'name', v_name),
    'from', jsonb_build_object('id', v_id, 'name', v_src_name, 'organization_id', v_from),
    'organization', jsonb_build_object('id', v_to, 'name', v_to_name),
    'event_id', v_event,
    'path', '/data-v2/' || v_new::text)
    || custom._table_duplicate_step(v_new, c_budget);
end;
$function$;
