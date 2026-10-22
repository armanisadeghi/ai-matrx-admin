-- chair-step: canonicalization lane 2 drops three bespoke org_module_config policies the regenerated std_select/svc_all already cover
-- lane: canonicalization lane 2 (schema platform, m-z).
-- platform.org_module_config (entity, 3 rows, PK organization_id+module_token stays the PK).
-- 1. platform.retrofit_entity 'keep' (organization_id already NOT NULL): id uuid + unique,
--    metadata, created_by/updated_by + FKs (NOT VALID; validated in its own transaction next),
--    _stamp_actor; the existing `_touch` trigger (platform._touch_row) comes back as `_touch_row`.
-- 2. deleted_at + has_soft_delete (nullable, every row NULL).
-- 3. iam.apply_rls entity. Its std_select reads `organization_id IN iam.my_orgs()` among its
--    lanes, so it is a superset of the bespoke policies, which are dropped:
--      omc_read          platform admin OR organization_id IN my_orgs()      -> std_select
--      omc_write_select  platform admin OR iam.has_org_owner(organization_id) (an owner is a
--                        member, so in my_orgs)                               -> std_select
--      omc_service       service_role ALL true                                -> svc_all
--    The DOORS-ONLY restrictive *_client_*_refused policies and org_open_gate stay.
set lock_timeout = '2s';

select platform.retrofit_entity('platform','org_module_config','org_module_config','keep');
alter table platform.org_module_config add column if not exists deleted_at timestamptz;
update platform.entity_types set has_soft_delete = true where token = 'org_module_config';
create index if not exists org_module_config_created_by_idx on platform.org_module_config (created_by);
create index if not exists org_module_config_updated_by_idx on platform.org_module_config (updated_by);
select iam.apply_rls('platform','org_module_config','org_module_config','entity');
drop policy if exists omc_read on platform.org_module_config;
drop policy if exists omc_write_select on platform.org_module_config;
drop policy if exists omc_service on platform.org_module_config;
