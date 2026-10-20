-- chair-step: this file creates TWO new client-callable functions (custom.my_levels_across, SECURITY DEFINER;
-- custom.field_declare_many, SECURITY INVOKER), declares both in platform.client_callable_door and GRANTs EXECUTE
-- on them to authenticated (PUBLIC's default EXECUTE is cleared at birth by the DDL guard). It replaces no live
-- body, alters no table and revokes nothing. Its inverse revokes the grants, deletes the declaration rows and
-- drops the functions.
-- lane: TABLE-CREATE-SPEED
-- lock: custom
-- Inverse: migrations/inverse/tablecreatespeed_a_levels_and_columns_in_one_call_down.sql
--
-- TABLE-CREATE-SPEED item 1 - ONE CALL WHERE THERE WERE MANY.
-- 1. custom.my_levels_across: the Data home lists every organization the person is in, and asked custom.my_levels
--    once per organization on the page (13-27 calls per page for admin@admin.com, 125 organizations), three at a time,
--    each 1-3 s of ladder work, while a new table was being made. One call now answers every row on the page: each
--    organization is admitted by the same two checks custom.my_levels makes (assert_store_door, assert_client_may_reach);
--    one that refuses answers its ids with `refused` set and no level; the levels come from ONE
--    custom.effective_level_many over every admitted id (the ladder is the person's, not the organization's), and the
--    world-reader mask is custom.my_levels' own, per organization. At most 500 ids per call.
-- 2. custom.field_declare_many: a new table's columns were three sequential custom.field_declare calls. One call
--    declares them all, in order, each through custom.field_declare itself (INVOKER: every check is that door's),
--    in one transaction, so a refusal leaves none of them.

CREATE FUNCTION custom.my_levels_across(p_asks jsonb)
 RETURNS TABLE(organization_id uuid, id uuid, level public.permission_level, refused text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
#variable_conflict use_column
declare
  v_me      uuid;
  v_ask     jsonb;
  v_org     uuid;
  v_ok      uuid[] := '{}';
  v_world   uuid[] := '{}';
  v_refused jsonb := '{}'::jsonb;
  v_n       integer;
begin
  v_me := custom.query_principal();
  if v_me is null then
    raise exception 'Nobody is signed in, so there is no access to describe.'
      using errcode = '42501',
            hint = 'DOOR-1: this door resolves the person from the session and takes no principal argument.';
  end if;
  if p_asks is null or jsonb_typeof(p_asks) <> 'array' then
    raise exception 'This door was asked about a list of organizations and was not given a list.'
      using errcode = '22023',
            hint = 'p_asks is a JSON array of {"organization_id": "<uuid>", "ids": ["<uuid>", ...]}.';
  end if;
  select count(*) into v_n from jsonb_array_elements(p_asks) a, jsonb_array_elements_text(coalesce(a -> 'ids', '[]'::jsonb)) x;
  if v_n > 500 then
    raise exception 'This door answers at most 500 ids in one call; it was asked about %.', v_n
      using errcode = '22023', hint = 'Ask for the rows on the page, not for every row.';
  end if;

  for v_ask in select a from jsonb_array_elements(p_asks) a loop
    v_org := nullif(v_ask ->> 'organization_id', '')::uuid;
    continue when v_org is null or v_org = any (v_ok) or v_refused ? v_org::text;
    begin
      perform custom.assert_store_door(v_org, 'custom.my_levels');
      perform custom.assert_client_may_reach(v_org, 'custom.my_levels');
      if custom.world_reader_only(v_org) then
        v_world := v_world || v_org;
      end if;
      v_ok := v_ok || v_org;
    exception when others then
      v_refused := v_refused || jsonb_build_object(v_org::text, sqlerrm);
    end;
  end loop;

  return query
  with asked as (
    select nullif(a ->> 'organization_id', '')::uuid as aorg, x::uuid as aid
      from jsonb_array_elements(p_asks) a,
           jsonb_array_elements_text(coalesce(a -> 'ids', '[]'::jsonb)) x
  ),
  lv as (
    select m.id as lid, m.level as llevel
      from custom.effective_level_many(
             v_me,
             array(select distinct s.aid from asked s where s.aid is not null and s.aorg = any (v_ok)),
             'record') m
  )
  select distinct on (s.aorg, s.aid)
         s.aorg,
         s.aid,
         case when s.aorg = any (v_ok) then
                case when s.aorg = any (v_world) and not custom.world_reader_may_know_row(s.aorg, s.aid) then null
                     else l.llevel end
         end,
         v_refused ->> s.aorg::text
    from asked s
    left join lv l on l.lid = s.aid
   where s.aorg is not null and s.aid is not null
   order by s.aorg, s.aid;
end
$function$;

CREATE FUNCTION custom.field_declare_many(p_organization_id uuid, p_table_id uuid, p_specs jsonb)
 RETURNS uuid[]
 LANGUAGE plpgsql
 SECURITY INVOKER
 SET search_path TO ''
AS $function$
declare
  v_spec jsonb;
  v_out  uuid[] := '{}';
begin
  if p_specs is null or jsonb_typeof(p_specs) <> 'array' then
    raise exception 'This door declares a list of columns and was not given a list.'
      using errcode = '22023', hint = 'p_specs is a JSON array of the declarations custom.field_declare takes.';
  end if;
  for v_spec in select s from jsonb_array_elements(p_specs) with ordinality as t(s, n) order by n loop
    v_out := v_out || custom.field_declare(p_organization_id, p_table_id, v_spec);
  end loop;
  return v_out;
end
$function$;

INSERT INTO platform.client_callable_door
  (schema_name, function_name, identity_args, identity_argtypes, reason, declared_by, signed_in_callers)
VALUES
  ('custom', 'my_levels_across', 'p_asks jsonb', ARRAY['jsonb'::regtype]::oid[],
   'Every organization in p_asks is admitted by custom.assert_store_door and custom.assert_client_may_reach (the two checks custom.my_levels makes) before any level of it is answered; one that refuses answers its ids with refused set and no level. Levels are the signed-in person''s own (custom.query_principal), masked for a world reader exactly as custom.my_levels masks them. At most 500 ids.',
   'migrations/campaign/tablecreatespeed_a_levels_and_columns_in_one_call.sql', true),
  ('custom', 'field_declare_many', 'p_organization_id uuid, p_table_id uuid, p_specs jsonb', ARRAY['uuid'::regtype, 'uuid'::regtype, 'jsonb'::regtype]::oid[],
   'SECURITY INVOKER: each column goes through custom.field_declare, which makes every check itself; this door only calls it once per declaration in one transaction.',
   'migrations/campaign/tablecreatespeed_a_levels_and_columns_in_one_call.sql', true);

GRANT EXECUTE ON FUNCTION custom.my_levels_across(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION custom.field_declare_many(uuid, uuid, jsonb) TO authenticated;
