-- INVERSE of migrations/campaign/tablecreatespeed_b_the_outbox_insert_plans_one_partition.sql (lane TABLE-CREATE-SPEED): the three bodies before it.
-- chair-step: restores function bodies.
-- lock: custom
-- based-on: custom._context_side_effects(jsonb) 62adcd10c9a781e4a9a94c32f9eee8f76fc0372e2ec1364d804df39ec2d263e2
-- based-on: custom._record_events_to_activity() 1563f6189f0715b0bb3b68e50e9d25fae2e72ff1dd180fe43b888cd41357e52c
-- based-on: custom.io_outbox_broadcast_stmt() 8c30c2f6b1dfc6b75f33c649f49a16a99fd4f0d62551d1417ae85b378c75c39e

CREATE OR REPLACE FUNCTION custom._context_side_effects(p_events jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog'
AS $function$
declare
  c_tk constant uuid := '11111111-0000-4000-8000-000000000001';   -- custom.table_kernel_id()
  c_fk constant uuid := '11111111-0000-4000-8000-000000000002';   -- custom.field_kernel_id()
  e      record;
  r      custom.record;
  x      record;
  v_type uuid;
  v_key  text;
  v_rs   jsonb;
  v_held uuid;
begin
  -- WHICH EVENTS ARE ABOUT THE CONTEXT SYSTEM: a Record in a Table kept for context (a scope), a Table
  -- kept for context (a scope type), a Field of one (a context field). A Table record that is gone
  -- (purged) is carried too, so its search row can go; everything else is left alone at the cost of
  -- one primary-key read per event.
  -- LANE 9 W2-W: A STORE-FIRST SCOPE DOOR HOLDS ITS OWN ROW BACK. The door writes the store first and the old
  -- row second; the old row's own triggers (the sweep wake, the search sync, the dataset provisioning) must run
  -- first, as they did when the old row was the writer, so the door names its row here for its first store
  -- write and runs this twin for it itself once the old row is written (custom.context_scope_write,
  -- custom.context_type_write). Every other event, and every other row in the same statement, is unchanged.
  v_held := nullif(current_setting('custom.context_door_row', true), '')::uuid;
  for e in
    select ev.org, ev.id, ev.table_id, bool_or(ev.operation = 'created') as created
      from (select (je ->> 0)::uuid as org, (je ->> 1)::uuid as id, (je ->> 2)::uuid as table_id, je ->> 3 as operation
              from jsonb_array_elements(coalesce(p_events, '[]'::jsonb)) je) ev
     where case
             when ev.table_id = c_tk then
               not exists (select 1 from custom.record t where t.organization_id = ev.org and t.id = ev.id)
               or exists (select 1 from custom.record t where t.organization_id = ev.org and t.id = ev.id
                            and t.data ->> 'kept_for' = 'context')
             when ev.table_id = c_fk then
               exists (select 1 from custom.record f
                         join custom.record t on t.organization_id = f.organization_id
                                             and t.id = (case when (f.data ->> 'entity_definition_id') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then (f.data ->> 'entity_definition_id')::uuid end)   -- TEMPLATE-INSTALL-SLOW: uuid compare, not a text cast of the id
                                             and t.table_id = c_tk and t.data ->> 'kept_for' = 'context'
                        where f.organization_id = ev.org and f.id = ev.id)
             else
               exists (select 1 from custom.record t where t.organization_id = ev.org and t.id = ev.table_id
                         and t.table_id = c_tk and t.data ->> 'kept_for' = 'context')
           end
       and ev.id is distinct from v_held
     group by 1, 2, 3
  loop
    select * into r from custom.record where organization_id = e.org and id = e.id;

    if e.table_id = c_tk then
      -- ── A SCOPE TYPE (twin of platform._search_item_sync_scope_type, public._notify_suggestion_sweep_scope_type)
      if r.id is null or r.deleted_at is not null then
        perform platform._search_item_drop('scope_type', e.id);
        continue;
      end if;
      -- The old title is the type's slug in the old grammar (hyphens); the store keeps it with
      -- underscores (measured 2026-09-28: 83 of 83 equal once read back).
      perform platform._search_item_put('scope_type', r.id, r.organization_id, r.created_by, null::platform.visibility,
        coalesce(nullif(btrim(r.data ->> 'label_plural'), ''), nullif(btrim(r.data ->> 'label_singular'), ''), nullif(btrim(replace(r.data ->> 'slug', '_', '-')), ''), 'Untitled scope type' || coalesce(' ' || to_char(r.created_at, 'YYYY-MM-DD'), '')),
        left(coalesce(nullif(r.data ->> 'description', ''), r.metadata #>> '{moved_from,carried,description}'), 140),
        '{}'::text[], r.updated_at, null::text, null::text);
      if e.created then
        insert into rag.kg_sweep_queue (change_type, entity_id, scope_type_id, organization_id, created_by)
        select 'scope_type', r.id, r.id, r.organization_id, null
         where not exists (select 1 from rag.kg_sweep_queue q where q.change_type = 'scope_type' and q.entity_id = r.id);
        if found then
          perform pg_notify('suggestion_sweep', json_build_object('change_type', 'scope_type', 'entity_id', r.id::text,
            'scope_type_id', r.id::text, 'organization_id', r.organization_id::text, 'created_by', null)::text);
        end if;
      end if;

    elsif e.table_id = c_fk then
      -- ── A CONTEXT FIELD (twin of public._notify_suggestion_sweep_context_item and the item half of
      --    context.provision_scope_datasets_trigger). An inactive or archived field wakes nothing.
      continue when r.id is null or r.deleted_at is not null
                 or not coalesce((r.metadata #>> '{moved_from,carried,is_active}')::boolean, true);
      v_type := (r.data ->> 'entity_definition_id')::uuid;
      if e.created then
        insert into rag.kg_sweep_queue (change_type, entity_id, scope_type_id, organization_id, created_by)
        select 'context_item', r.id, v_type, r.organization_id, r.created_by
         where not exists (select 1 from rag.kg_sweep_queue q where q.change_type = 'context_item' and q.entity_id = r.id);
        if found then
          perform pg_notify('suggestion_sweep', json_build_object('change_type', 'context_item', 'entity_id', r.id::text,
            'scope_type_id', v_type::text, 'organization_id', r.organization_id::text, 'created_by', r.created_by::text)::text);
        end if;
      end if;
      -- Where a Field says it is bound to a table template: its own document (lane
      -- SCOPES-STORE-HOMES' home), or what the copy carried before that home existed.
      v_rs := coalesce(r.data -> 'reference_source', r.metadata #> '{moved_from,carried,reference_source}');
      if v_rs ->> 'container_type' = 'table_template' then
        for x in select s.id from custom.record s
                  where s.organization_id = r.organization_id and s.table_id = v_type
                    and s.data_class = 'record' and s.deleted_at is null
        loop
          perform custom.scope_table_provision(r.organization_id, r.id, x.id, null);
        end loop;
      end if;

    else
      -- ── A SCOPE (twin of platform._search_item_sync_scope, public._notify_suggestion_sweep_scope
      --    and the scope half of context.provision_scope_datasets_trigger)
      if r.id is null or r.deleted_at is not null then
        perform platform._search_item_drop('scope', e.id);
        continue;
      end if;
      select f.data ->> 'key' into v_key from custom.record f
       where f.organization_id = r.organization_id and f.id = custom._ctx_id('scope-column-field', r.table_id::text, 'description');
      perform platform._search_item_put('scope', r.id, r.organization_id, r.created_by, r.visibility,
        coalesce(nullif(btrim(r.data ->> 'name'), ''), 'Untitled scope' || coalesce(' ' || to_char(r.created_at, 'YYYY-MM-DD'), '')),
        left(r.data ->> coalesce(v_key, 'description'), 140),
        '{}'::text[], r.updated_at, null::text, null::text);
      if e.created then
        insert into rag.kg_sweep_queue (change_type, entity_id, scope_type_id, organization_id, created_by)
        select 'scope', r.id, r.table_id, r.organization_id, r.created_by
         where not exists (select 1 from rag.kg_sweep_queue q where q.change_type = 'scope' and q.entity_id = r.id);
        if found then
          perform pg_notify('suggestion_sweep', json_build_object('change_type', 'scope', 'entity_id', r.id::text,
            'scope_type_id', r.table_id::text, 'organization_id', r.organization_id::text, 'created_by', r.created_by::text)::text);
        end if;
        for x in select f.id from custom.record f
                  where f.organization_id = r.organization_id and f.table_id = c_fk and f.deleted_at is null
                    and f.data ->> 'entity_definition_id' = r.table_id::text
                    and coalesce((f.metadata #>> '{moved_from,carried,is_active}')::boolean, true)
                    and coalesce(f.data -> 'reference_source', f.metadata #> '{moved_from,carried,reference_source}') ->> 'container_type' = 'table_template'
        loop
          perform custom.scope_table_provision(r.organization_id, x.id, r.id, null);
        end loop;
      end if;
    end if;
  end loop;
end
$function$;

CREATE OR REPLACE FUNCTION custom._record_events_to_activity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
begin
  insert into platform.activity_log (organization_id, entity_type, entity_id, action, actor_id, metadata)
  select n.organization_id,
         custom.record_source_key(n.table_id),
         n.record_id,
         'record.' || case
           when n.operation = 'updated' then 'updated'
           when n.operation = 'created' and coalesce(r.version, 1) > 1 then 'restored'
           when n.operation = 'created' then 'created'
           when n.operation = 'deleted' and r.id is null then 'purged'
           when n.operation = 'deleted' then 'archived'
           else n.operation end,
         nullif(n.actor ->> 'user_id', '')::uuid,
         jsonb_build_object(
           'table_id',          n.table_id,
           'table_name',        t.data ->> 'name',
           'record_id',         n.record_id,
           'version',           r.version,
           'changed_field_ids', n.changed_field_ids,
           -- G8: the changed columns by KEY, the older store's `changed_fields` word, so the
           -- scheduler's `changed_fields` filter (scheduler.sch_match_event) reads both stores
           -- one way.
           'changed_fields',    coalesce((select jsonb_agg(f.data ->> 'key' order by f.data ->> 'key')
                                            from custom.record f
                                           where f.organization_id = n.organization_id
                                             and f.table_id = custom.field_kernel_id()
                                             and f.id in (select platform.uuid_or_null(e) from jsonb_array_elements_text(
                                                   case when jsonb_typeof(n.changed_field_ids) = 'array'
                                                        then n.changed_field_ids else '[]'::jsonb end) e)),
                                         '[]'::jsonb),
           'actor_tier',        n.actor ->> 'tier',
           'source',            'custom.io_outbox')
    from new_rows n
    left join custom.record r on r.organization_id = n.organization_id and r.id = n.record_id
    left join custom.record t on t.organization_id = n.organization_id and t.id = n.table_id
   where n.event_key = 'records.changed'
     and n.table_id is not null
     and (exists (select 1 from files.webhooks w
                   where w.is_active
                     and w.organization_id = n.organization_id
                     and w.resource_types && custom.record_source_keys(n.table_id))
          -- G8: ONE PATH FOR BOTH STORES. A schedule that runs an agent when a row changes
          -- (scheduler.sch_trigger type `event`) listens to the same activity spine the older
          -- store's workbench.udt_row_activity writes, and scheduler.sch_match_event fires it
          -- from there. A record-store table's changes now land on that spine whenever a live
          -- schedule listens for them, exactly as they do for a webhook.
          or exists (select 1 from scheduler.sch_trigger t
                      where t.type = 'event' and t.enabled and t.deleted_at is null
                        and t.organization_id = n.organization_id
                        and t.config ->> 'entity_type' = any (custom.record_source_keys(n.table_id))))
     -- The organization's own store switch (the guard this file names): a store that is off
     -- announces nothing, to a webhook or to a schedule.
     -- (CHAIR-ALWAYS-ON 2026-10-03: the per-organization store switch is retired; the store is always on, so
     -- the knob arm that used to sit here is gone.)
     ;
  -- LANE SCOPES-SIDE-EFFECTS: the old scope tables' side effects ride this consumer's own statement
  -- (the search index, the suggestion-sweep wake, a scope's dataset table), for Tables kept for
  -- context only — custom._context_side_effects filters. No trigger of their own: creating one on
  -- custom.io_outbox would queue every store write behind its lock.
  perform custom._context_side_effects(
    (select jsonb_agg(jsonb_build_array(n.organization_id, n.record_id, n.table_id, n.operation))
       from new_rows n
      where n.event_key = 'records.changed' and n.table_id is not null));
  return null;
end
$function$;

CREATE OR REPLACE FUNCTION custom.io_outbox_broadcast_stmt()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_cap          constant integer := 200;
  v_field_kernel uuid;
  v_table_kernel uuid;
  r              record;
begin
  -- THE PLATFORM'S OWN SWITCH, ASKED ONCE PER STATEMENT. When this database does not
  -- authorize private channels, no subscriber can ever be admitted to one of these topics, so
  -- a notice written now is a row nobody will ever read. Exactly the same expression the RLS
  -- policy uses, so the two sides cannot drift.
  if not coalesce(
       (platform.knob_resolve('platform', 'realtime_broadcast_enabled', null) #>> '{}')::boolean,
       false)
  then
    return null;
  end if;

  v_field_kernel := custom.field_kernel_id();
  v_table_kernel := custom.table_kernel_id();

  for r in
    with subject as (
      select n.organization_id,
             case when n.table_id = v_table_kernel then n.record_id
                  when n.table_id = v_field_kernel then f.entity_definition_id
                  else n.table_id end                                      as table_id,
             case when n.table_id = v_table_kernel then 'table'
                  when n.table_id = v_field_kernel then 'field'
                  else 'record' end                                        as kind,
             n.operation,
             n.record_id,
             coalesce(jsonb_array_length(n.changed_field_ids), 0) > 0      as fields_changed
        from new_rows n
        -- ONLY Field rows pay for this. The ordinary record write — the whole bulk path —
        -- matches nothing here and the join contributes no rows and no lookups.
        left join lateral (
          select (c.data ->> 'entity_definition_id')::uuid as entity_definition_id
            from custom.record c
           where c.organization_id = n.organization_id
             and c.id = n.record_id
        ) f on n.table_id = v_field_kernel
       where n.event_key = 'records.changed'
    )
    select s.organization_id,
           s.table_id,
           s.kind,
           s.operation,
           count(*)                    as n,
           jsonb_agg(s.record_id)      as ids,
           bool_or(s.fields_changed)   as fields_changed
      from subject s
     where s.table_id is not null
     group by s.organization_id, s.table_id, s.kind, s.operation
  loop
    perform custom._realtime_notice(
      r.organization_id, r.table_id, r.kind, r.operation,
      case when r.n > v_cap then null else r.ids end,
      r.fields_changed);
  end loop;

  return null;
end;
$function$;
