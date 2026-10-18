-- inverse of 20261018010000_custom_domains_public_urls.sql
-- lane: DOMAINS-BUILD-2
-- chair-step: drops the public-url read door; share links fall back to the main site's addresses.
delete from platform.client_callable_door where schema_name = 'iam' and function_name = 'org_domain_public_urls';
drop function if exists iam.org_domain_public_urls(uuid);
