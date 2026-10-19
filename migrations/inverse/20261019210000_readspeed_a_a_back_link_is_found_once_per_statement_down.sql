-- target: branch,production
-- lane: READ-SPEED
-- lock: custom
-- based-on: custom._back_link_relation(uuid, uuid, text) 0d8eb43438acb5fb92a298f434267de47f771de152be17323a26b7bc7ac70d19
-- Inverse of READ-SPEED a: custom._back_link_relation as it was (LANGUAGE sql, one lookup per call).

CREATE OR REPLACE FUNCTION custom._back_link_relation(p_organization_id uuid, p_table_id uuid, p_key text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
  -- THE REVERSE COLUMN `p_key` OF TABLE `p_table_id`, AS THE RELATION IT IS FROM THIS END (REL-9).
  -- custom.reverse_columns keys a reverse column by its linking Field's inverse_key, else
  -- `linked_<field id without dashes>`; this answers that same key with the shape a relation Field
  -- has where a roll-up reads it: a relation of MANY records whose target is the linking table,
  -- plus the linking Field (`back_link_of`) whose edges are the links. Null when no relation of
  -- this organization links to the table under that key. No client lane: called
  -- only from the store's own definer bodies (the field guard, custom.rollup_value, custom.relation_targets).
  -- NOTION-PROPS: a two-way link's reverse Field (config.reverse_of) shares its key with the forward
  -- Field's inverse_key and holds no value, so a read through that key lands here and reads the
  -- forward Field's edges; the reverse Field itself is never a linking Field.
  select jsonb_build_object(
           'type', 'relation',
           'multi', true,
           'key', p_key,
           'relation_target', f.data ->> 'entity_definition_id',
           'back_link_of', f.id::text,
           'back_link_field_key', coalesce(nullif(f.data ->> 'key', ''), f.data ->> 'name'),
           'label', coalesce(nullif(btrim(f.data ->> 'label'), ''), f.data ->> 'key'))
    from custom.record f
   where f.organization_id = p_organization_id
     and f.table_id = custom.field_kernel_id()
     and f.data_class = 'field'
     and f.deleted_at is null
     and f.data ->> 'type' = 'relation'
     and nullif(f.data -> 'config' ->> 'reverse_of', '') is null
     and p_table_id is not null
     and (case coalesce(nullif(f.data -> 'config' ->> 'target_mode', ''), 'one')
            when 'one' then f.data ->> 'relation_target' = p_table_id::text
            when 'several' then coalesce(f.data -> 'config' -> 'target_tables', '[]'::jsonb) ? p_table_id::text
            else false end)
     and (nullif(f.data ->> 'inverse_key', '') = p_key
          or (nullif(f.data ->> 'inverse_key', '') is null and 'linked_' || replace(f.id::text, '-', '') = p_key))
   order by f.id
   limit 1
$function$

;
