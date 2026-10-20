-- chair-step: this file REPLACES one live body, custom.my_levels(uuid, jsonb, text). Same signature, same SECURITY
-- DEFINER, same walls, same answer for every id; only the way a set of RECORD ids is asked changes. It creates
-- nothing, alters no table, grants and revokes nothing. Its inverse puts the original body back character for character.
-- lane: SERVER-ROWS
-- lock: custom
-- Inverse: migrations/inverse/serverrows_a_a_pages_levels_are_read_the_way_the_page_reads_them_down.sql
-- based-on: custom.my_levels(uuid, jsonb, text) 9545d3d656ffa29a2fa7d1c41917242ccf9f4f755265ed0799f581bc89466a9c
--
-- SERVER-ROWS item 1 - A PAGE'S PER-ROW LEVELS ARE READ THE WAY THE PAGE ITSELF READS THEM.
-- A plain member opening a table she cannot edit gets a second question once the page lands: custom.my_levels of the
-- page's 100 row ids (the grid holds its first fit until it is answered, and the server's first-page seed asks it
-- too). It walked custom.effective_level_many: the ladder's halving for every id, each id on its own walk. Measured
-- as test@test.com on four Workspace tables, 100 ids each: 850-1570 ms (and 2.2-4.3 s through PostgREST under load),
-- against 200-440 ms for admin. The page read that drew those rows had already answered the same rung for the same
-- rows through custom.levels_of (custom.read_records_by_ids), the set path that asks the ladder once per CLASS of
-- record and reads each row in its organization: 316-424 ms for the same ids, the same answer for all 400
-- (`l` IS custom.effective_level by levels_of's own contract, as effective_level_many is by its).
-- So a set of record ids now goes through custom.levels_of, with the organization handed over in the statement memo
-- exactly as read_records_by_ids hands it (a hint, never a filter). Any other p_type is asked as before. ONE rule:
-- the ladder; one set path: the page's own. The world-lane filter is unchanged.

CREATE OR REPLACE FUNCTION custom.my_levels(p_organization_id uuid, p_ids jsonb, p_type text DEFAULT 'record'::text)
 RETURNS TABLE(id uuid, level permission_level)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_me uuid;
  v_world boolean;
  v_type text;
  v_ids uuid[];
  v_lv jsonb;
begin
  perform custom.assert_store_door(p_organization_id, 'custom.my_levels');
  perform custom.assert_client_may_reach(p_organization_id, 'custom.my_levels');
  v_world := custom.world_reader_only(p_organization_id);

  v_me := custom.query_principal();
  if v_me is null then
    raise exception 'Nobody is signed in, so there is no access to describe.'
      using errcode = '42501',
            hint = 'DOOR-1: this door resolves the person from the session and takes no principal argument. Sign in, or call it from a lane that carries a person.';
  end if;

  if p_ids is not null and jsonb_typeof(p_ids) <> 'array' then
    raise exception 'This door was asked about a list of things and was not given a list.'
      using errcode = '22023',
            hint = 'p_ids is a JSON array of record ids, for example ["11111111-1111-4111-8111-111111111111"].';
  end if;

  v_type := coalesce(nullif(btrim(p_type), ''), 'record');
  v_ids := array(select distinct a.asked::uuid
                   from jsonb_array_elements_text(coalesce(p_ids, '[]'::jsonb)) a(asked)
                  where a.asked is not null);

  -- SERVER-ROWS (2026-10-20). RECORDS ARE ASKED THE WAY THE PAGE READS THEM: custom.levels_of, the set path
  -- custom.read_records_by_ids answers a page's rows with (the ladder once per class of record, each row read in the
  -- organization handed over in the statement memo), instead of custom.effective_level_many's halving per id.
  -- `l` is custom.effective_level for the id, as effective_level_many's level is: the same answer, 3-4x sooner for a
  -- member. Any other p_type has no class path and is asked as before.
  if v_type = 'record' then
    perform platform.memo_k_put('custom.levels_of_org', p_organization_id::text);
    v_lv := case when cardinality(v_ids) > 0 then custom.levels_of(v_me, v_ids) else '{}'::jsonb end;
    perform platform.memo_k_put('custom.levels_of_org', '');
  else
    select coalesce(jsonb_object_agg(m.id::text, jsonb_build_object('l', m.level)), '{}'::jsonb)
      into v_lv
      from custom.effective_level_many(v_me, v_ids, v_type) m;
  end if;

  -- Every id asked about gets a row, in the order asked, duplicates and nulls included. A subject this person
  -- holds nothing on answers null, because a missing row and "no access" would be the same thing to the screen
  -- that asked, and one of them is a silence.
  return query
  select a.asked::uuid,
         -- CHAIR-WORLD-LANE-2: a person admitted only through the world lane is answered about a Public Table, its
         -- rows and its definition rows, and about nothing else (null, as for any subject she holds nothing on).
         case when a.asked is null then null::public.permission_level
              when v_world and not custom.world_reader_may_know_row(p_organization_id, a.asked::uuid) then null::public.permission_level
              else (v_lv -> a.asked ->> 'l')::public.permission_level end
    from jsonb_array_elements_text(coalesce(p_ids, '[]'::jsonb)) with ordinality as a(asked, ord)
   order by a.ord;
end
$function$;
