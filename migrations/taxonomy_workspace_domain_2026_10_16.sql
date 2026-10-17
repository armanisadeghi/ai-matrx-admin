-- Domain tree: Workspace (Arman 2026-10-09: "Change Board at the top level of the menu to Workspace" —
-- every place a person works). Registry DATA change on platform.taxonomy_node: revive the workspace
-- domain, re-parent board's and projects' features into it IN PLACE (ids kept), add its missing
-- features (start, spaces, pages-and-dashboards, make), retire board and projects as legacy once empty.
-- Atomic: raises on any unexpected row count.
do $$
declare
  sys uuid := '39c38960-d30c-4840-b0c1-c9960de95582';
  ws uuid;
  n int;
begin
  update platform.taxonomy_node set status='canonical', docs_path='systems/board/',
    notes='2026-10-16: revived per Arman 2026-10-09 — every place a person works (board + projects merged here).'
  where slug='workspace' and level='domain' returning id into ws;
  if ws is null then raise exception 'workspace domain missing'; end if;

  update platform.taxonomy_node c set parent_id=ws
  where c.level='feature' and c.slug in ('boards','dashboard','launchpad','war-room','tasks-and-projects')
    and c.parent_id in (select id from platform.taxonomy_node where slug in ('board','projects') and level='domain');
  get diagnostics n = row_count; if n<>5 then raise exception 're-parent touched % rows, expected 5', n; end if;

  insert into platform.taxonomy_node (slug,name,level,parent_id,status,docs_path,notes,organization_id) values
   ('start','Start Page','feature',ws,'canonical',null,'2026-10-09 Arman: the person''s own custom home.',sys),
   ('spaces','Spaces','feature',ws,'canonical',null,'2026-10-05 Arman: Notion-style pages, databases and templates; a place you work.',sys),
   ('pages-and-dashboards','Pages and Dashboards','feature',ws,'canonical',null,'2026-10-09 Arman: pages and dashboards built from tables are places you work, not Data.',sys),
   ('make','Make','feature',ws,'canonical',null,'2026-10-09 Arman: the Make hub lives in Workspace, not Data.',sys);

  if exists (select 1 from platform.taxonomy_node where parent_id in (select id from platform.taxonomy_node where slug in ('board','projects') and level='domain')) then
    raise exception 'board/projects still have children';
  end if;
  update platform.taxonomy_node set status='legacy',
    notes=coalesce(nullif(notes,'')||' ','')||'2026-10-16: retired — merged into workspace (Arman 2026-10-09).'
  where slug in ('board','projects') and level='domain';
  get diagnostics n = row_count; if n<>2 then raise exception 'retire touched % rows', n; end if;

  update agent.review_queue q set domain_id = ws
  where q.domain_id in (select id from platform.taxonomy_node where slug in ('board','projects') and level='domain');
end $$;
