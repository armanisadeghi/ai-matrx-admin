-- chair-step: canonicalization lane 5 — drop owner_id (always equal to created_by, measured 2026-10-22) from study_structured_section and study_source_chunk; chunk's four hand-written policies give way to the generated rules
-- lane: canonicalization lane 5 — batch 4, education kit outline storage.
-- education.study_structured_section: owner_id dropped (every row owner_id = created_by; no DB
--   function or policy reads it; aidream kit_outline.py stops writing it in the same change).
-- education.study_source_chunk: organization_id backfilled by the NAMED rule "the parent section's
--   organization" (every live chunk has a section, 36/36), created_by from owner_id, then the base
--   contract (updated_by, version, deleted_at, shared triggers, FKs to iam.*) and the generated
--   entity rules; the bespoke read/ins/upd/del (owner-only) policies are dropped — the generated
--   std_select still lets the owner read (created_by short-circuit) and adds the organization lanes.
--   Writers (kit_outline.py, docproc ingest.py) pass organization_id + created_by in the same change.
set lock_timeout = '2s';

-- ── study_structured_section ──────────────────────────────────────────────────
alter table education.study_structured_section drop column owner_id;

-- ── study_source_chunk ────────────────────────────────────────────────────────
alter table education.study_source_chunk add column if not exists organization_id uuid;
alter table education.study_source_chunk add column if not exists created_by uuid;
alter table education.study_source_chunk add column if not exists updated_by uuid;
alter table education.study_source_chunk add column if not exists version int not null default 1;
alter table education.study_source_chunk add column if not exists deleted_at timestamptz;
update education.study_source_chunk c set organization_id = s.organization_id
  from education.study_structured_section s where s.id = c.structured_section_id and c.organization_id is null;
update education.study_source_chunk set created_by = owner_id where created_by is null;
alter table education.study_source_chunk alter column organization_id set not null;
alter table education.study_source_chunk add constraint study_source_chunk_org_fk foreign key (organization_id) references iam.organizations(id);
alter table education.study_source_chunk add constraint study_source_chunk_created_by_fk foreign key (created_by) references iam.users(id);
alter table education.study_source_chunk add constraint study_source_chunk_updated_by_fk foreign key (updated_by) references iam.users(id);
create index if not exists study_source_chunk_organization_id_idx on education.study_source_chunk (organization_id);
create index if not exists study_source_chunk_created_by_idx on education.study_source_chunk (created_by);
create index if not exists study_source_chunk_updated_by_idx on education.study_source_chunk (updated_by);

drop policy if exists read on education.study_source_chunk;
drop policy if exists ins on education.study_source_chunk;
drop policy if exists upd on education.study_source_chunk;
drop policy if exists del on education.study_source_chunk;
alter table education.study_source_chunk drop column owner_id;

drop trigger if exists trg_study_source_chunk_updated_at on education.study_source_chunk;
drop trigger if exists _touch_row on education.study_source_chunk;
drop trigger if exists _stamp_actor on education.study_source_chunk;
create trigger _touch_row before insert or update on education.study_source_chunk for each row execute function platform._touch_row();
create trigger _stamp_actor before insert or update on education.study_source_chunk for each row execute function platform._stamp_actor();

update platform.entity_types set has_soft_delete = true where token = 'study_source_chunk';
select iam.apply_rls('education', 'study_source_chunk', 'study_source_chunk', 'entity');

do $$ begin
  if exists (select 1 from education.study_source_chunk where organization_id is null) then raise exception 'chunk: null organization_id'; end if;
  if not exists (select 1 from pg_policy where polname = 'platform_admin_read' and polrelid = 'education.study_source_chunk'::regclass) then
    raise exception 'platform_admin_read missing on study_source_chunk';
  end if;
end $$;
