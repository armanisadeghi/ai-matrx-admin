-- PLATFORM CONTENT IN MATRX SYSTEM HAS NO PERSON OWNER (Arman, 2026-10-16: "all system things belong to the system").
--
-- created_by is the OWNER column (Data Doctrine §6c). platform._stamp_actor() writes the signed-in actor into it
-- whenever a writer leaves it NULL, so every admin, agent or script that created platform content with a person's
-- identity made that person its owner: 111 built-in agents, 833 kinds, 643 skills, 1,991 io contracts, docs files…
-- Ownership lives with the organization (§6e: global content is owned by a global_readable system org). A person
-- stays recorded as the ACTOR in updated_by / created_by_tier / history.row_versions — never as owner.
--
-- Rule: on the declared platform-content tables, a row in the Matrx System organization has
-- created_by ∈ {NULL, the system principal}. The system principal (system@aimatrx.com,
-- aidream MATRX_SYSTEM_PRINCIPAL_USER_ID) is not a person and is never touched; a table whose created_by is
-- NOT NULL (files.files) takes the principal instead of NULL.
--
-- The declaration IS the attach list below (no registry predicate splits content from activity — plan attack
-- 2026-10-16). platform._stamp_actor is NOT changed: it sits on ~900 tables. The new trigger sorts after every
-- organization-setting trigger on these tables (files: trg_cld_files_inherit_org).
--
-- UPDATE: a row MOVED into the system org loses its person owner only when the mover is privileged (server pool,
-- definer doors, the admin lane). A person moving their own work keeps it — the system never takes ownership.
-- New function; no based-on.

create or replace function platform._system_content_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_principal constant uuid := '71b55cc0-f333-462f-8176-f558f866ea5d';
  v_caller    name := coalesce(nullif(current_setting('role', true), 'none'), session_user)::name;
begin
  if NEW.organization_id is null or NEW.created_by is null or NEW.created_by = v_principal then
    return NEW;
  end if;
  if not exists (select 1 from iam.system_orgs s
                  where s.organization_id = NEW.organization_id and s.key = 'system') then
    return NEW;
  end if;
  if TG_OP = 'UPDATE'
     and OLD.organization_id is distinct from NEW.organization_id
     and v_caller = 'authenticated'
     and not public.is_platform_admin() then
    return NEW;
  end if;
  NEW.created_by := case when TG_ARGV[0] = 'principal' then v_principal else null end;
  return NEW;
end
$$;

comment on function platform._system_content_owner() is
  'Platform content in the Matrx System org has no person owner: created_by becomes NULL (or the system principal '
  'where the column is NOT NULL). Attached only to the declared platform-content tables. Guard: aidream '
  'scripts/check_system_content_has_no_person_owner.py.';

do $$
declare
  t record;
begin
  for t in
    select * from (values
      ('agent', 'definition', 'null'),
      ('skill', 'definition', 'null'),
      ('mandate', 'definition', 'null'),
      ('tool', 'definition', 'null'),
      ('ai', 'model_definition', 'null'),
      ('content_ir', 'kind_definition', 'null'),
      ('content_ir', 'io_contract', 'null'),
      ('agent', 'prompt_block', 'null'),
      ('files', 'files', 'principal')
    ) as v(s, n, mode)
  loop
    execute format(
      'create trigger zz_system_content_owner before insert or update of organization_id, created_by on %I.%I '
      'for each row execute function platform._system_content_owner(%L)', t.s, t.n, t.mode);
  end loop;
end $$;

-- Provenance: this backfill is a named system write (platform._stamp_actor_tier refuses an unnamed one).
set local app.actor_tier = 'system';
set local app.actor_system = 'migration.system_content_has_no_person_owner';

-- The one personal-visibility system agent (an E2E test builtin) would go dark without an owner.
update agent.definition set visibility = 'internal'
 where id = '0315e53f-54ab-40fe-aa66-0dc003badce3' and visibility = 'personal';

-- BACKFILL, entity rows, with normal triggers (history + search sync stay on). Runs as the ledger owner, so the
-- governance guard (authenticated-only) does not apply; the new trigger itself writes the target value.
update agent.definition      set created_by = null where organization_id = '39c38960-d30c-4840-b0c1-c9960de95582' and created_by is not null and created_by <> '71b55cc0-f333-462f-8176-f558f866ea5d';
update skill.definition      set created_by = null where organization_id = '39c38960-d30c-4840-b0c1-c9960de95582' and created_by is not null and created_by <> '71b55cc0-f333-462f-8176-f558f866ea5d';
update mandate.definition    set created_by = null where organization_id = '39c38960-d30c-4840-b0c1-c9960de95582' and created_by is not null and created_by <> '71b55cc0-f333-462f-8176-f558f866ea5d';
update tool.definition       set created_by = null where organization_id = '39c38960-d30c-4840-b0c1-c9960de95582' and created_by is not null and created_by <> '71b55cc0-f333-462f-8176-f558f866ea5d';
update ai.model_definition   set created_by = null where organization_id = '39c38960-d30c-4840-b0c1-c9960de95582' and created_by is not null and created_by <> '71b55cc0-f333-462f-8176-f558f866ea5d';
update content_ir.kind_definition set created_by = null where organization_id = '39c38960-d30c-4840-b0c1-c9960de95582' and created_by is not null and created_by <> '71b55cc0-f333-462f-8176-f558f866ea5d';
update content_ir.io_contract set created_by = null where organization_id = '39c38960-d30c-4840-b0c1-c9960de95582' and created_by is not null and created_by <> '71b55cc0-f333-462f-8176-f558f866ea5d';
update agent.prompt_block    set created_by = null where organization_id = '39c38960-d30c-4840-b0c1-c9960de95582' and created_by is not null and created_by <> '71b55cc0-f333-462f-8176-f558f866ea5d';
update files.files           set created_by = '71b55cc0-f333-462f-8176-f558f866ea5d' where organization_id = '39c38960-d30c-4840-b0c1-c9960de95582' and created_by <> '71b55cc0-f333-462f-8176-f558f866ea5d';

-- COMPONENT PASS (Data Doctrine §6d-1): a part's created_by is derived from its parent. Only the true parts of
-- platform content — never activity children (chat.request/message, agent.usage, drift alerts, crm, annotations).
-- Replica mode for this pass only, as §6d-1 prescribes; created_by is the only column written.
set local session_replication_role = replica;
update agent.definition_version c set created_by = p.created_by from agent.definition p
 where c.agent_id = p.id and p.organization_id = '39c38960-d30c-4840-b0c1-c9960de95582' and c.created_by is distinct from p.created_by;
update tool.definition_version c set created_by = p.created_by from tool.definition p
 where c.tool_id = p.id and p.organization_id = '39c38960-d30c-4840-b0c1-c9960de95582' and c.created_by is distinct from p.created_by;
update tool.test_sample c set created_by = p.created_by from tool.definition p
 where c.tool_id = p.id and p.organization_id = '39c38960-d30c-4840-b0c1-c9960de95582' and c.created_by is distinct from p.created_by;
update tool.ui c set created_by = p.created_by from tool.definition p
 where c.tool_id = p.id and p.organization_id = '39c38960-d30c-4840-b0c1-c9960de95582' and c.created_by is distinct from p.created_by;
update content_ir.kind_component c set created_by = p.created_by from content_ir.kind_definition p
 where c.kind_definition_id = p.id and p.organization_id = '39c38960-d30c-4840-b0c1-c9960de95582' and c.created_by is distinct from p.created_by;
update content_ir.kind_component_incident c set created_by = p.created_by from content_ir.kind_definition p
 where c.kind_definition_id = p.id and p.organization_id = '39c38960-d30c-4840-b0c1-c9960de95582' and c.created_by is distinct from p.created_by;
update content_ir.kind_edge c set created_by = p.created_by from content_ir.kind_definition p
 where c.parent_definition_id = p.id and p.organization_id = '39c38960-d30c-4840-b0c1-c9960de95582' and c.created_by is distinct from p.created_by;
update content_ir.kind_example c set created_by = p.created_by from content_ir.kind_definition p
 where c.kind_definition_id = p.id and p.organization_id = '39c38960-d30c-4840-b0c1-c9960de95582' and c.created_by is distinct from p.created_by;
update content_ir.kind_surface c set created_by = p.created_by from content_ir.kind_definition p
 where c.kind_definition_id = p.id and p.organization_id = '39c38960-d30c-4840-b0c1-c9960de95582' and c.created_by is distinct from p.created_by;
update files.file_versions c set created_by = p.created_by from files.files p
 where c.file_id = p.id and p.organization_id = '39c38960-d30c-4840-b0c1-c9960de95582' and c.created_by is distinct from p.created_by;
update files.overrides c set created_by = p.created_by from files.files p
 where c.file_id = p.id and p.organization_id = '39c38960-d30c-4840-b0c1-c9960de95582' and c.created_by is distinct from p.created_by;
set local session_replication_role = origin;
