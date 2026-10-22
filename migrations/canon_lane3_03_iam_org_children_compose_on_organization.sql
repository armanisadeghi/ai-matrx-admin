-- chair-step: canonicalization lane 3 drops two hand-written member-read policies on iam.org_industries and iam.organization_preferences; the generated component std_select (iam.has_access on the parent organization) replaces them, proven to return the same rows
-- lane: canonicalization lane 3 (schemas users + iam).
--
-- Both tables are registered components of an organization (organization_id) but had no
-- composition edge, so no std_select was generated and a hand-written member read stood in:
--   org_industries.org_industries_select_member  USING is_member_of_organization(organization_id)
--   organization_preferences.org_read             USING organization_id IN iam.my_orgs()
-- Inserting the composition edge fires platform._component_edge_regenerates, which runs
-- iam.apply_rls(..., 'component'); the generated std_select defers to the parent organization.
-- The generator preserves hand-written policies, so the two stand-ins are dropped first.
--
-- Proof (rolled-back rehearsal 2026-10-22, role authenticated, request.jwt.claims sub = ...):
--   test admin 87a6e699-3622-4869-8843-d0867456c0dd  preferences/industries 20/3 -> 20/3
--   ordinary member 34ed4fc3-c527-4819-99bf-15c26603b261 (3 orgs, not an admin) 3/2 -> 3/2
-- platform_admin_read, org_open_gate and the generated client_*_refused write guards are kept.
set lock_timeout = '2s';

drop policy if exists org_industries_select_member on iam.org_industries;
drop policy if exists org_read on iam.organization_preferences;

insert into platform.entity_relationships (child_type, parent_type, fk_column, kind)
select v.child_type, 'organization', 'organization_id', 'composition'
  from (values ('org_industries'), ('organization_preferences')) v(child_type)
 where not exists (select 1 from platform.entity_relationships r
                    where r.child_type = v.child_type and r.kind = 'composition');

do $$
begin
  if not exists (select 1 from pg_policy where polrelid = 'iam.org_industries'::regclass and polname = 'std_select') then
    raise exception 'iam.org_industries has no std_select after the composition edge';
  end if;
  if not exists (select 1 from pg_policy where polrelid = 'iam.organization_preferences'::regclass and polname = 'std_select') then
    raise exception 'iam.organization_preferences has no std_select after the composition edge';
  end if;
end $$;
