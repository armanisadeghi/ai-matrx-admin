-- 20261022130000: organization_kind uses the platform's own test-account marking (iam._is_test_account:
-- listed test emails, fixture-tagged accounts, @fixtures.aimatrx.com, @system.internal) instead of two hard-coded
-- emails, so fixture people land in Tests, not Real. archived_at is appended so the admin list can read the
-- kinds of the open (or archived) organizations only.
create or replace view iam.organization_kind with (security_invoker = true) as
select o.id as organization_id,
       case
         when count(om.user_id) = 0 then 'empty'
         when coalesce(bool_or(
                not coalesce(u.is_anonymous, false)
                and not iam._is_test_account(u.id)
                and (u.email_confirmed_at is not null or u.last_sign_in_at is not null)), false) then 'real'
         when bool_and(coalesce(u.is_anonymous, false)) then 'guests'
         else 'tests'
       end as kind,
       o.archived_at as archived_at
  from iam.organizations o
  left join iam.organization_member om on om.organization_id = o.id
  left join auth.users u on u.id = om.user_id
 group by o.id, o.archived_at;
-- auth.users is unreadable to an invoker, even service_role; the view must run as its owner (service_role-only grant).
alter view iam.organization_kind set (security_invoker = false);
