-- Inverse: the run facts view without the review-flag columns (run the drill definition inverse first).
drop view workflow._run_facts;
create view workflow._run_facts with (security_invoker = true) as
select r.id as run_id, r.definition_id as workflow_id, r.organization_id, r.created_by as person_id, r.status,
       case when r.parent_run_id is not null then 'child'
            when r.metadata ? 'trigger_id' or exists (select 1 from workflow.trigger_fire f where f.run_id = r.id) then 'trigger'
            when r.metadata ? '_mandate' then 'mandate' else 'direct' end as how_started,
       r.created_at, r.started_at, r.completed_at,
       case when r.completed_at is not null and r.completed_at >= coalesce(r.started_at, r.created_at)
            then (extract(epoch from r.completed_at - coalesce(r.started_at, r.created_at)) * 1000)::bigint end as duration_ms,
       (r.status in ('errored','failed'))::int as failed, (r.completed_at is not null)::int as finished,
       r.steps_executed, coalesce(c.cost,0) as cost, coalesce(c.requests,0) as requests, (c.run_id is not null)::int as has_request
  from workflow.run r left join workflow._run_cost c on c.run_id = r.id where r.deleted_at is null;
revoke all on workflow._run_facts from public, anon, authenticated;
