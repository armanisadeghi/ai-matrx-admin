-- chair-step: lane Q users one-roof — the one REVOKE takes default app privileges off a NEW machinery cache table (system tables carry no anon/authenticated access).
-- Users one-roof, adversarial fix lane Q (2026-10-18).
--   S10 admin.search_people(p_query, p_limit): ⌘K People and the user-search window ask the database for the
--       few people matching what was typed (email, name, display name or id) instead of loading the whole
--       roster. Trigram indexes: 20261018172100_lane_q_search_people_trgm_indexes.sql (CONCURRENTLY).
--   S11 admin.user_owned_resources_cache + admin.user_owned_resources_cached(p_user, p_shard, p_shards,
--       p_refresh): the Content tab's per-person census is computed once and kept (computed_at); the tab's
--       Refresh recomputes. System (machinery) table: read and written only through the definer door.

-- 1. S10 ------------------------------------------------------------------------------------------
create function admin.search_people(p_query text, p_limit integer default 8)
 returns table(id uuid, email text, name text, display_name text, is_anonymous boolean, rank integer)
 language plpgsql
 stable security definer
 set search_path to ''
as $function$
-- Every typed word must appear in the person's email, name (raw_user_meta_data full_name / name),
-- profile display name, or id. Candidates come from the longest word through the trigram indexes;
-- rank 0 = email or a name STARTS with the first word, 1 = id starts with it, 2 = contains.
declare
  v_words text[];
  v_probe text;
  v_limit int := least(greatest(coalesce(p_limit, 8), 1), 50);
begin
  if coalesce(auth.role(), '') <> 'service_role' and session_user <> 'postgres'
     and not public.is_platform_admin() then
    raise exception 'admin.search_people: platform admins only' using errcode = '42501';
  end if;
  select coalesce(array_agg(w), '{}') into v_words
    from regexp_split_to_table(lower(btrim(coalesce(p_query, ''))), '\s+') w where w <> '';
  if cardinality(v_words) = 0 then return; end if;
  select w into v_probe from unnest(v_words) w order by length(w) desc limit 1;

  return query
  with cand as (
    select u.id from auth.users u
     where lower(coalesce(u.email, '')) like '%' || v_probe || '%'
        or lower(coalesce(u.raw_user_meta_data->>'full_name', '') || ' ' || coalesce(u.raw_user_meta_data->>'name', ''))
           like '%' || v_probe || '%'
        or u.id::text like v_probe || '%'
    union
    select p.id from users.profiles p
     where lower(coalesce(p.display_name, '')) like '%' || v_probe || '%' and p.deleted_at is null
  ), hay as (
    select u.id, u.email::text as email,
           nullif(btrim(coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', '')), '') as name,
           nullif(btrim(p.display_name), '') as display_name,
           coalesce(u.is_anonymous, false) as is_anonymous,
           lower(concat_ws(' ', u.email, u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name',
                           p.display_name, u.id::text)) as h
      from cand c
      join auth.users u on u.id = c.id
      left join users.profiles p on p.id = u.id and p.deleted_at is null
  )
  select h.id, h.email, h.name, h.display_name, h.is_anonymous,
         case when lower(coalesce(h.email, '')) like v_words[1] || '%'
                or lower(coalesce(h.name, '')) like v_words[1] || '%'
                or lower(coalesce(h.display_name, '')) like v_words[1] || '%' then 0
              when h.id::text like v_words[1] || '%' then 1
              else 2 end as rank
    from hay h
   where (select bool_and(h.h like '%' || w || '%') from unnest(v_words) w)
   order by 6, coalesce(h.display_name, h.name, h.email, h.id::text)
   limit v_limit;
end $function$;

insert into platform.client_callable_door
  (schema_name, function_name, identity_args, identity_argtypes, reason, declared_by, non_client_lane, signed_in_callers, anonymous_callers, gate_predicate, argument_rules)
values
  ('admin', 'search_people', 'p_query text, p_limit integer',
   array['text'::regtype, 'integer'::regtype]::oid[],
   'READ. The body refuses anyone but a platform admin (or the server) with 42501 and returns up to p_limit people whose email, name, display name or id match the typed words.',
   'migrations/20261018172000_lane_q_search_people_and_owned_resources_cache.sql (users one-roof lane Q)',
   null, true, false, 'public.is_platform_admin()',
   '{"version":1,"arguments":{"p_query":{"type":"text","position":1,"optional":false,"foreign":{"not_an_id":true}},"p_limit":{"type":"integer","position":2,"optional":true,"foreign":{"not_an_id":true},"null_rule":{"means":"8 people"}}}}'::jsonb)
on conflict do nothing;
grant execute on function admin.search_people(text, integer) to authenticated, service_role;

-- 2. S11 ------------------------------------------------------------------------------------------
create table admin.user_owned_resources_cache (
  user_id uuid not null references iam.users(id) on delete cascade,
  shard integer not null,
  shards integer not null,
  body jsonb not null,
  computed_at timestamptz not null default now(),
  computed_by uuid,
  primary key (user_id, shards, shard)
);
comment on table admin.user_owned_resources_cache is
  'System (machinery) cache: one row per (person, shard) of admin.user_owned_resources_shard — the Content tab''s census, kept with computed_at and recomputed on Refresh. Read/written only through admin.user_owned_resources_cached.';
alter table admin.user_owned_resources_cache enable row level security;
revoke all on admin.user_owned_resources_cache from anon, authenticated;
insert into platform.entity_types (token, schema_name, table_name, label, audit_class, audit_class_reason, table_ref)
values ('admin_user_owned_resources_cache', 'admin', 'user_owned_resources_cache', 'Owned-resources census cache',
        'machinery', 'A recomputable cache of admin.user_owned_resources_shard results; no person reads it except through the definer door admin.user_owned_resources_cached.',
        'admin.user_owned_resources_cache'::regclass);

create function admin.user_owned_resources_cached(
  p_user uuid, p_shard integer, p_shards integer, p_refresh boolean default false)
 returns jsonb
 language plpgsql
 volatile security definer
 set search_path to ''
as $function$
-- The kept shard (with computed_at, cached=true) unless p_refresh or none is kept; then the shard is
-- computed by admin.user_owned_resources_shard (which refuses non-admins), stored, and returned (cached=false).
declare
  v_row admin.user_owned_resources_cache;
  v_body jsonb;
begin
  if coalesce(auth.role(), '') <> 'service_role' and session_user <> 'postgres'
     and not public.is_platform_admin() then
    raise exception 'admin.user_owned_resources_cached: platform admins only' using errcode = '42501';
  end if;
  if not coalesce(p_refresh, false) then
    select * into v_row from admin.user_owned_resources_cache c
     where c.user_id = p_user and c.shards = p_shards and c.shard = p_shard;
    if found then
      return v_row.body || jsonb_build_object('computed_at', v_row.computed_at, 'cached', true);
    end if;
  end if;
  v_body := admin.user_owned_resources_shard(p_user, p_shard, p_shards);
  insert into admin.user_owned_resources_cache as c (user_id, shard, shards, body, computed_at, computed_by)
  values (p_user, p_shard, p_shards, v_body, now(), auth.uid())
  on conflict (user_id, shards, shard) do update
    set body = excluded.body, computed_at = excluded.computed_at, computed_by = excluded.computed_by;
  return v_body || jsonb_build_object('computed_at', now(), 'cached', false);
end $function$;

insert into platform.client_callable_door
  (schema_name, function_name, identity_args, identity_argtypes, reason, declared_by, non_client_lane, signed_in_callers, anonymous_callers, gate_predicate, argument_rules)
values
  ('admin', 'user_owned_resources_cached', 'p_user uuid, p_shard integer, p_shards integer, p_refresh boolean',
   array['uuid'::regtype, 'integer'::regtype, 'integer'::regtype, 'boolean'::regtype]::oid[],
   'READ (+ cache write). p_user is any auth user; the body refuses anyone but a platform admin (or the server) with 42501 and returns one kept or freshly computed shard of what that person owns.',
   'migrations/20261018172000_lane_q_search_people_and_owned_resources_cache.sql (users one-roof lane Q)',
   null, true, false, 'public.is_platform_admin()',
   '{"version":1,"arguments":{"p_user":{"type":"uuid","position":1,"optional":false,"check":"public.is_platform_admin() (or the service role), decided before the first read","foreign":{"note":"Any person; platform admins only.","bounded":true}},"p_shard":{"type":"integer","position":2,"optional":false,"foreign":{"not_an_id":true}},"p_shards":{"type":"integer","position":3,"optional":false,"foreign":{"not_an_id":true}},"p_refresh":{"type":"boolean","position":4,"optional":true,"foreign":{"not_an_id":true},"null_rule":{"means":"use the kept census"}}}}'::jsonb)
on conflict do nothing;
grant execute on function admin.user_owned_resources_cached(uuid, integer, integer, boolean) to authenticated, service_role;
