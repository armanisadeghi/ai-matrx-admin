-- based-on: platform.knob_snapshot_delta(uuid, uuid, jsonb, text) 358606eb079fdd5c3bf69301f9291e49273111fd194eda44cff6ad99738738c5
--
-- DB LANE A (2026-10-21): "UNCHANGED" NO LONGER COSTS A FULL ANSWER.
--
-- Census (pg_stat_statements 15:58-21:40 UTC): knob_snapshot_delta was the biggest browser cost on the
-- database, 6,138 s over 41k calls, mean 176 ms. Every tab re-asks it, and the old body worked out the
-- whole answer (every override in the organization through knob_resolve, then md5) BEFORE comparing
-- the etag, so "unchanged" cost exactly as much as a full read.
--
-- Now the etag is 'k3.<fingerprint>.<defaults version>', where the fingerprint covers the INPUTS of the
-- answer, read in the same snapshot as the answer would be:
--   * the platform register: row count + the sum of every row's xmin (mod 2^32). Every INSERT/UPDATE/
--     DELETE of platform.feature_knob changes it; computed through age(), which is ~3 ms over the
--     5.6k rows where `xmin::text::bigint` or the jsonb map costs 15+ ms. Exact: sum(age(xmin)) - n*age(3)
--     = n*3 - sum(xmin) (mod 2^32) for one transaction's stable "current" xid;
--   * who is asking and on which rungs (resolved organization, user, the person rung, scopes);
--   * every override and rung lock row of the organization (id, version, updated_at: `_touch_row`
--     bumps version on every UPDATE; an insert or delete changes the row set);
--   * the scope-kind ladder (12 rows).
-- Those are everything platform.knob_resolve reads, so an equal fingerprint is an equal answer, and the
-- defaults version carried in the etag is the one the answer was minted with. The check is a ~3 ms
-- register scan plus one indexed read of the organization's rows; the defaults map and knob_resolve run
-- only when it moved. The answer shape is unchanged; old etags (content md5s) simply miss once.
create or replace function platform.knob_snapshot_delta(p_organization_id uuid, p_user_id uuid default null::uuid, p_scopes jsonb default null::jsonb, p_etag text default null::text)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to 'platform', 'iam', 'public'
as $function$
declare
  v_org      uuid := p_organization_id;
  v_defaults jsonb;
  v_version  text;
  v_over     jsonb;
  v_etag     text;
  v_rows     text;
  v_fp       text;
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

  -- The inputs of the answer below, in this statement's snapshot (see the header).
  select count(*)::text || ':' ||
         (((sum(age(k.xmin)::bigint) - count(*) * age('3'::xid)::bigint) % 4294967296 + 4294967296) % 4294967296)::text
    into v_rows
    from platform.feature_knob k;
  select v_rows || '|' || coalesce(v_org::text, '-') || '|' || coalesce(p_user_id::text, '-') || '|' ||
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
  v_fp := md5(v_rows);

  if p_etag is not null and split_part(p_etag, '.', 1) = 'k3' and split_part(p_etag, '.', 2) = v_fp
     and split_part(p_etag, '.', 3) <> '' then
    return jsonb_build_object('etag', p_etag, 'defaults_version', split_part(p_etag, '.', 3), 'unchanged', true);
  end if;

  select coalesce(jsonb_object_agg(k.feature || '.' || k.key, coalesce(k.value, k.default_value)), '{}'::jsonb)
    into v_defaults
    from platform.feature_knob k;
  v_version := md5(v_defaults::text);
  v_etag := 'k3.' || v_fp || '.' || v_version;

  -- Candidate keys: every key with an override row in this organization (empty when v_org is null).
  -- The ONE resolver decides each; a key equal to its platform value is not sent.
  select coalesce(jsonb_object_agg(c.feature || '.' || c.key, r.v), '{}'::jsonb)
    into v_over
    from (select distinct o.feature, o.key
            from platform.knob_override o
            join platform.feature_knob f on f.feature = o.feature and f.key = o.key
           where o.organization_id = v_org) c
   cross join lateral (select platform.knob_resolve(c.feature, c.key, v_org, p_user_id, p_scopes) as v) r
   where r.v is distinct from (v_defaults -> (c.feature || '.' || c.key));

  return jsonb_build_object('etag', v_etag, 'defaults_version', v_version, 'unchanged', false,
                            'organization_id', p_organization_id, 'user_id', p_user_id,
                            'overrides', v_over);
end
$function$;
