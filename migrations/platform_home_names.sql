-- FIRST-PAINT CONTRACT (notes): the names of the homes a list meets, in one specific read, with each
-- scope type's name and each listed organization's General. Applied via Supabase MCP 2026-10-16
-- (platform_home_names). Same visibility as platform.home_labels.
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

-- Door row (platform.client_callable_door) with argument_rules for both uuid[] arguments, then:
grant execute on function platform.home_names(uuid[], uuid[]) to authenticated;
