-- chair-step: Retire seven legacy/stray access columns whose ORM fields already left the deployed models (aidream bceee25ba1 + 50d10f76a6): chat.user_request.visibility, legal.wc_claim.is_public (+ its bridge trigger/function), scraper.scrape_domain.is_public, scraper.scrape_path_pattern.is_public, canvas.canvas_items.is_public, workbench.udt_documents.is_public, workbench.udt_workbooks.is_public, education.study_plan_day.visibility. No access rule, view, index-backed reader or search projection reads any of them.
-- based-on: workbench._bridge_legacy_owner() cd0eac7ddca3d957b0f85fafd40439c3f5cf682aa49d5e931964497d1cc6f433
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
-- workbench._bridge_legacy_owner() serves udt_documents, udt_workbooks and two deprecated.* tables that
-- still carry is_public. Its body is unchanged except that the is_public mirror now runs only on a table
-- that still has the column (PL/pgSQL compiles one instance per trigger relation, so the NEW.is_public
-- references are never evaluated for the two udt tables).

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
create or replace function workbench._bridge_legacy_owner()
returns trigger
language plpgsql
as $fn$
declare
  v_has_is_public boolean := exists (
    select 1 from pg_catalog.pg_attribute
     where attrelid = tg_relid and attname = 'is_public' and not attisdropped);
begin
  if tg_op = 'INSERT' then
    -- Owner: accept whichever spelling the writer used; fall back to the caller.
    new.created_by := coalesce(new.created_by, new.user_id, auth.uid());
    new.user_id    := coalesce(new.user_id, new.created_by);

    if new.visibility is null then
      -- Writer said nothing about visibility: derive it exactly as the step-1 backfill did.
      -- (nested, never `v_has_is_public and new.is_public`: one SQL expression
      -- would resolve new.is_public on a table that no longer has it)
      new.visibility := case
        when new.organization_id is not null then 'internal'::platform.visibility
        else 'personal'::platform.visibility
      end;
      if v_has_is_public then
        if coalesce(new.is_public, false) then
          new.visibility := 'public'::platform.visibility;
        end if;
      end if;
    elsif v_has_is_public then
      -- Canonical writer: visibility is authoritative, mirror it down.
      new.is_public := (new.visibility = 'public'::platform.visibility);
    end if;

  else -- UPDATE
    if new.created_by is distinct from old.created_by then
      new.user_id := new.created_by;              -- canonical writer wins
    elsif new.user_id is distinct from old.user_id then
      new.created_by := new.user_id;              -- legacy writer
    end if;

    if new.visibility is null then
      new.visibility := old.visibility;           -- never let it go back to NULL
    end if;

    if v_has_is_public then
      if new.visibility is distinct from old.visibility then
        -- Canonical writer set visibility; is_public is derived from it.
        new.is_public := (new.visibility = 'public'::platform.visibility);
      elsif coalesce(new.is_public, false) is distinct from coalesce(old.is_public, false) then
        -- Legacy writer toggled is_public. Coming OUT of public lands on the backfill default.
        new.visibility := case
          when coalesce(new.is_public, false) then 'public'::platform.visibility
          when new.organization_id is not null then 'internal'::platform.visibility
          else 'personal'::platform.visibility
        end;
      end if;
    end if;
  end if;

  return new;
end;
$fn$;

alter table workbench.udt_documents drop column is_public;
alter table workbench.udt_workbooks drop column is_public;

-- education.study_plan_day (component; no rule, search projection or writer names it)
alter table education.study_plan_day drop column visibility;
