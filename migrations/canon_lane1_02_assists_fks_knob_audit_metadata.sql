-- chair-step: canonicalization lane 1 deletes 21 platform.assists rows addressed to nonexistent people or organizations (unreachable junk) so the base foreign keys can land
-- lane: canonicalization lane 1 (schema platform, a-l) — batch 2.
-- 1. platform.assists base FKs (organization_id -> iam.organizations, created_by/updated_by -> iam.users),
--    each with its covering index (886 rows, plain build is milliseconds). Plain NO ACTION, like the
--    other 155 platform base FKs; the fixture sweeper (aidream/testing/fixture_sweep.py) clears or
--    nulls dependent rows generically before removing a test person.
--    Junk removed first (backup listed in the lane-1 report): 19 pending capture_ladder.needs_your_browser
--    chips whose person (user_id = created_by = updated_by) no longer exists in iam.users — unreachable
--    by anyone — and 2 of admin@admin.com's chips whose organization no longer exists.
--    organization_id stays nullable here: 54 rows from Aug 2026 carry none and there is no provable
--    owning organization for them (lane-1 report: needs a ruling). Every DB writer of the table passes one.
-- 2. platform.knob_override_audit gets the base metadata column (constant default: catalogue-only,
--    no rewrite of its ~221k rows).
set lock_timeout = '2s';

delete from platform.assists a
 where not exists (select 1 from iam.users u where u.id = a.user_id)
   and a.created_by is not distinct from a.user_id
   and a.source_key = 'capture_ladder.needs_your_browser';
delete from platform.assists a
 where a.id in ('365eccf3-1aaf-4911-bc0e-f03bdc82fa1c', '0de4744f-1a04-4902-9304-e7f888106d5c')
   and not exists (select 1 from iam.organizations o where o.id = a.organization_id);

create index if not exists assists_organization_id_idx on platform.assists (organization_id);
create index if not exists assists_created_by_idx on platform.assists (created_by);
create index if not exists assists_updated_by_idx on platform.assists (updated_by);
alter table platform.assists
  add constraint assists_organization_id_fkey foreign key (organization_id) references iam.organizations(id);
alter table platform.assists
  add constraint assists_created_by_fkey foreign key (created_by) references iam.users(id);
alter table platform.assists
  add constraint assists_updated_by_fkey foreign key (updated_by) references iam.users(id);

alter table platform.knob_override_audit add column if not exists metadata jsonb not null default '{}'::jsonb;
