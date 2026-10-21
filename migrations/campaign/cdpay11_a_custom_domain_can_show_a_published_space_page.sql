-- chair-step: WIDENS iam.org_domain_route.target_kind with 'space' (drop + re-add of the one check constraint, wider set; every existing row still passes) and replaces two doors so a business's own domain can show a Spaces page it published to the web. Inverse: migrations/campaign/cdpay11_a_custom_domain_can_show_a_published_space_page.inverse.sql.
-- guard: custom/system_enabled
-- lock: iam
-- lane: CLOSE-PAY
-- based-on: iam.org_domain_route_set(uuid, uuid, text, text, uuid) 67e74983742457133008832a9faaa49a4a927cfe206d0e6aa46efd538786f135
-- based-on: iam.org_domains(uuid) df9e67438b0444094e8a55d3c1d33280473325dd58c428bcd7cc0e112310c178
--
-- CD-PAY-11 (ACCEPTANCE.json): "A published Space page can be served on the business's custom domain."
-- A route may now name target_kind 'space' with a content.document id. The route door accepts it only for a
-- Spaces page of THIS organization that is on the web right now (content._space_on_web — the same rule the public
-- /site/<link> page reads through). The proxy rewrites that path to /site/<id>; a page taken off the web answers
-- exactly like one that never existed there, so nothing unpublished is ever served on the business's host.
-- org_domains lists the organization's published Spaces pages beside its forms and booking pages, and names the
-- title of a space route.

set local lock_timeout = '3s';
set local statement_timeout = '60s';

alter table iam.org_domain_route drop constraint org_domain_route_target_kind_check;
alter table iam.org_domain_route add constraint org_domain_route_target_kind_check
  check (target_kind = any (array['form', 'booking', 'portal', 'space']::text[]));

CREATE OR REPLACE FUNCTION iam.org_domain_route_set(p_organization_id uuid, p_domain_id uuid, p_path_prefix text, p_target_kind text, p_target_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_prefix text := coalesce(nullif(lower(btrim(p_path_prefix)), ''), '/');
  v_target uuid := p_target_id;
  v_id uuid;
begin
  if not public.is_org_admin(p_organization_id) then
    raise exception 'Only an admin of this organization can choose what its domains show.' using errcode = '42501';
  end if;
  if not exists (select 1 from iam.org_domain d where d.id = p_domain_id
                  and d.organization_id = p_organization_id and d.status <> 'removed') then
    raise exception 'That domain is not connected to this organization.' using errcode = '02000';
  end if;
  if left(v_prefix, 1) <> '/' then v_prefix := '/' || v_prefix; end if;
  if v_prefix !~ '^/([a-z0-9][a-z0-9-]*)?$' then
    raise exception 'A path is one word, like /book.' using errcode = '22023';
  end if;
  if p_target_kind is null then
    delete from iam.org_domain_route r where r.domain_id = p_domain_id and r.path_prefix = v_prefix;
    return jsonb_build_object('ok', true, 'removed', true);
  end if;
  if p_target_kind = 'portal' then
    v_target := p_organization_id;
  elsif p_target_kind in ('form', 'booking') then
    if not exists (select 1 from custom.anon_form f
                    where f.id = p_target_id and f.organization_id = p_organization_id
                      and f.deleted_at is null and f.published_at is not null
                      and (p_target_kind = 'form' or f.presentation ? 'booking')) then
      raise exception 'Pick a published % of this organization.', p_target_kind using errcode = '02000';
    end if;
  elsif p_target_kind = 'space' then
    if not exists (select 1 from content.document d
                    where d.id = p_target_id and d.organization_id = p_organization_id
                      and content._space_on_web(d)) then
      raise exception 'Pick a page of this organization that is published to the web.' using errcode = '02000';
    end if;
  else
    raise exception 'A domain shows a form, a booking page, a published page or the portal.'
      using errcode = '22023';
  end if;
  insert into iam.org_domain_route as r (organization_id, domain_id, path_prefix, target_kind, target_id, created_by, updated_by)
  values (p_organization_id, p_domain_id, v_prefix, p_target_kind, v_target, auth.uid(), auth.uid())
  on conflict (domain_id, path_prefix) do update
     set target_kind = excluded.target_kind, target_id = excluded.target_id,
         updated_by = excluded.updated_by, updated_at = now()
  returning r.id into v_id;
  return jsonb_build_object('ok', true, 'route_id', v_id, 'path_prefix', v_prefix);
end; $function$;

CREATE OR REPLACE FUNCTION iam.org_domains(p_organization_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not public.is_org_member(p_organization_id) then
    raise exception 'Only members of this organization can see its domains.' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'access', iam._org_domain_access(p_organization_id),
    'can_manage', public.is_org_admin(p_organization_id),
    'domains', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', d.id, 'host', d.host, 'status', d.status, 'verification', d.verification,
        'last_check_at', d.last_check_at, 'last_error', d.last_error, 'created_at', d.created_at,
        'routes', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', r.id, 'path_prefix', r.path_prefix, 'target_kind', r.target_kind, 'target_id', r.target_id,
            'target_title', case when r.target_kind = 'space'
                                 then (select coalesce(nullif(s.title, ''), 'Untitled') from content.document s where s.id = r.target_id)
                                 else (select f.title from custom.anon_form f where f.id = r.target_id) end
          ) order by r.path_prefix)
          from iam.org_domain_route r where r.domain_id = d.id), '[]'::jsonb)
      ) order by d.created_at)
      from iam.org_domain d where d.organization_id = p_organization_id and d.status <> 'removed'), '[]'::jsonb),
    'targets', coalesce((
      select jsonb_agg(t.target order by t.sort_kind, t.title)
      from (
        select jsonb_build_object(
                 'kind', case when f.presentation ? 'booking' then 'booking' else 'form' end,
                 'id', f.id, 'title', coalesce(f.title, 'Untitled')) as target,
               0 as sort_kind, coalesce(f.title, 'Untitled') as title
          from custom.anon_form f
         where f.organization_id = p_organization_id and f.deleted_at is null
           and f.published_at is not null and f.closed_at is null
        union all
        select jsonb_build_object('kind', 'space', 'id', s.id, 'title', coalesce(nullif(s.title, ''), 'Untitled')),
               1, coalesce(nullif(s.title, ''), 'Untitled')
          from content.document s
         where s.organization_id = p_organization_id and content._space_on_web(s)
      ) t), '[]'::jsonb));
end; $function$;

update platform.client_callable_door
   set reason = 'Sets which published form, booking page, Spaces page or portal a path of a connected domain shows. Org admins only; the target must be this organization''s and published.',
       argument_rules = jsonb_set(argument_rules, '{arguments,p_target_id,check}',
         to_jsonb('custom.anon_form in p_organization_id, published; or a content.document of p_organization_id on the web (content._space_on_web); portal ignores it and stores p_organization_id'::text))
 where schema_name = 'iam' and function_name = 'org_domain_route_set';
