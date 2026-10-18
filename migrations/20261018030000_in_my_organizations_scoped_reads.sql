-- why: the app holds only the FIRST PAGE (50) of a person's organizations (bounded organizations,
--   2026-10-16). Readers that built "organization_id in (<my org ids>)" from that page silently
--   dropped rows for anyone in more organizations than one page. The filter cannot simply go:
--   RLS also admits public / admin / global-readable rows on these tables, so "scoped to my
--   organizations" has to stay — asked on the server, never shipped as an id list.
-- ONE canonical set: iam.my_organization_ids() — exactly the set iam.my_organizations_page
--   ('active') pages through (her memberships, any status, in organizations that are not
--   archived). Under the caller's rights (INVOKER): public.mbr_for_user is the same door the page uses.
-- ONE canonical filter name: `in_my_organizations`, a PostgREST computed field on each table a list
--   reads this way. Every body is the same one line over iam.my_organization_ids(); the client
--   writes `.is("in_my_organizations", true)` (or the `in_my_organizations.is.true` arm of an or()).
create or replace function iam.my_organization_ids()
 returns setof uuid
 language sql
 stable
 set search_path to ''
as $function$
  select distinct m.container_id
    from public.mbr_for_user('organization') m
    join iam.organizations o on o.id = m.container_id
   where o.archived_at is null
$function$;
comment on function iam.my_organization_ids() is
  'Every organization the caller belongs to that is not archived — the whole set iam.my_organizations_page(active) pages through. Server-side "scoped to my organizations"; the client never ships the id list.';
grant execute on function iam.my_organization_ids() to authenticated, service_role;

create or replace function platform.in_my_organizations(r platform.judge_verdict) returns boolean
 language sql stable as $f$ select $1.organization_id in (select iam.my_organization_ids()) $f$;
create or replace function platform.in_my_organizations(r platform.tag) returns boolean
 language sql stable as $f$ select $1.organization_id in (select iam.my_organization_ids()) $f$;
create or replace function platform.in_my_organizations(r platform.saved_view) returns boolean
 language sql stable as $f$ select $1.organization_id in (select iam.my_organization_ids()) $f$;
create or replace function media.in_my_organizations(r media.source_library) returns boolean
 language sql stable as $f$ select $1.organization_id in (select iam.my_organization_ids()) $f$;
create or replace function workflow.in_my_organizations(r workflow.definition) returns boolean
 language sql stable as $f$ select $1.organization_id in (select iam.my_organization_ids()) $f$;
create or replace function content_ir.in_my_organizations(r content_ir.kind_instance) returns boolean
 language sql stable as $f$ select $1.organization_id in (select iam.my_organization_ids()) $f$;

grant execute on function platform.in_my_organizations(platform.judge_verdict) to authenticated, service_role;
grant execute on function platform.in_my_organizations(platform.tag) to authenticated, service_role;
grant execute on function platform.in_my_organizations(platform.saved_view) to authenticated, service_role;
grant execute on function media.in_my_organizations(media.source_library) to authenticated, service_role;
grant execute on function workflow.in_my_organizations(workflow.definition) to authenticated, service_role;
grant execute on function content_ir.in_my_organizations(content_ir.kind_instance) to authenticated, service_role;

notify pgrst, 'reload schema';
