-- AT-SLOW (Airtable parity: base move timed out at the 8 s client limit on a 2-table linked base). Two set-based fixes, measured on live
-- inside rolled-back transactions (auto_explain, 30-row two-table linked base, ~/lane-resume/reports/AT-SLOW.md):
--   1. custom._table_move_plan's "crossing" check asked one exclusive-or of EVERY live relation edge in the store (Parallel Bitmap Heap
--      Scan over idx_assoc_relation_field_live, 103,794 edges, 4,089 buffers read, 591 ms) to find the few that start or end at a moving
--      row. It now asks two halves, each from the moving rows through idx_assoc_source_live / idx_assoc_target_live; same rows, same answer.
--   2. custom._field_write_door (BEFORE UPDATE OF data) asked custom.effective_level for every row a statement named, before looking at
--      whether any value changed: ~8 ms a row on a move between organizations or a re-file, where no value changes (463 ms of the 30-row
--      move). An UPDATE that leaves data as it was now returns at once, and the ladder is asked only when a changed value is a real field.
-- Inverse: migrations/inverse/atslow_a_move_plan_and_field_door_skip_unchanged_down.sql
-- based-on: custom._table_move_plan(uuid, uuid, uuid) d929f207f4a3086063d12e180092b1707d27dade15c797f3eb2bd1238b563511
-- based-on: custom._field_write_door() f7015065b7ab2840a269f5cbf54b5e8eaf418f6064bc42139e1e74e9c9ab1f23

CREATE OR REPLACE FUNCTION custom._table_move_plan(p_table_id uuid, p_to uuid, p_me uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_tables   uuid := custom.table_kernel_id();
  v_fieldk   uuid := custom.field_kernel_id();
  v_ceiling  constant integer := 16;   -- REC-N-4, the containment ceiling
  v_t        record;
  v_org      uuid;
  v_org_name text;
  v_name     text;
  v_may      boolean := false;
  v_why_not  text;
  v_general  text[] := array[]::text[];
  v_carry_t  uuid[];            -- tables that move: the table, what is inside it, their own choice lists
  v_add      uuid[];
  v_inside   integer := 0;      -- tables that ride along because they live inside what moves
  v_round    integer := 0;
  v_fields   uuid[];
  v_recs     uuid[];
  v_others   uuid[];            -- rules, dashboards, templates, relations that move
  v_all      uuid[];
  v_idre     text;
  r          record;
  v_dest     jsonb := '[]'::jsonb;
  v_to_why   text;
  v_counts   jsonb;
  v_shared   text;
  v_home_like boolean;
  v_cross_n  integer := 0;      -- relation values that will cross the wall
  v_cross_shut text;            -- a source table that does not allow links to other organizations
  v_cols_n   integer := 0;      -- columns that will point across the wall (SC-1-TAILS)
begin
  select t.* into v_t
    from custom.record t
   where t.id = p_table_id and t.table_id = v_tables
   limit 1;
  if not found then
    return null;
  end if;
  v_org  := v_t.organization_id;
  v_name := coalesce(nullif(btrim(v_t.data ->> 'name'), ''), 'This table');
  select o.name into v_org_name from iam.organizations o where o.id = v_org;
  v_org_name := coalesce(v_org_name, 'its organization');

  -- WHO MAY MOVE IT: the person who made it, or an owner or admin of its organization.
  v_may := p_me is not null
           and (v_t.created_by = p_me or iam.is_org_manager(v_org, p_me));
  if not v_may then
    v_why_not := format('Only the person who made %s or an owner or admin of %s can move it.',
                        v_name, v_org_name);
  end if;

  -- ── what the store or the app keeps never moves by itself ──
  if v_t.data_class = 'kernel' then
    v_general := v_general || format('%s is one of the record store''s own tables, so it stays where it is.', v_name);
  elsif coalesce((v_t.data ->> 'kept_by_the_app')::boolean, false) or v_t.data ? 'scope_binding' then
    v_general := v_general || format(
      'The app keeps %s for %s, so it moves with what uses it, not by itself.',
      v_name,
      coalesce(case v_t.data ->> 'kept_for'
                 when 'context' then 'the context system'
                 when 'choices' then 'a column''s choices'
                 else nullif(v_t.data ->> 'kept_for', '') end,
               'one of its features'));
  end if;
  if v_t.deleted_at is not null then
    v_general := v_general || format('%s is in the trash. Restore it first, then move it.', v_name);
  end if;

  -- ── where it sits: a HOME (its organization's record, a person's space, a "Home" folder, a
  -- kernel row) moves with nothing and is re-pointed; a row of another Table or a Table is a
  -- container, and a Table inside a container moves with it, not by itself ──
  if custom.containment_parent(v_t.data) is not null then
    select coalesce(nullif(btrim(p.data ->> 'name'), ''), nullif(btrim(p.data ->> 'title'), ''), 'another record'),
           (p.table_id is null or p.data_class = 'kernel'
            or exists (select 1 from custom.record k where k.id = p.table_id and k.data_class = 'kernel'))
           and p.table_id is distinct from v_tables
      into v_shared, v_home_like
      from custom.record p
     where p.organization_id = v_org and p.id = custom.containment_parent(v_t.data);
    if not coalesce(v_home_like, true) then
      v_general := v_general || format('%s lives inside %s, so it moves with that, not by itself.',
                                       v_name, coalesce(v_shared, 'another record'));
    end if;
  end if;

  -- ── the carry set: a CLOSURE (SC-1-TAILS). What is inside what moves, moves with it. ──
  -- Each round adds (a) the choice lists only the carried tables' columns use, and (b) every
  -- Table — live or in the trash — whose home is a carried Table or a row of one. It stops when
  -- a round adds nothing, or at the containment ceiling, which is then said.
  -- AT-MOVEFIX: a base moves its tables TOGETHER; custom.base_move names them in custom._table_move_set(), so links among them are internal.
  v_carry_t := array[p_table_id] || array(select s from unnest(custom._table_move_set()) s where s <> p_table_id);
  loop
    v_round := v_round + 1;
    select coalesce(array_agg(distinct o.id), array[]::uuid[]) into v_add
      from custom.record f
      join custom.record o
        on o.organization_id = v_org
       and o.id = nullif(f.data -> 'config' ->> 'options_table_id', '')::uuid
       and o.table_id = v_tables
     where f.organization_id = v_org and f.table_id = v_fieldk
       and nullif(f.data ->> 'entity_definition_id', '')::uuid = any (v_carry_t)
       and not (o.id = any (v_carry_t))
       and coalesce((o.data ->> 'kept_by_the_app')::boolean, false)
       and not exists (select 1 from custom.record g
                        where g.organization_id = v_org and g.table_id = v_fieldk
                          and g.deleted_at is null
                          and g.data -> 'config' ->> 'options_table_id' = o.id::text
                          and not (coalesce(nullif(g.data ->> 'entity_definition_id', '')::uuid,
                                            '00000000-0000-0000-0000-000000000000'::uuid) = any (v_carry_t)));
    v_carry_t := v_carry_t || v_add;

    select coalesce(array_agg(t2.id), array[]::uuid[]) into v_add
      from custom.record t2
     where t2.organization_id = v_org and t2.table_id = v_tables and t2.data_class = 'table'
       and not (t2.id = any (v_carry_t))
       and custom.containment_parent(t2.data) is not null
       and (custom.containment_parent(t2.data) = any (v_carry_t)
            or exists (select 1 from custom.record x
                        where x.organization_id = v_org
                          and x.id = custom.containment_parent(t2.data)
                          and x.table_id = any (v_carry_t)));
    v_inside := v_inside + coalesce(array_length(v_add, 1), 0);
    v_carry_t := v_carry_t || v_add;

    exit when coalesce(array_length(v_add, 1), 0) = 0;
    if v_round >= v_ceiling then
      v_general := v_general || format(
        'Tables are nested more than %s deep inside %s, which is deeper than the store keeps things inside things. Take the innermost ones out first.',
        v_ceiling, v_name);
      exit;
    end if;
  end loop;

  -- Choice lists it shares with a Table that stays: named, refused.
  for r in
    select distinct coalesce(nullif(btrim(f.data ->> 'label'), ''), f.data ->> 'key') as col,
           coalesce(nullif(btrim(ot.data ->> 'name'), ''), 'another table') as other
      from custom.record f
      join custom.record g
        on g.organization_id = v_org and g.table_id = v_fieldk and g.deleted_at is null
       and g.data -> 'config' ->> 'options_table_id' = f.data -> 'config' ->> 'options_table_id'
       and not (coalesce(nullif(g.data ->> 'entity_definition_id', '')::uuid,
                         '00000000-0000-0000-0000-000000000000'::uuid) = any (v_carry_t))
      left join custom.record ot
        on ot.organization_id = v_org and ot.id = nullif(g.data ->> 'entity_definition_id', '')::uuid
     where f.organization_id = v_org and f.table_id = v_fieldk and f.deleted_at is null
       and nullif(f.data ->> 'entity_definition_id', '')::uuid = any (v_carry_t)
       and nullif(f.data -> 'config' ->> 'options_table_id', '') is not null
     limit 3
  loop
    v_general := v_general || format(
      'Its %s column shares its choices with %s, which stays in %s. Give one of them its own choices first.',
      r.col, r.other, v_org_name);
  end loop;

  select coalesce(array_agg(f.id), array[]::uuid[]) into v_fields
    from custom.record f
   where f.organization_id = v_org and f.table_id = v_fieldk
     and nullif(f.data ->> 'entity_definition_id', '')::uuid = any (v_carry_t);

  select coalesce(array_agg(x.id), array[]::uuid[]) into v_recs
    from custom.record x
   where x.organization_id = v_org and x.table_id = any (v_carry_t);

  select coalesce(array_agg(x.id), array[]::uuid[]) into v_others
    from custom.record x
   where x.organization_id = v_org
     and not (x.id = any (v_carry_t))
     and (   (x.data_class = 'rule'               and nullif(x.data ->> 'scope_table_id', '')::uuid   = any (v_carry_t))
          or (x.data_class = custom.dashboard_class() and nullif(x.data ->> 'subject_table_id', '')::uuid = any (v_carry_t))
          or (x.data_class = 'doc_template'       and nullif(x.data ->> 'renders_table_id', '')::uuid = any (v_carry_t))
          or (x.data_class = 'checklist_template' and nullif(x.data ->> 'about_table_id', '')::uuid   = any (v_carry_t))
          -- AT-NOTIFY-MOVE: an automation is the table's own (its entry lives in the table's data), so its revisions and run
          -- history ride with it. They named the table and its columns, which read as "still uses it" and held every
          -- table that had an automation in place.
          or (x.data_class in ('automation_revision', 'automation_run') and nullif(x.data ->> 'table_id', '')::uuid = any (v_carry_t))
          -- a relation record is filed with the row it starts at (REL-12): it moves with its
          -- `from`; one whose `to` stays is judged below.
          or (x.data_class = 'relation'
              and nullif(x.data ->> 'from', '')::uuid = any (v_recs)));

  v_all := v_carry_t || v_fields || v_recs || v_others;

  -- ── a COLUMN whose target stays, or a column that stays pointing in (SC-1-TAILS, chair ruling
  -- 2026-09-24): the same wall as a row link — it holds across organizations when the Table it
  -- STARTS at allows links to other organizations and both organizations have turned links on
  -- (asked per destination below); the store's own kernel Tables are shared and never cross ──
  for r in
    select coalesce(nullif(btrim(f.data ->> 'label'), ''), f.data ->> 'key') as col,
           coalesce(nullif(btrim(ot.data ->> 'name'), ''), 'another table') as other,
           nullif(f.data ->> 'entity_definition_id', '')::uuid as of_table,
           coalesce(nullif(btrim(mt.data ->> 'name'), ''), 'a table') as of_name,
           coalesce((mt.data ->> 'cross_organization_relations')::boolean, false) as allowed
      from custom.record f
      join custom.record ot
        on ot.organization_id = v_org and ot.id = nullif(f.data ->> 'relation_target', '')::uuid
       and ot.data_class <> 'kernel'
      left join custom.record mt
        on mt.organization_id = v_org and mt.id = nullif(f.data ->> 'entity_definition_id', '')::uuid
     where f.organization_id = v_org and f.id = any (v_fields) and f.deleted_at is null
       and not (nullif(f.data ->> 'relation_target', '')::uuid = any (v_carry_t))
  loop
    v_cols_n := v_cols_n + 1;
    if not r.allowed then
      v_general := v_general || format(
        '%s column links to %s, which stays in %s, and %s does not allow links to other organizations. Allow it in %s''s settings, or remove that column first.',
        case when r.of_table = p_table_id then 'Its ' || r.col else r.of_name || '''s ' || r.col end,
        r.other, v_org_name, r.of_name, r.of_name);
    end if;
  end loop;
  for r in
    select coalesce(nullif(btrim(f.data ->> 'label'), ''), f.data ->> 'key') as col,
           coalesce(nullif(btrim(ot.data ->> 'name'), ''), 'another table') as other,
           coalesce((ot.data ->> 'cross_organization_relations')::boolean, false) as allowed
      from custom.record f
      left join custom.record ot
        on ot.organization_id = v_org and ot.id = nullif(f.data ->> 'entity_definition_id', '')::uuid
     where f.organization_id = v_org and f.table_id = v_fieldk and f.deleted_at is null
       and not (f.id = any (v_fields))
       and nullif(f.data ->> 'relation_target', '')::uuid = any (v_carry_t)
  loop
    v_cols_n := v_cols_n + 1;
    if not r.allowed then
      v_general := v_general || format(
        '%s links to this table through its %s column and stays in %s, and %s does not allow links to other organizations. Allow it in %s''s settings, or remove that column first.',
        r.other, r.col, v_org_name, r.other, r.other);
    end if;
  end loop;

  -- ── a relation VALUE between a moving row and a row that stays (REC-29 / VIS-34) ──
  -- It holds across the wall where the wall is open: the Table it STARTS at allows links to other
  -- organizations, and both organizations have turned links on (asked per destination below).
  -- An OWNED relation record is containment, and containment never crosses.
  if exists (select 1 from custom.record x
              where x.organization_id = v_org and x.data_class = 'relation' and x.deleted_at is null
                and coalesce(x.data ->> 'kind', '') = 'owned'
                and ((nullif(x.data ->> 'from', '')::uuid = any (v_recs))
                     <> (nullif(x.data ->> 'to', '')::uuid = any (v_recs)))) then
    v_general := v_general || format(
      'Some of its rows own, or are owned by, rows that stay in %s. What is inside something moves with it, so take them apart first.',
      v_org_name);
  end if;
  with crossing as (
    -- the edges of relation columns (platform.associations, one fact with the value)
    -- AT-SLOW: two halves, each starting from the moving rows (idx_assoc_source_live / idx_assoc_target_live),
    -- instead of one exclusive-or every live relation edge in the store was read to answer (591 ms on 100k edges).
    select a.source_id as src, a.target_id as tgt
      from platform.associations a
     where a.source_type = 'record' and a.source_id = any (v_recs)
       and a.deleted_at is null and a.relation_field_id is not null
       and a.target_type = 'record' and not (a.target_id = any (v_recs))
       and exists (select 1 from custom.record o where o.organization_id = v_org and o.id = a.target_id)
    union all
    select a.source_id, a.target_id
      from platform.associations a
     where a.target_type = 'record' and a.target_id = any (v_recs)
       and a.deleted_at is null and a.relation_field_id is not null
       and a.source_type = 'record' and not (a.source_id = any (v_recs))
       and exists (select 1 from custom.record o where o.organization_id = v_org and o.id = a.source_id)
    union all
    -- referenced relation records
    select nullif(x.data ->> 'from', '')::uuid, nullif(x.data ->> 'to', '')::uuid
      from custom.record x
     where x.organization_id = v_org and x.data_class = 'relation' and x.deleted_at is null
       and coalesce(x.data ->> 'kind', '') <> 'owned'
       and ((nullif(x.data ->> 'from', '')::uuid = any (v_recs))
            <> (nullif(x.data ->> 'to', '')::uuid = any (v_recs)))
  )
  select count(*)::integer,
         (select coalesce(nullif(btrim(st.data ->> 'name'), ''), 'a table')
            from crossing c2
            join custom.record s  on s.organization_id = v_org and s.id = c2.src
            join custom.record st on st.organization_id = v_org and st.id = s.table_id
           where not coalesce((st.data ->> 'cross_organization_relations')::boolean, false)
           limit 1)
    into v_cross_n, v_cross_shut
    from crossing;
  if v_cross_shut is not null then
    v_general := v_general || format(
      'Some of its rows are linked to rows that stay in %s, and %s does not allow links to other organizations. Allow it in %s''s settings, or remove those links first.',
      v_org_name, v_cross_shut, v_cross_shut);
  end if;

  -- ── containment across the edge of what moves ──
  if exists (select 1 from custom.record x
              where x.organization_id = v_org and x.id = any (v_recs)
                and custom.containment_parent(x.data) is not null
                and not (custom.containment_parent(x.data) = any (v_all))) then
    v_general := v_general || 'Some of its rows live inside records of another table. Take them out first.'::text;
  end if;
  if exists (select 1 from custom.record x
              where x.organization_id = v_org and x.table_id <> v_tables and x.deleted_at is null
                and not (x.id = any (v_all))
                and custom.containment_parent(x.data) = any (v_recs)) then
    v_general := v_general || 'Records of other tables live inside its rows. Take them out first.'::text;
  end if;

  -- ── what else in the organization still uses it ──
  for r in
    select p.title from custom.portal p
     where p.organization_id = v_org and p.archived_at is null
       and (p.client_table_id = any (v_carry_t)
            or exists (select 1 from custom.portal_table pt
                        where pt.portal_id = p.id and pt.table_id = any (v_carry_t)))
     limit 3
  loop
    v_general := v_general || format(
      'The client portal "%s" shows it. Take it out of that portal first.', r.title);
  end loop;
  if exists (select 1 from iam.permissions g
              where g.resource_type = 'record' and g.resource_id = any (v_carry_t)
                and g.granted_to_organization_id = v_org
                and g.status <> 'rejected'
                and (g.expires_at is null or g.expires_at > now())) then
    v_general := v_general || format(
      'It is shared with everyone in %s. Stop sharing it with the whole organization first, so nobody keeps access by accident.',
      v_org_name);
  end if;
  v_idre := array_to_string(array(select x::text from unnest(v_carry_t || v_fields) x), '|');
  for r in
    select x.data_class as cls,
           coalesce(nullif(btrim(x.data ->> 'name'), ''), nullif(btrim(x.data ->> 'label'), ''), 'something') as nm,
           coalesce(nullif(btrim(ot.data ->> 'name'), ''), null) as of_table
      from custom.record x
      left join custom.record ot
        on ot.organization_id = v_org and ot.id = x.table_id and ot.table_id = v_tables
     where x.organization_id = v_org and x.deleted_at is null
       and x.table_id is distinct from v_fieldk            -- a column of another table is named above
       and not (x.id = any (v_all))
       -- A row of a table THE APP keeps (its own bookkeeping — the older saved-views copy, a
       -- choice list) follows the table by id and holds nothing in place.
       and not (ot.id is not null
                and coalesce((custom.table_placement(ot.organization_id, ot.id, ot.data, false) ->> 'platform_owned')::boolean, false))
       -- A relation record whose `to` is a moving row is judged above, as a link.
       and x.data_class is distinct from 'relation'
       and x.data::text ~ v_idre
     limit 3
  loop
    v_general := v_general || format(
      '%s "%s"%s still uses it and stays in %s. Change it first.',
      initcap(replace(case r.cls when 'record' then 'row' else r.cls end, '_', ' ')),
      r.nm,
      case when r.of_table is not null and r.cls = 'record' then format(' of %s', r.of_table) else '' end,
      v_org_name);
  end loop;

  -- ── where it may go: every organization this person belongs to, but this one ──
  for r in
    -- UI-FIX-19: the web address rides along, so a screen can tell two same-named organizations apart.
    select o.id, o.name::text as name, o.slug::text as slug, m.role::text as role
      from iam.organization_member m
      join iam.organizations o on o.id = m.organization_id and o.archived_at is null
     where m.user_id = p_me and o.id <> v_org
     order by o.name
  loop
    v_to_why := null;
    if not custom.store_is_open(r.id) then
      v_to_why := format('%s does not keep its data in the record store yet.', r.name);
    elsif exists (select 1 from custom.record d
                   where d.organization_id = r.id and d.table_id = v_tables and d.deleted_at is null
                     and lower(coalesce(d.data ->> 'slug', d.data ->> 'name'))
                       = lower(coalesce(v_t.data ->> 'slug', v_t.data ->> 'name'))) then
      v_to_why := format('%s already has a table called %s. Rename one of them first.', r.name, v_name);
    elsif v_cross_n + v_cols_n > 0 and not custom.cross_organization_links_open(v_org, r.id) then
      -- THE WALL IS ASKED OF BOTH ORGANIZATIONS, and the sentence says which is shut.
      v_to_why := format(
        '%s, and links between organizations need both to allow them: %s. Turn on "Links to other organizations" there, or remove those links first.',
        case when v_cross_n > 0 then format('Some of its rows are linked to rows that stay in %s', v_org_name)
             else format('Some of its columns link to tables that stay in %s', v_org_name) end,
        case when not custom.cross_organization_links_open(v_org, v_org) and not custom.cross_organization_links_open(r.id, r.id)
               then format('neither %s nor %s does', v_org_name, r.name)
             when not custom.cross_organization_links_open(v_org, v_org)
               then format('%s does not', v_org_name)
             else format('%s does not', r.name) end);
    end if;
    v_dest := v_dest || jsonb_build_object('id', r.id, 'name', r.name, 'slug', r.slug, 'role', r.role,
                                           'ok', v_to_why is null, 'why', v_to_why);
  end loop;

  v_counts := jsonb_build_object(
    'fields',  (select count(*) from custom.record f where f.organization_id = v_org and f.id = any (v_fields)
                  and (f.data ->> 'entity_definition_id')::uuid = p_table_id and f.deleted_at is null),
    'records', (select count(*) from custom.record x where x.organization_id = v_org
                  and x.table_id = p_table_id and x.deleted_at is null),
    'in_trash', (select count(*) from custom.record x where x.organization_id = v_org
                  and x.table_id = p_table_id and x.deleted_at is not null),
    'choice_lists', greatest(coalesce(array_length(v_carry_t, 1), 1) - 1 - v_inside, 0),
    'with_it', coalesce(array_length(v_others, 1), 0),
    -- SC-1-TAILS: what rides along because it lives inside, and the links that will reach back.
    'tables_inside', v_inside,
    'links_across', v_cross_n,
    'columns_across', v_cols_n);

  return jsonb_build_object(
    'table',        jsonb_build_object('id', p_table_id, 'name', v_name, 'version', v_t.version),
    'organization', jsonb_build_object('id', v_org, 'name', v_org_name),
    'may_move',     v_may,
    'why_not',      v_why_not,
    'held_by',      to_jsonb(v_general),
    'destinations', v_dest,
    'carries',      v_counts,
    -- internal: the ids that move. The doors strip this before a client reads the answer.
    '_carry',       jsonb_build_object('tables', to_jsonb(v_carry_t), 'fields', to_jsonb(v_fields),
                                       'records', to_jsonb(v_recs), 'others', to_jsonb(v_others)));
end;
$function$;

CREATE OR REPLACE FUNCTION custom._field_write_door()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_me    uuid := auth.uid();
  v_level public.permission_level;
  v_key   text;
  v_field custom.record;
  v_old   jsonb := coalesce(case when tg_op = 'UPDATE' then old.data end, '{}'::jsonb);
begin
  -- WHO THIS SKIPS, AND WHY IT IS NOT THE ROLE. Every write door into this store is
  -- SECURITY DEFINER and every server lane runs as the role that OWNS custom.record, so a
  -- role test here would skip the only write path that exists and DOOR-3 would be a law
  -- nothing ever enforced. What matters is whether a PERSON is being acted for: when the
  -- request carries one, that person's field-level security binds the write, whichever
  -- door and whichever role it arrived through. A write carrying no person at all is the
  -- store's own housekeeping and has no field-level answer to give.
  if v_me is null then
    return new;
  end if;
  if new.table_id is null or new.table_id = custom.field_kernel_id() then
    return new;
  end if;

  -- CREATING is not editing somebody else's field. `platform._stamp_actor` has already run
  -- (it sorts ahead of this trigger), so `created_by` is the person, and VIS-25 makes the
  -- creator the owner and therefore the top level on what they just made. Without this arm
  -- nobody could ever write a confidential field's first value, including its author — and
  -- it is also why the ladder below is only ever asked about a row that already exists.
  if tg_op = 'INSERT' and new.created_by = v_me then
    return new;
  end if;

  -- THE ONE LADDER'S LEVEL FORM. This used to be `iam.effective_level`, which is arm 2 of
  -- the one function rather than the one function: it cannot see the store's own carrying,
  -- so a person admitted to this record THROUGH its Table was masked out of every field on
  -- it. `custom.effective_level` is the same question the read door asks, so the fields a
  -- person may change are decided on the ladder that decided they may be here at all.
  -- AT-SLOW: an UPDATE that leaves the values as they were (a move between organizations, a re-file) has no field to judge,
  -- and the ladder is asked once, only when a changed value belongs to a real field (it cost ~8 ms a row on every move).
  if tg_op = 'UPDATE' and new.data is not distinct from old.data then
    return new;
  end if;

  for v_key in
    select e.key from jsonb_each(coalesce(new.data, '{}'::jsonb)) e
     where left(e.key, 1) <> '_'
       and (v_old -> e.key) is distinct from e.value
  loop
    select f.* into v_field
      from custom.record f
     where f.organization_id = new.organization_id
       and f.table_id = custom.field_kernel_id()
       and f.deleted_at is null
       and (f.data ->> 'entity_definition_id')::uuid = new.table_id
       and f.data ->> 'key' = v_key;
    if not found then continue; end if;
    if v_level is null then
      v_level := custom.effective_level(v_me, new.organization_id, new.id, 'record');
    end if;

    -- ACCESS-SETUP §12.1: the per-row form — a part's per-row cells (the person on THIS row) answer here.
    if not iam.part_may_touch(v_me, new.id, v_field.id, v_level, 'edit') then
      raise exception 'You can see this record, but "%" is not yours to change.',
                      coalesce(v_field.data ->> 'label', v_key)
        using errcode = '42501',
              hint = 'DOOR-3: the store refuses an edit to a field you may not edit, whichever door you came through. '
                     || 'It would take ' || iam.level_label('record',
                          iam.field_sensitivity_level(v_field.data ->> 'sensitivity', 'edit', new.organization_id))
                     || ', or a share of this one field with you.';
    end if;
  end loop;
  return new;
end;
$function$;
