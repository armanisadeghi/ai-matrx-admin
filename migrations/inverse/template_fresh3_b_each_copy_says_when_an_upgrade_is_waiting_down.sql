-- inverse of migrations/campaign/template_fresh3_b_each_copy_says_when_an_upgrade_is_waiting.sql (lane TEMPLATE-FRESH-3): the body before it.

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
             'started_at', i.started_at, 'finished_at', i.finished_at,
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
