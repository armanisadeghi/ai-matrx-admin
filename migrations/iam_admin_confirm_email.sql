-- Verify email (admin): a platform admin marks one person's email address as verified, with a reason,
-- audited inside the function (admin._audit_user_action). Audit action 'update' with metadata.operation =
-- 'email_verified' (a new action word would need a CHECK widening, which is a chair step).

CREATE FUNCTION iam.admin_confirm_email(p_user uuid, p_reason text DEFAULT NULL::text)
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
  perform admin._audit_user_action('update', p_user,
    jsonb_build_object('email_confirmed_at', null),
    jsonb_build_object('email_confirmed_at', v_confirmed, 'email', v_email), p_reason, jsonb_build_object('operation', 'email_verified'));
  return jsonb_build_object('ok', true, 'user_id', p_user, 'changed', true, 'email_confirmed_at', v_confirmed);
end $function$;

insert into platform.client_callable_door
  (schema_name, function_name, identity_args, identity_argtypes, declared_by, reason, gate_predicate,
   anonymous_callers, signed_in_callers)
values ('iam', 'admin_confirm_email', 'p_user uuid, p_reason text',
  array['uuid'::regtype::oid, 'text'::regtype::oid], 'iam_admin_confirm_email.sql',
  'A platform admin marks one person''s email verified (sets auth.users.email_confirmed_at when null) and writes one admin.admin_audit_log row. public.is_platform_admin() refuses everyone else with 42501 before anything is read.',
  'public.is_platform_admin()', false, true);
GRANT EXECUTE ON FUNCTION iam.admin_confirm_email(uuid, text) TO authenticated;
