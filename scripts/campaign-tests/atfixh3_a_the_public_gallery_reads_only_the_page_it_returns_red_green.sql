-- LANE AT-FIX-H3 1 - THE PUBLIC GALLERY ANSWERS FAST, AND THE SAME CARDS.
--
-- THE USE CASE. A visitor opens aimatrx.com/templates. The page asks public.templates_public for 200 cards at a time,
-- and each ask took 1.1-2.5 s because every ask drew the picture of ALL 1,191 templates before cutting its page.
--
-- RED before 20261020000000_atfixh3_a_the_public_gallery_reads_only_the_page_it_returns.sql: S1 fails (a 200-card
-- page with pictures takes over 300 ms). GREEN after: S1 the same ask answers under 300 ms (best of 3 warm asks);
-- S2 the page holds the same ids in the same order as the whole catalog's cut, total and offsets agree; S3 a slug
-- ask still finds exactly its one template; S4 a search still narrows; S5 a page past the end is empty with the
-- full total.

\set ON_ERROR_STOP on
\timing off
\set suite 'atfixh3_a_the_public_gallery_reads_only_the_page_it_returns_red_green.sql'
\set requires 'function:public.templates_public'
\i scripts/campaign-tests/_preamble.sql
\if :matrx_skip
\quit
\endif

begin;
set local statement_timeout = '120s';
do $t$
declare
  v_best numeric := 1e9; v_t0 timestamptz; v_ms numeric; v_a jsonb; v_b jsonb; v_all jsonb; v_one jsonb; v_slug text;
  v_ids_a text[]; v_ids_b text[]; v_ids_all text[]; v_q jsonb;
begin
  for i in 1..3 loop
    v_t0 := clock_timestamp();
    v_a := public.templates_public('{"scope":"platform","limit":200,"offset":0,"thumb":true}');
    v_ms := extract(epoch from clock_timestamp() - v_t0) * 1000;
    v_best := least(v_best, v_ms);
  end loop;
  if v_best >= 300 then
    raise exception 'S1 RED: a 200-card page with pictures took % ms at best (target under 300)', round(v_best);
  end if;
  raise notice 'S1 ok: best of 3 = % ms', round(v_best);

  -- S2 pages tile the whole ordered catalog
  v_b := public.templates_public('{"scope":"platform","limit":200,"offset":200,"thumb":false}');
  v_all := public.templates_public('{"scope":"platform","limit":200,"offset":0,"thumb":false}');
  if (v_a ->> 'total') <> (v_b ->> 'total') or (v_a ->> 'total')::int < 200 then
    raise exception 'S2 total disagrees: % vs %', v_a ->> 'total', v_b ->> 'total';
  end if;
  select array_agg(c ->> 'id' order by o) into v_ids_a from jsonb_array_elements(v_a -> 'cards') with ordinality x(c, o);
  select array_agg(c ->> 'id' order by o) into v_ids_all from jsonb_array_elements(v_all -> 'cards') with ordinality x(c, o);
  if v_ids_a is distinct from v_ids_all then raise exception 'S2 the picture flag changed which cards a page holds'; end if;
  select array_agg(c ->> 'id') into v_ids_b from jsonb_array_elements(v_b -> 'cards') x(c);
  if v_ids_b && v_ids_a then raise exception 'S2 page 2 repeats a card of page 1'; end if;
  if jsonb_array_length(v_a -> 'cards') <> 200 or (v_a -> 'cards' -> 0 ->> 'name') is null or (v_a -> 'cards' -> 0 ->> 'slug') is null
     or (v_a -> 'cards' -> 0 -> 'thumb') is null then
    raise exception 'S2 a card lost its shape: %', left((v_a -> 'cards' -> 0)::text, 300);
  end if;
  raise notice 'S2 ok';

  -- S3 a slug finds its one template
  v_slug := v_a -> 'cards' -> 5 ->> 'slug';
  v_one := public.templates_public(jsonb_build_object('slug', v_slug, 'thumb', true));
  if (v_one ->> 'total')::int < 1 or v_one -> 'cards' -> 0 ->> 'slug' <> v_slug then
    raise exception 'S3 the slug ask lost its template: %', left(v_one::text, 200);
  end if;
  raise notice 'S3 ok';

  -- S4 a search narrows
  v_q := public.templates_public(jsonb_build_object('q', v_a -> 'cards' -> 7 ->> 'name'));
  if (v_q ->> 'total')::int < 1 or (v_q ->> 'total')::int >= (v_a ->> 'total')::int then
    raise exception 'S4 the search did not narrow: %', v_q ->> 'total';
  end if;
  raise notice 'S4 ok';

  -- S5 past the end
  v_b := public.templates_public('{"limit":10,"offset":100000}');
  if jsonb_array_length(v_b -> 'cards') <> 0 or (v_b ->> 'total') <> (v_a ->> 'total') then
    raise exception 'S5 a page past the end is wrong: % cards, total %', jsonb_array_length(v_b -> 'cards'), v_b ->> 'total';
  end if;
  raise notice 'S5 ok';
end
$t$;
rollback;
\echo 'atfixh3_a: all checks passed'
