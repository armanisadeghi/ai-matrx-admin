-- chair-step: puts custom.reverse_columns back to the single-pass query that ran the access checks on every table of the organization.
-- based-on: custom.reverse_columns(uuid, uuid) <the hash of the new body; take it with pnpm db:based-on custom.reverse_columns before applying>
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
  with links as (
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
