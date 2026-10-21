-- The org-admin member page reuses the platform user page's tabs (users one-roof → org admins,
-- Arman 2026-10-18). These are the org-scoped reads behind its Activity, Feedback and Admin history
-- tabs: every one starts with public.is_org_admin(p_org_id) and returns only rows of THAT
-- organization. Conversations, texts, sign-ins and account records never appear here (access ladder:
-- Private and account records have no standing org-admin read).

-- Activity: one keyset page across the org's sources, the same page shape as admin.user_activity
-- (items / next_before / next_before_key / sources) so features/admin/users/record/userActivity.ts
-- parses both. Order: at desc, key asc (C). Cursor: rows before next_before, plus rows AT it whose key
-- sorts after next_before_key.
create or replace function iam.org_admin_member_activity(
  p_org_id uuid,
  p_user_id uuid,
  p_before timestamptz default null,
  p_kinds text[] default null,
  p_limit integer default 50,
  p_before_key text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  c_kinds constant text[] := array['org_admin', 'run', 'feedback'];
  v_limit int := least(greatest(coalesce(p_limit, 50), 1), 200);
  v_before timestamptz := coalesce(p_before, 'infinity'::timestamptz);
  v_all jsonb := '[]'::jsonb;
  v_sources jsonb := '[]'::jsonb;
  v_branch jsonb;
  v_page jsonb;
  v_last jsonb;
  v_more boolean;
  k text;
begin
  if not public.is_org_admin(p_org_id) then
    raise exception 'Forbidden: organization admin required' using errcode = '42501';
  end if;
  if p_user_id is null then
    raise exception 'org_admin_member_activity: p_user_id is required' using errcode = '22004';
  end if;
  if p_before_key is not null and p_before is null then
    raise exception 'org_admin_member_activity: p_before_key needs p_before' using errcode = '22023';
  end if;

  foreach k in array coalesce(p_kinds, c_kinds) loop
    if not (k = any (c_kinds)) then
      v_sources := v_sources || jsonb_build_array(jsonb_build_object('kind', k, 'ok', false, 'error', 'unknown kind'));
      continue;
    end if;
    begin
      if k = 'org_admin' then
        -- This organization's audit rows about the person, and org-level actions they took.
        select coalesce(jsonb_agg(s.item), '[]'::jsonb) into v_branch from (
          select admin._user_activity_item(a.created_at, 'org_admin', a.id::text,
                   initcap(replace(replace(a.action, '_', ' '), '.', ' ')),
                   coalesce(a.detail->>'reason', a.metadata->>'reason'),
                   a.actor_user_id,
                   jsonb_build_object('type', 'admin_history', 'user_id', p_user_id)) as item
            from iam.org_admin_audit a
           where a.organization_id = p_org_id
             and (a.target_user_id = p_user_id or (a.actor_user_id = p_user_id and a.target_user_id is null))
             and (a.created_at < v_before or (a.created_at = v_before and (p_before_key is null
                  or ('org_admin:' || a.id::text) collate "C" > p_before_key collate "C")))
           order by a.created_at desc, ('org_admin:' || a.id::text) collate "C"
           limit v_limit + 1) s;
      elsif k = 'run' then
        -- Workflow runs they started in this organization (never one kept to its owner).
        select coalesce(jsonb_agg(s.item), '[]'::jsonb) into v_branch from (
          select admin._user_activity_item(w.created_at, 'run', w.id::text, 'Workflow run', w.status,
                   w.created_by, jsonb_build_object('type', 'workflow_run', 'id', w.id)) as item
            from workflow.run w
           where w.organization_id = p_org_id and w.created_by = p_user_id and w.deleted_at is null
             and w.shown_to is distinct from 'only_me'::platform.shown_to
             and (w.created_at < v_before or (w.created_at = v_before and (p_before_key is null
                  or ('run:' || w.id::text) collate "C" > p_before_key collate "C")))
           order by w.created_at desc, ('run:' || w.id::text) collate "C"
           limit v_limit + 1) s;
      else
        -- Feedback they filed while working in this organization.
        select coalesce(jsonb_agg(s.item), '[]'::jsonb) into v_branch from (
          select admin._user_activity_item(f.created_at, 'feedback', f.id::text, 'Feedback filed',
                   replace(coalesce(f.feedback_type, 'feedback'), '_', ' ') || ' · ' || coalesce(f.status, 'new'),
                   f.user_id, jsonb_build_object('type', 'feedback', 'id', f.id)) as item
            from users.user_feedback f
           where f.organization_id = p_org_id and f.user_id = p_user_id and f.deleted_at is null
             and (f.created_at < v_before or (f.created_at = v_before and (p_before_key is null
                  or ('feedback:' || f.id::text) collate "C" > p_before_key collate "C")))
           order by f.created_at desc, ('feedback:' || f.id::text) collate "C"
           limit v_limit + 1) s;
      end if;
      v_all := v_all || v_branch;
      v_sources := v_sources || jsonb_build_array(jsonb_build_object('kind', k, 'ok', true));
    exception when others then
      v_sources := v_sources || jsonb_build_array(jsonb_build_object('kind', k, 'ok', false, 'error', sqlerrm, 'code', sqlstate));
    end;
  end loop;

  select coalesce(jsonb_agg(x.e order by x.at desc, x.key collate "C"), '[]'::jsonb), count(*) > v_limit
    into v_page, v_more
    from (select e, (e->>'at')::timestamptz as at, e->>'key' as key
            from jsonb_array_elements(v_all) e
           order by (e->>'at')::timestamptz desc, (e->>'key') collate "C"
           limit v_limit + 1) x;
  if v_more then
    v_page := v_page - v_limit;
    v_last := v_page -> (v_limit - 1);
  end if;

  return jsonb_build_object(
    'items', v_page,
    'next_before', case when v_more then v_last->>'at' end,
    'next_before_key', case when v_more then v_last->>'key' end,
    'sources', v_sources);
end;
$function$;

-- Feedback the person filed in this organization, newest first, with the full count.
create or replace function iam.org_admin_member_feedback(p_org_id uuid, p_user_id uuid, p_limit integer default 200)
returns table(id uuid, feedback_type text, status text, description text, route text, priority text,
              created_at timestamptz, total bigint)
language plpgsql
stable
security definer
set search_path to ''
as $function$
begin
  if not public.is_org_admin(p_org_id) then
    raise exception 'Forbidden: organization admin required' using errcode = '42501';
  end if;
  return query
  select f.id, f.feedback_type::text, f.status::text, coalesce(f.description, '')::text, f.route::text,
         f.priority::text, f.created_at, count(*) over ()
    from users.user_feedback f
   where f.organization_id = p_org_id and f.user_id = p_user_id and f.deleted_at is null
   order by f.created_at desc
   limit least(greatest(coalesce(p_limit, 200), 1), 1000);
end;
$function$;

-- This organization's admin actions on the person (iam.org_admin_audit), newest first.
create or replace function iam.org_admin_member_audit(p_org_id uuid, p_user_id uuid, p_limit integer default 200)
returns table(id uuid, actor_user_id uuid, actor_email text, action text, detail jsonb, metadata jsonb,
              created_at timestamptz)
language plpgsql
stable
security definer
set search_path to ''
as $function$
begin
  if not public.is_org_admin(p_org_id) then
    raise exception 'Forbidden: organization admin required' using errcode = '42501';
  end if;
  return query
  select a.id, a.actor_user_id, u.email::text, a.action, a.detail, a.metadata, a.created_at
    from iam.org_admin_audit a
    left join auth.users u on u.id = a.actor_user_id
   where a.organization_id = p_org_id and a.target_user_id = p_user_id
   order by a.created_at desc
   limit least(greatest(coalesce(p_limit, 200), 1), 1000);
end;
$function$;


insert into platform.client_callable_door
  (schema_name, function_name, identity_args, identity_argtypes, reason, declared_by, non_client_lane, signed_in_callers, anonymous_callers, argument_rules)
values
  ('iam', 'org_admin_member_activity',
   'p_org_id uuid, p_user_id uuid, p_before timestamp with time zone, p_kinds text[], p_limit integer, p_before_key text',
   array['uuid'::regtype, 'uuid'::regtype, 'timestamptz'::regtype, 'text[]'::regtype, 'integer'::regtype, 'text'::regtype]::oid[],
   'Signed-in organization-admin door: the Activity tab of /organizations/<org>/admin/users/<id> (features/admin/users/record/userActivity.ts). p_org_id is checked by public.is_org_admin (caller must own/admin it; NULL fails); every row read is filtered to organization_id = p_org_id, so p_user_id only narrows inside that org.',
   '20261020120000_org_admin_member_record_reads', null, true, false,
   jsonb_build_object('version', 1, 'arguments', jsonb_build_object(
     'p_org_id', jsonb_build_object('type', 'uuid', 'position', 1, 'optional', false,
       'check', 'public.is_org_admin(p_org_id), decided before the first read',
       'foreign', jsonb_build_object('bounded', true, 'note', 'An organization the caller does not own or administer raises 42501 before any row is read.')),
     'p_user_id', jsonb_build_object('type', 'uuid', 'position', 2, 'optional', false,
       'check', 'filters rows already bounded to organization_id = p_org_id',
       'foreign', jsonb_build_object('bounded', true, 'note', 'Only narrows rows already limited to the organization the caller administers; another organization''s rows are never read.'))))),
  ('iam', 'org_admin_member_feedback', 'p_org_id uuid, p_user_id uuid, p_limit integer',
   array['uuid'::regtype, 'uuid'::regtype, 'integer'::regtype]::oid[],
   'Signed-in organization-admin door: the Feedback tab of the org member page (features/admin/users/record/UserSupportTab.tsx). p_org_id is checked by public.is_org_admin (NULL fails); rows are filtered to organization_id = p_org_id, p_user_id only narrows.',
   '20261020120000_org_admin_member_record_reads', null, true, false,
   jsonb_build_object('version', 1, 'arguments', jsonb_build_object(
     'p_org_id', jsonb_build_object('type', 'uuid', 'position', 1, 'optional', false,
       'check', 'public.is_org_admin(p_org_id), decided before the first read',
       'foreign', jsonb_build_object('bounded', true, 'note', 'An organization the caller does not own or administer raises 42501 before any row is read.')),
     'p_user_id', jsonb_build_object('type', 'uuid', 'position', 2, 'optional', false,
       'check', 'filters rows already bounded to organization_id = p_org_id',
       'foreign', jsonb_build_object('bounded', true, 'note', 'Only narrows rows already limited to the organization the caller administers; another organization''s rows are never read.'))))),
  ('iam', 'org_admin_member_audit', 'p_org_id uuid, p_user_id uuid, p_limit integer',
   array['uuid'::regtype, 'uuid'::regtype, 'integer'::regtype]::oid[],
   'Signed-in organization-admin door: the Admin history tab of the org member page (features/admin/users/record/UserHistoryTab.tsx). p_org_id is checked by public.is_org_admin (NULL fails); rows are this org''s iam.org_admin_audit only, p_user_id only narrows.',
   '20261020120000_org_admin_member_record_reads', null, true, false,
   jsonb_build_object('version', 1, 'arguments', jsonb_build_object(
     'p_org_id', jsonb_build_object('type', 'uuid', 'position', 1, 'optional', false,
       'check', 'public.is_org_admin(p_org_id), decided before the first read',
       'foreign', jsonb_build_object('bounded', true, 'note', 'An organization the caller does not own or administer raises 42501 before any row is read.')),
     'p_user_id', jsonb_build_object('type', 'uuid', 'position', 2, 'optional', false,
       'check', 'filters rows already bounded to organization_id = p_org_id',
       'foreign', jsonb_build_object('bounded', true, 'note', 'Only narrows rows already limited to the organization the caller administers; another organization''s rows are never read.')))));
