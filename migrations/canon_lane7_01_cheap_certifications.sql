-- lane: canonicalization lane 7 (batch 1 — the cheap certifications).
-- 1. Machinery tables with row security off: campaign_watch.build_lock, seo.engine_owner_task,
--    partman.part_config, partman.part_config_sub (the last two are pg_partman's own control tables,
--    already registered audit_class=machinery with a reason; nothing is retrofitted — row security is
--    only switched on). Every role that reads them today (postgres = owner, service_role, svc_seo,
--    supabase_admin) has BYPASSRLS, and no anon/authenticated grant exists, so no reader changes.
-- 2. meta.audit_exemption, workflow.extract_sweep_state: add the soft-delete column (nullable, no
--    rewrite) and register has_soft_delete.
-- 3. web.page, web.page_evidence already carry the _version_capture trigger; the registry said
--    is_versioned=false. The registry is corrected to what the table does.
-- 4. web.temp_brand_{firmographic,presence,recognition}: the three base FKs (0 orphans measured
--    2026-10-22; 8/27/4 rows) with covering indexes.
set lock_timeout = '2s';

alter table campaign_watch.build_lock enable row level security;
alter table seo.engine_owner_task enable row level security;
alter table partman.part_config enable row level security;
alter table partman.part_config_sub enable row level security;

alter table meta.audit_exemption add column if not exists deleted_at timestamptz;
alter table workflow.extract_sweep_state add column if not exists deleted_at timestamptz;
update platform.entity_types set has_soft_delete = true
 where token in ('audit_exemption', 'extract_sweep_state');

update platform.entity_types set is_versioned = true
 where token in ('web_page', 'web_page_evidence');

create index if not exists temp_brand_firmographic_organization_id_idx on web.temp_brand_firmographic (organization_id);
create index if not exists temp_brand_firmographic_created_by_idx on web.temp_brand_firmographic (created_by);
create index if not exists temp_brand_firmographic_updated_by_idx on web.temp_brand_firmographic (updated_by);
alter table web.temp_brand_firmographic
  add constraint temp_brand_firmographic_organization_id_fkey foreign key (organization_id) references iam.organizations(id),
  add constraint temp_brand_firmographic_created_by_fkey foreign key (created_by) references iam.users(id),
  add constraint temp_brand_firmographic_updated_by_fkey foreign key (updated_by) references iam.users(id);

create index if not exists temp_brand_presence_organization_id_idx on web.temp_brand_presence (organization_id);
create index if not exists temp_brand_presence_created_by_idx on web.temp_brand_presence (created_by);
create index if not exists temp_brand_presence_updated_by_idx on web.temp_brand_presence (updated_by);
alter table web.temp_brand_presence
  add constraint temp_brand_presence_organization_id_fkey foreign key (organization_id) references iam.organizations(id),
  add constraint temp_brand_presence_created_by_fkey foreign key (created_by) references iam.users(id),
  add constraint temp_brand_presence_updated_by_fkey foreign key (updated_by) references iam.users(id);

create index if not exists temp_brand_recognition_organization_id_idx on web.temp_brand_recognition (organization_id);
create index if not exists temp_brand_recognition_created_by_idx on web.temp_brand_recognition (created_by);
create index if not exists temp_brand_recognition_updated_by_idx on web.temp_brand_recognition (updated_by);
alter table web.temp_brand_recognition
  add constraint temp_brand_recognition_organization_id_fkey foreign key (organization_id) references iam.organizations(id),
  add constraint temp_brand_recognition_created_by_fkey foreign key (created_by) references iam.users(id),
  add constraint temp_brand_recognition_updated_by_fkey foreign key (updated_by) references iam.users(id);
