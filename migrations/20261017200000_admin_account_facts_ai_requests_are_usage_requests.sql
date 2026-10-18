-- users.admin_account_facts: `ai_requests` / `ai_requests_7d` now mean what the usage explorer
-- (drill ai_usage) calls a request, so the Accounts roster and the user page (admin.user_overview) show
-- ONE number under "AI requests". Before: the roster counted every runtime.global_request spine row
-- (246,805 for the heaviest user) while the user page summed runtime._ai_usage_hourly.requests (9,919
-- all time): spine rows are agent runs / calls, the explorer counts chat requests once at first execution.
-- Active days, first/last AI time and cost are unchanged. Same signature, grants preserved.
-- based-on: users.admin_account_facts() b14a33afa2e9b052e79f79d0a03de79f258675f2dc749ecb78efe711060afb76

CREATE OR REPLACE FUNCTION users.admin_account_facts()
 RETURNS TABLE(user_id uuid, ai_requests bigint, ai_requests_7d bigint, ai_active_days bigint, first_ai_at timestamp with time zone, last_ai_at timestamp with time zone, ai_cost numeric, user_agent text, acquisition jsonb)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  -- One row per account: everything the admin Accounts roster needs to say
  -- who an account is and how far it got, computed in one pass (~0.5 s on
  -- 2026-09-30 against 1,461 accounts and 208k runtime requests).
  -- AI requests are the usage explorer's requests (runtime._ai_usage_hourly, the same number
  -- admin.user_overview shows); active days / first / last come from the runtime spine; cost is the settled
  -- runtime.global_execution cost. The browser and first touch come from the
  -- earliest users.guest_executions row naming the account that captured a
  -- first touch, else its earliest linked row. Service-role only.
  with req as (
    select gr.created_by as uid,
           count(distinct (gr.created_at at time zone 'utc')::date) as days,
           min(gr.created_at) as first_at,
           max(gr.created_at) as last_at
    from runtime.global_request gr
    where gr.deleted_at is null and gr.created_by is not null
    group by 1
  ),
  hourly as (
    -- AI requests = the usage explorer's definition (drill ai_usage measure `requests`): chat requests
    -- counted once at their first execution, summed from runtime._ai_usage_hourly by person.
    select h.person_id as uid,
           sum(h.requests) as n,
           sum(h.requests) filter (where h.bucket >= now() - interval '7 days') as n7
    from runtime._ai_usage_hourly h
    where h.person_id is not null
    group by 1
  ),
  spend as (
    select gr.created_by as uid, sum(e.cost) as cost
    from runtime.global_request gr
    join runtime.global_execution e on e.request_id = gr.id
    where gr.deleted_at is null and gr.created_by is not null
    group by 1
  ),
  touch as (
    select distinct on (g.uid) g.uid, g.user_agent, g.acquisition
    from (
      select unnest(array_remove(array[
               ge.auth_user_id,
               ge.converted_to_user_id,
               case when (ge.metadata->>'acquisition_user_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                    then (ge.metadata->>'acquisition_user_id')::uuid end
             ], null)) as uid,
             ge.user_agent,
             ge.metadata->'acquisition' as acquisition,
             ge.created_at,
             (ge.metadata->'acquisition'->>'captured_at') is not null as has_touch
      from users.guest_executions ge
      where ge.auth_user_id is not null
         or ge.converted_to_user_id is not null
         or ge.metadata ? 'acquisition_user_id'
    ) g
    order by g.uid, g.has_touch desc, g.created_at asc
  )
  select u.id,
         coalesce(hr.n, 0)::bigint, coalesce(hr.n7, 0)::bigint, coalesce(r.days, 0),
         r.first_at, r.last_at,
         coalesce(s.cost, 0),
         t.user_agent, t.acquisition
  from auth.users u
  left join req r on r.uid = u.id
  left join hourly hr on hr.uid = u.id
  left join spend s on s.uid = u.id
  left join touch t on t.uid = u.id;
$function$;
