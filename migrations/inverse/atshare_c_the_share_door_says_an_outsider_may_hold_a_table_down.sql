-- lane: AT-SHARE inverse: puts back the older wording of the share door's p_principal_id ruling (text only).
update platform.client_callable_door
   set argument_rules = jsonb_set(argument_rules, '{arguments,p_principal_id}',
     '{"type": "uuid", "check": "CHECKED: a membership of this organization (iam.memberships) or a live portal principal admitted by custom.portal_admits(p_organization_id, p_principal_id). A share cannot be addressed to somebody the organization has never named.", "access": "a member of this organization, or one of its portal principals", "foreign": {"note": "refused by name", "not_a_leak": true, "same_as_invented": true}, "verified": "2026-09-21 lane ARGS-RULED — read from this body"}'::jsonb)
 where schema_name = 'custom' and function_name = 'share_grant';
