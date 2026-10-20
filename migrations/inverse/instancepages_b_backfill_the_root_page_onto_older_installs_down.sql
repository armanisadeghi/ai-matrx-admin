-- INVERSE of migrations/inverse/instancepages_b_backfill_the_root_page_onto_older_installs.sql (lane INSTANCE-PAGES): removes only the
-- entries that migration added (backfilled = true); an install's own recorded pages are never touched.
-- chair-step: data only.
-- lock: custom
set local lock_timeout = '3s';

update custom.template_install i
   set made = coalesce((select jsonb_agg(m order by o) from jsonb_array_elements(i.made) with ordinality as e(m, o)
                         where not (m ->> 'kind' = 'page' and coalesce((m ->> 'backfilled')::boolean, false))), '[]'::jsonb)
 where jsonb_path_exists(i.made, '$[*] ? (@.kind == "page" && @.backfilled == true)');
