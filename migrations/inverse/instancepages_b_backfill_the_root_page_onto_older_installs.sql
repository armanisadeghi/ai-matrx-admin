-- chair-step: data only; it only ADDS a page entry to an install that records none (the additive allow-list cannot read an UPDATE).
-- guard: custom/system_enabled
-- UNAPPLIED chair step (a non-additive UPDATE): the senior owner runs it with --confirm-chair-step; it sits in migrations/inverse/ so no sweep takes it. Live census 2026-10-20: 0 installs qualify.
-- Data only: custom.template_install.made gains one {kind: page} entry per install that has none. No DDL.
-- lane: INSTANCE-PAGES
-- lock: custom
-- Inverse: migrations/inverse/instancepages_b_backfill_the_root_page_onto_older_installs_down.sql
-- INSTANCE-PAGES: older installs never recorded the root page the host made (template_install_note kind 'page' arrived 2026-10-20). The
-- only reliable trace is the page itself: a Spaces page of the same organization whose metadata.from_template.install_id is the install id
-- (the marker Spaces stamps; the flat text form is read too). An install that already records any page is never touched, and an install
-- whose marker matches more than one page is left alone (not reliable). Each entry carries backfilled = true so the inverse removes
-- exactly these. The page stays marked; Spaces switches the marker off on its own side.
set local lock_timeout = '3s';

with hit as (
  select i.id as install_id, (array_agg(d.id order by d.created_at))[1] as page_id, (array_agg(d.title order by d.created_at))[1] as title, count(*) as n
    from custom.template_install i
    join content.document d
      on d.organization_id = i.organization_id and d.format = 'spaces'
     and coalesce(d.metadata -> 'from_template' ->> 'install_id', case when jsonb_typeof(d.metadata -> 'from_template') = 'string' then d.metadata ->> 'from_template' end) = i.id::text
   where not jsonb_path_exists(i.made, '$[*] ? (@.kind == "page")')
   group by i.id)
update custom.template_install i
   set made = i.made || jsonb_build_array(jsonb_build_object('kind', 'page', 'id', h.page_id, 'ref', 'page', 'title', h.title, 'step', null, 'backfilled', true))
  from hit h
 where h.install_id = i.id and h.n = 1;
