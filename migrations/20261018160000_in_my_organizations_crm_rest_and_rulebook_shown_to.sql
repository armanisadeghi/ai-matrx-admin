-- why: bounded organizations lane C, continued. The remaining filtering readers of "my organizations"
--   still shipped an id list built from the first page (CRM deals / outreach lists / duplicate review,
--   masterwork browse). Extends the `in_my_organizations` computed-field family
--   (20261018040000, per-row `iam.is_my_organization` probe form) to crm.deal, crm.merge_candidate,
--   crm.party_merge and platform.rulebook, and adds `platform.listed_in_my_organizations(rulebook)`:
--   "a row of one of MY organizations that its organization's Shown-to rule lists to me" - the rule the
--   masterwork browse built client-side per organization id (shownToBlendedFilter), here asked on the
--   (T-13: the retired row column is not read; personal rows carry shown_to = only_me)
--   server through the same platform.shown_to_lists / platform.shown_to_context the *_list_scoped RPCs use.
create or replace function crm.in_my_organizations(r crm.deal) returns boolean
 language sql stable as $f$ select iam.is_my_organization($1.organization_id) $f$;
create or replace function crm.in_my_organizations(r crm.merge_candidate) returns boolean
 language sql stable as $f$ select iam.is_my_organization($1.organization_id) $f$;
create or replace function crm.in_my_organizations(r crm.party_merge) returns boolean
 language sql stable as $f$ select iam.is_my_organization($1.organization_id) $f$;
create or replace function platform.in_my_organizations(r platform.rulebook) returns boolean
 language sql stable as $f$ select iam.is_my_organization($1.organization_id) $f$;
create or replace function platform.listed_in_my_organizations(r platform.rulebook) returns boolean
 language sql stable as $f$
  select iam.is_my_organization($1.organization_id)
     and platform.shown_to_lists($1.shown_to, null, $1.created_by, $1.organization_id,
                                 (select auth.uid()), platform.shown_to_context('rulebook'))
$f$;
comment on function platform.listed_in_my_organizations(platform.rulebook) is
  'Row is in one of the caller''s organizations AND that organization''s Shown-to rule lists it to the caller (same rule as the *_list_scoped RPCs). PostgREST computed field for the masterwork browse.';
grant execute on function crm.in_my_organizations(crm.deal) to authenticated, service_role;
grant execute on function crm.in_my_organizations(crm.merge_candidate) to authenticated, service_role;
grant execute on function crm.in_my_organizations(crm.party_merge) to authenticated, service_role;
grant execute on function platform.in_my_organizations(platform.rulebook) to authenticated, service_role;
grant execute on function platform.listed_in_my_organizations(platform.rulebook) to authenticated, service_role;

notify pgrst, 'reload schema';
