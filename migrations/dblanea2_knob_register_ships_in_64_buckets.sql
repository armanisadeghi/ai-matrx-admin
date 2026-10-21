-- based-on: platform.knob_defaults(text) b88f67b352f5ed1bcd115c35603edadb03eb278cc246d12f0feb5361b9e30c8f
-- based-on: platform.knob_snapshot_delta(uuid, uuid, jsonb, text) 09a9f2d3f935a2008ff1c5ffb3be363d6976f2d0d780b5044a10afa31a915978
--
-- DB LANE A2 (2026-10-21): A KNOB WRITE SENDS ONLY THE CHANGED 1/64 OF THE REGISTER.
--
-- Census: every open tab holds the whole knob register (~5,600 keys, ~200 kB). Any write to
-- platform.feature_knob (~110/h: agents seeding knobs, pg_cron job 71 hourly) moved the one defaults
-- version, so every tab re-read the full map through knob_defaults (97/min x 59 ms) and every
-- knob_defaults "unchanged?" check rebuilt the full map just to hash it.
--
-- Now the register is split into 64 buckets by feature name: bucket(feature) =
-- hashtext(feature) & 63 (platform.knob_bucket; a UTF-8 byte sum cost 10 ms, md5 8 ms per check). Clients never
-- compute it: every patch is grouped {bucket: {feature: {key: value}}}, so a client replaces whole
-- buckets, and a key or feature deleted from a changed bucket simply is not in the new bucket.
-- The register vector is 64 x 8 hex, one per bucket: md5 of (row count : xmin sum mod 2^32) of that
-- bucket's rows, through age() exactly as dblanea_knob_delta_unchanged_is_cheap did for the whole
-- register (~2.5 ms; never the jsonb map). If hashtext ever answered differently (a Postgres upgrade),
-- every bucket moves once and every client takes one full patch: self-healing, never wrong. The defaults version is md5(vector).
--
-- Wire (no new parameter anywhere: a second overload makes PostgREST answer PGRST203 on named calls):
--   knob_snapshot_delta: etag = 'k4.<md5 of this asker's organization inputs>.<vector>'. A client that
--     holds the defaults at some vector sends 'k4.<its fp>.<its vector>'; when it moved, the answer
--     carries `defaults_vector`, `defaults_patch_buckets` (the changed bucket numbers) and
--     `defaults_patch` ({bucket: {feature: {key: value}}} for EVERY feature now in those buckets; a
--     changed bucket that is absent is now empty). The full map is never built here.
--   knob_defaults: p_known_version 'b64:<vector>' (or 'b64:' for a cold client: every bucket) answers
--     `version`, `vector`, and the same patch fields; never `defaults`.
--   Old clients are untouched: they send the etag back opaque and read `defaults_version` /
--   `overrides` as before, and knob_defaults without the prefix answers the flat `defaults` map as
--   before (its "unchanged" check is now the cheap vector, not the full map).

-- No SET search_path on purpose: a one-expression SQL function is inlined into its callers only without
-- one (schema-qualified, so nothing it names can be shadowed). Grouping 5.6k rows by it costs ~1 ms.
create or replace function platform.knob_bucket(p_feature text)
 returns integer
 language sql
 immutable strict parallel safe
as $function$
  select pg_catalog.hashtext(p_feature) & 63
$function$;

create or replace function platform.knob_register_vector()
 returns text
 language sql
 stable
 set search_path to ''
as $function$
  with b as (
    select platform.knob_bucket(k.feature) as bucket, count(*)::bigint as n, sum(age(k.xmin)::bigint)::bigint as a
      from platform.feature_knob k
     group by 1
  )
  select string_agg(
           case when b.bucket is null then '00000000'
                else substr(md5(b.n::text || ':' ||
                     (((b.a - b.n * age('3'::xid)::bigint) % 4294967296 + 4294967296) % 4294967296)::text), 1, 8)
           end, '' order by g.i)
    from generate_series(0, 63) g(i)
    left join b on b.bucket = g.i
$function$;

create or replace function platform.knob_vector_diff(p_held text, p_now text)
 returns integer[]
 language sql
 immutable parallel safe
 set search_path to ''
as $function$
  select case
           when p_held is null or length(p_held) <> 512 or p_held !~ '^[0-9a-f]+$'
             then (select array_agg(i order by i) from generate_series(0, 63) i)
           else coalesce((select array_agg(i order by i)
                            from generate_series(0, 63) i
                           where substr(p_held, i * 8 + 1, 8) is distinct from substr(p_now, i * 8 + 1, 8)),
                         '{}'::integer[])
         end
$function$;

create or replace function platform.knob_defaults_by_bucket(p_buckets integer[])
 returns jsonb
 language sql
 stable
 set search_path to ''
as $function$
  select coalesce(jsonb_object_agg(u.bucket::text, u.m), '{}'::jsonb)
    from (select t.bucket, jsonb_object_agg(t.feature, t.m) as m
            from (select platform.knob_bucket(k.feature) as bucket, k.feature,
                         jsonb_object_agg(k.key, coalesce(k.value, k.default_value)) as m
                    from platform.feature_knob k
                   where cardinality(p_buckets) > 0
                     and platform.knob_bucket(k.feature) = any (p_buckets)
                   group by k.feature) t
           group by t.bucket) u
$function$;


create or replace function platform.knob_defaults(p_known_version text default null::text)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to 'platform', 'iam', 'public'
as $function$
declare
  v_vec      text := platform.knob_register_vector();
  v_version  text := md5(v_vec);
  v_held     text;
  v_buckets  integer[];
  v_defaults jsonb;
begin
  if p_known_version like 'b64:%' then
    v_held := substr(p_known_version, 5);
    if v_held = v_vec then
      return jsonb_build_object('version', v_version, 'vector', v_vec, 'unchanged', true);
    end if;
    v_buckets := platform.knob_vector_diff(v_held, v_vec);
    return jsonb_build_object('version', v_version, 'vector', v_vec, 'unchanged', false,
                              'defaults_patch_buckets', to_jsonb(v_buckets),
                              'defaults_patch', platform.knob_defaults_by_bucket(v_buckets));
  end if;
  if p_known_version is not null and p_known_version = v_version then
    return jsonb_build_object('version', v_version, 'unchanged', true);
  end if;
  select coalesce(jsonb_object_agg(k.feature || '.' || k.key, coalesce(k.value, k.default_value)), '{}'::jsonb)
    into v_defaults
    from platform.feature_knob k;
  return jsonb_build_object('version', v_version, 'unchanged', false, 'defaults', v_defaults);
end
$function$;

create or replace function platform.knob_snapshot_delta(p_organization_id uuid, p_user_id uuid default null::uuid, p_scopes jsonb default null::jsonb, p_etag text default null::text)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to 'platform', 'iam', 'public'
as $function$
declare
  v_org     uuid := p_organization_id;
  v_vec     text;
  v_over    jsonb;
  v_etag    text;
  v_rows    text;
  v_held    text;
  v_buckets integer[];
  v_out     jsonb;
begin
  -- Same two access decisions, same words, as platform.knob_snapshot (RCA-8 / ARGS-RULED / CHAIR-WORLD).
  if p_organization_id is not null
     and not iam.is_trusted_backend()
     and not iam.has_org_access(p_organization_id) then
    if (select auth.uid()) is not null and custom.organization_has_a_public_table(p_organization_id) then
      v_org := null;
    else
      raise exception 'platform.knob_snapshot: not a member of that organization'
        using errcode = '42501';
    end if;
  end if;

  if p_user_id is not null
     and not iam.is_trusted_backend()
     and p_user_id is distinct from (select auth.uid())
     and not iam.may_address_user_in_org(p_user_id, p_organization_id) then
    raise exception 'platform.knob_snapshot: that is not your configuration to read'
      using errcode = '42501',
            hint = 'A snapshot resolves the USER rung as well as the organization rung, so it answers one person''s own settings. Ask for your own, or for somebody in an organization you are both in.';
  end if;

  -- The inputs of the answer below, in this statement's snapshot: the register (as its 64-bucket
  -- vector) and this asker's organization rows, ladder and arguments.
  v_vec := platform.knob_register_vector();
  select coalesce(v_org::text, '-') || '|' || coalesce(p_user_id::text, '-') || '|' ||
         coalesce(platform.knob_person_for(p_user_id)::text, '-') || '|' || coalesce(p_scopes::text, '-') || '|' ||
         coalesce((select string_agg(o.id::text || ':' || coalesce(o.version, 0)::text || ':' ||
                                     coalesce(o.updated_at::text, ''), ',' order by o.id)
                     from platform.knob_override o
                    where o.organization_id = v_org), '') || '|' ||
         coalesce((select string_agg(l.id::text || ':' || coalesce(l.version, 0)::text || ':' ||
                                     coalesce(l.updated_at::text, ''), ',' order by l.id)
                     from platform.knob_rung_lock l
                    where l.organization_id = v_org), '') || '|' ||
         coalesce((select string_agg(s.kind || ':' || coalesce(s.precedence, 0)::text || ':' ||
                                     coalesce(s.version, 0)::text, ',' order by s.kind)
                     from platform.knob_scope_kind s), '')
    into v_rows;
  v_etag := 'k4.' || md5(v_rows) || '.' || v_vec;

  if p_etag is not null and p_etag = v_etag then
    return jsonb_build_object('etag', v_etag, 'defaults_version', md5(v_vec), 'unchanged', true);
  end if;

  -- Candidate keys: every key with an override row in this organization (empty when v_org is null).
  -- The ONE resolver decides each; a key equal to its platform value is not sent.
  select coalesce(jsonb_object_agg(c.feature || '.' || c.key, r.v), '{}'::jsonb)
    into v_over
    from (select distinct o.feature, o.key, coalesce(f.value, f.default_value) as platform_value
            from platform.knob_override o
            join platform.feature_knob f on f.feature = o.feature and f.key = o.key
           where o.organization_id = v_org) c
   cross join lateral (select platform.knob_resolve(c.feature, c.key, v_org, p_user_id, p_scopes) as v) r
   where r.v is distinct from c.platform_value;

  v_out := jsonb_build_object('etag', v_etag, 'defaults_version', md5(v_vec), 'unchanged', false,
                              'organization_id', p_organization_id, 'user_id', p_user_id,
                              'overrides', v_over);

  -- A client that named the vector its defaults are at gets exactly the buckets that moved since.
  if p_etag like 'k4.%' then
    v_held := split_part(p_etag, '.', 3);
    if length(v_held) = 512 and v_held ~ '^[0-9a-f]+$' then
      v_buckets := platform.knob_vector_diff(v_held, v_vec);
      v_out := v_out || jsonb_build_object('defaults_vector', v_vec,
                                           'defaults_patch_buckets', to_jsonb(v_buckets),
                                           'defaults_patch', platform.knob_defaults_by_bucket(v_buckets));
    end if;
  end if;
  return v_out;
end
$function$;
