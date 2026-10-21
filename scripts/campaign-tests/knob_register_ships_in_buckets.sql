-- lane: DB LANE A2 (2026-10-21) — migrations/dblanea2_knob_register_ships_in_64_buckets.sql
-- Run it before and after any change to platform.knob_snapshot_delta / platform.knob_defaults.
-- Run as the owner (Supabase Management API / MCP / psql). The DO block always raises its report, so
-- every write below rolls back; PASS/FAIL is the first word of it.
--
-- Proven failing first on the k3 body (dblanea_knob_delta_unchanged_is_cheap): it sends no patch, so a
-- write to one feature makes every tab re-read the whole ~200 kB register through knob_defaults.
--
-- Clause 1 (one write, one bucket): a write to feature X answers `defaults_patch_buckets` = [bucket(X)]
--   (bucket = hashtext(feature) & 63) and a `defaults_patch` {bucket: {feature: {key: value}}} holding only
--   that bucket, X's every key in it, and under 1/8 of the register; never `defaults`.
-- Clause 2 (another organization is not this tab's business): an override write in another organization
--   leaves this asker's etag byte-identical and the answer "unchanged".
-- Clause 3 (this organization is): an override write here moves the etag, with an empty bucket patch.
-- Clause 4 (a deleted key leaves): a key deleted from a patched bucket is absent from the patch while its
--   feature's other keys are present.
-- Clause 5 (same register): knob_defaults('b64:') flattened equals the old flat map; a held vector is
--   answered "unchanged"; the old-protocol version is answered "unchanged".
do $$
declare
  v_org   uuid;
  v_org2  uuid;
  v_user  uuid := '87a6e699-3622-4869-8843-d0867456c0dd';  -- admin@admin.com
  d jsonb; e0 text; e1 text; e2 text;
  x record; b int; n_patch int; n_all int;
  flat jsonb; full_b64 jsonb; vec text;
  out text := ''; bad int := 0;
begin
  select organization_id into v_org from platform.knob_override group by 1 order by count(*) desc limit 1;
  select organization_id into v_org2 from platform.knob_override where organization_id <> v_org group by 1 order by count(*) desc limit 1;
  perform set_config('request.jwt.claims', json_build_object('sub', v_user, 'role', 'authenticated')::text, true);
  select count(*) into n_all from platform.feature_knob;

  -- a feature with a handful of keys
  select k.feature, min(k.key) as key into x from platform.feature_knob k group by k.feature having count(*) between 2 and 8
   order by k.feature limit 1;

  d := platform.knob_snapshot_delta(v_org, v_user, null, null);
  e0 := d ->> 'etag';

  -- Clause 1
  update platform.feature_knob set value = value where feature = x.feature and key = x.key;
  d := platform.knob_snapshot_delta(v_org, v_user, null, e0);
  -- computed here, not through platform.knob_bucket, so the clause reports (not errors) on a body without it
  b := hashtext(x.feature) & 63;
  select count(*) into n_patch
    from jsonb_each(coalesce(d -> 'defaults_patch', '{}')) bk, jsonb_each(bk.value) f, jsonb_object_keys(f.value);
  if d ? 'defaults' or not (d ? 'defaults_patch')
     or (d -> 'defaults_patch_buckets') is distinct from jsonb_build_array(b)
     or (select array_agg(k) from jsonb_object_keys(d -> 'defaults_patch') k) is distinct from array[b::text]
     or (select count(*) from jsonb_object_keys(d -> 'defaults_patch' -> b::text -> x.feature))
        <> (select count(*) from platform.feature_knob where feature = x.feature)
     or exists (select 1 from jsonb_object_keys(d -> 'defaults_patch' -> b::text) f
                 where hashtext(f) & 63 <> b)
     or n_patch * 8 > n_all then
    bad := bad + 1;
    out := out || '  FAIL a write to ' || x.feature || ' did not answer only its bucket ' || b || ': buckets='
           || coalesce(d ->> 'defaults_patch_buckets', 'none') || ' patch keys=' || n_patch || ' of ' || n_all || E'\n';
  end if;
  e1 := d ->> 'etag';
  out := out || 'feature=' || x.feature || ' bucket=' || b || ' patch_keys=' || n_patch || ' of ' || n_all
         || ' patch_bytes=' || coalesce(length((d -> 'defaults_patch')::text), 0) || E'\n';

  -- Clause 2
  update platform.knob_override set value = value
   where id = (select id from platform.knob_override where organization_id = v_org2 order by id limit 1);
  d := platform.knob_snapshot_delta(v_org, v_user, null, e1);
  if (d ->> 'etag') is distinct from e1 or (d ->> 'unchanged') is distinct from 'true' then
    bad := bad + 1; out := out || E'  FAIL another organization''s override moved this etag\n';
  end if;

  -- Clause 3
  update platform.knob_override set value = value
   where id = (select id from platform.knob_override where organization_id = v_org order by id limit 1);
  d := platform.knob_snapshot_delta(v_org, v_user, null, e1);
  e2 := d ->> 'etag';
  if e2 is not distinct from e1 or (d ->> 'unchanged') = 'true'
     or (d -> 'defaults_patch_buckets') is distinct from '[]'::jsonb then
    bad := bad + 1; out := out || '  FAIL this organization''s override: etag moved=' || (e2 is distinct from e1)
           || ' buckets=' || coalesce(d ->> 'defaults_patch_buckets', 'none') || E'\n';
  end if;

  -- Clause 4
  insert into platform.feature_knob (feature, key, value, default_value, value_type, label, description)
  values (x.feature, 'zz_lane_a2_probe', 'true', 'true', 'boolean', 'Probe', 'Rolled back');
  e2 := platform.knob_snapshot_delta(v_org, v_user, null, null) ->> 'etag';
  delete from platform.feature_knob where feature = x.feature and key = 'zz_lane_a2_probe';
  d := platform.knob_snapshot_delta(v_org, v_user, null, e2);
  if (d -> 'defaults_patch' -> b::text -> x.feature) is null
     or (d -> 'defaults_patch' -> b::text -> x.feature) ? 'zz_lane_a2_probe'
     or not ((d -> 'defaults_patch' -> b::text -> x.feature) ? x.key) then
    bad := bad + 1; out := out || E'  FAIL a deleted key in a patched bucket is still sent (or its feature is missing)\n';
  end if;

  -- Clause 5
  flat := platform.knob_defaults(null) -> 'defaults';
  full_b64 := platform.knob_defaults('b64:');
  vec := full_b64 ->> 'vector';
  if (select coalesce(jsonb_object_agg(f.key || '.' || k.key, k.value), '{}')
        from jsonb_each(coalesce(full_b64 -> 'defaults_patch', '{}')) bk, jsonb_each(bk.value) f, jsonb_each(f.value) k)
        is distinct from flat
     or full_b64 ? 'defaults' then
    bad := bad + 1; out := out || E'  FAIL the bucketed register differs from the flat map\n';
  end if;
  if (platform.knob_defaults('b64:' || coalesce(vec, '')) ->> 'unchanged') is distinct from 'true'
     or (platform.knob_defaults(platform.knob_defaults(null) ->> 'version') ->> 'unchanged') is distinct from 'true' then
    bad := bad + 1; out := out || E'  FAIL a held version is not answered unchanged\n';
  end if;

  raise exception '%', case when bad = 0 then 'PASS' else 'FAIL ' || bad end || E'\n' || out;
end $$;
