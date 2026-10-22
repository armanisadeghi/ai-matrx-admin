-- draft: lane F waits for the deployed aidream server + scraper service to contain the model commits (bceee25ba1, 50d10f76a6)
-- chair-step: Retire seven legacy/stray access columns whose ORM fields already left the deployed models (aidream bceee25ba1 + 50d10f76a6): chat.user_request.visibility, legal.wc_claim.is_public (+ its bridge trigger/function), scraper.scrape_domain.is_public, scraper.scrape_path_pattern.is_public, canvas.canvas_items.is_public, workbench.udt_documents.is_public, workbench.udt_workbooks.is_public, education.study_plan_day.visibility. No access rule, view, index-backed reader or search projection reads any of them.
--
-- lane: canonicalization wave 2, lane F. Clears the one WARN on each table (legacy_is_public / stray visibility).
--
-- Access is unchanged: no RLS policy depends on any dropped column (pg_depend: attrdef only, plus
-- wc_claim_is_public_idx), access rules read `visibility` (or the component lane's parent), and
-- before/after counts as anon / test admin / ordinary member are recorded in the lane-F report.
-- education.study_plan_block.visibility is deliberately KEPT: its search projection
-- (platform._search_item_sync_study_plan_block) passes it as row_visibility, and a NULL there routes
-- non-owner org members through the kernel, which grants them the hit today — a change in who sees it.
--
-- workbench.udt_documents / udt_workbooks keep their user_id <-> created_by bridge: they move off the
-- shared workbench._bridge_legacy_owner() (which also serves two deprecated.* tables that still carry
-- is_public) onto workbench._bridge_legacy_user_id(), the same body without the is_public mirror.

set lock_timeout = '2s';

-- chat.user_request (component; RLS lane never read it)
alter table chat.user_request drop column visibility;

-- legal.wc_claim: the API keeps the is_public wire field, derived from visibility in aidream.
drop trigger _bridge_is_public on legal.wc_claim;
drop function legal._bridge_wc_claim_is_public();
alter table legal.wc_claim drop column is_public;

-- scraper engine config tables (every signed-in user reads them; the flag gated nothing)
alter table scraper.scrape_domain drop column is_public;
alter table scraper.scrape_path_pattern drop column is_public;

-- canvas
alter table canvas.canvas_items drop column is_public;

-- workbench udt documents / workbooks
create function workbench._bridge_legacy_user_id()
returns trigger
language plpgsql
as $fn$
begin
  if tg_op = 'INSERT' then
    -- Owner: accept whichever spelling the writer used; fall back to the caller.
    new.created_by := coalesce(new.created_by, new.user_id, auth.uid());
    new.user_id    := coalesce(new.user_id, new.created_by);
    if new.visibility is null then
      new.visibility := case
        when new.organization_id is not null then 'internal'::platform.visibility
        else 'personal'::platform.visibility
      end;
    end if;
  else
    if new.created_by is distinct from old.created_by then
      new.user_id := new.created_by;              -- canonical writer wins
    elsif new.user_id is distinct from old.user_id then
      new.created_by := new.user_id;              -- legacy writer
    end if;
    if new.visibility is null then
      new.visibility := old.visibility;           -- never let it go back to NULL
    end if;
  end if;
  return new;
end;
$fn$;

drop trigger _bridge_legacy_owner on workbench.udt_documents;
create trigger _bridge_legacy_owner before insert or update on workbench.udt_documents
  for each row execute function workbench._bridge_legacy_user_id();
drop trigger _bridge_legacy_owner on workbench.udt_workbooks;
create trigger _bridge_legacy_owner before insert or update on workbench.udt_workbooks
  for each row execute function workbench._bridge_legacy_user_id();

alter table workbench.udt_documents drop column is_public;
alter table workbench.udt_workbooks drop column is_public;

-- education.study_plan_day (component; no rule, search projection or writer names it)
alter table education.study_plan_day drop column visibility;
