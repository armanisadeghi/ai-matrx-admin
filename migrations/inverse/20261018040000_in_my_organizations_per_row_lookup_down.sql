-- inverse of 20261018040000_in_my_organizations_per_row_lookup.sql
-- lane: bounded organizations lane C
-- chair-step: back to the set form of in_my_organizations; drops the CRM overloads and the per-row door.
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
drop function if exists crm.in_my_organizations(crm.party);
drop function if exists crm.in_my_organizations(crm.outreach_list);
drop function if exists platform.in_my_organizations(platform.outcome_event);
delete from platform.client_callable_door where schema_name = 'iam' and function_name = 'is_my_organization';
drop function if exists iam.is_my_organization(uuid);
notify pgrst, 'reload schema';
