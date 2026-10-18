-- 20261018010000_custom_domains_public_urls.sql
-- lane: DOMAINS-BUILD-2
-- lock: iam
--
-- Plan step 6 (common-docs/systems/data/custom-data/CUSTOM-DOMAINS.md): every link a business shares
-- for a form, booking page or portal uses its LIVE custom domain when one maps that thing.
-- iam.org_domain_public_urls(p_organization_id) answers { "<target id>": "https://host/prefix" } for
-- that organization's targets a live domain maps. Members only (the share screens are signed in);
-- signed-out pages already know their host and read iam.org_domain_resolve.
-- New function only; inverse: migrations/inverse/20261018010000_custom_domains_public_urls_down.sql.

create or replace function iam.org_domain_public_urls(p_organization_id uuid)
returns jsonb
language plpgsql stable security definer set search_path to ''
as $$
begin
  if not public.is_org_member(p_organization_id) then
    raise exception 'Only members of this organization can see its share addresses.' using errcode = '42501';
  end if;
  return (
    select coalesce(jsonb_object_agg(t.target_id::text, t.url), '{}'::jsonb)
    from (
      select distinct on (r.target_id)
             r.target_id,
             'https://' || d.host || case when r.path_prefix = '/' then '' else r.path_prefix end as url
        from iam.org_domain_route r
        join iam.org_domain d on d.id = r.domain_id and d.status = 'live'
       where d.organization_id = p_organization_id
       order by r.target_id, length(r.path_prefix), d.created_at
    ) t);
end; $$;

insert into platform.client_callable_door (schema_name, function_name, identity_args, identity_argtypes, reason,
  declared_by, non_client_lane, signed_in_callers, anonymous_callers, gate_predicate, argument_rules)
select n.nspname, p.proname, pg_catalog.pg_get_function_identity_arguments(p.oid), platform.door_argtypes(p.proargtypes),
       'The public https address each of ONE named organization''s forms, booking pages and portal is served at by its live custom domains. Refuses a non-member.',
       '20261018010000_custom_domains_public_urls', null, true, false,
       'public.is_org_member(p_organization_id)',
       '{"version": 1, "arguments": {"p_organization_id": {"type": "uuid", "position": 1, "optional": false, "check": "membership of p_organization_id, decided before the first read", "foreign": {"bounded": true, "note": "A foreign organization raises 42501 before anything is read."}}}}'::jsonb
  from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'iam' and p.proname = 'org_domain_public_urls'
on conflict do nothing;

grant execute on function iam.org_domain_public_urls(uuid) to authenticated, service_role;
