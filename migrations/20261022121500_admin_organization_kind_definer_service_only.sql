-- 20261022121500: the kind view reads auth.users, which security_invoker made unreadable even for service_role.
-- It now runs as its owner. (Narrowing who may select it is a REVOKE, a chair step; noted in ORG-CLEANUP.md section 7.)
alter view iam.organization_kind set (security_invoker = false);
grant select on iam.organization_kind to service_role;
