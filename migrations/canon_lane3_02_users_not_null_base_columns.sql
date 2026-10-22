-- chair-step: canonicalization lane 3 sets NOT NULL on base columns that already hold no NULLs (invitation_codes is empty; its one writer, app/api/admin/invitation-requests/[id]/route.ts, passes organization_id; created_at/updated_at default now())
-- lane: canonicalization lane 3 (schemas users + iam).
--
-- users.invitation_codes: created_at, updated_at, organization_id -> NOT NULL (0 rows today).
--   No DB function inserts into it; the only writer is the super-admin route above, which passes
--   organization_id explicitly. The validator in features/landing/actions.ts only reads.
-- users.user_email_preferences: created_at, updated_at -> NOT NULL (4 rows, none NULL; both default now()).
set lock_timeout = '2s';

alter table users.invitation_codes alter column created_at set not null;
alter table users.invitation_codes alter column updated_at set not null;
alter table users.invitation_codes alter column organization_id set not null;

alter table users.user_email_preferences alter column created_at set not null;
alter table users.user_email_preferences alter column updated_at set not null;
