-- chair-step: INVERSE of cdpay11_a_custom_domain_can_show_a_published_space_page.sql — removes every 'space' route, narrows iam.org_domain_route.target_kind back to form/booking/portal and restores the two doors' bodies and the door row as they were before it.
-- lock: iam
-- lane: CLOSE-PAY
-- based-on: iam.org_domain_route_set(uuid, uuid, text, text, uuid) f10cdbd6d8f0c40a4210e077588f41c24fecd8b1fd2385e11d5b92023469c651
-- based-on: iam.org_domains(uuid) 2bf0142d6e4618e8174418cbbedd55ea48c2898237f65a1f1b7d732dc37e27fd

set local lock_timeout = '3s';
set local statement_timeout = '60s';

delete from iam.org_domain_route where target_kind = 'space';
alter table iam.org_domain_route drop constraint org_domain_route_target_kind_check;
alter table iam.org_domain_route add constraint org_domain_route_target_kind_check
  check (target_kind = any (array['form', 'booking', 'portal']::text[]));

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
  else
    raise exception 'A domain shows a form, a booking page or the portal, and this is a %.', p_target_kind
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
            'target_title', (select f.title from custom.anon_form f where f.id = r.target_id)
          ) order by r.path_prefix)
          from iam.org_domain_route r where r.domain_id = d.id), '[]'::jsonb)
      ) order by d.created_at)
      from iam.org_domain d where d.organization_id = p_organization_id and d.status <> 'removed'), '[]'::jsonb),
    'targets', coalesce((
      select jsonb_agg(jsonb_build_object(
        'kind', case when f.presentation ? 'booking' then 'booking' else 'form' end,
        'id', f.id, 'title', coalesce(f.title, 'Untitled')) order by f.title)
      from custom.anon_form f
      where f.organization_id = p_organization_id and f.deleted_at is null
        and f.published_at is not null and f.closed_at is null), '[]'::jsonb));
end; $function$;

update platform.client_callable_door set reason = 'Sets which published form, booking page or portal a path of a connected domain shows. Org admins only; the target must be this organization''s.', argument_rules = '{"version": 1, "arguments": {"p_domain_id": {"type": "uuid", "check": "iam.org_domain row with organization_id = p_organization_id", "foreign": {"note": "A domain of another organization answers not connected; nothing is read or written for it.", "bounded": true}, "optional": false, "position": 2}, "p_target_id": {"type": "uuid", "check": "custom.anon_form in p_organization_id, published; portal ignores it and stores p_organization_id", "foreign": {"note": "A form of another organization raises not found; nothing is written.", "bounded": true}, "optional": true, "position": 5}, "p_path_prefix": {"type": "text", "foreign": {"not_an_id": true}, "optional": false, "position": 3}, "p_target_kind": {"type": "text", "foreign": {"not_an_id": true}, "optional": true, "position": 4}, "p_organization_id": {"type": "uuid", "check": "membership/admin of p_organization_id, decided before the first read", "foreign": {"note": "A foreign organization raises 42501 before anything is read.", "bounded": true}, "optional": false, "position": 1}}}'::jsonb
 where schema_name = 'iam' and function_name = 'org_domain_route_set';
