-- target: branch,production
-- additive: yes
-- guard: custom/system_enabled
-- lane: READ-SPEED
-- lock: custom
-- based-on: custom._back_link_relation(uuid, uuid, text) b0edd898345234ac46fcdf36ee8d0bd9fd984be7a7e550d383e91fe06d29edae
--
-- READ-SPEED a — A BACK-LINK IS FOUND ONCE PER STATEMENT, BY THE TABLE'S OWN INDEX.
--
-- WHY (measured live 2026-10-19, ADVERSARIAL-3 D1). A freshly installed "Donors · Nonprofit Fundraising Desk"
-- (14 rows) read in 17-18 s, "Customers · Plumbing Company HQ" (12 rows) in 9.7-10.3 s; the page door timed out
-- at 8 s. pg_stat_xact_user_functions on one Donors page: custom._back_link_relation 248 calls, 15,958 ms SELF
-- of 18,172 ms. It was LANGUAGE sql with SET search_path, so it is never inlined and always runs a GENERIC plan:
-- `order by f.id limit 1` makes the planner walk the record_pXX_pkey (organization_id, id) index of the WHOLE
-- organization (43,480 rows, 43,812 buffers, 64-107 ms per call) instead of its 3,168 Field rows. Every roll-up
-- through a back-link asks it 2-3 times per row (custom._derived_source_archived, custom.relation_targets,
-- custom.rollup_value), so the cost was rows x roll-ups x the organization's size.
--
-- THE FIX. Same answer, asked once: the relation Fields of this organization that link to p_table_id are read
-- ONCE per statement (materialised over the (organization_id, table_id) Field rows, never the pkey walk) and kept
-- in the statement memo (platform.memo_k_*: seat + statement + backend + transaction + generation stamped; a
-- write to any Field row runs platform.memo_clear, so a Field made earlier in the same statement is seen). The
-- key is then picked from that list: inverse_key, else linked_<field id without dashes>; the first by Field id,
-- as before. Proven identical before shipping: old vs new body over every (organization, table, key) a roll-up
-- or lookup names plus every relation's back-link key in the database — 2,837 probes, 2,778 found, 0 differ.
-- Inverse: migrations/inverse/20261019210000_readspeed_a_a_back_link_is_found_once_per_statement_down.sql

create or replace function custom._back_link_relation(p_organization_id uuid, p_table_id uuid, p_key text)
 returns jsonb
 language plpgsql
 stable
 set search_path to 'pg_catalog'
as $function$
declare
  v_mk    text;
  v_raw   text;
  v_links jsonb;
begin
  if p_table_id is null or p_organization_id is null then
    return null;
  end if;
  v_mk := 'custom.back_links:' || p_organization_id::text || ':' || p_table_id::text;
  v_raw := platform.memo_k_get(v_mk);
  if v_raw is not null then
    v_links := v_raw::jsonb;
  else
    with c as materialized (
      select f.id, f.data
        from custom.record f
       where f.organization_id = p_organization_id
         and f.table_id = custom.field_kernel_id()
         and f.data_class = 'field'
         and f.deleted_at is null
         and f.data ->> 'type' = 'relation')
    select coalesce(jsonb_agg(jsonb_build_object(
             'k', coalesce(nullif(c.data ->> 'inverse_key', ''), 'linked_' || replace(c.id::text, '-', '')),
             'r', jsonb_build_object(
               'type', 'relation',
               'multi', true,
               'relation_target', c.data ->> 'entity_definition_id',
               'back_link_of', c.id::text,
               'back_link_field_key', coalesce(nullif(c.data ->> 'key', ''), c.data ->> 'name'),
               'label', coalesce(nullif(btrim(c.data ->> 'label'), ''), c.data ->> 'key')))
             order by c.id), '[]'::jsonb)
      into v_links
      from c
     where nullif(c.data -> 'config' ->> 'reverse_of', '') is null
       and (case coalesce(nullif(c.data -> 'config' ->> 'target_mode', ''), 'one')
              when 'one' then c.data ->> 'relation_target' = p_table_id::text
              when 'several' then coalesce(c.data -> 'config' -> 'target_tables', '[]'::jsonb) ? p_table_id::text
              else false end);
    perform platform.memo_k_put(v_mk, v_links::text);
  end if;
  return (select (l -> 'r') || jsonb_build_object('key', p_key)
            from jsonb_array_elements(v_links) l
           where l ->> 'k' = p_key
           limit 1);
end;
$function$;
