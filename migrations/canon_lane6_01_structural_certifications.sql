-- chair-step: canonicalization lane 6 enables row security on nine access-machinery tables (only postgres and service_role hold grants; both bypass RLS) and sets NOT NULL on columns that hold no NULLs (shared_canvas_items.visibility; udt_documents.organization_id; udt_documents.metadata after backfill to '{}')
-- lane: canonicalization lane 6 (schemas custom, mandate, canvas, public, transcripts, workbench, context, ui, hr).
--
-- 1. machinery_rls_on: the access resolver's own tables get row security ON. Readers are SECURITY
--    DEFINER functions owned by postgres (owner bypasses RLS, not FORCEd) and service_role (BYPASSRLS);
--    authenticated/anon hold no grant on any of them. The admin-read event trigger adds platform_admin_read.
-- 2. canvas_scores / canvas_views: base FKs (+ covering indexes), created_at NOT NULL, visibility
--    (organization class -> 'internal', also the column default since the two writer functions,
--    canvas.submit_canvas_score / canvas.record_canvas_view, never send it).
-- 3. context.user_active_context: declares soft delete; retrofit adds deleted_at.
-- 4. workbench.udt_documents: metadata default '{}' + NOT NULL. The create door in @ai-matrx/office
--    (createDocument) never sends metadata and the column had no default, so every new document
--    landed NULL — the default fixes that writer without a package change. organization_id NOT NULL
--    (0 NULL rows; the same door already passes it).
-- 5. canvas.shared_canvas_items: visibility NOT NULL (0 NULL rows; column already defaulted).
set lock_timeout = '2s';

alter table context.scope_door_registry enable row level security;
alter table custom._share_tails_mine_repair enable row level security;
alter table custom.agg_digest_checked enable row level security;
alter table custom.carrying_rule enable row level security;
alter table custom.organization_visibility_version enable row level security;
alter table custom.visibility_cache enable row level security;
alter table custom.visibility_epoch enable row level security;
alter table hr._recompute_queue enable row level security;
alter table hr.notify_outsider_door_baseline enable row level security;

create index if not exists canvas_scores_organization_id_idx on canvas.canvas_scores (organization_id);
create index if not exists canvas_scores_created_by_idx on canvas.canvas_scores (created_by);
create index if not exists canvas_scores_updated_by_idx on canvas.canvas_scores (updated_by);
create index if not exists canvas_views_organization_id_idx on canvas.canvas_views (organization_id);
create index if not exists canvas_views_created_by_idx on canvas.canvas_views (created_by);
create index if not exists canvas_views_updated_by_idx on canvas.canvas_views (updated_by);
create index if not exists user_active_context_created_by_idx on context.user_active_context (created_by);
create index if not exists user_active_context_updated_by_idx on context.user_active_context (updated_by);
create index if not exists udt_documents_updated_by_idx on workbench.udt_documents (updated_by);

update platform.entity_types set has_soft_delete = true
 where token = 'user_active_context' and schema_name = 'context' and table_name = 'user_active_context';

select platform.retrofit_entity('canvas','canvas_scores','canvas_score','keep', p_visibility_expr => '''internal''');
select platform.retrofit_entity('canvas','canvas_views','canvas_view','keep', p_visibility_expr => '''internal''');
select platform.retrofit_entity('context','user_active_context','user_active_context','keep');
select platform.retrofit_entity('workbench','udt_documents','udt_document','keep');

alter table canvas.canvas_scores alter column visibility set default 'internal';
alter table canvas.canvas_views alter column visibility set default 'internal';
alter table canvas.shared_canvas_items alter column visibility set not null;
