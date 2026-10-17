-- read_lane_v2_b4_01_runtime_global_execution_checkpoint — enroll runtime.global_execution_checkpoint in read-lane v2 and regenerate its policies (one table, one transaction).
-- Applied 2026-10-17 outside the 1-4 AM window on purpose: a live timeout (Agent Factory build progress polls
-- this runtime spine; one point read 2.6-3.0 s warm, 12 s timeout in production for a platform admin). Clone
-- rehearsal: only std_select changes, no grants; member point read 1,145 ms -> 13 ms. One table per transaction.
-- Design + chair approval: common-docs/projects/rich-content-unification/evidence/generator-perf-design.md
-- Needs read_lane_v2_a_generator.sql. The enroll row is written BEFORE the regeneration, never inside
-- the freeze: iam._apply_rls_unchecked issues its policy statements last (POLICY-LOCK).
insert into iam.read_lane_v2_rollout (token, batch) select token, 'b4' from platform.entity_types where schema_name = 'runtime' and table_name = 'global_execution_checkpoint' and is_active on conflict do nothing;
select iam.apply_rls('runtime', 'global_execution_checkpoint', (select token from platform.entity_types where schema_name = 'runtime' and table_name = 'global_execution_checkpoint' and is_active), (select rls_variant from platform.entity_types where schema_name = 'runtime' and table_name = 'global_execution_checkpoint' and is_active));
