-- lane: DB LANE A (2026-10-21) — migrations/dblanea_knob_delta_unchanged_is_cheap.sql
-- Run it before and after any change to platform.knob_snapshot_delta.
-- Run as the owner (Supabase Management API / MCP / psql). The DO block always raises its report, so
-- every write below rolls back; PASS/FAIL is the first word of it.
--
-- Clause 1 (unchanged is cheap): for the organization with the most overrides, answering a matching
--   etag costs under half of a full answer (best of 5 each). Proven failing first: the pre-change body
--   resolved every override before comparing, so "unchanged" cost the same as full (ratio ~1.0).
-- Clause 2 (the etag is honoured): the answer's own etag is answered "unchanged" with no payload.
-- Clause 3 (every input moves it): an override row rewritten (version bump), a registry bound changed on
--   an overridden key, and another person asking each produce a different etag, and the full answer after
--   the override rewrite still equals the resolver's.
do $$
declare
  v_org  uuid;
  v_user uuid := '87a6e699-3622-4869-8843-d0867456c0dd';  -- admin@admin.com
  v_other uuid := '4060701e-706a-4c76-b3ca-0bbc69fa5a14'; -- test@test.com
  d jsonb; again jsonb; e0 text; e1 text;
  t0 timestamptz; full_ms numeric := 1e9; same_ms numeric := 1e9; i int;
  o record;
  out text := ''; bad int := 0;
begin
  select organization_id into v_org from platform.knob_override group by 1 order by count(*) desc limit 1;
  perform set_config('request.jwt.claims', json_build_object('sub', v_user, 'role', 'authenticated')::text, true);

  for i in 1..5 loop
    t0 := clock_timestamp();
    d := platform.knob_snapshot_delta(v_org, v_user, null, null);
    full_ms := least(full_ms, extract(epoch from clock_timestamp() - t0) * 1000);
    t0 := clock_timestamp();
    again := platform.knob_snapshot_delta(v_org, v_user, null, d ->> 'etag');
    same_ms := least(same_ms, extract(epoch from clock_timestamp() - t0) * 1000);
  end loop;
  e0 := d ->> 'etag';
  out := out || 'org=' || v_org || ' overrides=' || (select count(*) from jsonb_object_keys(d -> 'overrides'))
         || ' full_ms=' || round(full_ms, 1) || ' unchanged_ms=' || round(same_ms, 1) || E'\n';

  if same_ms >= full_ms * 0.5 then
    bad := bad + 1; out := out || '  FAIL unchanged is not cheap: ' || round(same_ms, 1) || ' ms vs full ' || round(full_ms, 1) || E' ms\n';
  end if;
  if (again ->> 'unchanged') is distinct from 'true' or again ? 'overrides'
     or (again ->> 'defaults_version') is distinct from (d ->> 'defaults_version') then
    bad := bad + 1; out := out || E'  FAIL own etag not honoured\n';
  end if;

  if (platform.knob_snapshot_delta(v_org, v_other, null, null) ->> 'etag') = e0 then
    bad := bad + 1; out := out || E'  FAIL another person gets the same etag\n';
  end if;

  select ko.id, ko.feature, ko.key into o from platform.knob_override ko where ko.organization_id = v_org order by ko.id limit 1;
  update platform.knob_override set value = value where id = o.id;
  d := platform.knob_snapshot_delta(v_org, v_user, null, e0);
  e1 := d ->> 'etag';
  if e1 = e0 or (d ->> 'unchanged') = 'true' then
    bad := bad + 1; out := out || E'  FAIL an override rewrite did not move the etag\n';
  end if;
  if ((platform.knob_defaults(null) -> 'defaults') || (platform.knob_snapshot_delta(v_org, v_user, null, null) -> 'overrides')) is distinct from
     (select coalesce(jsonb_object_agg(k.feature || '.' || k.key, platform.knob_resolve_uncached(k.feature, k.key, v_org, v_user, null)), '{}')
        from platform.feature_knob k) then
    bad := bad + 1; out := out || E'  FAIL full answer after the rewrite differs from the resolver\n';
  end if;

  update platform.feature_knob set allowed_values = allowed_values, max_value = coalesce(max_value, 0) + 1
   where feature = o.feature and key = o.key;
  if (platform.knob_snapshot_delta(v_org, v_user, null, e1) ->> 'etag') = e1 then
    bad := bad + 1; out := out || E'  FAIL a registry bound change on an overridden key did not move the etag\n';
  end if;

  raise exception '%', case when bad = 0 then 'PASS' else 'FAIL ' || bad end || E'\n' || out;
end $$;
