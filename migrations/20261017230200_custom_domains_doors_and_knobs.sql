-- 20261017230200_custom_domains_doors_and_knobs.sql
-- lane: DOMAINS-BUILD
-- lock: iam
-- chair-step: new custom-domain tables and doors; the REVOKEs keep clients off direct writes (a host maps only through the doors).
--
-- A business serves its forms, booking pages and portal on its own address (book.theirbusiness.com).
-- Plan: common-docs/systems/data/custom-data/CUSTOM-DOMAINS.md. Arman 2026-10-17: custom domains on
-- the bigger plans only, as a KNOB; a per-organization override grants it outside those plans.
--
-- New objects only (nothing replaced, so no based-on lines):
--   iam.org_domain        one host an organization serves on (unique while not removed)
--   iam.org_domain_route  which published thing each path of that host shows
--   knobs custom_domains.allowed_plans / max_per_org / plan_exception
--   doors: iam.org_domains (members read), iam.org_domain_route_set (admins),
--          iam.org_domain_admin_check (admins, before the server calls Vercel),
--          iam.org_domain_record (server only, after Vercel answered),
--          iam.org_domain_resolve (anyone: host -> live routes, the proxy's lookup)

-- Rows change only through the doors below; members still read through row security.
revoke insert, update, delete on iam.org_domain, iam.org_domain_route from anon, authenticated;

-- ─── Knobs ─────────────────────────────────────────────────────────────────────────
insert into platform.feature_knob
  (feature, key, value, default_value, value_type, unit, min_value, max_value, allowed_values,
   label, description, set_by, basis, review_due, overridable_by, override_direction)
values
  ('custom_domains', 'allowed_plans', '["team", "company-premium", "enterprise"]', '["team", "company-premium", "enterprise"]',
   'json', null, null, null, null,
   'Plans with custom domains',
   'The billing plan keys whose organizations may serve their public pages on their own domain.',
   'agent',
   'Arman 2026-10-17: custom domains on the bigger plans only (team / business tier and up, like Typeform and Calendly). Team, Premium and Enterprise are those tiers in billing.plan.',
   date '2026-11-30', '{}', 'any'),
  ('custom_domains', 'max_per_org', '5', '5', 'integer', 'domains', 0, 1000, null,
   'Custom domains per organization',
   'How many domains one organization may connect. An organization may lower it for itself.',
   'agent',
   'Each domain is one Vercel project domain and one certificate; Vercel caps domains per project. 5 covers www + apex + a few subdomains for one business.',
   date '2026-11-30', '{organization}', 'lower_only'),
  ('custom_domains', 'plan_exception', '0', '0', 'integer', null, 0, 1, null,
   'Custom domains outside the plan',
   '1 grants custom domains to this organization whatever its plan. Set by the platform only.',
   'agent',
   'Pre-launch every organization is on complimentary Pro, so testing needs a per-organization grant without touching plans or plan limits. lower_only at 0 means the organization door can never raise it; only a platform row grants.',
   date '2026-11-30', '{organization}', 'lower_only')
on conflict (feature, key) do nothing;

-- ─── Helpers ───────────────────────────────────────────────────────────────────────
create or replace function iam._org_domain_access(p_organization_id uuid)
returns jsonb
language plpgsql stable security definer set search_path to ''
as $$
declare
  v_plan text := billing.resolve_plan(p_organization_id);
  v_plans jsonb := platform.knob_resolve('custom_domains', 'allowed_plans', p_organization_id);
  v_max integer := (platform.knob_resolve('custom_domains', 'max_per_org', p_organization_id) #>> '{}')::integer;
  v_exception integer := (platform.knob_resolve('custom_domains', 'plan_exception', p_organization_id) #>> '{}')::integer;
  v_used integer;
  v_by text;
begin
  select count(*) into v_used from iam.org_domain d
   where d.organization_id = p_organization_id and d.status <> 'removed';
  v_by := case when v_plans @> to_jsonb(v_plan) then 'plan'
               when v_exception >= 1 then 'grant'
               else null end;
  return jsonb_build_object(
    'allowed', v_by is not null,
    'allowed_by', v_by,
    'plan', v_plan,
    'allowed_plans', v_plans,
    'allowed_plan_names', coalesce((
      select jsonb_agg(p.name order by p.rank nulls last, p.name) from billing.plan p
       where v_plans @> to_jsonb(p.plan_key)), '[]'::jsonb),
    'max', v_max,
    'used', v_used);
end; $$;

-- ─── Reads for members ─────────────────────────────────────────────────────────────
create or replace function iam.org_domains(p_organization_id uuid)
returns jsonb
language plpgsql stable security definer set search_path to ''
as $$
begin
  if not public.is_org_member(p_organization_id) then
    raise exception 'Only members of this organization can see its domains.' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'access', iam._org_domain_access(p_organization_id),
    'can_manage', public.is_org_admin(p_organization_id),
    'domains', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', d.id, 'host', d.host, 'status', d.status, 'verification', d.verification,
        'last_check_at', d.last_check_at, 'last_error', d.last_error, 'created_at', d.created_at,
        'routes', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', r.id, 'path_prefix', r.path_prefix, 'target_kind', r.target_kind, 'target_id', r.target_id,
            'target_title', (select f.title from custom.anon_form f where f.id = r.target_id)
          ) order by r.path_prefix)
          from iam.org_domain_route r where r.domain_id = d.id), '[]'::jsonb)
      ) order by d.created_at)
      from iam.org_domain d where d.organization_id = p_organization_id and d.status <> 'removed'), '[]'::jsonb),
    'targets', coalesce((
      select jsonb_agg(jsonb_build_object(
        'kind', case when f.presentation ? 'booking' then 'booking' else 'form' end,
        'id', f.id, 'title', coalesce(f.title, 'Untitled')) order by f.title)
      from custom.anon_form f
      where f.organization_id = p_organization_id and f.deleted_at is null
        and f.published_at is not null and f.closed_at is null), '[]'::jsonb));
end; $$;

-- ─── Admin check before the server talks to Vercel ─────────────────────────────────
-- p_action: add (p_host required) | check | remove (p_domain_id required).
create or replace function iam.org_domain_admin_check(
  p_organization_id uuid, p_action text, p_host text, p_domain_id uuid
) returns jsonb
language plpgsql stable security definer set search_path to ''
as $$
declare
  v_access jsonb;
  v_host text := lower(btrim(coalesce(p_host, '')));
  v_d iam.org_domain;
begin
  if not public.is_org_admin(p_organization_id) then
    raise exception 'Only an admin of this organization can manage its domains.' using errcode = '42501';
  end if;
  if p_action = 'add' then
    v_access := iam._org_domain_access(p_organization_id);
    if not (v_access->>'allowed')::boolean then
      return jsonb_build_object('ok', false, 'reason', 'plan',
        'detail', 'Custom domains come with these plans: ' ||
          coalesce((select string_agg(x, ', ') from jsonb_array_elements_text(v_access->'allowed_plan_names') x), 'none') || '.');
    end if;
    if (v_access->>'used')::integer >= (v_access->>'max')::integer then
      return jsonb_build_object('ok', false, 'reason', 'limit',
        'detail', format('This organization can connect %s domains and has %s.', v_access->>'max', v_access->>'used'));
    end if;
    v_host := regexp_replace(regexp_replace(v_host, '^[a-z]+://', ''), '[/:].*$', '');
    if v_host !~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$' then
      return jsonb_build_object('ok', false, 'reason', 'host', 'detail', 'Enter a domain like book.yourbusiness.com.');
    end if;
    if v_host ~ '(^|\.)(aimatrx\.com|appmatrx\.com|matrxserver\.com|vercel\.app|localhost)$' then
      return jsonb_build_object('ok', false, 'reason', 'host', 'detail', 'That address belongs to the platform.');
    end if;
    if exists (select 1 from iam.org_domain d where d.host = v_host and d.status <> 'removed') then
      return jsonb_build_object('ok', false, 'reason', 'taken', 'detail', 'That domain is already connected.');
    end if;
    return jsonb_build_object('ok', true, 'host', v_host);
  end if;
  select * into v_d from iam.org_domain d
   where d.id = p_domain_id and d.organization_id = p_organization_id and d.status <> 'removed';
  if v_d.id is null then
    return jsonb_build_object('ok', false, 'reason', 'missing', 'detail', 'That domain is not connected to this organization.');
  end if;
  return jsonb_build_object('ok', true, 'host', v_d.host, 'domain_id', v_d.id);
end; $$;

-- ─── Server-only write after Vercel answered ───────────────────────────────────────
-- Inserts on add (p_domain_id null), else updates status/verification of that row.
create or replace function iam.org_domain_record(
  p_organization_id uuid, p_domain_id uuid, p_host text, p_status text,
  p_verification jsonb, p_error text, p_actor uuid
) returns jsonb
language plpgsql security definer set search_path to ''
as $$
declare v_id uuid;
begin
  if p_domain_id is null then
    insert into iam.org_domain (organization_id, host, status, verification, last_check_at, last_error, created_by, updated_by)
    values (p_organization_id, lower(p_host), p_status, coalesce(p_verification, '{}'::jsonb), now(), p_error, p_actor, p_actor)
    returning id into v_id;
  else
    update iam.org_domain d
       set status = p_status, verification = coalesce(p_verification, d.verification),
           last_check_at = now(), last_error = p_error, updated_by = p_actor, updated_at = now()
     where d.id = p_domain_id and d.organization_id = p_organization_id
    returning d.id into v_id;
    if p_status = 'removed' then
      delete from iam.org_domain_route r where r.domain_id = p_domain_id;
    end if;
  end if;
  return jsonb_build_object('ok', v_id is not null, 'domain_id', v_id);
end; $$;

-- ─── Routes (org admins) ───────────────────────────────────────────────────────────
-- p_target_kind null removes the route at that path.
create or replace function iam.org_domain_route_set(
  p_organization_id uuid, p_domain_id uuid, p_path_prefix text, p_target_kind text, p_target_id uuid
) returns jsonb
language plpgsql security definer set search_path to ''
as $$
declare
  v_prefix text := coalesce(nullif(lower(btrim(p_path_prefix)), ''), '/');
  v_target uuid := p_target_id;
  v_id uuid;
begin
  if not public.is_org_admin(p_organization_id) then
    raise exception 'Only an admin of this organization can choose what its domains show.' using errcode = '42501';
  end if;
  if not exists (select 1 from iam.org_domain d where d.id = p_domain_id
                  and d.organization_id = p_organization_id and d.status <> 'removed') then
    raise exception 'That domain is not connected to this organization.' using errcode = '02000';
  end if;
  if left(v_prefix, 1) <> '/' then v_prefix := '/' || v_prefix; end if;
  if v_prefix !~ '^/([a-z0-9][a-z0-9-]*)?$' then
    raise exception 'A path is one word, like /book.' using errcode = '22023';
  end if;
  if p_target_kind is null then
    delete from iam.org_domain_route r where r.domain_id = p_domain_id and r.path_prefix = v_prefix;
    return jsonb_build_object('ok', true, 'removed', true);
  end if;
  if p_target_kind = 'portal' then
    v_target := p_organization_id;
  elsif p_target_kind in ('form', 'booking') then
    if not exists (select 1 from custom.anon_form f
                    where f.id = p_target_id and f.organization_id = p_organization_id
                      and f.deleted_at is null and f.published_at is not null
                      and (p_target_kind = 'form' or f.presentation ? 'booking')) then
      raise exception 'Pick a published % of this organization.', p_target_kind using errcode = '02000';
    end if;
  else
    raise exception 'A domain shows a form, a booking page or the portal, and this is a %.', p_target_kind
      using errcode = '22023';
  end if;
  insert into iam.org_domain_route as r (organization_id, domain_id, path_prefix, target_kind, target_id, created_by, updated_by)
  values (p_organization_id, p_domain_id, v_prefix, p_target_kind, v_target, auth.uid(), auth.uid())
  on conflict (domain_id, path_prefix) do update
     set target_kind = excluded.target_kind, target_id = excluded.target_id,
         updated_by = excluded.updated_by, updated_at = now()
  returning r.id into v_id;
  return jsonb_build_object('ok', true, 'route_id', v_id, 'path_prefix', v_prefix);
end; $$;

-- ─── The proxy's lookup (anyone; only live hosts answer) ───────────────────────────
create or replace function iam.org_domain_resolve(p_host text)
returns jsonb
language sql stable security definer set search_path to ''
as $$
  select jsonb_build_object(
    'organization_id', d.organization_id,
    'routes', coalesce((
      select jsonb_agg(jsonb_build_object('path_prefix', r.path_prefix, 'target_kind', r.target_kind, 'target_id', r.target_id)
        order by length(r.path_prefix) desc)
      from iam.org_domain_route r where r.domain_id = d.id), '[]'::jsonb))
  from iam.org_domain d
  where d.host = lower(p_host) and d.status = 'live';
$$;

revoke all on function iam._org_domain_access(uuid) from public, anon, authenticated;
revoke all on function iam.org_domain_record(uuid, uuid, text, text, jsonb, text, uuid) from public, anon, authenticated;
grant execute on function iam.org_domain_record(uuid, uuid, text, text, jsonb, text, uuid) to service_role;

-- ─── Client doors ──────────────────────────────────────────────────────────────────
insert into platform.client_callable_door (schema_name, function_name, identity_args, identity_argtypes, reason,
  declared_by, non_client_lane, signed_in_callers, anonymous_callers, gate_predicate, argument_rules)
select n.nspname, p.proname, pg_catalog.pg_get_function_identity_arguments(p.oid), platform.door_argtypes(p.proargtypes),
       case p.proname
         when 'org_domains' then 'The custom domains of ONE named organization, their routes, its publishable targets and whether its plan allows domains. Refuses a non-member.'
         when 'org_domain_admin_check' then 'Org-admin pre-check the domains route runs before it calls Vercel: plan knob, per-org limit, host shape, host not taken. Refuses a non-admin.'
         else 'Sets which published form, booking page or portal a path of a connected domain shows. Org admins only; the target must be this organization''s.'
       end,
       '20261017230200_custom_domains_doors_and_knobs', null, true, false,
       case p.proname when 'org_domains' then 'public.is_org_member(p_organization_id)' else 'public.is_org_admin(p_organization_id)' end,
       case p.proname
         when 'org_domains' then '{"version": 1, "arguments": {"p_organization_id": {"type": "uuid", "position": 1, "optional": false, "check": "membership/admin of p_organization_id, decided before the first read", "foreign": {"bounded": true, "note": "A foreign organization raises 42501 before anything is read."}}}}'::jsonb
         when 'org_domain_admin_check' then '{"version": 1, "arguments": {"p_organization_id": {"type": "uuid", "position": 1, "optional": false, "check": "membership/admin of p_organization_id, decided before the first read", "foreign": {"bounded": true, "note": "A foreign organization raises 42501 before anything is read."}}, "p_action": {"type": "text", "position": 2, "optional": false, "foreign": {"not_an_id": true}}, "p_host": {"type": "text", "position": 3, "optional": true, "foreign": {"not_an_id": true}}, "p_domain_id": {"type": "uuid", "position": 4, "optional": false, "check": "iam.org_domain row with organization_id = p_organization_id", "foreign": {"bounded": true, "note": "A domain of another organization answers not connected; nothing is read or written for it."}}}}'::jsonb
         else '{"version": 1, "arguments": {"p_organization_id": {"type": "uuid", "position": 1, "optional": false, "check": "membership/admin of p_organization_id, decided before the first read", "foreign": {"bounded": true, "note": "A foreign organization raises 42501 before anything is read."}}, "p_domain_id": {"type": "uuid", "position": 2, "optional": false, "check": "iam.org_domain row with organization_id = p_organization_id", "foreign": {"bounded": true, "note": "A domain of another organization answers not connected; nothing is read or written for it."}}, "p_path_prefix": {"type": "text", "position": 3, "optional": false, "foreign": {"not_an_id": true}}, "p_target_kind": {"type": "text", "position": 4, "optional": true, "foreign": {"not_an_id": true}}, "p_target_id": {"type": "uuid", "position": 5, "optional": true, "check": "custom.anon_form in p_organization_id, published; portal ignores it and stores p_organization_id", "foreign": {"bounded": true, "note": "A form of another organization raises not found; nothing is written."}}}}'::jsonb
       end
  from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'iam' and p.proname in ('org_domains', 'org_domain_admin_check', 'org_domain_route_set')
on conflict do nothing;
insert into platform.client_callable_door (schema_name, function_name, identity_args, identity_argtypes, reason,
  declared_by, non_client_lane, signed_in_callers, anonymous_callers, anonymous_purpose)
select n.nspname, p.proname, pg_catalog.pg_get_function_identity_arguments(p.oid), platform.door_argtypes(p.proargtypes),
       'p_host: a hostname; answers only a LIVE domain''s organization id and its path -> published-target routes, the same things its public pages already show.',
       '20261017230200_custom_domains_doors_and_knobs', null, true, true,
       'The edge proxy resolves a signed-out visitor''s custom host to the published pages it shows before any session exists.'
  from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'iam' and p.proname = 'org_domain_resolve'
on conflict do nothing;
insert into platform.client_callable_door (schema_name, function_name, identity_args, identity_argtypes, reason,
  declared_by, non_client_lane, signed_in_callers, anonymous_callers)
select n.nspname, p.proname, pg_catalog.pg_get_function_identity_arguments(p.oid), platform.door_argtypes(p.proargtypes),
       case p.proname when 'org_domain_record'
         then 'p_domain_id/p_organization_id: written only after org_domain_admin_check passed for the caller and Vercel answered.'
         else 'p_organization_id: read only; called inside iam.org_domains / iam.org_domain_admin_check after their membership/admin check.' end,
       '20261017230200_custom_domains_doors_and_knobs',
       case p.proname when 'org_domain_record'
         then 'server_only: the Next.js /api/organizations/[orgId]/domains route, after Vercel answered the add/check/remove; a browser can never mark a host live.'
         else 'internal: helper of the custom-domain doors, never called by a client.' end,
       false, false
  from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'iam' and p.proname in ('org_domain_record', '_org_domain_access')
on conflict do nothing;

grant execute on function iam.org_domains(uuid), iam.org_domain_admin_check(uuid, text, text, uuid),
  iam.org_domain_route_set(uuid, uuid, text, text, uuid) to authenticated, service_role;
grant execute on function iam.org_domain_resolve(text) to anon, authenticated, service_role;
