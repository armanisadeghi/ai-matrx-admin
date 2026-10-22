-- 20261022131000: a view runs the functions it calls with the CALLER's rights, so iam.organization_kind (admin
-- organizations list, read as service_role) needs service_role to be able to execute iam._is_test_account.
grant execute on function iam._is_test_account(uuid) to service_role;
