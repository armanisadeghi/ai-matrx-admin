-- chair-step: canonicalization lane 4 drops the legacy owner columns pdf.pdf_redaction_key_escrow.owner_id (0 rows; created_by is the owner) and rag.retrieval_audit.user_id (created_by carries the same person; the one row with no created_by is backfilled from user_id first)
-- lane: canonicalization lane 4 (schemas rag, files, docproc, pdf) — batch 2.
--
-- pdf.pdf_redaction_key_escrow: soft-delete column (has_soft_delete=true), owner index moves to
--   created_by, owner_id dropped. Writers/readers repointed in the same change:
--   matrx-frontend features/file-analysis/redact/escrow.ts (insert no longer names owner_id —
--   _stamp_actor stamps created_by), aidream services/documents/escrow.py (owner = created_by),
--   aidream db/models/pdf.py (ORM field list). No database function names the column.
-- rag.retrieval_audit: soft-delete column (has_soft_delete=true), user_id dropped after
--   created_by is filled from it where empty. Writer matrx_rag.search._write_audit already set
--   created_by; aidream services/rag/admin_queries.list_audit_rows filters/reads created_by and
--   still answers the wire field user_id. ORM field list edited in matrx_rag/db/models_rag.py.
set lock_timeout = '2s';

alter table pdf.pdf_redaction_key_escrow add column if not exists deleted_at timestamptz;
update platform.entity_types set has_soft_delete = true where token = 'pdf_redaction_key_escrow';
create index if not exists pdf_redaction_key_escrow_created_by_idx
  on pdf.pdf_redaction_key_escrow (created_by, created_at desc);
update pdf.pdf_redaction_key_escrow set created_by = owner_id where created_by is null;
alter table pdf.pdf_redaction_key_escrow drop column owner_id;

alter table rag.retrieval_audit add column if not exists deleted_at timestamptz;
update platform.entity_types set has_soft_delete = true where token = 'retrieval_audit';
alter table rag.retrieval_audit disable trigger user;
update rag.retrieval_audit set created_by = user_id
 where created_by is null and user_id in (select id from iam.users);  -- a user_id naming a deleted account stays unattributed
alter table rag.retrieval_audit enable trigger user;
alter table rag.retrieval_audit drop column user_id;

do $$ begin
  if exists (select 1 from iam.verify_canonical('pdf', 'pdf_redaction_key_escrow', 'pdf_redaction_key_escrow', null) where status in ('FAIL','WARN')) then raise exception 'pdf.pdf_redaction_key_escrow still has findings'; end if;
  if exists (select 1 from iam.verify_canonical('rag', 'retrieval_audit', 'retrieval_audit', null) where status in ('FAIL','WARN')) then raise exception 'rag.retrieval_audit still has findings'; end if;
end $$;
