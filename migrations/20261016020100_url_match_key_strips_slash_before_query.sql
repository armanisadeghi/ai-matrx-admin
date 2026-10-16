-- based-on: web.url_match_key(text) 6061727055945659cf34a0907b33b357c2ea91a52bba213e1457dce8a6c6f014
-- why: the first cut left a trailing slash that sat before the query ("/channel/UC.../?utm=x"); strip the query and
--   fragment first, then trailing slashes, so every spelling of one address has one key.
create or replace function web.url_match_key(p_url text)
returns text
language sql
immutable
set search_path to ''
as $$
  select nullif(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(lower(btrim(coalesce(p_url, ''))), '^[a-z][a-z0-9+.-]*://', ''),
          '^www\.', ''),
        '[?#].*$', ''),
      '/+$', ''),
    '')
$$;
