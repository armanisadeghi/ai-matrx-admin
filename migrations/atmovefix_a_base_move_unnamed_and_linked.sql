-- AT-MOVEFIX (Airtable parity, move a base between workspaces) — two defects found walking custom.base_move (AT-WALK-E):
--   1. A base nobody ever named ("Name this base") has no custom.base row, so base_move refused it ("That base is not one you have been given").
--      Homes made by ensureTable / imports / templates never have one, while /data/bases lists them. A base is now a Home record that holds
--      tables (the rule /data/bases uses); the custom.base row moves only when it exists.
--   2. A base whose tables link to each other could not move: tables went through custom.table_move one at a time, so each link between the
--      base's own tables looked like a link to a table that stays. The base's tables now go as ONE set (custom._table_move_set names them to
--      the plan for the length of the transaction); links among them are internal. A link to a table OUTSIDE the base refuses,
--      naming that table, and nothing moves. Single-table moves are unchanged (the set is empty).
-- Proof: scripts/campaign-tests/atnotify_base_move.sql (clauses 3 unnamed, 4 intra-base relation, 5 outside link). Inverse: migrations/inverse/atmovefix_a_base_move_unnamed_and_linked_down.sql
-- based-on: custom._table_move_plan(uuid, uuid, uuid) 8e1f07642ef607a8c4c0581c0f44b99026f451adb60e90056b3319d75f7d252e
-- based-on: custom.relation_value_target_ok(uuid, uuid, jsonb, uuid) d2ca0a3ad85c05e619739d891080864c75a3c650c2af38ecad46f534fcefc3e2
-- based-on: custom.base_move(uuid, uuid) 1208916139f984eba2b139ea389696bc9a3780bf73e745e7a7e4a4d270a18b1c

CREATE OR REPLACE FUNCTION custom._table_move_set()
 RETURNS uuid[]
 LANGUAGE sql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
  select coalesce(nullif(current_setting('custom.table_move_set', true), '')::uuid[], array[]::uuid[]);
$function$;

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
    select a.source_id as src, a.target_id as tgt
      from platform.associations a
     where a.deleted_at is null and a.relation_field_id is not null
       and a.source_type = 'record' and a.target_type = 'record'
       and ((a.source_id = any (v_recs)) <> (a.target_id = any (v_recs)))
       and exists (select 1 from custom.record o where o.organization_id = v_org
                    and o.id = case when a.source_id = any (v_recs) then a.target_id else a.source_id end)
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

CREATE OR REPLACE FUNCTION custom.relation_value_target_ok(p_organization_id uuid, p_field_id uuid, p_field_data jsonb, p_target_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_decl     jsonb;
  v_mode     text;
  v_tables   uuid[];
  v_tgt_org  uuid;
  v_tgt_tbl  uuid;
  v_open     boolean;
begin
  if p_organization_id is null or p_target_id is null then
    return false;
  end if;

  -- THE OLD CONDITION, FIRST AND UNCHANGED: a live record of this organization in the
  -- declared table. Almost every relation value on the platform is answered here.
  if exists (select 1 from custom.record t
              where t.organization_id = p_organization_id
                and t.id = p_target_id
                and t.table_id = nullif(p_field_data ->> 'relation_target', '')::uuid
                and t.deleted_at is null) then
    return true;
  end if;

  select t.organization_id, t.table_id into v_tgt_org, v_tgt_tbl
    from custom.record t
   where t.id = p_target_id and t.deleted_at is null
   limit 1;
  if v_tgt_org is null then
    return false;
  end if;

  -- REL-8, read from the declaration exactly as platform.enforce_relation_edge reads it.
  v_decl := case when p_field_id is null then null
                 else platform.relation_declaration(p_organization_id, p_field_id) end;
  v_mode := coalesce(v_decl ->> 'target_mode', 'one');
  if v_mode <> 'any' then
    select array_agg((x #>> '{}')::uuid) into v_tables
      from jsonb_array_elements(coalesce(v_decl -> 'target_tables', '[]'::jsonb)) x;
    if v_tgt_tbl is null or not (v_tgt_tbl = any (coalesce(v_tables, '{}'::uuid[]))) then
      return false;
    end if;
  end if;

  -- AT-MOVEFIX: while custom.base_move moves a base's tables as one set, a link from one of them to another is internal:
  -- the target row has not landed in the new organization yet (a row is judged before its sibling in the same statement), and it is
  -- about to. A link to a table outside the set is still judged exactly as before.
  if v_tgt_tbl = any (custom._table_move_set())
     and nullif(p_field_data ->> 'entity_definition_id', '')::uuid = any (custom._table_move_set()) then
    return true;
  end if;

  if v_tgt_org = p_organization_id then
    return true;
  end if;

  -- REC-29 / VIS-34: across organizations only where the Table the relation STARTS at allows
  -- it AND both organizations have turned links on — the same two facts the edge trigger reads.
  select coalesce((t.data ->> 'cross_organization_relations')::boolean, false) into v_open
    from custom.record t
   where t.organization_id = p_organization_id
     and t.id = nullif(p_field_data ->> 'entity_definition_id', '')::uuid
     and t.deleted_at is null;
  return coalesce(v_open, false)
     and custom.cross_organization_links_open(p_organization_id, v_tgt_org);
end;
$function$;

CREATE OR REPLACE FUNCTION custom.base_move(p_home_id uuid, p_to_organization_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_me     uuid := custom.query_principal();
  v_from   uuid;
  v_hdata  jsonb;
  v_base   uuid;
  v_name   text;
  v_tables uuid[];
  v_t      uuid;
  v_moved  jsonb := '[]'::jsonb;
  v_res    jsonb;
  v_out    text[];
  v_n      text;
  v_to_name text;
  r        record;
begin
  if v_me is null then
    raise exception 'Sign in to move a base.' using errcode = '42501';
  end if;
  if p_home_id is null or p_to_organization_id is null then
    raise exception 'Say which base to move and which workspace it goes to.' using errcode = '22004';
  end if;
  -- A BASE IS A HOME THAT HOLDS TABLES (the rule /data/bases uses); its custom.base row (a name, an icon) exists only once someone named it.
  select h.organization_id, h.data into v_from, v_hdata
    from custom.record h where h.id = p_home_id and h.deleted_at is null;
  select b.id, b.name into v_base, v_name
    from custom.base b where b.home_id = p_home_id and b.deleted_at is null;
  if v_from is null then
    raise exception 'That base is not one you have been given, so nothing moved.' using errcode = '42501';
  end if;
  select coalesce(array_agg(t.id order by t.created_at, t.id), array[]::uuid[]) into v_tables
    from custom.record t
   where t.organization_id = v_from and t.data_class = 'table' and t.deleted_at is null
     and custom.containment_parent(t.data) = p_home_id;
  if v_base is null and coalesce(array_length(v_tables, 1), 0) = 0 then
    raise exception 'That base is not one you have been given, so nothing moved.' using errcode = '42501';
  end if;
  v_name := coalesce(v_name, nullif(btrim(v_hdata ->> 'name'), ''),
                     (select nullif(btrim(t.data ->> 'name'), '') from custom.record t where t.id = v_tables[1]), 'This base');
  -- The organization wall, then the row: admin on the Home.
  perform custom.assert_client_may_change(v_from, p_home_id, 'custom.base_move', 'admin', 'base');
  if p_to_organization_id = v_from then
    raise exception '% is already in that workspace.', v_name using errcode = '22023';
  end if;
  if not iam.is_org_member(v_me, p_to_organization_id) then
    raise exception 'You are not a member of that workspace, so % cannot go there.', v_name
      using errcode = '42501', hint = 'A base moves only into a workspace you belong to.';
  end if;
  perform custom.assert_store_door(p_to_organization_id, 'custom.base_move');
  select o.name::text into v_to_name from iam.organizations o where o.id = p_to_organization_id;

  if coalesce(array_length(v_tables, 1), 0) > 0 then
    -- LINKS TO TABLES OUTSIDE THE BASE refuse, by name (links among the base's own tables are internal and travel with it).
    select coalesce(array_agg(distinct x.nm order by x.nm), array[]::text[]) into v_out from (
      select coalesce(nullif(btrim(ot.data ->> 'name'), ''), 'another table') as nm
        from custom.record f
        join custom.record ot on ot.organization_id = v_from and ot.id = nullif(f.data ->> 'relation_target', '')::uuid
                             and ot.data_class <> 'kernel' and ot.deleted_at is null
       where f.organization_id = v_from and f.table_id = custom.field_kernel_id() and f.deleted_at is null
         and nullif(f.data ->> 'entity_definition_id', '')::uuid = any (v_tables)
         and not (ot.id = any (v_tables))
      union all
      select coalesce(nullif(btrim(st.data ->> 'name'), ''), 'another table')
        from custom.record f
        join custom.record st on st.organization_id = v_from and st.id = nullif(f.data ->> 'entity_definition_id', '')::uuid
                             and st.deleted_at is null
       where f.organization_id = v_from and f.table_id = custom.field_kernel_id() and f.deleted_at is null
         and nullif(f.data ->> 'relation_target', '')::uuid = any (v_tables)
         and not (st.id = any (v_tables))) x;
    if coalesce(array_length(v_out, 1), 0) > 0 then
      raise exception '% is linked to % outside this base, so nothing moved.', v_name, array_to_string(v_out, ', ')
        using errcode = '55000',
              hint = 'Remove those links, or move the other table into this base, then move it again.';
    end if;
    -- Each table must be the caller's to move and must not collide with a table already over there (the checks the per-table door made one by one).
    foreach v_t in array v_tables loop
      select t.* into r from custom.record t where t.id = v_t;
      if not (r.created_by = v_me or iam.is_org_manager(v_from, v_me)) then
        raise exception 'Only the person who made % or an owner or admin of its workspace can move it.', coalesce(nullif(btrim(r.data ->> 'name'), ''), 'a table')
          using errcode = '42501';
      end if;
      if exists (select 1 from custom.record d
                  where d.organization_id = p_to_organization_id and d.table_id = custom.table_kernel_id() and d.deleted_at is null
                    and lower(coalesce(d.data ->> 'slug', d.data ->> 'name')) = lower(coalesce(r.data ->> 'slug', r.data ->> 'name'))) then
        raise exception '% already has a table called %. Rename one of them first.', v_to_name, coalesce(nullif(btrim(r.data ->> 'name'), ''), 'a table')
          using errcode = '55000';
      end if;
    end loop;

    -- ALL THE BASE'S TABLES THROUGH THE ONE TABLE DOOR, AS ONE SET: the door's plan carries every table of the set together
    -- (custom._table_move_set), so its own refusals (held by something) still stop and undo the whole base.
    -- The other tables are filed inside the first for the length of the move (a table inside a carried table rides with it, and lands
    -- after it); the loop below puts every table back under the Home. The first stays where it is.
    foreach v_t in array v_tables[2:array_length(v_tables, 1)] loop
      perform custom.record_reparent(v_from, v_t, v_tables[1]);
    end loop;
    perform set_config('custom.table_move_set', v_tables::text, true);
    v_res := custom.table_move(v_tables[1], p_to_organization_id, null);
    perform set_config('custom.table_move_set', '', true);
    select coalesce(jsonb_agg(jsonb_build_object('id', t.id, 'name', t.data ->> 'name') order by t.created_at, t.id), '[]'::jsonb)
      into v_moved from custom.record t where t.id = any (v_tables);
  end if;

  -- THE HOME AND ITS BASE ROW (when someone named the base) FOLLOW (the same mark custom.table_move sets, for the same partition re-key).
  perform set_config('custom.table_move_from', v_from::text, true);
  update custom.record h set organization_id = p_to_organization_id where h.organization_id = v_from and h.id = p_home_id;
  if v_base is not null then
    update custom.base b set organization_id = p_to_organization_id where b.id = v_base;
  end if;
  perform set_config('custom.table_move_from', '', true);
  update history.row_versions v set organization_id = p_to_organization_id
   where v.entity_type = 'custom.record' and v.organization_id = v_from and v.row_id = p_home_id;

  -- THE TABLES GO BACK UNDER THEIR HOME, so the base is still one base over there.
  foreach v_t in array v_tables loop
    perform custom.record_reparent(p_to_organization_id, v_t, p_home_id);
  end loop;

  return jsonb_build_object('moved', true, 'base_id', v_base, 'home_id', p_home_id, 'name', v_name,
           'from_organization_id', v_from, 'to_organization_id', p_to_organization_id,
           'tables', v_moved, 'path', '/data/bases/' || p_home_id::text);
end;
$function$;
