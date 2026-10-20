-- target: branch,production
-- additive: yes
-- guard: custom/system_enabled
-- One function body (custom.template_instances): two new keys per copy, nothing removed.
-- lane: INSTANCE-PAGES
-- lock: custom
-- Inverse: migrations/inverse/instancepages_a_each_copy_names_its_root_page_down.sql
-- based-on: custom.template_instances(uuid, text) a6eb1cea91b7d7d93dfa605e021c8c0f433c06135b08393c526741478a51d464
-- Each entry of custom.template_instances now carries root_page_id (uuid or null) and pages ([{id, title}], [] when none): what the
-- install recorded with template_install_note kind 'page'. Spaces stops tying a copy to its root through metadata.from_template.
set local lock_timeout = '3s';

CREATE OR REPLACE FUNCTION custom.template_instances(p_organization_id uuid, p_catalogue_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
begin
  perform custom.assert_client_may_reach(p_organization_id, 'custom.template_instances');
  if not iam.has_org_access(p_organization_id) then
    raise exception 'You are not a member of that organization.' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'install_id', i.id, 'instance_no', coalesce(i.instance_no, 1), 'mode', case when i.instance_no is null then 'default' else 'fresh' end,
             'title', i.instance_title, 'state', i.state, 'version', i.template_version, 'template_id', i.template_id,
             -- TEMPLATE-FRESH-3: the per-copy upgrade answer, the same for the default install and every fresh copy: the version
             -- this copy runs, the template's current version, and whether an upgrade is waiting (the copy is installed).
             'template_version', i.template_version, 'current_version', greatest(n.template_version, i.template_version),
             'current_template_id', n.id,
             'upgrade_available', coalesce(n.template_version > i.template_version and i.state = 'installed', false),
             'started_at', i.started_at, 'finished_at', i.finished_at,
             -- INSTANCE-PAGES: the pages the install recorded (template_install_note kind 'page'), oldest first, and the first of them
             -- as the copy's root. A copy with nothing recorded answers null and an empty list.
             'root_page_id', (select (m ->> 'id')::uuid from jsonb_array_elements(i.made) with ordinality as e(m, o)
                               where m ->> 'kind' = 'page' and nullif(m ->> 'id', '') is not null order by o limit 1),
             'pages', (select coalesce(jsonb_agg(jsonb_build_object('id', m ->> 'id', 'title', m ->> 'title') order by o), '[]'::jsonb)
                         from jsonb_array_elements(i.made) with ordinality as e(m, o)
                        where m ->> 'kind' = 'page' and nullif(m ->> 'id', '') is not null),
             'tables', (select coalesce(jsonb_agg(jsonb_build_object('ref', m ->> 'ref', 'id', m ->> 'id', 'title', m ->> 'title')), '[]'::jsonb)
                          from jsonb_array_elements(i.made) m where m ->> 'kind' = 'table'),
             'newer_version', case when n.template_version > i.template_version then n.template_version end,
             'upgrade', case when n.template_version > i.template_version and i.state = 'installed' then
                          jsonb_build_object('door', 'template_upgrade', 'install_id', i.id, 'template_id', n.id,
                                             'from_version', i.template_version, 'to_version', n.template_version) end)
           order by coalesce(i.instance_no, 1), i.started_at)
      from custom.template_install i
      left join lateral (select t.id, t.template_version from custom.template t
                          where t.catalogue_id = i.catalogue_id and t.retired_at is null
                            and (t.scope = 'platform' or t.organization_id = p_organization_id)
                          order by t.template_version desc, (t.scope = 'org') desc limit 1) n on true
     where i.organization_id = p_organization_id and i.catalogue_id = p_catalogue_id), '[]'::jsonb);
end;
$function$
;
