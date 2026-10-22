-- lane: canonicalization lane 5 (communication, education, legal, assignment, dictionary) — batch 1.
-- legal reference catalogues (CourtListener mirror): citations, courts, dockets, opinion_clusters,
-- opinions. Adds the base created_at / metadata columns and the soft-delete column the reference
-- contract asks for. Every add is catalogue-only (constant / STABLE default, or nullable with no
-- default): no table rewrite. All five are tiny on live (opinion_clusters ~7.9k rows, 21 MB).
-- Every existing row reads deleted_at NULL, so no reader loses a row.
-- NOT HERE: legal.opinions.author_id (CourtListener's own author key, int8) still trips
-- legacy_owner_col / reference_has_no_scope_columns; renaming it touches the matrx-legal package.
set lock_timeout = '2s';

alter table legal.citations        add column if not exists created_at timestamptz not null default now();
alter table legal.courts           add column if not exists created_at timestamptz not null default now();
alter table legal.dockets          add column if not exists created_at timestamptz not null default now();
alter table legal.opinion_clusters add column if not exists created_at timestamptz not null default now();
alter table legal.opinions         add column if not exists created_at timestamptz not null default now();

alter table legal.citations        add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table legal.courts           add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table legal.dockets          add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table legal.opinion_clusters add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table legal.opinions         add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table legal.citations        add column if not exists deleted_at timestamptz;
alter table legal.courts           add column if not exists deleted_at timestamptz;
alter table legal.dockets          add column if not exists deleted_at timestamptz;
alter table legal.opinion_clusters add column if not exists deleted_at timestamptz;
alter table legal.opinions         add column if not exists deleted_at timestamptz;

update platform.entity_types set has_soft_delete = true
 where schema_name = 'legal' and table_name in ('citations','courts','dockets','opinion_clusters','opinions');
