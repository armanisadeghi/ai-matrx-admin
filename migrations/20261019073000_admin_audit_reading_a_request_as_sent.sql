-- chair-step: widens admin_audit_log_action_check by one word (request_snapshot_read_as_sent); a CHECK can only be widened by DROP + ADD, nothing else changes.
-- Defect 65 (2026-10-19): a platform admin may read a request snapshot exactly as the provider got it
-- (aidream GET /admin/requests/{snapshot_id}/as-sent decrypts the conversation's frozen wire swaps and
-- re-applies them in memory; nothing is stored). Every such read files one audit row through
-- admin._audit_user_action (who, which snapshot, why), so the action word joins the vocabulary.
-- Additive: the list below is the live list read 2026-10-19 07:25Z plus one word.
alter table admin.admin_audit_log drop constraint admin_audit_log_action_check;
alter table admin.admin_audit_log add constraint admin_audit_log_action_check check (action = any (array[
  'promote', 'update', 'revoke', 'admin_lane_platform_tenant_admission', 'scheduler_task_disable',
  'scheduler_run_mark_failed', 'top_tier_models_grant', 'top_tier_models_revoke', 'account_close',
  'account_close_self', 'account_reopen', 'sign_out_everywhere', 'plan_clear', 'free_months_grant',
  'usage_reset', 'support_session_created', 'support_session_extended', 'support_session_started',
  'support_session_ended', 'onboarding_flag_set', 'mcp_full_access_grant', 'mcp_full_access_revoke',
  'magic_link_create', 'password_reset_link_create', 'session_end', 'mfa_factor_remove', 'api_key_revoke',
  'email_verified',
  'org_membership_add', 'org_membership_set_role', 'org_membership_remove',
  'coupon_create', 'coupon_revoke', 'guest_block', 'guest_unblock',
  'message_sent', 'email_sent',
  'note_add', 'note_edit', 'note_pin', 'note_unpin', 'note_delete',
  -- defect 65: an admin read the payload a model actually received (pick-list hidden text restored)
  'request_snapshot_read_as_sent'
]::text[]));
