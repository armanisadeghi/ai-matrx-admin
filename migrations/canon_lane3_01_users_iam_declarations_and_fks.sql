-- lane: canonicalization lane 3 (schemas users + iam) -- additive certification fixes only.
--
-- 1. iam machinery tables: ENABLE ROW LEVEL SECURITY. Owner is postgres (bypasses, no FORCE) and
--    the only other grantee is service_role (BYPASSRLS); anon/authenticated hold no grant, so no
--    reader changes. Certify was proven green for all four in a rolled-back transaction.
-- 2. Hand-written self-only actor checks (the secsweep2 "*_user_id_is_the_caller_*" /
--    "*_is_addressable_*" restrictive policies) are declared as kept product-rule policies in
--    meta.audit_exemption, exactly as the estate-reduction ruling 1 (2026-10-07) did for
--    browser.stream_ticket and hr.candidate. Fingerprints are computed from the live policy so the
--    declaration fails again the moment a policy is edited.
-- 3. Subject columns (Arman 2026-10-06): user_id names who the row is ABOUT, not who wrote it.
-- 4. visibility on two Organization-level shareable tables (the T-13 transitional default every
--    certified Organization table carries). No policy is regenerated, so access is unchanged.
-- 5. Base FKs (organization_id -> iam.organizations, created_by/updated_by -> iam.users) with a
--    covering index each. Zero orphans measured 2026-10-22.
-- 6. deleted_at on three tables whose only finding is the soft_delete WARN.
set lock_timeout = '2s';

-- 1 ---------------------------------------------------------------------------------------------
alter table iam._org_availability_key  enable row level security;
alter table iam.definer_class_exemption enable row level security;
alter table iam.read_lane_v2_rollout   enable row level security;
alter table iam.superseded_policy      enable row level security;

-- 2 ---------------------------------------------------------------------------------------------
insert into meta.audit_exemption (check_name, schema_name, table_name, reason, organization_id, metadata)
select 'bespoke_policy_present', n.nspname, c.relname,
       'Hand-written policies encode product rules (staff-only writes, self-only actor checks, org-admin writes, public follows, own log lines, vault sharing, row history); they stay as written (estate-reduction orchestrator ruling 2026-10-07). Honoured only while each policy keeps its fingerprint.',
       '39c38960-d30c-4840-b0c1-c9960de95582',
       jsonb_build_object('ruling', 'estate reduction orchestrator ruling 1, 2026-10-07; applied to users by canonicalization lane 3, 2026-10-22',
                          'policies', jsonb_object_agg(p.polname,
                             md5(concat_ws('|', p.polcmd::text, p.polpermissive::text, p.polroles::regrole[]::text,
                                 coalesce(pg_get_expr(p.polqual, p.polrelid), '-'),
                                 coalesce(pg_get_expr(p.polwithcheck, p.polrelid), '-')))))
  from pg_policy p
  join pg_class c on c.oid = p.polrelid
  join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'users'
   and c.relname in ('invitation_codes', 'system_announcements', 'user_email_preferences', 'user_feedback', 'user_surface_state')
   and (p.polname like '%\_is\_the\_caller\_%' or p.polname like '%\_is\_addressable\_%')
 group by n.nspname, c.relname
on conflict (check_name, schema_name, table_name) do update
   set metadata = meta.audit_exemption.metadata
                  || jsonb_build_object('policies', coalesce(meta.audit_exemption.metadata->'policies', '{}'::jsonb) || (excluded.metadata->'policies'));

-- 3 ---------------------------------------------------------------------------------------------
insert into meta.audit_exemption (check_name, schema_name, table_name, reason, organization_id, metadata)
values
  ('legacy_owner_col', 'users', 'user_email_preferences', 'subject column: user_id is the person whose email preferences these are', '39c38960-d30c-4840-b0c1-c9960de95582', '{"ruling":"Arman 2026-10-06: keep user_id where it names who the row is about","columns":["user_id"]}'),
  ('legacy_owner_col', 'users', 'user_surface_state', 'subject column: user_id is the person whose surface state this is', '39c38960-d30c-4840-b0c1-c9960de95582', '{"ruling":"Arman 2026-10-06: keep user_id where it names who the row is about","columns":["user_id"]}'),
  ('legacy_owner_col', 'users', 'user_stats', 'subject column: user_id is the person the stats describe', '39c38960-d30c-4840-b0c1-c9960de95582', '{"ruling":"Arman 2026-10-06: keep user_id where it names who the row is about","columns":["user_id"]}'),
  ('legacy_owner_col', 'users', 'user_feedback', 'subject column: user_id is the reporter the item is filed for; created_by is the writer (368 of 1,172 rows differ)', '39c38960-d30c-4840-b0c1-c9960de95582', '{"ruling":"Arman 2026-10-06: keep user_id where it names who the row is about","columns":["user_id"]}'),
  ('legacy_owner_col', 'users', 'user_secret_audit', 'subject column: user_id is the secret owner the audit line is about; actor_id is who acted', '39c38960-d30c-4840-b0c1-c9960de95582', '{"ruling":"Arman 2026-10-06: keep user_id where it names who the row is about","columns":["user_id"]}'),
  ('legacy_owner_col', 'iam', 'org_member_controls', 'subject column: user_id is the member the control applies to; created_by is the admin who set it', '39c38960-d30c-4840-b0c1-c9960de95582', '{"ruling":"Arman 2026-10-06: keep user_id where it names who the row is about","columns":["user_id"]}')
on conflict (check_name, schema_name, table_name) do nothing;

-- 4 ---------------------------------------------------------------------------------------------
alter table users.user_feedback add column if not exists visibility platform.visibility not null
  default platform._t13_transitional_row_column_default('users.user_feedback'::regclass, 'internal'::platform.visibility);
alter table users.user_stats add column if not exists visibility platform.visibility not null
  default platform._t13_transitional_row_column_default('users.user_stats'::regclass, 'internal'::platform.visibility);

-- 5 ---------------------------------------------------------------------------------------------
create index if not exists user_surface_state_organization_id_idx on users.user_surface_state (organization_id);
create index if not exists user_surface_state_created_by_idx      on users.user_surface_state (created_by);
create index if not exists user_surface_state_updated_by_idx      on users.user_surface_state (updated_by);
alter table users.user_surface_state add constraint user_surface_state_organization_id_fkey foreign key (organization_id) references iam.organizations(id);
alter table users.user_surface_state add constraint user_surface_state_created_by_fkey      foreign key (created_by)      references iam.users(id);
alter table users.user_surface_state add constraint user_surface_state_updated_by_fkey      foreign key (updated_by)      references iam.users(id);

create index if not exists user_secret_audit_organization_id_idx on users.user_secret_audit (organization_id);
alter table users.user_secret_audit add constraint user_secret_audit_organization_id_fkey foreign key (organization_id) references iam.organizations(id);

create index if not exists integration_connections_created_by_idx on users.integration_connections (created_by);
alter table users.integration_connections add constraint integration_connections_created_by_fkey foreign key (created_by) references iam.users(id);

create index if not exists user_secrets_created_by_idx on users.user_secrets (created_by);
create index if not exists user_secrets_updated_by_idx on users.user_secrets (updated_by);
alter table users.user_secrets add constraint user_secrets_created_by_fkey foreign key (created_by) references iam.users(id);
alter table users.user_secrets add constraint user_secrets_updated_by_fkey foreign key (updated_by) references iam.users(id);

create index if not exists invitation_codes_updated_by_idx on users.invitation_codes (updated_by);
alter table users.invitation_codes add constraint invitation_codes_updated_by_fkey foreign key (updated_by) references iam.users(id);

-- 6 ---------------------------------------------------------------------------------------------
alter table iam.personal_data_column    add column if not exists deleted_at timestamptz;
alter table users.desktop_app_account   add column if not exists deleted_at timestamptz;
alter table users.desktop_app_instance  add column if not exists deleted_at timestamptz;
update platform.entity_types set has_soft_delete = true
 where token in ('personal_data_column', 'desktop_app_account', 'desktop_app_instance') and not has_soft_delete;
