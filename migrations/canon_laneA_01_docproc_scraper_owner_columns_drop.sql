-- chair-step: Owner-column retirement Stage B for canonicalization wave 2 lane A's three tables only (docproc.processed_documents.owner_id, docproc.page_extraction_jobs.owner_id, scraper.scrape_parsed_page.owner_id/user_id/is_public). Every deployed writer/reader already uses created_by (deployed aidream + scraper 0bef185c95 contain 57b7a956da and ee7dcbf0af; frontend main contains 3637a6174b); the legacy columns are pure mirrors of created_by.
-- based-on: platform._search_item_sync_processed_document() 65a9096b3ebc1a550de4627829dfb53ded2ba74a646ef6e5f910a4f12d77f7ee
-- based-on: platform._search_item_sync_page_extraction_job() 2ab29b575f9a6dee9c91d7f07bbb7308cf9bf437764f903286b8e3d232202b46
-- based-on: scraper.retire_identity_row_with_its_trash() 726fcc73150e8d5a7622d6b92f64a9b027ca595b004983f27d9cc2b66d9b1aa8
--
-- lane: canonicalization wave 2, lane A. Clears legacy_owner_col (pd, pej, spp) and legacy_is_public (spp).
--
-- Measured 2026-10-22 (live): processed_documents 32,070 rows owner_id = created_by on every row;
-- page_extraction_jobs 198 rows equal on every row; scrape_parsed_page 12,489 rows: user_id NULL on
-- every row, owner_id NULL except 39 rows where it equals created_by, is_public false/NULL (visibility
-- drives access). Readers census (aidream incl. packages/ + apps/shared, matrx-frontend, matrx-local,
-- matrx-extend, DB function bodies incl. dynamic SQL): no live reader or writer names these columns
-- except the objects this file drops or rewrites. Two aidream maintenance scripts were switched to
-- created_by in the same change.
--
-- Access is unchanged (wave 2 rule): the four RESTRICTIVE *_owner_id_is_the_caller_* guards are
-- implied by the permissive std_insert / std_update they sit beside, because _0_owner_mirror keeps
-- owner_id = created_by on every row:
--   insert guard  owner_id = uid OR admin        <= std_insert requires created_by = uid
--   pej update    owner_id = uid OR admin OR editor  <= std_update requires created_by = uid OR editor
--   pd update     owner_id = created_by OR ...   is always true under the mirror
-- so dropping them admits and refuses exactly the same writes. std_select / std_delete never read owner_id.
--
-- This replaces the pd/pej/spp half of aidream's held 1234_hold_legacy_owner_columns_drop.sql and adds
-- what that file missed: the two search-projection triggers (platform._search_item_sync_processed_document
-- / _page_extraction_job) compared old.owner_id/new.owner_id, and scraper.retire_identity_row_with_its_trash
-- keyed restores on owner_id — each would have failed every UPDATE once the column was gone. They now
-- compare/key on created_by, which is what the search generator (aidream db/generate_search_projection.py)
-- emits for a table without owner_id, and what the live identity index
-- scrape_parsed_page_identity_per_creator_uidx already enforces.
set lock_timeout = '2s';

-- 1. guards that read owner_id ------------------------------------------------------------------
drop policy if exists processed_documents_owner_id_is_the_caller_insert on docproc.processed_documents;
drop policy if exists processed_documents_owner_id_is_the_caller_update on docproc.processed_documents;
drop policy if exists page_extraction_jobs_owner_id_is_the_caller_insert on docproc.page_extraction_jobs;
drop policy if exists page_extraction_jobs_owner_id_is_the_caller_update on docproc.page_extraction_jobs;

-- 2. mirror triggers + their table-specific functions --------------------------------------------
drop trigger if exists _0_owner_mirror on docproc.processed_documents;
drop trigger if exists _0_owner_mirror on docproc.page_extraction_jobs;
drop trigger if exists _0_owner_mirror on scraper.scrape_parsed_page;
drop trigger if exists _0_created_by_is_the_owner on docproc.processed_documents;
drop trigger if exists _0_created_by_is_the_owner on docproc.page_extraction_jobs;
drop function if exists docproc._created_by_is_the_owner();
drop function if exists scraper._scrape_parsed_page_owner_is_the_personal_creator();

-- 3. bodies that named the columns ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION platform._search_item_sync_processed_document()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
begin
  if tg_op = 'DELETE' then
    perform platform._search_item_drop('processed_document', old.id);
    return null;
  end if;
  if tg_op = 'UPDATE'
     and (old.name, old.organization_id, old.created_by, old.visibility, old.deleted_at, old.origin_client, old.source_kind, old.mime_type) is not distinct from (new.name, new.organization_id, new.created_by, new.visibility, new.deleted_at, new.origin_client, new.source_kind, new.mime_type)
       and date_trunc('hour', new.updated_at) = date_trunc('hour', old.updated_at) then
    return null;
  end if;
  if tg_op = 'UPDATE' and new.id is distinct from old.id then
    perform platform._search_item_drop('processed_document', old.id);
  end if;
  if new.organization_id is not null and new.deleted_at is null then
    perform platform._search_item_put('processed_document', new.id, new.organization_id, new.created_by, new.visibility, coalesce(nullif(btrim(new.name::text), ''), 'Untitled source' || coalesce(' ' || to_char(new.created_at, 'YYYY-MM-DD'), '')), concat_ws(' · ', new.source_kind::text, new.origin_client::text), '{}'::text[], new.updated_at, new.source_kind::text, new.origin_client::text);
  else
    perform platform._search_item_drop('processed_document', new.id);
  end if;
  return null;
end
$function$;

CREATE OR REPLACE FUNCTION platform._search_item_sync_page_extraction_job()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
begin
  if tg_op = 'DELETE' then
    perform platform._search_item_drop('page_extraction_job', old.id);
    return null;
  end if;
  if tg_op = 'UPDATE'
     and (old.name, old.organization_id, old.created_by, old.visibility, old.deleted_at, old.description, old.kind) is not distinct from (new.name, new.organization_id, new.created_by, new.visibility, new.deleted_at, new.description, new.kind)
       and date_trunc('hour', new.updated_at) = date_trunc('hour', old.updated_at) then
    return null;
  end if;
  if tg_op = 'UPDATE' and new.id is distinct from old.id then
    perform platform._search_item_drop('page_extraction_job', old.id);
  end if;
  if new.organization_id is not null and new.deleted_at is null then
    perform platform._search_item_put('page_extraction_job', new.id, new.organization_id, new.created_by, new.visibility, coalesce(nullif(btrim(new.name::text), ''), 'Untitled extraction dataset' || coalesce(' ' || to_char(new.created_at, 'YYYY-MM-DD'), '')), nullif(concat_ws(' · ', new.kind::text), ''), '{}'::text[], new.updated_at, null::text, null::text);
  else
    perform platform._search_item_drop('page_extraction_job', new.id);
  end if;
  return null;
end
$function$;

-- A trashed identity row comes back active only when no other active row holds its identity. The
-- identity is the live unique key scrape_parsed_page_identity_per_creator_uidx:
-- (organization, the creator for a personal capture else nobody, canonical_url). "Personal" is read as
-- shown_to = 'only_me' (the T-13 list column; _t13_transitional_dual_write keeps it equal to
-- visibility = 'personal' — 8,195 = 8,195 rows on 2026-10-22), because T-13 refuses a new reader of visibility.
CREATE OR REPLACE FUNCTION scraper.retire_identity_row_with_its_trash()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if old.deleted_at is null and new.deleted_at is not null and new.validity = 'active' then
    new.validity := 'stale';
    new.metadata := coalesce(new.metadata, '{}'::jsonb) || '{"retired_by_trash": true}'::jsonb;
  elsif old.deleted_at is not null and new.deleted_at is null
        and coalesce((new.metadata ->> 'retired_by_trash')::boolean, false) then
    new.metadata := new.metadata - 'retired_by_trash';
    if not exists (
      select 1 from scraper.scrape_parsed_page o
       where o.id <> new.id and o.validity = 'active' and o.deleted_at is null
         and o.organization_id = new.organization_id and o.canonical_url = new.canonical_url
         and coalesce(case when o.shown_to = 'only_me'::platform.shown_to then o.created_by end,
                      '00000000-0000-0000-0000-000000000000'::uuid)
             = coalesce(case when new.shown_to = 'only_me'::platform.shown_to then new.created_by end,
                        '00000000-0000-0000-0000-000000000000'::uuid)
    ) then
      new.validity := 'active';
    end if;
  end if;
  return new;
end
$function$;

-- 4. realtime column list without owner_id (same table set, same order) ---------------------------
alter publication supabase_realtime drop table docproc.page_extraction_jobs;
alter publication supabase_realtime add table docproc.page_extraction_jobs (
  id, file_id, processed_document_id, name, description, agent_id, shortcut_id, variable_mapping,
  output_schema, chunk_size, chunk_overlap, scope_pages, model_overrides, max_concurrent, organization_id,
  latest_run_id, created_at, updated_at, source_variations, chunking_strategy, is_saved, archived_at,
  extra_inputs, rag_boost, attach_combined_pdf, kind, validates_job_id, column_order, metadata, created_by,
  updated_by, custom_fields, version, deleted_at, visibility, shown_to, published_to_web,
  published_to_web_at, published_to_web_by, test_run_id, test_expires_at
);

-- 5. the columns (metadata-only drops; their FKs and indexes go with them, the created_by twins stay) --
alter table docproc.processed_documents  drop column owner_id;
alter table docproc.page_extraction_jobs drop column owner_id;
alter table scraper.scrape_parsed_page   drop column owner_id;
alter table scraper.scrape_parsed_page   drop column user_id;
alter table scraper.scrape_parsed_page   drop column is_public;
