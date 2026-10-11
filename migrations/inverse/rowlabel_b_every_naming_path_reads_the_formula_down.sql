-- chair-step: ROW-LABEL-FORMULA part 2 inverse. Restores the five function bodies as they were.
-- lane: ROW-LABEL-FORMULA
-- lock: custom
-- based-on: custom._inbox_items(uuid, uuid, boolean) c5eebc05282f37ceb0ca2473cc51788c289300f742b666cb06c70f4cce291461
-- based-on: custom.work_list(uuid, text, boolean, integer, integer) 047a6c6ae7fee03ed5b57fc29b148b8fd5b9a84cee8e0bd074d4d355a769ed16
-- based-on: custom._relation_names_resolve(uuid, uuid, text[]) 0bd3af8dcb4a093ef02382ce51ce9637c5dfe7e700ffee6e9c2c6163a2eb6671
-- based-on: custom._record_outside_projection(uuid, uuid, permission_level) ee51d48cdaccf49de3e3f111f79cdf51331e94705b76b2198e7b20900d43850a
-- based-on: custom.io_relation_candidate(uuid, uuid, text[]) dda87cf2abf017d3fb5b536d345d86965b21c8b2e2acb13d33e119dee5fbfb58

CREATE OR REPLACE FUNCTION custom._inbox_items(p_organization_id uuid, p_user_id uuid, p_include_decided boolean DEFAULT false)
 RETURNS TABLE(item_id uuid, kind text, origin text, title text, subject_id uuid, subject_kind text, summary text, state text, due_on timestamp with time zone, due_state text, actionable boolean, requested_by uuid, requested_by_name text, at timestamp with time zone, table_id uuid, table_name text, decided_by uuid, decided_by_name text, decided_at timestamp with time zone, outcome text, snoozed_until timestamp with time zone, cleared_at timestamp with time zone, reminded_at timestamp with time zone, woke_at timestamp with time zone, inbox_state text, sort_at timestamp with time zone, touched_by uuid, item_version integer)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
-- NOT a definer, on purpose: it has no client EXECUTE and is only ever reached from inside the
-- definer doors below (and pg_cron's tick, which runs as the store's owner), so it runs with their
-- rights and needs no door of its own.
declare
  v_now    timestamptz := custom._inbox_now();
  v_person uuid;
begin
  -- LANE ARCHIVED-ORG-WORK: AN ARCHIVED ORGANIZATION HAS NOTHING WAITING IN IT. Its members cannot
  -- open it, its waiting work was withdrawn when it was archived, and the inbox, the badge's count
  -- and the reminders (all this one function) never list, count or remind about any of it.
  if exists (select 1 from iam.organizations g where g.id = p_organization_id and g.archived_at is not null) then
    return;
  end if;

  -- WHAT IS WAITING ON ONE PERSON, asked for that person by id — so the inbox screen, the shell
  -- badge's count and the reminder tick cannot disagree: they are this one function.
  -- Approvals: the ones this person is among the approvers of (the same ladder
  -- custom.work_approval_may_decide asks). Assignments: open records whose Assignee is this
  -- person's person-record, that they can see (the same predicate as custom.work_list 'mine';
  -- the seat suite asserts the two agree). p_user_id null is the store owner's server lane,
  -- which sees every approval and has no assignments, exactly as work_inbox always answered it.
  if p_user_id is not null then
    select r.id into v_person
      from custom.record r
     where r.organization_id = p_organization_id
       and r.table_id = custom.person_kernel_id()
       and r.deleted_at is null
       and r.data ->> 'user_id' = p_user_id::text
     order by r.created_at
     limit 1;
  end if;

  return query
  with approvals as (
    select r.id, r.data as d, r.created_at, r.updated_by, r.version,
           case when coalesce(r.data ->> 'subject_kind', 'record') = 'table'
                  then nullif(r.data ->> 'subject_id', '')::uuid
                when lower(coalesce(r.data #>> '{change,kind}', '')) = 'table_add' then null
                else nullif(r.data ->> 'subject_table_id', '')::uuid end as tid,
           nullif(coalesce(r.data ->> 'decided_by', r.data ->> 'withdrawn_by'), '')::uuid as who
      from custom.record r
     where r.organization_id = p_organization_id
       and r.data_class = 'work_approval'
       and r.deleted_at is null
       and (coalesce(p_include_decided, false) or coalesce(r.data ->> 'state', 'pending') = 'pending')
       -- LANE S5-PRIME: A DECISION ABOUT AN ARCHIVED THING IS NEVER LISTED AS WAITING.
       and (coalesce(r.data ->> 'state', 'pending') <> 'pending'
            or custom.work_approval_withdrawal(p_organization_id, r.data) is null)
       -- A PERSON'S OWN REQUEST IS NOT WAITING ON THEM: custom.work_approval_decide refuses the
       -- requester of a person's ask ("You asked for this change, so somebody else approves it"),
       -- so listing it with Approve would be a control that fails when pressed. An agent's
       -- request, which the decide door lets its person decide, stays.
       and not (p_user_id is not null
                and coalesce(r.data ->> 'state', 'pending') = 'pending'
                and r.data ->> 'requested_by' = p_user_id::text
                and coalesce(r.data ->> 'origin', 'person') <> 'agent')
       and case when p_user_id is null then custom.query_is_store_owner()
                else custom.work_approval_is_approver(p_organization_id,
                       nullif(r.data ->> 'subject_id', '')::uuid, nullif(r.data ->> 'approver_id', '')::uuid, p_user_id) end
  ),
  items as (
    select a.id as item_id,
           case when coalesce(a.d ->> 'origin', 'person') = 'agent' then 'proposal' else 'approval' end as kind,
           coalesce(a.d ->> 'origin', 'person') as origin,
           case when (a.d -> 'change') ->> 'kind' = 'field_add'
                then format('Add %s to %s',
                            coalesce(nullif(a.d #>> '{change,field,label}', ''),
                                     nullif(a.d #>> '{change,field,key}', ''), 'a column'),
                            coalesce(a.d ->> 'subject_title', 'a table'))
                else format('Change %s', coalesce(a.d ->> 'subject_title', 'a record')) end as title,
           nullif(a.d ->> 'subject_id', '')::uuid as subject_id,
           coalesce(a.d ->> 'subject_kind', 'record') as subject_kind,
           coalesce(nullif(a.d ->> 'note', ''),
                    case when (a.d -> 'change') ->> 'kind' = 'field_add'
                         then 'A new column on a table that already existed.'
                         else (select string_agg(k, ', ' order by k)
                                 from jsonb_object_keys(a.d #> '{change,patch}') k) end) as summary,
           coalesce(a.d ->> 'state', 'pending') as state,
           null::timestamptz as due_on,
           null::text as due_state,
           coalesce(a.d ->> 'state', 'pending') = 'pending' as actionable,
           nullif(a.d ->> 'requested_by', '')::uuid as requested_by,
           (select coalesce(nullif(u.raw_user_meta_data ->> 'display_name', ''),
                            nullif(u.raw_user_meta_data ->> 'full_name', ''),
                            split_part(u.email::text, '@', 1))::text
              from auth.users u where u.id = nullif(a.d ->> 'requested_by', '')::uuid) as requested_by_name,
           a.created_at as at,
           a.tid as table_id,
           (select coalesce(nullif(t.data ->> 'name', ''), 'a table')
              from custom.record t where t.organization_id = p_organization_id and t.id = a.tid) as table_name,
           case when coalesce(a.d ->> 'state', 'pending') <> 'pending' then a.who end as decided_by,
           case when coalesce(a.d ->> 'state', 'pending') <> 'pending' then
             (select coalesce(nullif(u.raw_user_meta_data ->> 'display_name', ''),
                              nullif(u.raw_user_meta_data ->> 'full_name', ''),
                              split_part(u.email::text, '@', 1))::text
                from auth.users u where u.id = a.who) end as decided_by_name,
           case when coalesce(a.d ->> 'state', 'pending') <> 'pending'
                then nullif(a.d ->> 'decided_at', '')::timestamptz end as decided_at,
           case when coalesce(a.d ->> 'state', 'pending') <> 'pending'
                then coalesce(nullif(a.d ->> 'outcome', ''), nullif(a.d ->> 'withdrawn_reason', '')) end as outcome,
           coalesce(a.d ->> 'state', 'pending') <> 'pending' as closed,
           a.updated_by as touched_by,
           a.version as item_version
      from approvals a
    union all
    select r.id, 'assignment', 'person',
           coalesce(custom._card_words(r.organization_id, r.data ->> coalesce(t.data ->> 'title_field', 'name'),
                                       lower(coalesce(nullif(t.data ->> 'label_singular', ''), 'record'))),
                    'Untitled'),
           r.id, 'record',
           format('%s · %s', coalesce(t.data ->> 'name', 'a table'), coalesce(s.data ->> 'name', 'no state')),
           coalesce(s.data ->> 'name', 'open'),
           nullif(r.data ->> 'due_date', '')::timestamptz,
           case when coalesce((s.data ->> 'terminal')::boolean, false) then 'finished'
                when nullif(r.data ->> 'due_date', '') is null                        then 'undated'
                when (r.data ->> 'due_date')::timestamptz <  date_trunc('day', now()) then 'overdue'
                when (r.data ->> 'due_date')::timestamptz <  date_trunc('day', now()) + interval '1 day'
                                                                                      then 'due_today'
                else 'scheduled' end,
           true,
           r.updated_by,
           (select coalesce(nullif(u.raw_user_meta_data ->> 'display_name', ''),
                            nullif(u.raw_user_meta_data ->> 'full_name', ''),
                            split_part(u.email::text, '@', 1))::text
              from auth.users u where u.id = r.updated_by),
           r.updated_at,
           r.table_id, t.data ->> 'name',
           null::uuid, null::text, null::timestamptz, null::text,
           coalesce((s.data ->> 'terminal')::boolean, false),
           r.updated_by,
           r.version
      from custom.record r
      join custom.record t
        on t.organization_id = r.organization_id
       and t.id = r.table_id
       and t.table_id = custom.table_kernel_id()
      left join custom.record s
        on s.organization_id = r.organization_id
       and s.id = custom.work_state_id(r.organization_id, r.table_id, r.data ->> 'status')
       and s.deleted_at is null
     where v_person is not null
       and r.organization_id = p_organization_id
       and r.deleted_at is null
       and r.data_class = 'record'
       -- compared as text: a hand-typed name in somebody's Assignee must not take the inbox down
       and r.data ->> 'assignee' = v_person::text
       and (coalesce(p_include_decided, false)
            or not coalesce((s.data ->> 'terminal')::boolean, false))
       and custom.has_visibility(p_user_id, 'record', r.id, 'viewer'::public.permission_level)
  )
  select i.item_id, i.kind, i.origin, i.title, i.subject_id, i.subject_kind, i.summary, i.state,
         i.due_on, i.due_state, i.actionable, i.requested_by, i.requested_by_name, i.at,
         i.table_id, i.table_name, i.decided_by, i.decided_by_name, i.decided_at, i.outcome,
         st.snoozed_until, st.cleared_at, st.reminded_at, st.woke_at,
         case when i.closed then 'closed'
              -- DONE STAYS DONE until somebody ELSE changes it (Superhuman: new activity brings a
              -- thread back) — a newer version of the item than the one she cleared, written by
              -- someone else. Her own edit to her own assignment does not.
              when st.cleared_at is not null
                   and not (i.item_version > coalesce(st.cleared_version, i.item_version)
                            and i.touched_by is distinct from p_user_id)
                then 'cleared'
              when st.snoozed_until is not null and st.snoozed_until > v_now then 'snoozed'
              else 'waiting' end,
         -- A SNOOZED ITEM COMES BACK AT THE TOP: it sorts by the moment it returned.
         case when st.snoozed_until is not null and st.snoozed_until <= v_now
                   and st.snoozed_until > i.at then st.snoozed_until
              else i.at end,
         i.touched_by, i.item_version
    from items i
    left join custom.inbox_item_state st
      on st.organization_id = p_organization_id
     and st.person_id = p_user_id
     and st.item_id = i.item_id;
end
$function$;

CREATE OR REPLACE FUNCTION custom.work_list(p_organization_id uuid DEFAULT NULL::uuid, p_flavour text DEFAULT 'mine'::text, p_include_finished boolean DEFAULT false, p_limit integer DEFAULT 100, p_offset integer DEFAULT 0)
 RETURNS TABLE(record_id uuid, table_id uuid, table_name text, title text, assignee_id uuid, assignee_name text, assignee_user_id uuid, due_on timestamp with time zone, due_state text, status text, terminal boolean, assigned_by uuid, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_me     uuid;
  v_person uuid;
  v_flav   text := lower(coalesce(nullif(btrim(p_flavour), ''), 'mine'));
  v_cap    integer;
  v_off    integer;
  v_need   integer;
  v_org    uuid;
  v_ceil   integer;
  v_chunk  integer;
  v_at     integer;
  v_got    integer;
  v_page   jsonb;
  v_all    jsonb := '[]'::jsonb;
begin
  -- NO ORGANIZATION NAMED = the optional organization FILTER left off (org-filter sweep,
  -- 2026-09-29; access-belongs-to-the-person): the work waiting on the caller in EVERY organization
  -- she belongs to. Each organization is asked through this same door with its name, so it meets its
  -- own wall and its own ladder below; this only adds the answers together. An organization whose
  -- wall refuses (42501) contributes nothing. No permission is changed by this branch.
  --
  -- PAGING ACROSS ORGANIZATIONS (lane ALL-ORGS-PAGING, 2026-10-01; the class DATA-HOME-3B2 found in
  -- custom.archived_tables_everywhere). The page after v_off can only come from each organization's
  -- own first v_cap + v_off rows, so that is all each one is asked for — in pages of at most its own
  -- ceiling (custom.page_ceiling), never in one ask past it: the old body asked every organization
  -- for v_cap + v_off rows at once, so any page past the ceiling was refused (22023 PAGE-1). An
  -- organization that answers a short page has nothing more and is not asked again.
  if p_organization_id is null then
    v_me  := custom.query_principal();
    v_cap := least(greatest(coalesce(p_limit, 100), 1), 1000);
    v_off := greatest(0, coalesce(p_offset, 0));
    v_need := v_cap + v_off;
    if v_me is null then
      return;
    end if;
    for v_org in
      select m.organization_id
        from iam.organization_member m
        join iam.organizations o on o.id = m.organization_id and o.archived_at is null
       where m.user_id = v_me
    loop
      begin
        v_ceil := greatest(coalesce(custom.page_ceiling(v_org), 500), 1);
        v_at := 0;
        loop
          v_chunk := least(v_need - v_at, v_ceil);
          exit when v_chunk < 1;
          select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb), count(*)
            into v_page, v_got
            from custom.work_list(v_org, p_flavour, p_include_finished, v_chunk, v_at) x;
          v_all := v_all || v_page;
          v_at := v_at + v_got;
          exit when v_got < v_chunk;
        end loop;
      exception when insufficient_privilege then
        continue;
      end;
    end loop;
    return query
      select w.record_id, w.table_id, w.table_name, w.title, w.assignee_id, w.assignee_name, w.assignee_user_id,
             w.due_on, w.due_state, w.status, w.terminal, w.assigned_by, w.updated_at
        from jsonb_to_recordset(v_all) as w(record_id uuid, table_id uuid, table_name text, title text, assignee_id uuid,
               assignee_name text, assignee_user_id uuid, due_on timestamptz, due_state text, status text,
               terminal boolean, assigned_by uuid, updated_at timestamptz)
       order by case when w.terminal then 2 when w.due_on is null then 1 else 0 end,
                w.due_on nulls last, w.updated_at desc, w.record_id
       limit v_cap offset v_off;
    return;
  end if;

  perform custom.assert_client_may_reach(p_organization_id, 'custom.work_list');
  if v_flav not in ('mine', 'assigned', 'unassigned') then
    raise exception 'There are three work lists: mine, assigned and unassigned, and "%" is none of them.', p_flavour
      using errcode = '22023',
            hint = '`mine` is what is waiting on you, `assigned` is what you gave to other people, `unassigned` is what is waiting on somebody being chosen.';
  end if;
  v_me := custom.query_principal();
  if v_me is null then
    return;
  end if;
  v_person := custom.work_person(p_organization_id, v_me, false);
  if v_flav = 'mine' and v_person is null then
    return;
  end if;

  return query
    select r.id,
           r.table_id,
           t.data ->> 'name',
           custom._card_words(r.organization_id, r.data ->> coalesce(t.data ->> 'title_field', 'name'),
                              lower(coalesce(nullif(t.data ->> 'label_singular', ''), 'record'))),
           p.id,
           p.data ->> 'name',
           nullif(p.data ->> 'user_id', '')::uuid,
           nullif(r.data ->> 'due_date', '')::timestamptz,
           case when coalesce((s.data ->> 'terminal')::boolean, false) then 'finished'
                when nullif(r.data ->> 'due_date', '') is null                        then 'undated'
                when (r.data ->> 'due_date')::timestamptz <  date_trunc('day', now()) then 'overdue'
                when (r.data ->> 'due_date')::timestamptz <  date_trunc('day', now()) + interval '1 day'
                                                                                      then 'due_today'
                else 'scheduled' end,
           s.data ->> 'name',
           coalesce((s.data ->> 'terminal')::boolean, false),
           r.updated_by,
           r.updated_at
      from custom.record r
      join custom.record t
        on t.organization_id = r.organization_id
       and t.id = r.table_id
       and t.table_id = custom.table_kernel_id()
      left join custom.record p
        on p.organization_id = r.organization_id
       -- a hand-typed name in somebody's Assignee must not take the list down (ALL-ORGS-PAGING:
       -- 22P02 "invalid input syntax for type uuid" refused the whole All-organizations list)
       and p.id = case when r.data ->> 'assignee' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then (r.data ->> 'assignee')::uuid end
       and p.table_id = custom.person_kernel_id()
      left join custom.record s
        on s.organization_id = r.organization_id
       and s.id = custom.work_state_id(r.organization_id, r.table_id, r.data ->> 'status')
       and s.deleted_at is null
     where r.organization_id = p_organization_id
       and r.deleted_at is null
       and r.data_class = 'record'
       and (coalesce(p_include_finished, false)
            or not coalesce((s.data ->> 'terminal')::boolean, false))
       and case v_flav
             when 'mine'       then case when r.data ->> 'assignee' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then (r.data ->> 'assignee')::uuid end = v_person
             when 'unassigned' then nullif(r.data ->> 'assignee', '') is null
                                and r.data ? 'status'
             else                   nullif(r.data ->> 'assignee', '') is not null
                                and case when r.data ->> 'assignee' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then (r.data ->> 'assignee')::uuid end is distinct from v_person
                                and r.updated_by = v_me
           end
       -- THE ONE LADDER, row by row. The candidate set is already narrow (one person's work
       -- inside one organization), so the per-row question is the honest one to ask here.
       and (custom.query_is_store_owner()
            or custom.has_visibility(v_me, 'record', r.id, 'viewer'::public.permission_level))
     order by case when coalesce((s.data ->> 'terminal')::boolean, false) then 2
                   when nullif(r.data ->> 'due_date', '') is null then 1 else 0 end,
              nullif(r.data ->> 'due_date', '')::timestamptz nulls last,
              r.updated_at desc, r.id
     -- the organization's own page ceiling (knob custom/page_size_ceiling), as custom.page_contract() says
     limit custom.page_size(p_organization_id, 'custom.work_list', p_limit, 100, null)
    offset greatest(0, coalesce(p_offset, 0));
end
$function$;

CREATE OR REPLACE FUNCTION custom._relation_names_resolve(p_organization_id uuid, p_target uuid, p_names text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_title text;
  v_me    uuid;
  v_keys  text[];
  v_pred  text;
  v_memo  text;
  v_out   jsonb;
begin
  if p_organization_id is null or p_target is null then
    return null;
  end if;
  select nullif(t.data ->> 'title_field', '') into v_title
    from custom.record t
   where t.organization_id = p_organization_id and t.id = p_target and t.deleted_at is null;
  if v_title is null then
    return null;
  end if;
  v_keys := array(select distinct k
                    from (select custom.relation_name_key(n) as k from unnest(coalesce(p_names, '{}'::text[])) n) x
                   where k is not null);
  if cardinality(v_keys) = 0 then
    return '{}'::jsonb;
  end if;

  -- WHO IS ASKING DECIDES WHAT CAN BE MATCHED: the read doors' own predicate for this person on
  -- this Table (custom.visible_predicate_sql), built once per transaction and seat — an import of
  -- 250 rows asks it once, not 250 times. The store's own lanes (no person) match every record.
  v_me := custom.query_principal();
  if v_me is null then
    v_pred := 'true';
  else
    v_memo := 'rnm:' || v_me::text || ':' || p_organization_id::text || ':' || p_target::text;
    v_pred := platform.memo_s_get(v_memo);
    if v_pred is null then
      v_pred := custom.visible_predicate_sql(v_me, p_organization_id, p_target, 'viewer'::public.permission_level, 'r');
      perform platform.memo_s_put(v_memo, v_pred);
    end if;
  end if;

  execute format($q$
    select coalesce(jsonb_object_agg(g.k, g.matches), '{}'::jsonb)
      from (select custom.relation_name_key(r.data ->> $3) as k,
                   jsonb_agg(jsonb_build_object('id', r.id, 'words', r.data ->> $3) order by r.created_at, r.id) as matches
              from custom.record r
             where r.organization_id = $1
               and r.table_id = $2
               and r.data_class = 'record'
               and r.deleted_at is null
               and custom.relation_name_key(r.data ->> $3) = any ($4)
               and (%s)
             group by 1) g
  $q$, v_pred)
    into v_out
    using p_organization_id, p_target, v_title, v_keys;
  return coalesce(v_out, '{}'::jsonb);
end
$function$;

CREATE OR REPLACE FUNCTION custom._record_outside_projection(p_record_id uuid, p_user uuid, p_level permission_level)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_row     custom.record;
  v_table   custom.record;
  v_visible text[];
  v_fields  jsonb;
  v_title   text;
  v_tf      text;
begin
  select r.* into v_row from custom.record r where r.id = p_record_id and r.deleted_at is null;
  if not found then return null; end if;
  -- An archived organization is closed to everyone until restored (access ladder T-33).
  if exists (select 1 from iam.organizations o where o.id = v_row.organization_id and o.archived_at is not null) then
    return null;
  end if;
  select t.* into v_table from custom.record t
   where t.id = v_row.table_id and t.table_id = custom.table_kernel_id()
     and t.data_class = 'table' and t.deleted_at is null;
  if not found then return null; end if;

  select coalesce(array_agg(f.field_key), '{}'::text[]) into v_visible
    from iam.visible_field_ids(p_user, v_row.organization_id, v_row.table_id,
                               coalesce(p_level, 'viewer'::public.permission_level), 'read') f;

  with fld as (
    select f.id, f.data, f.data ->> 'key' as k, f.data ->> 'type' as typ,
           coalesce((f.data ->> 'sort')::numeric, 0) as srt
      from custom.record f
     where f.organization_id = v_row.organization_id
       and f.table_id = custom.field_kernel_id()
       and f.deleted_at is null
       and (f.data ->> 'entity_definition_id')::uuid = v_row.table_id
       and (f.data ->> 'key') = any (v_visible)
       and coalesce(f.data ->> 'type', '') <> 'relation'
       and (p_user is not null
            or coalesce(f.data ->> 'sensitivity', 'internal') not in ('confidential', 'restricted'))
       and not exists (select 1 from custom.entity_protected_value pv
                        where pv.row_id = v_row.id and pv.field_id = f.id)
  ), val as (
    select fld.*, v_row.data -> fld.k as v,
           case when fld.typ = 'list' and nullif(fld.data #>> '{config,options_table_id}', '') is not null
                then custom.choice_options(v_row.organization_id, (fld.data #>> '{config,options_table_id}')::uuid)
           end as opts
      from fld
     where v_row.data ? fld.k
       and v_row.data -> fld.k is not null
       and v_row.data -> fld.k <> 'null'::jsonb
       and v_row.data -> fld.k <> '""'::jsonb
       and v_row.data -> fld.k <> '[]'::jsonb
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'key', val.k,
           'label', coalesce(nullif(val.data ->> 'label', ''), val.k),
           'type', val.typ,
           'unit', val.data ->> 'unit',
           'format', val.data ->> 'format',
           'value', case
             when val.opts is null then val.v
             when jsonb_typeof(val.v) = 'array' then
               (select coalesce(jsonb_agg(coalesce(val.opts -> (e #>> '{}') -> 'label', e)), '[]'::jsonb)
                  from jsonb_array_elements(val.v) e)
             else coalesce(val.opts -> (val.v #>> '{}') -> 'label', val.v)
           end) order by val.srt, val.k), '[]'::jsonb)
    into v_fields
    from val;

  -- The title is the row's own title field only when that field is served here; otherwise the
  -- Table's word for one row, so a withheld title never reaches the page through the heading.
  v_tf := v_table.data ->> 'title_field';
  if v_tf is not null then
    select e ->> 'value' into v_title
      from jsonb_array_elements(v_fields) e
     where e ->> 'key' = v_tf and jsonb_typeof(e -> 'value') in ('string', 'number')
     limit 1;
  end if;

  return jsonb_build_object(
    'id', v_row.id,
    'table', jsonb_build_object(
      'name', coalesce(v_table.data ->> 'name', 'Table'),
      'label_singular', coalesce(nullif(v_table.data ->> 'label_singular', ''), 'Record')),
    'title', coalesce(nullif(btrim(v_title), ''),
                      coalesce(nullif(v_table.data ->> 'label_singular', ''), 'Record')),
    'fields', v_fields,
    'updated_at', v_row.updated_at);
end
$function$;

CREATE OR REPLACE FUNCTION custom.io_relation_candidate(p_organization_id uuid, p_table_id uuid, p_words text[])
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_t      record;
  v_title  text;
  v_hits   integer;
  v_words  integer := cardinality(coalesce(p_words, array[]::text[]));
begin
  if v_words < 2 then
    return null;
  end if;
  for v_t in
    select r.id, r.data ->> 'title_field' as title_field
      from custom.record r
     where r.organization_id = p_organization_id
       and r.table_id = custom.table_kernel_id()
       and r.data_class = 'table'
       and r.deleted_at is null
       -- NULL MEANS "THIS TABLE DOES NOT EXIST YET", AND `r.id <> NULL` IS NULL, WHICH A
       -- WHERE TREATS AS FALSE — so this loop saw ZERO candidate tables for exactly the
       -- case the previous file opened, and the one arm that turns a flat file into a
       -- database answered "no" silently every time. The same NULL-comparison class the
       -- W3-MIG verdict found in custom.field_dependants. There is no table to exclude when
       -- there is no table.
       and (p_table_id is null or r.id <> p_table_id)
       and nullif(r.data ->> 'title_field', '') is not null
     order by r.created_at desc
     limit 40
  loop
    -- THE WALL, PER CANDIDATE. A Table this person cannot open is not a suggestion this
    -- person gets, and the refusal is swallowed here rather than ending the inference:
    -- "you may not see that one" is not an error in an answer about a file.
    begin
      perform custom.assert_may_know_table(p_organization_id, v_t.id, 'custom.io_relation_candidate');
    exception when others then
      continue;
    end;
    v_title := v_t.title_field;
    select count(distinct r.data ->> v_title) into v_hits
      from custom.record r
     where r.organization_id = p_organization_id
       and r.table_id = v_t.id
       and r.data_class = 'record'
       and r.deleted_at is null
       and r.data ->> v_title = any (p_words);
    if v_hits = v_words then
      return v_t.id;
    end if;
  end loop;
  return null;
end;
$function$;
