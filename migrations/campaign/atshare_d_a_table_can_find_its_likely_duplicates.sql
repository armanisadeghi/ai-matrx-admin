-- lane: AT-SHARE
-- lock: custom
-- scope: Airtable parity "Dedupe": custom.find_duplicates(org, table, fields[], limit) lists groups of records that carry the same value
--   (case and spacing ignored) in EVERY chosen field, so a person can open the merge that already exists (custom.migrate_merge).
--   It reads through custom.read_records, so a field the reader may not see can never be matched on. Needs Edit on the table (the merge's own level).
-- additive: yes

CREATE OR REPLACE FUNCTION custom.find_duplicates(p_organization_id uuid, p_table_id uuid, p_fields text[], p_limit integer DEFAULT 50)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_fields  text[];
  v_limit   integer := least(greatest(coalesce(p_limit, 50), 1), 200);
  v_scan    constant integer := 5000;
  v_title   text;
  v_groups  jsonb;
  v_scanned integer := 0;
  v_keyed   jsonb := '[]'::jsonb;
  v_batch   jsonb;
  v_got     integer;
  v_page    integer;
begin
  perform custom.assert_client_may_reach(p_organization_id, 'custom.find_duplicates');
  perform custom.assert_client_may_open(p_organization_id, p_table_id, 'custom.find_duplicates',
                                        'editor'::public.permission_level, 'table');
  select coalesce(array_agg(distinct k), array[]::text[]) into v_fields
    from unnest(coalesce(p_fields, array[]::text[])) k where nullif(btrim(k), '') is not null;
  if cardinality(v_fields) = 0 then
    raise exception 'Choose at least one field to compare.' using errcode = '22023';
  end if;
  select coalesce(t.data ->> 'title_field', 'name') into v_title
    from custom.record t where t.organization_id = p_organization_id and t.id = p_table_id;

  -- the store serves at most 1000 rows a page (custom.page_size): read up to five pages, never one oversize ask
  for v_page in 0..4 loop
    select coalesce(jsonb_agg(jsonb_build_object(
             'id', rr.id,
             'title', coalesce(nullif(rr.document ->> v_title, ''), '(untitled)'),
             'sig', (select string_agg(lower(btrim(coalesce(rr.document ->> f, ''))), E'\u001f' order by f) from unnest(v_fields) f),
             'complete', (select bool_and(nullif(btrim(coalesce(rr.document ->> f, '')), '') is not null) from unnest(v_fields) f))), '[]'::jsonb),
           count(*)
      into v_batch, v_got
      from custom.read_records(p_organization_id, p_table_id, false, 1000, v_page * 1000) rr;
    v_keyed := v_keyed || v_batch;
    v_scanned := v_scanned + v_got;
    exit when v_got < 1000;
  end loop;
  select coalesce(jsonb_agg(jsonb_build_object('size', g.n, 'members', g.members) order by g.n desc, g.sig), '[]'::jsonb)
    into v_groups
    from (select k.sig, count(*) as n,
                 jsonb_agg(jsonb_build_object('id', k.id, 'title', k.title) order by k.title, k.id) as members
            from jsonb_to_recordset(v_keyed) as k(id uuid, title text, sig text, complete boolean)
           where k.complete group by k.sig having count(*) > 1
           order by count(*) desc, k.sig limit v_limit) g;

  return jsonb_build_object('fields', to_jsonb(v_fields), 'groups', v_groups, 'scanned', v_scanned, 'truncated', v_scanned >= v_scan);
end;
$function$;

comment on function custom.find_duplicates(uuid, uuid, text[], integer) is
  'AT-SHARE — groups of records with the same value (case and spacing ignored) in every chosen field, for the merge that already exists. Edit on the table; reads through custom.read_records so masked fields never match.';

insert into platform.client_callable_door
  (schema_name, function_name, identity_args, identity_argtypes, reason, declared_by,
   non_client_lane, signed_in_callers, anonymous_callers, anonymous_purpose, argument_rules)
values
  ('custom', 'find_duplicates', 'p_organization_id uuid, p_table_id uuid, p_fields text[], p_limit integer',
   array['uuid'::regtype, 'uuid'::regtype, 'text[]'::regtype, 'integer'::regtype]::oid[],
   'Finds likely duplicate records of one table by chosen fields, for the table header''s Find duplicates list that opens the existing merge.',
   'atshare_d_a_table_can_find_its_likely_duplicates.sql', null, true, false, null,
   jsonb_build_object('version', 1, 'declared_by', 'atshare_d_a_table_can_find_its_likely_duplicates.sql',
     'declared_at', '2026-10-15 lane AT-SHARE, read from the body and exercised in scripts/campaign-tests/atshare_duplicates_green.sql',
     'arguments', jsonb_build_object(
       'p_organization_id', jsonb_build_object('type', 'uuid', 'position', 1, 'optional', false, 'entity', 'organization',
         'check', 'custom.assert_client_may_reach(arg1), the organization wall, taken before anything is read.',
         'foreign', jsonb_build_object('sqlstate', '42501', 'same_as_invented', true),
         'verified', 'exercised from two seats in scripts/campaign-tests/atshare_duplicates_green.sql, rolled back'),
       'p_table_id', jsonb_build_object('type', 'uuid', 'position', 2, 'optional', false, 'entity', 'custom_record',
         'check', 'custom.assert_client_may_open(arg2) at Edit, before any record is read.',
         'foreign', jsonb_build_object('sqlstate', '42501', 'same_as_invented', true),
         'verified', 'exercised from two seats in scripts/campaign-tests/atshare_duplicates_green.sql, rolled back'),
       'p_fields', jsonb_build_object('type', 'text[]', 'position', 3, 'optional', false, 'entity', null,
         'entity_reason', 'field keys of the table; a key that is not a field simply never matches, and masked fields are read as absent',
         'check', 'compared only against documents returned by custom.read_records for the caller', 'foreign', jsonb_build_object('note', 'not an id of a thing'),
         'null_rule', jsonb_build_object('means', 'refused: choose at least one field'),
         'verified', 'read from the body'),
       'p_limit', jsonb_build_object('type', 'integer', 'position', 4, 'optional', true, 'entity', null,
         'entity_reason', 'a group count, clamped to 1..200; names no record',
         'check', 'least(greatest(coalesce(arg4, 50), 1), 200)', 'foreign', jsonb_build_object('note', 'not an id'),
         'null_rule', jsonb_build_object('means', 'the default of 50'),
         'verified', 'read from the body'))))
on conflict do nothing;

grant execute on function custom.find_duplicates(uuid, uuid, text[], integer) to authenticated;
