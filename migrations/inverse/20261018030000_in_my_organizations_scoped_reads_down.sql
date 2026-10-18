-- inverse of 20261018030000_in_my_organizations_scoped_reads.sql
-- lane: bounded organizations lane C
-- chair-step: drops the server-side "scoped to my organizations" filter; readers fall back to shipping ids.
drop function if exists platform.in_my_organizations(platform.judge_verdict);
drop function if exists platform.in_my_organizations(platform.tag);
drop function if exists platform.in_my_organizations(platform.saved_view);
drop function if exists media.in_my_organizations(media.source_library);
drop function if exists workflow.in_my_organizations(workflow.definition);
drop function if exists content_ir.in_my_organizations(content_ir.kind_instance);
drop function if exists iam.my_organization_ids();
notify pgrst, 'reload schema';
