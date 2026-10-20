-- INVERSE of migrations/campaign/20261021260300_linkpicker2_d_a_kind_whose_id_is_not_a_uuid_is_not_offered_as_a_link_target.sql (lane LINK-PICKER-2): restores custom.entity_reference_kinds as it was (every active record -> kind rule).
-- chair-step: restores one function body.
-- lock: custom
-- based-on: custom.entity_reference_kinds() e48aa7cb1d78a100c8b406e58ea253e81d57c312a822d2810d6eff25c16368f4
set local lock_timeout = '3s';

create or replace function custom.entity_reference_kinds()
 RETURNS TABLE(token text, label text, category text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
#variable_conflict use_column
begin
  -- SUITE-HEALTH-3: the identical body, moved from LANGUAGE sql into plpgsql so its plan is
  -- cached for the session instead of re-planned on every call (writeperf2_green clause 9).
  -- The kinds of platform thing an entity-reference Field may name: exactly the registered
  -- `record → <token>` association types, so the list a person picks from, the list the Field
  -- guard accepts and the list the edge trigger accepts are ONE list.
  return query
  select e.token, e.label, coalesce(nullif(e.reference_category, ''), e.schema_name)
    from platform.association_types r
    join platform.entity_types e on e.token = r.target_type
   where r.source_type = 'record'
     and r.target_type <> 'record'
     and r.is_active
     and e.is_active
   order by e.label;
end
$function$
;
