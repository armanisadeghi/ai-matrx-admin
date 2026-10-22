-- lane: canonicalization wave 2, lane E (big tables). Online step 1 of 2: catalog-only column adds.
--
-- Every ADD COLUMN here is instant (constant or STABLE default -> stored as a fast default, no table
-- rewrite) except platform.feature_knob.id, whose volatile default rewrites that 5,654-row / 6 MB
-- table once. Every new FK is NOT VALID (no scan; validated later in step 2 under SHARE UPDATE
-- EXCLUSIVE). id columns get their volatile default only for NEW rows here; existing rows are
-- backfilled in small batches outside this file, then made NOT NULL in canon2_e2 (autocommit).
--
-- Access is unchanged (wave 2 rule): no policy, grant, registry row or composition edge is touched.
-- (A composition edge would fire platform._component_edge_regenerates and rewrite policies.)
--
-- Writers: every writer names its columns (matrx-orm models list fields and keep unknown columns in
-- _extra_data; DB function writers use explicit column lists or %ROWTYPE; census found no positional
-- INSERT/COPY/SELECT * over these tables), so an added defaulted column breaks no live writer.
-- New FKs on created_by/updated_by use ON DELETE SET NULL so they can never block a user deletion.
set lock_timeout = '2s';

-- rag embeddings (component): base_metadata, base_created_at, base_id_uuid (id filled later)
alter table rag.embeddings_voyage_4_large_1024  add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table rag.embeddings_voyage_4_large_1024  add column if not exists created_at timestamptz not null default now();
alter table rag.embeddings_voyage_4_large_1024  add column if not exists id uuid;
alter table rag.embeddings_voyage_4_large_1024  alter column id set default gen_random_uuid();

alter table rag.embeddings_oai_3_small_1536     add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table rag.embeddings_oai_3_small_1536     add column if not exists created_at timestamptz not null default now();
alter table rag.embeddings_oai_3_small_1536     add column if not exists id uuid;
alter table rag.embeddings_oai_3_small_1536     alter column id set default gen_random_uuid();

alter table rag.embeddings_google_gemini_2_1536 add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table rag.embeddings_google_gemini_2_1536 add column if not exists created_at timestamptz not null default now();
alter table rag.embeddings_google_gemini_2_1536 add column if not exists id uuid;
alter table rag.embeddings_google_gemini_2_1536 alter column id set default gen_random_uuid();

alter table rag.embeddings_voyage_code_3_1024   add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table rag.embeddings_voyage_code_3_1024   add column if not exists created_at timestamptz not null default now();
alter table rag.embeddings_voyage_code_3_1024   add column if not exists id uuid;
alter table rag.embeddings_voyage_code_3_1024   alter column id set default gen_random_uuid();

-- base_org_fk: the same FK the oai/voyage_code siblings already carry (ON DELETE CASCADE, NOT VALID).
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'embeddings_voyage_4_large_1024_organization_id_fkey') then
    alter table rag.embeddings_voyage_4_large_1024 add constraint embeddings_voyage_4_large_1024_organization_id_fkey
      foreign key (organization_id) references iam.organizations(id) on delete cascade not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'embeddings_google_gemini_2_1536_organization_id_fkey') then
    alter table rag.embeddings_google_gemini_2_1536 add constraint embeddings_google_gemini_2_1536_organization_id_fkey
      foreign key (organization_id) references iam.organizations(id) on delete cascade not valid;
  end if;
end $$;

-- seo queues (component): base_created_at, base_id_uuid (id filled later)
alter table seo.keyword_classification_queue add column if not exists created_at timestamptz not null default now();
alter table seo.keyword_classification_queue add column if not exists id uuid;
alter table seo.keyword_classification_queue alter column id set default gen_random_uuid();
alter table seo.topic_placement_queue        add column if not exists created_at timestamptz not null default now();
alter table seo.topic_placement_queue        add column if not exists id uuid;
alter table seo.topic_placement_queue        alter column id set default gen_random_uuid();

-- platform.knob_override_audit (ledger): base_created_at (backfilled from "at" later)
alter table platform.knob_override_audit add column if not exists created_at timestamptz not null default now();

-- platform.feature_knob (reference): base_metadata, base_id_uuid, base_updated_by_fk
alter table platform.feature_knob add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table platform.feature_knob add column if not exists id uuid not null default gen_random_uuid();
create unique index if not exists feature_knob_id_key on platform.feature_knob (id);
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'feature_knob_updated_by_fkey') then
    alter table platform.feature_knob add constraint feature_knob_updated_by_fkey
      foreign key (updated_by) references iam.users(id) on delete set null;
  end if;
end $$;

