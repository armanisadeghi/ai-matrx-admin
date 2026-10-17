-- drillnames_a_relation_without_a_title_column_is_named.sql (lane DRILL-ROUND2-DATA, 2026-10-17)
--
-- APPLIED TO PRODUCTION THROUGH THE SUPABASE MCP (HANDOFF G1). History only: never re-apply over a
-- later drill_ask.
--
-- DEFECT: a member page's drill (HR timesheets, CRM deals) read "A pay period whose name you cannot
-- read" and "An assigned to whose name you cannot read". The door names a relation group only when
-- the target entity declares a title column (platform._drill_compile `relations`); hr_pay_period,
-- hr_employment and user declare none, and member pages (OrganizationDrillExplorer) pass no host
-- resolver, so every such group fell through to the unreadable words.
--
-- FIX (the shared layer, every definition inherits it): after the title-column relations, drill_ask
-- names every relation Dimension of a DECLARED definition the answer still has no words for, through
-- platform.drill_relation_names — read as the seat:
--   hr_pay_period  its dates and pay group ("Oct 1 – Oct 14, 2026 · Studio Crew — Weekly"), as the seat
--   hr_employment  the employee's display name, through hr.employment / hr.employee row security
--   user / person  platform._drill_people_names: the seat herself, anyone who shares an organization
--                  with her, or anyone for a platform admin in the admin apps; words as
--                  platform.ai_usage_names says a person (email, phone, full name).
-- A token with no rule returns {} and the screen keeps its own words.

create or replace function platform._drill_people_names(p_ids uuid[])
returns jsonb
language sql
stable security definer
set search_path to 'pg_catalog'
as $$
  -- the people a seat may name: herself, anyone sharing an organization with her, everyone for a
  -- platform admin inside the admin apps (public.is_platform_admin reads the admin lane)
  select coalesce(jsonb_object_agg(u.id, coalesce(
           nullif(u.email, ''), nullif(u.phone, ''),
           nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''),
           case when u.is_anonymous then 'Guest from ' || to_char(u.created_at, 'Mon FMDD, YYYY') end,
           'A person with no email or phone')), '{}'::jsonb)
    from auth.users u
   where u.id = any (p_ids[1:3000])
     and (u.id = (select auth.uid())
          or public.is_platform_admin()
          or exists (select 1
                       from iam.memberships mine
                       join iam.memberships theirs
                         on theirs.container_type = 'organization' and theirs.container_id = mine.container_id
                        and theirs.user_id = u.id and theirs.deleted_at is null
                      where mine.container_type = 'organization' and mine.user_id = (select auth.uid())
                        and mine.deleted_at is null));
$$;

insert into platform.client_callable_door (schema_name, function_name, identity_args, identity_argtypes, declared_by, reason)
select 'platform', '_drill_people_names', 'p_ids uuid[]', array['uuid[]'::regtype::oid],
       'migrations/campaign/drillnames_a_relation_without_a_title_column_is_named.sql (lane DRILL-ROUND2-DATA)',
       'Called by the invoker door platform.drill_ask (through platform.drill_relation_names) to name person groups. Returns words only for ids that are the caller, share an organization membership with the caller, or for a platform admin inside the admin apps; reads no other row.'
 where not exists (select 1 from platform.client_callable_door where schema_name = 'platform' and function_name = '_drill_people_names');

revoke all on function platform._drill_people_names(uuid[]) from public;
grant execute on function platform._drill_people_names(uuid[]) to authenticated, service_role;

create or replace function platform.drill_relation_names(p_token text, p_person boolean, p_ids text[])
returns jsonb
language plpgsql
stable
set search_path to 'pg_catalog'
as $$
declare
  v_ids uuid[];
  v     jsonb;
begin
  -- INVOKER: every rule but people reads through the target's own row security
  select coalesce(array_agg(distinct x::uuid), '{}') into v_ids
    from unnest(p_ids) x where x ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  if cardinality(v_ids) = 0 then
    return '{}'::jsonb;
  end if;
  if coalesce(p_person, false) or p_token = 'user' then
    return platform._drill_people_names(v_ids);
  end if;
  if p_token = 'hr_pay_period' then
    -- its dates, then its pay group (two pay groups share the same dates)
    select coalesce(jsonb_object_agg(p.id, case
             when p.period_start_on is null or p.period_end_on is null then 'Pay period ' || coalesce(p.sequence_number::text, '')
             when extract(year from p.period_start_on) = extract(year from p.period_end_on)
               then to_char(p.period_start_on, 'Mon FMDD') || ' – ' || to_char(p.period_end_on, 'Mon FMDD, YYYY')
             else to_char(p.period_start_on, 'Mon FMDD, YYYY') || ' – ' || to_char(p.period_end_on, 'Mon FMDD, YYYY') end
           || coalesce(' · ' || nullif(btrim(g.name), ''), '')), '{}'::jsonb)
      into v
      from hr.pay_period p left join hr.pay_group g on g.id = p.pay_group_id
     where p.id = any (v_ids);
    return v;
  end if;
  if p_token = 'hr_employment' then
    select coalesce(jsonb_object_agg(e.id, w.words) filter (where w.words is not null), '{}'::jsonb)
      into v
      from hr.employment e
      join hr.employee emp on emp.id = e.employee_id
      cross join lateral (select coalesce(nullif(btrim(emp.display_name), ''),
                                          nullif(btrim(concat_ws(' ', coalesce(nullif(btrim(emp.preferred_first_name), ''), emp.legal_first_name),
                                                                      coalesce(nullif(btrim(emp.preferred_last_name), ''), emp.legal_last_name))), ''),
                                          nullif(btrim(emp.work_email), '')) as words) w
     where e.id = any (v_ids);
    return v;
  end if;
  return '{}'::jsonb;
end
$$;

grant execute on function platform.drill_relation_names(text, boolean, text[]) to authenticated, service_role;

-- drill_ask: one block after the title-column relations (anchor = its total-row comment)
do $do$
declare
  s      text := pg_get_functiondef('platform.drill_ask(uuid,jsonb,jsonb)'::regprocedure);
  anchor text := E'  -- an answer always carries its total row, even when no row passed the filter\n';
  block  text := $blk$  -- RELATIONS WITH NO TITLE COLUMN (lane DRILL-ROUND2-DATA): a declared definition's relation
  -- Dimension the answer has no words for yet (a pay period, an employment, a person) is named by
  -- platform.drill_relation_names, read as the seat; a token with no rule keeps the screen's words.
  if p_source ->> 'kind' = 'entity' then
    for v_rel in select d from jsonb_array_elements(coalesce(platform.drill_declared(p_source ->> 'token') -> 'dimensions', '[]'::jsonb)) d
                  where d ->> 'kind' = 'relation' and not (v_lab ? (d ->> 'key')) loop
      select array_agg(distinct g) into v_ids
        from jsonb_array_elements(v_rows) x
        cross join lateral (values (x -> 'groups' ->> (v_rel ->> 'key')), (x -> 'prior_groups' ->> (v_rel ->> 'key'))) v(g)
       where g is not null;
      continue when v_ids is null;
      begin
        v_one := platform.drill_relation_names(v_rel -> 'relation' ->> 'token', coalesce((v_rel -> 'relation' ->> 'person')::boolean, false), v_ids);
        if v_one is not null and v_one <> '{}'::jsonb then
          v_lab := v_lab || jsonb_build_object(v_rel ->> 'key', v_one);
        end if;
      exception when insufficient_privilege then
        v_says := v_says || format('The names behind %s could not be read for you, so they show as ids.', v_rel ->> 'key');
      end;
    end loop;
  end if;

$blk$;
begin
  if position('RELATIONS WITH NO TITLE COLUMN' in s) > 0 then
    raise notice 'drill_ask already names relations without a title column';
    return;
  end if;
  if (length(s) - length(replace(s, anchor, ''))) / length(anchor) <> 1 then
    raise exception 'drill_ask anchor not found exactly once';
  end if;
  execute replace(s, anchor, block || anchor);
end
$do$;
