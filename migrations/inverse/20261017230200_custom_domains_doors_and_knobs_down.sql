-- inverse of 20261017230000_custom_domains_org_domain.sql + 20261017230100_custom_domains_org_domain_route.sql + 20261017230200_custom_domains_doors_and_knobs.sql
-- lane: DOMAINS-BUILD
-- chair-step: removes the custom-domain tables, doors and knobs; every connected domain row is dropped (detach them in Vercel first).
delete from platform.client_callable_door
 where schema_name = 'iam' and function_name in ('org_domains', 'org_domain_admin_check', 'org_domain_route_set', 'org_domain_resolve', 'org_domain_record');
drop function if exists iam.org_domain_resolve(text);
drop function if exists iam.org_domain_route_set(uuid, uuid, text, text, uuid);
drop function if exists iam.org_domain_record(uuid, uuid, text, text, jsonb, text, uuid);
drop function if exists iam.org_domain_admin_check(uuid, text, text, uuid);
drop function if exists iam.org_domains(uuid);
drop function if exists iam._org_domain_access(uuid);
delete from platform.knob_override where feature = 'custom_domains';
delete from platform.feature_knob where feature = 'custom_domains';
drop table if exists iam.org_domain_route;
drop table if exists iam.org_domain;
delete from platform.entity_relationships where child_type = 'iam_org_domain_route' or parent_type = 'iam_org_domain';
delete from platform.entity_types where token in ('iam_org_domain_route', 'iam_org_domain');
