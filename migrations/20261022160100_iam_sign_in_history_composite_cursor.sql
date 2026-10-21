-- 20261022160100_iam_sign_in_history_composite_cursor.sql (admin user page nits, 2026-10-21).
--
-- admin.user_sign_ins paged on signed_in_at alone with "strictly before", so two sign-ins sharing one
-- instant could straddle a page edge and the second was skipped. The cursor is now the last row's
-- (signed_in_at, id): the order is (signed_in_at desc, id asc), so the next page is everything strictly
-- earlier, plus the same instant with a larger id. p_before_id null = the old time-only cursor.
-- Additive: a NEW function, admin.user_sign_ins_page (the 3-argument admin.user_sign_ins stays until its
-- retirement is a chair step; nothing in the app calls it after this commit).

create or replace function admin.user_sign_ins_page(
  p_user uuid, p_before timestamptz default null, p_limit integer default 50, p_before_id uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_limit int := least(greatest(coalesce(p_limit, 50), 1), 200);
  v_rows jsonb;
begin
  if coalesce(auth.role(), '') <> 'service_role' and session_user <> 'postgres'
     and not public.is_platform_admin() then
    raise exception 'admin.user_sign_ins_page: platform admins only' using errcode = '42501';
  end if;
  if p_user is null then
    raise exception 'admin.user_sign_ins_page: p_user is required' using errcode = '22004';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', x.id,
           'signed_in_at', x.signed_in_at,
           'method', x.method,
           'provider', x.provider,
           'aal', x.aal,
           'ip', host(x.ip),
           'user_agent', x.user_agent,
           'session_id', x.session_id,
           'session_live', exists (select 1 from auth.sessions s where s.id = x.session_id),
           'oauth_client', c.client_name,
           'seeded', x.metadata ? 'seeded_from') order by x.signed_in_at desc, x.id), '[]'::jsonb)
    into v_rows
    from (select e.* from iam.sign_in_event e
           where e.person_id = p_user
             and (p_before is null
                  or e.signed_in_at < p_before
                  or (p_before_id is not null and e.signed_in_at = p_before and e.id > p_before_id))
           order by e.signed_in_at desc, e.id
           limit v_limit + 1) x
    left join auth.oauth_clients c on c.id = x.oauth_client_id;
  return jsonb_build_object(
    'items', case when jsonb_array_length(v_rows) > v_limit then v_rows - v_limit else v_rows end,
    'has_more', jsonb_array_length(v_rows) > v_limit);
end;
$$;

comment on function admin.user_sign_ins_page(uuid, timestamptz, integer, uuid) is
  'One page (newest first) of a person''s sign-in history from iam.sign_in_event. Cursor = the last row''s (signed_in_at, id) so same-instant rows never skip. Platform admins only.';

insert into platform.client_callable_door
  (schema_name, function_name, identity_args, identity_argtypes, reason, declared_by, non_client_lane, signed_in_callers, anonymous_callers, gate_predicate, argument_rules)
values
  ('admin', 'user_sign_ins_page', 'p_user uuid, p_before timestamp with time zone, p_limit integer, p_before_id uuid',
   array['uuid'::regtype, 'timestamptz'::regtype, 'integer'::regtype, 'uuid'::regtype]::oid[],
   'READ. p_user is any auth user; the body refuses anyone but a platform admin (or the server) with 42501 and returns one page of that person''s sign-in history.',
   'migrations/20261022160100_iam_sign_in_history_composite_cursor.sql (admin user page nits)',
   null, true, false, 'public.is_platform_admin()',
   '{"version":1,"arguments":{"p_user":{"type":"uuid","position":1,"optional":false,"check":"public.is_platform_admin() (or the service role), decided before the first read","foreign":{"bounded":true,"note":"Any person; platform admins only."}},"p_before_id":{"type":"uuid","position":4,"optional":true,"check":"only compared against iam.sign_in_event.id of the p_user rows already allowed","foreign":{"bounded":true,"note":"A cursor: narrows the page, reads nothing by itself."}}}}'::jsonb)
on conflict do nothing;

grant execute on function admin.user_sign_ins_page(uuid, timestamptz, integer, uuid) to authenticated, service_role;
