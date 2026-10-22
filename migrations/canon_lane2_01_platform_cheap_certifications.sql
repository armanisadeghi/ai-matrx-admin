-- chair-step: canonicalization lane 2 drops three policies that are exact duplicates of a canonical one (no reader moves)
-- lane: canonicalization lane 2 (schema platform, m-z) — batch 1, the cheap certifications.
-- 1. Machinery tables with row security off: provision_marker, provision_shape_debt,
--    provision_spec_grandfather, reachability_rebuild_pending, realtime_topic_prefix,
--    stamped_write_table. Grants (measured 2026-10-22): postgres (owner, no FORCE) and
--    service_role (BYPASSRLS) only — no anon/authenticated grant, so no reader changes.
-- 2. Duplicate policies dropped:
--    - org_change_policy.ocp_service and share_links.share_links_svc_all are byte-identical to
--      the canonical svc_all on the same table (service_role, ALL, true/true).
--    - reference_declaration.reference_declaration_no_client_select reads
--      is_platform_admin() OR is_admin(); both resolve to the same set (admin.admins via
--      public.current_user_is_admin), so it equals platform_admin_read, which stays.
-- 3. Soft-delete column (nullable, no default: catalogue-only change, no rewrite) + registry
--    has_soft_delete on org_change_policy, retention_policy, route_manifest,
--    shareable_resource_registry, source_authority, taxonomy_node. Every row reads deleted_at
--    NULL, so no reader loses a row.
set lock_timeout = '2s';

alter table platform.provision_marker enable row level security;
alter table platform.provision_shape_debt enable row level security;
alter table platform.provision_spec_grandfather enable row level security;
alter table platform.reachability_rebuild_pending enable row level security;
alter table platform.realtime_topic_prefix enable row level security;
alter table platform.stamped_write_table enable row level security;

drop policy if exists ocp_service on platform.org_change_policy;
drop policy if exists share_links_svc_all on platform.share_links;
drop policy if exists reference_declaration_no_client_select on platform.reference_declaration;

alter table platform.org_change_policy add column if not exists deleted_at timestamptz;
alter table platform.retention_policy add column if not exists deleted_at timestamptz;
alter table platform.route_manifest add column if not exists deleted_at timestamptz;
alter table platform.shareable_resource_registry add column if not exists deleted_at timestamptz;
alter table platform.source_authority add column if not exists deleted_at timestamptz;
alter table platform.taxonomy_node add column if not exists deleted_at timestamptz;
update platform.entity_types set has_soft_delete = true
 where schema_name = 'platform'
   and table_name in ('org_change_policy','retention_policy','route_manifest',
                      'shareable_resource_registry','source_authority','taxonomy_node');
