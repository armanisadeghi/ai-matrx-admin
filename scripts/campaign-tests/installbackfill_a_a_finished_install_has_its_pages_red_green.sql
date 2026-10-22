-- LANE INSTALL-BACKFILL - A FINISHED TEMPLATE INSTALL ALWAYS HAS ITS PAGES RECORDED, measured RED then GREEN.
--
-- THE USE CASE. A person presses "Use template" on a pack with pages. The copy finishes, its pages exist, and "Remove template
-- copy" must find them. Before INSTALL-ATOMIC (f4af9d3eaf) the page was recorded only after it was written, so a run cut off in
-- between left a finished install with zero page entries: template_instance_of_page answered null and the copy could not be removed.
-- The host now records the page first; this suite is the standing guard that no finished install is left without its pages.
--
-- THE RULE. A finished install (state installed) of a template whose pack has pages, started on or after the INSTALL-ATOMIC fix went
-- live (c_cutoff), with zero page entries in made, while a Spaces root with the pack's root title that the installer made in that
-- organization after the install began exists = a page made and never recorded. The suite lists every such install and fails on any.
-- (An install whose pages were never made at all, or older than the fix, is not this defect: INSTALL-BACKFILL.md lists them.)
--
-- RED: run with  -v plant=1  : a planted finished install (rolled back) with a made root and no page entry is reported -> exception.
-- GREEN: default run : the planted case is first proven detected (savepoint, rolled back), then the live census must be empty; a
-- recorded page is answered by template_instance_of_page through the signed-in door.
--   scripts: psql "$DB_URL" -v plant=1 -f scripts/campaign-tests/installbackfill_a_a_finished_install_has_its_pages_red_green.sql
-- Nothing is written that survives: the whole run is one rolled-back transaction. Seat: admin@admin.com.

\set ON_ERROR_STOP on
\timing off
\if :{?plant}
\else
\set plant 0
\endif
\set suite 'installbackfill_a_a_finished_install_has_its_pages_red_green.sql'
\set requires 'relation:custom.template_install|function:custom.template_instance_of_page'
\i scripts/campaign-tests/_preamble.sql
\if :matrx_skip
\quit
\endif

begin;
set local statement_timeout = '60s';
set local lock_timeout = '5s';

-- the census, one definition, used for the planted proof and for live
create temp view ib_unrecorded as
select i.id, i.catalogue_id, i.organization_id, i.started_at
  from custom.template_install i
  join custom.template t on t.id = i.template_id
 where i.state = 'installed'
   and i.started_at >= timestamptz '2026-10-21 00:34:43+00'
   and jsonb_array_length(coalesce(t.spec -> 'spacePack' -> 'pages', '[]'::jsonb)) > 0
   and not exists (select 1 from jsonb_array_elements(i.made) x where x ->> 'kind' = 'page')
   and exists (select 1 from content.document d
                where d.organization_id = i.organization_id and d.format = 'spaces' and d.created_by = i.installed_by
                  and d.created_at >= i.started_at - interval '2 minutes'
                  and d.title = (select coalesce((select p ->> 'title' from jsonb_array_elements(t.spec -> 'spacePack' -> 'pages') p
                                                   where nullif(p ->> 'parent', '') is null limit 1),
                                                 t.spec -> 'spacePack' -> 'pages' -> 0 ->> 'title')));

create temp table ib_plant (k text primary key, v text) on commit drop;
grant select on ib_plant to authenticated;

-- the planted case: a finished install whose root page exists and was never recorded
create or replace function pg_temp.ib_plant_it() returns void language plpgsql as $f$
declare
  v_tpl uuid; v_title text; v_type uuid; v_org uuid; v_admin uuid; v_root uuid; v_inst uuid := gen_random_uuid();
begin
  select u.id into v_admin from auth.users u where u.email = 'admin@admin.com';
  v_org := '5dc930e9-bd65-44a1-8369-af773f6e1a5b';  -- admin@admin.com's own organization (as in instanceofpage_a tests)
  select t.id, coalesce((select p ->> 'title' from jsonb_array_elements(t.spec -> 'spacePack' -> 'pages') p where nullif(p ->> 'parent','') is null limit 1),
                        t.spec -> 'spacePack' -> 'pages' -> 0 ->> 'title')
    into v_tpl, v_title
    from custom.template t
   where t.retired_at is null and jsonb_array_length(coalesce(t.spec -> 'spacePack' -> 'pages', '[]'::jsonb)) > 0 order by t.created_at desc limit 1;
  select d.document_type_id into v_type from content.document d where d.format = 'spaces' limit 1;
  insert into content.document (organization_id, document_type_id, format, title, visibility, created_by)
    values (v_org, v_type, 'spaces', v_title, 'internal', v_admin) returning id into v_root;
  insert into custom.template_install (id, organization_id, template_id, catalogue_id, template_version, state, install_day, timezone, installed_by, made, started_at)
    values (v_inst, v_org, v_tpl, 'IB-PLANT', 1, 'installed', current_date, 'UTC', v_admin, '[]'::jsonb, now() - interval '1 minute');
  insert into ib_plant values ('inst', v_inst::text), ('root', v_root::text), ('org', v_org::text), ('admin', v_admin::text);
end $f$;

-- PART 1: the guard sees a planted case (savepoint, rolled back) - unless this is the RED run, which keeps it
\if :plant
select pg_temp.ib_plant_it();
\else
savepoint planted;
select pg_temp.ib_plant_it();
do $t$
begin
  if not exists (select 1 from ib_unrecorded u where u.id::text = (select v from ib_plant where k = 'inst')) then
    raise exception 'SELF-TEST FAILED: a finished install with a made root and no page entry was not reported by the guard';
  end if;
  raise notice 'PART 1 ok: the guard reports a planted finished install with an unrecorded root';
end $t$;
rollback to savepoint planted;
\endif

-- PART 2: a recorded page is answered through the signed-in door (the seat a person has)
\if :plant
\else
savepoint recorded;
select pg_temp.ib_plant_it();
update custom.template_install i
   set made = jsonb_build_array(jsonb_build_object('kind', 'page', 'id', (select v from ib_plant where k = 'root'), 'title', 'planted'))
 where i.id::text = (select v from ib_plant where k = 'inst');
do $t$
begin
  if exists (select 1 from ib_unrecorded u where u.id::text = (select v from ib_plant where k = 'inst')) then
    raise exception 'FAILED: an install with its page recorded is still reported';
  end if;
end $t$;
select set_config('request.jwt.claims', json_build_object('sub', (select v from ib_plant where k = 'admin'), 'role', 'authenticated')::text, true);
set local role authenticated;
do $t$
declare v_ans jsonb;
begin
  v_ans := custom.template_instance_of_page((select p.v from ib_plant p where p.k = 'org')::uuid, (select p.v from ib_plant p where p.k = 'root')::uuid);
  if v_ans is null or v_ans ->> 'id' <> (select p.v from ib_plant p where p.k = 'inst') then
    raise exception 'FAILED: template_instance_of_page did not answer the install of a recorded page: %', v_ans;
  end if;
  raise notice 'PART 2 ok: a recorded page is answered by template_instance_of_page';
end $t$;
reset role;
rollback to savepoint recorded;
\endif

-- PART 3: the live census (plus the planted case in the RED run) must be empty
reset role;
do $t$
declare v_list text; v_n int;
begin
  select count(*), string_agg(u.id::text || ' ' || u.catalogue_id, ', ' order by u.started_at) into v_n, v_list from ib_unrecorded u;
  if v_n > 0 then
    raise exception 'RED: % finished install(s) have a page made and no page entry: %', v_n, v_list;
  end if;
  raise notice 'PART 3 ok: no finished install since the INSTALL-ATOMIC fix is missing its pages';
end $t$;
rollback;
