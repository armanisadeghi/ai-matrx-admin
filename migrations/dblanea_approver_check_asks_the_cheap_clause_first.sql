-- based-on: custom.work_approval_is_approver(uuid, uuid, uuid, uuid) aecf9c8ad0e82faf756e1e6157bbecc56743f7313371cc48a38f2dedd7be5b75
--
-- DB LANE A (2026-10-21): THE INBOX BADGE ASKS THE CHEAP CLAUSE FIRST.
--
-- platform.shell_counts (every page load + a 5-minute poll per tab, 3,042 s in the census window) calls
-- custom.inbox_counts, which asks this for every pending approval in every organization the person is
-- in. For admin@admin.com (47 organizations, ~400 pending approvals) it was 1.25 s of the 2.1 s badge:
-- custom.effective_level (the record's permission ladder) ran for every item BEFORE the organization-
-- admin check, though an organization admin is an approver of everything there. A boolean OR is
-- evaluated left to right and stops at the first true, so the same three clauses in cheapest-first
-- order give the same answer and skip the ladder for an admin. Measured in the migration lane:
-- see scripts/campaign-tests/inbox_badge_is_cheap.sql.
create or replace function custom.work_approval_is_approver(p_organization_id uuid, p_subject_id uuid, p_approver_id uuid, p_user_id uuid)
 returns boolean
 language plpgsql
 stable
 set search_path to 'pg_catalog'
as $function$
begin
  -- ONE PERSON'S ANSWER to custom.work_approval_approvers (bug desk V2, 2026-10-08): the inbox only
  -- asks "is THIS person an approver of this item", and building the whole approver list ran
  -- custom.effective_level for every member of the organization twice per pending item (24 ms each;
  -- custom.inbox_counts / custom.work_inbox timed out at 8 s). Same wall, same three clauses, one user.
  -- Invoker rights: its only callers are the SECURITY DEFINER inbox functions; no client may call it.
  -- DB LANE A (2026-10-21): cheapest clause first (the named approver, then organization admin, then
  -- the record's permission ladder); OR stops at the first true, so the answer is unchanged.
  perform custom.assert_client_may_reach(p_organization_id, 'custom.work_approval_approvers');
  return exists (
    select 1
      from iam.organization_member m
      join auth.users u on u.id = m.user_id
     where m.organization_id = p_organization_id
       and m.user_id = p_user_id
       and (m.user_id = p_approver_id
            or public.is_org_admin_for(m.user_id, p_organization_id)
            or custom.effective_level(m.user_id, p_organization_id, p_subject_id, 'record')
               = 'admin'::public.permission_level));
end
$function$;
