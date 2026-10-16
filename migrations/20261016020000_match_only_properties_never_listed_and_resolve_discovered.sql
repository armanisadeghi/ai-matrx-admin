-- based-on: social.brand_social_accounts(uuid) 5c587889257d0d15c96c3c6a18fcc3b7fc4eafee2f463b777236e3944ab82abc
-- based-on: social.brand_social_counts(uuid[]) e45b22adad6ee647852c57e2f67678adad639c47e029c207845e00a8457b7cdc
-- why: Arman's rule (2026-10-15/16): match-only items (Former, Ours but wrong, Misspelled, Broken link) are used for
--   matching only and never shown or used in marketing. A web.property whose link is dead carries status 'match_only'
--   (metadata.relation = {key:'broken_link', ...}); 'active' is the only marketing status.
--   1. The brand's Socials pages read social.brand_social_accounts / brand_social_counts, which listed EVERY live
--      property, so a broken YouTube link was still listed (and linked to /socials/youtube/<property>).
--      Both now read only status = 'active' properties (the same rule as relation-usage.ts / usage.py).
--      The rest of the sweep (every function reading web.property: seo.gsc_*, web.brand_archive_preview,
--      web.create_site, web.move_site_brand) is write paths or archive counts that must see every row; no views.
--   2. A pending discovered item whose URL is a property now kept for matching never sits in the review queue: it
--      resolves to that state (confirmed, resolved_property_id, relation_key). Both orders are covered — the
--      property turning match_only (AFTER trigger) and a later crawl writing the same URL again (BEFORE trigger).

create or replace function web.url_match_key(p_url text)
returns text
language sql
immutable
set search_path to ''
as $$
  select nullif(
    regexp_replace(
      regexp_replace(
        regexp_replace(lower(btrim(coalesce(p_url, ''))), '^[a-z][a-z0-9+.-]*://', ''),
        '^www\.', ''),
      '[?#].*$|/+$', ''),
    '')
$$;

create or replace function social.brand_social_accounts(p_brand_id uuid)
 returns table(row_key text, property_id uuid, platform text, handle text, url text, display_name text, property_status text, owner_kind text, owner_party_id uuid, owner_name text, trackable boolean, tracked_account_id uuid, tracked_role text, tracked_status text, tracked_label text, profile_id uuid, profile_handle text, profile_display_name text, profile_url text, avatar_url text, is_verified boolean, followers bigint, followers_observed_at timestamp with time zone, followers_30d_ago bigint, posts_tracked bigint, last_post_at timestamp with time zone, best_multiple_30d numeric, best_post_id_30d uuid, last_refreshed_at timestamp with time zone, avatar_file_id uuid)
 language sql
 stable
 set search_path to ''
as $function$
  with props as (
    select p.* from web.property p
    where p.brand_id = p_brand_id and p.deleted_at is null and p.status = 'active'
      and p.kind not in ('website','google_business_profile')
  ),
  tracked as (
    select t.* from social.tracked_account t
    where t.deleted_at is null
      and (t.property_id in (select id from props)
           or (t.brand_id = p_brand_id and t.role in ('own','client') and t.property_id is null))
  ),
  base as (
    select coalesce(p.id::text, 'tracked:' || t.id::text) as row_key, p.id as property_id,
           coalesce(p.kind, sp.platform) as platform, p.handle, coalesce(p.url, sp.profile_url) as url,
           p.display_name, p.status as property_status, coalesce(p.owner_kind, 'company') as owner_kind,
           p.owner_party_id, t.id as tracked_account_id, t.role as tracked_role, t.status as tracked_status,
           t.label as tracked_label, sp.id as profile_id, sp.handle as profile_handle,
           sp.display_name as profile_display_name, sp.profile_url, sp.avatar_url, sp.is_verified,
           sp.follower_count as profile_followers, sp.last_refreshed_at, sp.avatar_file_id
    from props p
    full join tracked t on t.property_id = p.id
    left join lateral (
      select s.* from social.social_profile s
      where (t.profile_id is not null and s.id = t.profile_id)
         or (t.id is null and p.id is not null and p.handle is not null and s.deleted_at is null
             and s.platform = p.kind and lower(s.handle) = lower(regexp_replace(p.handle, '^@', '')))
      order by (s.id = t.profile_id) desc nulls last, s.last_refreshed_at desc nulls last
      limit 1) sp on true
  )
  select b.row_key, b.property_id, b.platform, b.handle, b.url, b.display_name, b.property_status,
         b.owner_kind, b.owner_party_id, pa.display_name as owner_name,
         b.platform in ('tiktok','instagram','youtube','linkedin','facebook','x','threads','pinterest','reddit') as trackable,
         b.tracked_account_id, b.tracked_role, b.tracked_status, b.tracked_label,
         b.profile_id, b.profile_handle, b.profile_display_name, b.profile_url, b.avatar_url, b.is_verified,
         coalesce(snap.follower_count, b.profile_followers) as followers,
         snap.observed_at as followers_observed_at,
         snap30.follower_count as followers_30d_ago,
         coalesce(pst.posts_tracked, 0) as posts_tracked, pst.last_post_at,
         best.outlier_score as best_multiple_30d, best.post_id as best_post_id_30d,
         b.last_refreshed_at, b.avatar_file_id
  from base b
  left join crm.party pa on pa.id = b.owner_party_id and pa.deleted_at is null
  left join lateral (
    select s.follower_count, s.observed_at from social.profile_snapshot s
    where s.profile_id = b.profile_id and s.follower_count is not null
    order by s.observed_at desc limit 1) snap on b.profile_id is not null
  left join lateral (
    select s.follower_count from social.profile_snapshot s
    where s.profile_id = b.profile_id and s.follower_count is not null and s.observed_at <= now() - interval '30 days'
    order by s.observed_at desc limit 1) snap30 on b.profile_id is not null
  left join lateral (
    select count(*) as posts_tracked, max(po.posted_at) as last_post_at from social.post po
    where po.profile_id = b.profile_id and po.deleted_at is null) pst on b.profile_id is not null
  left join lateral (
    select st.outlier_score, st.post_id from social.post po
    join social.post_stat st on st.post_id = po.id
    where po.profile_id = b.profile_id and po.deleted_at is null
      and po.posted_at >= now() - interval '30 days' and st.outlier_score is not null
    order by st.outlier_score desc limit 1) best on b.profile_id is not null
  order by (b.owner_kind = 'person'), b.tracked_account_id is null, b.platform, b.handle nulls last;
$function$;

create or replace function social.brand_social_counts(p_brand_ids uuid[])
 returns table(brand_id uuid, accounts bigint, tracked bigint, company_accounts bigint, person_accounts bigint)
 language sql
 stable
 set search_path to ''
as $function$
  select p.brand_id,
         count(*) as accounts,
         count(*) filter (where exists (select 1 from social.tracked_account t
                                        where t.property_id = p.id and t.deleted_at is null)) as tracked,
         count(*) filter (where p.owner_kind = 'company') as company_accounts,
         count(*) filter (where p.owner_kind = 'person') as person_accounts
  from web.property p
  where p.brand_id = any(p_brand_ids) and p.deleted_at is null and p.status = 'active'
    and p.kind not in ('website','google_business_profile')
  group by p.brand_id;
$function$;

-- A property turning match_only resolves the brand's pending items for the same URL.
create or replace function web._resolve_discovered_for_match_only()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  if new.status = 'match_only' and new.deleted_at is null and web.url_match_key(new.url) is not null then
    update web.discovered_item d
       set status = 'confirmed',
           resolved_property_id = new.id,
           relation_key = coalesce(new.metadata -> 'relation' ->> 'key', d.relation_key),
           reviewed_at = now()
     where d.brand_id = new.brand_id and d.deleted_at is null and d.status = 'pending'
       and web.url_match_key(d.url) = web.url_match_key(new.url);
  end if;
  return null;
end
$$;

create or replace trigger resolve_discovered_for_match_only
  after insert or update of status, url on web.property
  for each row when (new.status = 'match_only')
  execute function web._resolve_discovered_for_match_only();

-- A crawl writing a URL that is already kept for matching never lands in the review queue.
create or replace function web._discovered_item_match_only_resolve()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_prop record;
begin
  if new.status = 'pending' and new.deleted_at is null and web.url_match_key(new.url) is not null then
    select p.id, p.metadata -> 'relation' ->> 'key' as rel_key into v_prop
      from web.property p
     where p.brand_id = new.brand_id and p.deleted_at is null and p.status = 'match_only'
       and web.url_match_key(p.url) = web.url_match_key(new.url)
     order by p.updated_at desc limit 1;
    if found then
      new.status := 'confirmed';
      new.resolved_property_id := v_prop.id;
      new.relation_key := coalesce(v_prop.rel_key, new.relation_key);
      new.reviewed_at := now();
    end if;
  end if;
  return new;
end
$$;

create or replace trigger discovered_item_match_only_resolve
  before insert on web.discovered_item
  for each row execute function web._discovered_item_match_only_resolve();

-- Backfill: pending items already matching a property kept for matching.
update web.discovered_item d
   set status = 'confirmed',
       resolved_property_id = p.id,
       relation_key = coalesce(p.metadata -> 'relation' ->> 'key', d.relation_key),
       reviewed_at = now()
  from web.property p
 where p.brand_id = d.brand_id and p.deleted_at is null and p.status = 'match_only'
   and d.deleted_at is null and d.status = 'pending'
   and web.url_match_key(p.url) is not null
   and web.url_match_key(d.url) = web.url_match_key(p.url);
