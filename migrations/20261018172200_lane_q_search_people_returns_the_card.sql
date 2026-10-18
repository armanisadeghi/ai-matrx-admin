-- chair-step: lane Q users one-roof — DROP + re-create admin.search_people (new today, 20261018172000) with the person card the user-search window shows (avatar, phone, admin level, organizations, dates); a return-type change CREATE OR REPLACE cannot make.
-- based-on: admin.search_people(text, integer) 16720a96178444b355642aac5e699f9be9dcb2adaaca9e28a129fcde7e6faa97
-- Users one-roof lane Q (2026-10-18), S10.
drop function admin.search_people(text, integer);

create function admin.search_people(p_query text, p_limit integer default 8)
 returns table(id uuid, email text, name text, display_name text, avatar_url text, phone text, admin_level text,
               organizations text[], created_at timestamptz, last_sign_in_at timestamptz, is_anonymous boolean,
               rank integer)
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
           nullif(btrim(p.avatar_url), '') as avatar_url,
           nullif(btrim(u.phone), '') as phone,
           a.level::text as admin_level,
           u.created_at, u.last_sign_in_at,
           coalesce(u.is_anonymous, false) as is_anonymous,
           lower(concat_ws(' ', u.email, u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name',
                           p.display_name, u.id::text)) as h
      from cand c
      join auth.users u on u.id = c.id
      left join users.profiles p on p.id = u.id and p.deleted_at is null
      left join admin.admins a on a.user_id = u.id
  )
  select h.id, h.email, h.name, h.display_name, h.avatar_url, h.phone, h.admin_level,
         coalesce((select array_agg(o.name::text order by o.name)
                     from iam.memberships m join iam.organizations o on o.id = m.container_id
                    where m.user_id = h.id and m.container_type = 'organization' and m.deleted_at is null
                      and m.status = 'active'), '{}'::text[]),
         h.created_at, h.last_sign_in_at, h.is_anonymous,
         case when lower(coalesce(h.email, '')) like v_words[1] || '%'
                or lower(coalesce(h.name, '')) like v_words[1] || '%'
                or lower(coalesce(h.display_name, '')) like v_words[1] || '%' then 0
              when h.id::text like v_words[1] || '%' then 1
              else 2 end as rank
    from hay h
   where (select bool_and(h.h like '%' || w || '%') from unnest(v_words) w)
   order by 12, coalesce(h.display_name, h.name, h.email, h.id::text)
   limit v_limit;
end $function$;

grant execute on function admin.search_people(text, integer) to authenticated, service_role;
