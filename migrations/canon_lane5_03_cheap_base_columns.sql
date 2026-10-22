-- chair-step: canonicalization lane 5 — contact_submissions created_at/updated_at become NOT NULL (0 null rows, measured 2026-10-22)
-- lane: canonicalization lane 5 — batch 3, catalogue-only base columns, no writer changes.
--   communication.contact_submissions: created_at/updated_at NOT NULL; visibility (default
--     'internal', the organization tier); rules regenerated (bespoke SECURITY-SWEEP-2 guards are
--     preserved by apply_rls; anonymous submissions do not write this table directly — no anon policy
--     exists before or after).
--   dictionary.dict_settings: visibility (default 'internal'); rules regenerated.
--   education.study_streak, education.study_structured_section: deleted_at + has_soft_delete.
--   education.data_rights_event: metadata jsonb NOT NULL.
-- Every add is nullable or carries a constant default: no rewrite. No row is hidden by any change.
set lock_timeout = '2s';

alter table communication.contact_submissions alter column created_at set not null;
alter table communication.contact_submissions alter column updated_at set not null;
alter table communication.contact_submissions add column if not exists visibility platform.visibility not null default 'internal';

alter table dictionary.dict_settings add column if not exists visibility platform.visibility not null default 'internal';

alter table education.study_streak add column if not exists deleted_at timestamptz;
alter table education.study_structured_section add column if not exists deleted_at timestamptz;
update platform.entity_types set has_soft_delete = true
 where (schema_name, table_name) in (('education','study_streak'), ('education','study_structured_section'));

alter table education.data_rights_event add column if not exists metadata jsonb not null default '{}'::jsonb;

select iam.apply_rls('communication', 'contact_submissions', 'contact_submission', 'entity');
select iam.apply_rls('dictionary', 'dict_settings', 'dict_setting', 'entity');
