-- based-on: admin.user_activity(uuid, timestamp with time zone, text[], integer, text) f8bac7f465b5c96796bb5b705e44f5bc11eb65d68bc18dc99e17453f7a966dd9
-- Users one-roof lane Q (2026-10-18): fix 20261018171000 — the same-instant pager ordered by an output
-- ordinal with COLLATE ("order by 2 collate", which Postgres refuses: 42804 on the tie path only). Found red
-- by pnpm check:user-activity's new TIE step. Body otherwise unchanged.
create or replace function admin.user_activity(
  p_user uuid, p_before timestamptz default null, p_kinds text[] default null, p_limit integer default 50,
  p_before_key text default null)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to ''
as $function$
-- One keyset page of a person's activity across 13 sources, newest first, ties by key (C collation).
-- The cursor is (next_before, next_before_key): key null = every row at or before next_before; key set =
-- rows before next_before plus the rows AT next_before whose key sorts after it. A failed source comes
-- back in `sources` with its error instead of failing the page.
declare
  c_kinds constant text[] := array[
    'admin', 'org_admin', 'support', 'sign_in', 'account', 'conversation',
    'run', 'feedback', 'notification', 'sms', 'billing', 'error', 'contact'];
  v_before timestamptz := coalesce(p_before, 'infinity'::timestamptz);
  v_limit int := least(greatest(coalesce(p_limit, 50), 1), 200);
  v_kinds text[] := '{}';
  v_all jsonb := '[]'::jsonb;
  v_branch jsonb;
  v_sources jsonb := '[]'::jsonb;
  v_floor timestamptz := '-infinity'::timestamptz;
  v_truncated boolean := false;
  v_count int;
  v_cut timestamptz;
  v_page jsonb;
  v_next timestamptz;
  v_next_key text;
  v_inst jsonb;
  v_rows jsonb;
  k text;
begin
  if coalesce(auth.role(), '') <> 'service_role' and session_user <> 'postgres'
     and not public.is_platform_admin() then
    raise exception 'admin.user_activity: platform admins only' using errcode = '42501';
  end if;
  if p_user is null then
    raise exception 'admin.user_activity: p_user is required' using errcode = '22004';
  end if;
  if p_before_key is not null and p_before is null then
    raise exception 'admin.user_activity: p_before_key needs p_before' using errcode = '22023';
  end if;

  if p_kinds is not null then
    foreach k in array p_kinds loop
      if not (k = any (c_kinds)) then
        v_sources := v_sources || jsonb_build_array(jsonb_build_object('kind', k, 'ok', false, 'error', 'unknown kind'));
      end if;
    end loop;
  end if;
  foreach k in array c_kinds loop
    continue when p_kinds is not null and not (k = any (p_kinds));
    v_kinds := v_kinds || k;
  end loop;

  -- Inside one instant: the rest of that instant, by key. A short page is fine; the next cursor steps
  -- past the instant.
  if p_before_key is not null then
    v_inst := admin._user_activity_instant(p_user, v_before, v_kinds);
    select coalesce(jsonb_agg(x.e order by x.k collate "C"), '[]'::jsonb), count(*) into v_rows, v_count
      from (select e, e ->> 'key' as k from jsonb_array_elements(v_inst -> 'items') e
             where (e ->> 'key') collate "C" > p_before_key collate "C") x;
    if v_count > v_limit then
      select coalesce(jsonb_agg(x.e order by x.k collate "C"), '[]'::jsonb) into v_page
        from (select e, e ->> 'key' as k from jsonb_array_elements(v_rows) e
               order by (e ->> 'key') collate "C" limit v_limit) x;
      v_next := v_before;
      v_next_key := v_page -> (v_limit - 1) ->> 'key';
    else
      v_page := v_rows;
      v_next := v_before - interval '1 microsecond';
      v_next_key := null;
    end if;
    foreach k in array v_kinds loop
      v_sources := v_sources || coalesce(
        (select jsonb_agg(f) from jsonb_array_elements(v_inst -> 'failed') f where f ->> 'kind' = k),
        jsonb_build_array(jsonb_build_object('kind', k, 'ok', true)));
    end loop;
    return jsonb_build_object('items', v_page, 'next_before', v_next, 'next_before_key', v_next_key,
                              'sources', v_sources);
  end if;

  foreach k in array v_kinds loop
    begin
      -- Test seam (pnpm check:user-activity): a transaction-local setting breaks one named source
      -- inside its wrapper, the same path a real branch error takes. Unset = no effect.
      if current_setting('matrx.test_break_activity_source', true) = k then
        raise exception 'planted: % source broken', k;
      end if;
      execute format('select admin.%I($1, $2, $3)', '_user_activity_' || k)
        into v_branch using p_user, v_before, v_limit;
      v_branch := coalesce(v_branch, '[]'::jsonb);
      if jsonb_array_length(v_branch) >= v_limit then
        v_truncated := true;
        v_floor := greatest(v_floor, (v_branch -> (jsonb_array_length(v_branch) - 1) ->> 'at')::timestamptz);
      end if;
      v_all := v_all || v_branch;
      v_sources := v_sources || jsonb_build_array(jsonb_build_object('kind', k, 'ok', true));
    exception when others then
      v_sources := v_sources || jsonb_build_array(jsonb_build_object('kind', k, 'ok', false, 'error', sqlerrm, 'code', sqlstate));
    end;
  end loop;

  -- Rows strictly newer than the floor are complete in every branch.
  select count(*) into v_count
    from jsonb_array_elements(v_all) e
   where (e ->> 'at')::timestamptz > v_floor;

  v_cut := null;
  if v_count > v_limit then
    select c.at into v_cut from (
      select (e ->> 'at')::timestamptz as at
        from jsonb_array_elements(v_all) e
       where (e ->> 'at')::timestamptz > v_floor
       order by 1 desc
       offset v_limit limit 1) c;
    -- The tie at the cut moves wholly to the next page.
    select coalesce(jsonb_agg(e order by (e ->> 'at')::timestamptz desc, (e ->> 'key') collate "C"), '[]'::jsonb) into v_page
      from jsonb_array_elements(v_all) e
     where (e ->> 'at')::timestamptz > v_cut;
    v_next := v_cut;
  else
    select coalesce(jsonb_agg(e order by (e ->> 'at')::timestamptz desc, (e ->> 'key') collate "C"), '[]'::jsonb) into v_page
      from jsonb_array_elements(v_all) e
     where (e ->> 'at')::timestamptz > v_floor;
    v_next := case when v_truncated then v_floor end;
    if v_truncated and jsonb_array_length(v_page) = 0 then
      v_cut := v_floor;
    end if;
  end if;

  if v_cut is not null and jsonb_array_length(v_page) = 0 then
    -- More rows than a page share one instant: page through THAT instant by key, never dropping a row.
    v_inst := admin._user_activity_instant(p_user, v_cut, v_kinds);
    v_count := jsonb_array_length(v_inst -> 'items');
    if v_count > v_limit then
      select coalesce(jsonb_agg(x.e order by x.k collate "C"), '[]'::jsonb) into v_page
        from (select e, e ->> 'key' as k from jsonb_array_elements(v_inst -> 'items') e
               order by (e ->> 'key') collate "C" limit v_limit) x;
      v_next := v_cut;
      v_next_key := v_page -> (v_limit - 1) ->> 'key';
    else
      v_page := v_inst -> 'items';
      v_next := v_cut - interval '1 microsecond';
    end if;
  end if;

  return jsonb_build_object('items', v_page, 'next_before', v_next, 'next_before_key', v_next_key,
                            'sources', v_sources);
end;
$function$;
