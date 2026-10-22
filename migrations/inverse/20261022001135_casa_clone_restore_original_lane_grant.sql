-- target: clone
-- additive: yes
-- guard: Verified quarantined clone only; retain original self-only anonymous lane grant after inverse metadata normalization.
-- chair-step: Restore the exact originally captured anonymous lane EXECUTE through its missing safe declaration on the quarantined clone.
-- Existing anonymous EXECUTE was unregistered; declare its unchanged lane-only verdict before replacement.
insert into platform.client_callable_door(schema_name,function_name,identity_args,identity_argtypes,reason,declared_by,non_client_lane,signed_in_callers,anonymous_callers,anonymous_purpose)
select 'platform','admin_lane_open','',array[]::oid[],'Existing self-only lane marker; it never grants membership or administrator power by itself.','20261021215557_admin_mfa_session_admission.sql',NULL,true,true,'Preserve the existing signed-out lane marker verdict; administrator membership and current MFA admission remain separate checks.'
where not exists(select 1 from platform.client_callable_door where schema_name='platform' and function_name='admin_lane_open' and identity_args='');
grant execute on function platform.admin_lane_open() to anon;
