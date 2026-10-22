-- 20261022120000_admin_organization_kind_and_default_knob.sql
-- The admin organizations list shows organizations with an engaged real person by default; guests, tests
-- and empty ones are one filter click away. The kind is computed here once (one grouped pass over
-- members + auth.users), never per row in the browser.
--   real   = at least one member who is not anonymous, not admin@admin.com / test@test.com, and has
--            signed in or confirmed their email
--   guests = every member is an anonymous guest
--   empty  = no members
--   tests  = everything else (only test or never-confirmed accounts)
create or replace view iam.organization_kind with (security_invoker = true) as
select o.id as organization_id,
       case
         when count(om.user_id) = 0 then 'empty'
         when coalesce(bool_or(
                not coalesce(u.is_anonymous, false)
                and lower(coalesce(u.email, '')) not in ('admin@admin.com', 'test@test.com')
                and (u.email_confirmed_at is not null or u.last_sign_in_at is not null)), false) then 'real'
         when bool_and(coalesce(u.is_anonymous, false)) then 'guests'
         else 'tests'
       end as kind
  from iam.organizations o
  left join iam.organization_member om on om.organization_id = o.id
  left join auth.users u on u.id = om.user_id
 group by o.id;

grant select on iam.organization_kind to service_role;
comment on view iam.organization_kind is
  'Admin organizations list: real | guests | tests | empty per organization (see migration 20261022120000).';

insert into platform.feature_knob
  (feature, key, value, default_value, value_type, unit, min_value, max_value, allowed_values, label, description,
   set_by, basis, review_due, overridable_by, override_direction, propagation, taxonomy_node_id)
select 'admin_organizations', 'default_kind', '"real"'::jsonb, '"real"'::jsonb, 'enum', null, null, null,
       '["real","guests","tests","empty","all"]'::jsonb,
       'Organizations list: kind shown by default',
       'Which kind the admin organizations list opens on. Real = a signed-in or confirmed person; Guests, Tests and Empty are one filter click away; All shows everything.',
       'agent', 'Agent-set 2026-10-22 (Arman: too many organizations on the admin list; guest/test orgs must exist but not crowd the view).',
       date '2026-12-22', '{user}', 'any', 'instant',
       (select id from platform.taxonomy_node where slug = 'organizations')
on conflict (feature, key) do nothing;
