-- chair-step: canonicalization lane 1 drops policies that are exact duplicates or strict subsets of a canonical one on the same table (no reader moves)
-- lane: canonicalization lane 1 (schema platform, a-l) — batch 1, the cheap certifications.
-- 1. Machinery tables with row security off: client_callable_door, client_callable_door_retirement,
--    client_excluded_column_unregistered, definer_client_grant_grandfather, doors_only_pending_cutover.
--    Grants (measured 2026-10-22): postgres (owner, no FORCE) and service_role (BYPASSRLS) only —
--    no anon/authenticated grant, so no reader changes. Every function that reads them runs as
--    postgres (SECURITY DEFINER) or is invoked by postgres/service_role. The event trigger
--    platform._admin_read_follows_rls adds platform_admin_read on enable.
-- 2. Redundant policies dropped:
--    - lifecycle_{entity_plan,map_build,reference_map,run,tier_ledger}_read and
--      assist_producer_policy_history_admin_read read is_platform_admin() OR is_admin() (or is_admin());
--      both resolve to the same set (admin.admins via public.current_user_is_admin, both gated by
--      platform.admin_lane_open()), so each equals platform_admin_read, which stays.
--    - knob_override_read ((org in my_orgs) AND …) and knob_rung_lock_read (org in my_orgs) are
--      PERMISSIVE strict subsets of the std_select arm `organization_id IN iam.my_orgs()`.
--    - assists_user_id_is_addressable_{insert,update} are RESTRICTIVE write checks on a table whose
--      RESTRICTIVE assists_client_{insert,update}_refused already refuse every client write (false);
--      the doors run as postgres (owner, no FORCE), which RLS never applied to.
-- 3. Soft-delete column (nullable, no default: catalogue-only change, no rewrite) + registry
--    has_soft_delete on assist_producer_policy, assurance_level, change_type_default, egress_pairing,
--    egress_ticket, knob_override, knob_rung_lock, knob_scope_kind, knob_write_door. Every row reads
--    deleted_at NULL, so no reader loses a row.
set lock_timeout = '2s';

alter table platform.client_callable_door enable row level security;
alter table platform.client_callable_door_retirement enable row level security;
alter table platform.client_excluded_column_unregistered enable row level security;
alter table platform.definer_client_grant_grandfather enable row level security;
alter table platform.doors_only_pending_cutover enable row level security;

drop policy if exists lifecycle_entity_plan_read on platform.lifecycle_entity_plan;
drop policy if exists lifecycle_map_build_read on platform.lifecycle_map_build;
drop policy if exists lifecycle_reference_map_read on platform.lifecycle_reference_map;
drop policy if exists lifecycle_run_read on platform.lifecycle_run;
drop policy if exists lifecycle_tier_ledger_read on platform.lifecycle_tier_ledger;
drop policy if exists assist_producer_policy_history_admin_read on platform.assist_producer_policy_history;
drop policy if exists knob_override_read on platform.knob_override;
drop policy if exists knob_rung_lock_read on platform.knob_rung_lock;
drop policy if exists assists_user_id_is_addressable_insert on platform.assists;
drop policy if exists assists_user_id_is_addressable_update on platform.assists;

alter table platform.assist_producer_policy add column if not exists deleted_at timestamptz;
alter table platform.assurance_level add column if not exists deleted_at timestamptz;
alter table platform.change_type_default add column if not exists deleted_at timestamptz;
alter table platform.egress_pairing add column if not exists deleted_at timestamptz;
alter table platform.egress_ticket add column if not exists deleted_at timestamptz;
alter table platform.knob_override add column if not exists deleted_at timestamptz;
alter table platform.knob_rung_lock add column if not exists deleted_at timestamptz;
alter table platform.knob_scope_kind add column if not exists deleted_at timestamptz;
alter table platform.knob_write_door add column if not exists deleted_at timestamptz;
update platform.entity_types set has_soft_delete = true
 where schema_name = 'platform'
   and table_name in ('assist_producer_policy','assurance_level','change_type_default','egress_pairing',
                      'egress_ticket','knob_override','knob_rung_lock','knob_scope_kind','knob_write_door');
