-- lane: AT-FIX-G4
-- Replaces one function (custom.reverse_columns). Inverse: migrations/inverse/atfixg4_reverse_columns_asks_access_only_of_linking_tables_down.sql
-- based-on: custom.reverse_columns(uuid, uuid) 81d24cdd04599dfc549a0d2ccadc7a6c49445cee57b8054ca2d79c388883ca0f
--
-- WHY A MEMBER WAITED 5.7 s (measured 2026-10-19, EXPLAIN (ANALYZE, BUFFERS) as test@test.com through the authenticated role)
-- The query joined Fields to tables and asked _may_know_table + may_see_table_structure in the same WHERE. The planner
-- walked all 880 tables of the Workspace (outer) and ran both access checks on EVERY ONE (8.1 s inside the statement),
-- only then probing for relation Fields (0.03 ms each). The answer has 2 rows. The cost grew with the organization.
-- THE FIX: `links` is MATERIALIZED, so the cheap structural filter finds the few relation Fields that point here first,
-- and the access checks run only on those linking tables. Same rows, same order, same refusals.

CREATE OR REPLACE FUNCTION custom.reverse_columns(p_organization_id uuid, p_table_id uuid)
 RETURNS TABLE(key text, label text, source_field_id uuid, source_field_key text, source_field_label text, source_table_id uuid, source_table_name text, cardinality text, read_only boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_on boolean;
begin
  perform custom.assert_client_may_reach(p_organization_id, 'custom.reverse_columns');
  perform custom.assert_may_know_table(p_organization_id, p_table_id, 'custom.reverse_columns');
  -- CONF-STRUCTURE: no column list for a Confidential table whose structure this person may not see.
  if not custom.may_see_table_structure(p_organization_id, p_table_id) then
    return;
  end if;
  v_on := coalesce(nullif(platform.knob_resolve('custom', 'back_links', p_organization_id) #>> '{}', ''), 'true') = 'true';

  return query
  with links as materialized (
    select f.id as fid,
           coalesce(nullif(f.data ->> 'key', ''), f.data ->> 'name') as fkey,
           coalesce(nullif(btrim(f.data ->> 'label'), ''), f.data ->> 'key') as flabel,
           nullif(f.data ->> 'inverse_key', '') as ikey,
           coalesce((f.data ->> 'sort')::numeric, 100) as fsort,
           t.id as tid,
           coalesce(nullif(btrim(t.data ->> 'name'), ''), 'Linked records') as tname,
           rv.key as rkey,
           rv.label as rlabel
      from custom.record f
      join custom.record t
        on t.organization_id = p_organization_id
       and t.id = (f.data ->> 'entity_definition_id')::uuid
       and t.table_id = custom.table_kernel_id()
       and t.data_class = 'table'
       and t.deleted_at is null
      -- NOTION-PROPS: the two-way link's own Field on THIS table, when there is one.
      left join lateral (select x.key, x.label from custom._reverse_field_of(p_organization_id, f.id) x) rv
        on f.data ->> 'relation_target' = p_table_id::text
     where f.organization_id = p_organization_id
       and f.table_id = custom.field_kernel_id()
       and f.data_class = 'field'
       and f.deleted_at is null
       and f.data ->> 'type' = 'relation'
       and nullif(f.data -> 'config' ->> 'reverse_of', '') is null
       and (case coalesce(nullif(f.data -> 'config' ->> 'target_mode', ''), 'one')
              when 'one' then f.data ->> 'relation_target' = p_table_id::text
              when 'several' then coalesce(f.data -> 'config' -> 'target_tables', '[]'::jsonb) ? p_table_id::text
              else false end)
       and (v_on or nullif(f.data ->> 'inverse_key', '') is not null)
  ), seen as (
    -- the access questions are asked of the few linking tables, never of every table of the organization
    select l.* from links l where custom._may_know_table(p_organization_id, l.tid)
       and custom.may_see_table_structure(p_organization_id, l.tid)
  )
  select coalesce(s.rkey, s.ikey, 'linked_' || replace(s.fid::text, '-', '')),
         case when s.rlabel is not null then s.rlabel
              when s.tid = p_table_id
                or (select count(*) from seen s2 where s2.tid = s.tid) > 1
              then s.tname || ' (' || s.flabel || ')'
              else s.tname end,
         s.fid, s.fkey, s.flabel, s.tid, s.tname,
         'many'::text,
         s.rkey is null
    from seen s
   order by s.tname, s.fsort, s.flabel, s.fid;
end
$function$;
