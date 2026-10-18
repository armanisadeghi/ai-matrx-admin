-- chair-step: widens admin.admin_audit_log_action_check by one per-person admin action word (email_verified); a CHECK cannot be widened without DROP + ADD; every existing row still satisfies it and nothing is removed. Then iam.admin_confirm_email records its own action word instead of 'update' + metadata.operation.
-- based-on: iam.admin_confirm_email(uuid, text) 1a85f57f561e8ab8ea205a31ad479af60df9de6e41fecd285521e287c9b1987d
--
-- admin_audit_email_verified_word.sql (users one-roof lane S add-on, 2026-10-17).
-- Live body of iam.admin_confirm_email with only the audit call changed: action 'email_verified'
-- (was 'update' with metadata.operation = 'email_verified'). Guard: pnpm check:user-action-audit.

ALTER TABLE admin.admin_audit_log DROP CONSTRAINT admin_audit_log_action_check;
ALTER TABLE admin.admin_audit_log ADD CONSTRAINT admin_audit_log_action_check
  CHECK ((action = ANY (ARRAY['promote'::text, 'update'::text, 'revoke'::text, 'admin_lane_platform_tenant_admission'::text, 'scheduler_task_disable'::text, 'scheduler_run_mark_failed'::text, 'top_tier_models_grant'::text, 'top_tier_models_revoke'::text, 'account_close'::text, 'account_close_self'::text, 'account_reopen'::text, 'sign_out_everywhere'::text, 'plan_clear'::text, 'free_months_grant'::text, 'usage_reset'::text, 'support_session_created'::text, 'support_session_extended'::text, 'support_session_started'::text, 'support_session_ended'::text, 'onboarding_flag_set'::text, 'mcp_full_access_grant'::text, 'mcp_full_access_revoke'::text, 'magic_link_create'::text, 'password_reset_link_create'::text, 'session_end'::text, 'mfa_factor_remove'::text, 'api_key_revoke'::text, 'email_verified'::text])));

CREATE OR REPLACE FUNCTION iam.admin_confirm_email(p_user uuid, p_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
-- A platform admin marks one person's email verified (auth.users.email_confirmed_at = now()).
-- Already verified: nothing changes and nothing is audited.
declare v_email text; v_confirmed timestamptz;
begin
  if not public.is_platform_admin() then
    raise exception 'admin_confirm_email: a platform admin verifies an email' using errcode = '42501';
  end if;
  if p_user is null then raise exception 'admin_confirm_email: no person given' using errcode = '22004'; end if;
  select u.email, u.email_confirmed_at into v_email, v_confirmed from auth.users u where u.id = p_user;
  if not found then
    raise exception 'admin_confirm_email: no person %', p_user using errcode = 'P0002';
  end if;
  if v_email is null then
    raise exception 'admin_confirm_email: this person has no email address' using errcode = '22023';
  end if;
  if v_confirmed is not null then
    return jsonb_build_object('ok', true, 'user_id', p_user, 'changed', false, 'email_confirmed_at', v_confirmed);
  end if;
  update auth.users set email_confirmed_at = now() where id = p_user
    returning email_confirmed_at into v_confirmed;
  perform admin._audit_user_action('email_verified', p_user,
    jsonb_build_object('email_confirmed_at', null),
    jsonb_build_object('email_confirmed_at', v_confirmed, 'email', v_email), p_reason, '{}'::jsonb);
  return jsonb_build_object('ok', true, 'user_id', p_user, 'changed', true, 'email_confirmed_at', v_confirmed);
end $function$;
