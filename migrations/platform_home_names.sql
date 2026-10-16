-- FIRST-PAINT CONTRACT (notes): the names of the homes a list meets, in one specific read, with each
-- scope type's name and each listed organization's General. Applied via Supabase MCP 2026-10-16
-- (platform_home_names). Same visibility as platform.home_labels.
-- based-on: platform.home_names(uuid[], uuid[]) 5286c036c79fab70c9773127754af3a3758f59864bc53800199e2cc954096056
create or replace function platform.home_names(p_scope_ids uuid[], p_general_orgs uuid[] default '{}')
returns table(scope_id uuid, name text, organization_id uuid, organization_name text, is_general boolean,
              scope_type_id uuid, scope_type_label text)
language plpgsql
stable
security definer
set search_path to 'pg_catalog'
as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Sign in to read homes.' using errcode = '42501';
  end if;
  return query
  with wanted as (
    select distinct x.id
      from (select unnest((coalesce(p_scope_ids, '{}'::uuid[]))[1:2000]) as id
            union
            select custom._ctx_id('home-general-scope', g::text)
              from unnest((coalesce(p_general_orgs, '{}'::uuid[]))[1:50]) as g) x
     where x.id is not null
  )
  select r.id, (r.data ->> 'name')::text, r.organization_id, o.name::text,
         r.id = custom._ctx_id('home-general-scope', r.organization_id::text),
         t.id, (t.data ->> 'name')::text
    from wanted w
    join custom.record r on r.id = w.id and r.data_class = 'record'
    join custom.record t on t.organization_id = r.organization_id and t.id = r.table_id
                        and t.table_id = custom.table_kernel_id() and t.data ->> 'kept_for' = 'context'
    join iam.organizations o on o.id = r.organization_id
   where (coalesce(public.is_platform_admin(), false)
          or iam.has_org_access(r.organization_id)
          or exists (select 1 from workbench.notes n
                      where n.home_scope_id = r.id
                        and iam.has_access_for(v_uid, 'note', n.id, 'viewer')
                      limit 1));
end;
$$;

revoke all on function platform.home_names(uuid[], uuid[]) from public, anon;

insert into platform.client_callable_door
  (schema_name, function_name, identity_args, declared_by, reason, gate_predicate,
   anonymous_callers, signed_in_callers, identity_argtypes, refusal_only, argument_rules)
values
  ('platform', 'home_names', 'p_scope_ids uuid[], p_general_orgs uuid[]', 'first-paint-fetch-contract notes',
   'Signed-in door naming the item homes a list meets (scope name, scope type, organization, General) in one specific read. Same visibility as platform.home_labels: organization access, platform admin, or a note the caller can open. Read-only; anon holds no EXECUTE; caller resolved by auth.uid().',
   'auth.uid()', false, true, '{2951,2951}'::oid[], false,
   $rules${"version":1,"arguments":{"p_scope_ids":{"type":"uuid[]","check":"each row is returned only when the caller has access to its organization, is a platform admin, or can open a note homed there; decided per row","foreign":{"note":"A scope id of an organization the caller cannot reach returns no row unless a note the caller can open lives there; the list is cut at 2000 ids.","bounded":true},"optional":false,"position":1,"null_rule":{"means":"no scopes asked"}},"p_general_orgs":{"type":"uuid[]","check":"the General scope id derived from each organization id is returned only under the same per-row access test","foreign":{"note":"A foreign organization id derives a General scope id that fails the per-row access test and returns no row; the list is cut at 50 ids.","bounded":true},"optional":true,"position":2,"null_rule":{"means":"no organization General asked"}}}}$rules$::jsonb)
on conflict do nothing;

grant execute on function platform.home_names(uuid[], uuid[]) to authenticated;
