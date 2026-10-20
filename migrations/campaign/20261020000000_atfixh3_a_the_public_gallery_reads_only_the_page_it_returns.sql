-- lane: AT-FIX-H3
-- additive: yes
-- NOTE: it REPLACES one live body, public.templates_public, with the same answer built cheaper. No knob can hold a pure read-speed
--   change of a public read door off (the door has no switch; an OFF state would be the slow body), so it carries no `-- guard:` line. Nothing is dropped,
--   granted or revoked and no row is touched. Inverse: migrations/inverse/20261020000000_atfixh3_a_the_public_gallery_reads_only_the_page_it_returns_down.sql.
-- lock: none
-- based-on: public.templates_public(jsonb) c3cf553079364ae6c17800fb8a244b02a694af2a52916b329e9aeee66d483f06
--
-- AT-FIX-H3 1 - public.templates_public took 1.1-2.5 s a call. EXPLAIN: picking the newest version of each of the
-- 1,191 platform templates costs 3 ms (index only), but the card list built EVERY row's card - including its slug
-- (a read of the 14 KB spec) and the picture drawn from the spec (template_public_thumb) - and only then cut the
-- page with a FILTER, so a 200-card page paid for all 1,191 pictures. Now the page is cut first (row_number over the
-- small card column), and only the rows of that page read their spec. The slug filter reads the spec only when it is
-- asked. The answer's shape, order and totals are unchanged.
CREATE OR REPLACE FUNCTION public.templates_public(p_filter jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  f        jsonb := coalesce(p_filter, '{}'::jsonb);
  v_limit  integer := least(greatest(coalesce((f ->> 'limit')::integer, 60), 1), 200);
  v_offset integer := greatest(coalesce((f ->> 'offset')::integer, 0), 0);
  v_q      text := nullif(btrim(f ->> 'q'), '');
  v_thumb  boolean := coalesce((f ->> 'thumb')::boolean, false);
  v_slug   text := f ->> 'slug';
  v_out    jsonb;
  v_total  integer;
begin
  with latest as (
    select distinct on (t.catalogue_id) t.id, t.catalogue_id, t.template_version, t.card
      from custom.template t
     where t.retired_at is null
       and t.scope = 'platform'
     order by t.catalogue_id, t.template_version desc
  ), picked as (
    select l.* from latest l
     where (f ->> 'catalogue_id' is null or l.catalogue_id = f ->> 'catalogue_id')
       and (v_slug is null or (select s.spec ->> 'id' from custom.template s where s.id = l.id) = v_slug)
       and (f ->> 'industry' is null or l.card ->> 'industry' = f ->> 'industry')
       and (f ->> 'job' is null or l.card ->> 'job' = f ->> 'job')
       and (f ->> 'teaches' is null or l.card ->> 'teaches' = f ->> 'teaches')
       and (f ->> 'kind' is null or (f ->> 'kind' = 'space') = (l.card ? 'space'))
       and (v_q is null or (coalesce(l.card ->> 'name', '') || ' ' || coalesce(l.card ->> 'persona', '') || ' '
                            || coalesce(l.card ->> 'vertical', '') || ' ' || coalesce(l.card ->> 'business', '')
                            || ' ' || coalesce(l.card -> 'space' ->> 'title', '') || ' ' || coalesce(l.card -> 'space' ->> 'description', '')) ilike '%' || v_q || '%')
  ), numbered as (
    select p.*, row_number() over (order by p.card ->> 'name', p.catalogue_id) rn, count(*) over () total
      from picked p
  ), page as (
    select n.* from numbered n where n.rn > v_offset and n.rn <= v_offset + v_limit
  )
  select coalesce((select max(n.total) from numbered n), 0)::integer,
         coalesce(jsonb_agg(
           jsonb_build_object(
             'id', p.id, 'catalogue_id', p.catalogue_id, 'version', p.template_version, 'scope', 'platform',
             'owner_organization_id', null,
             'slug', t.spec ->> 'id',
             'name', p.card ->> 'name', 'persona', p.card ->> 'persona',
             'business', p.card ->> 'business', 'vertical', p.card ->> 'vertical',
             'industry', p.card ->> 'industry', 'job', p.card ->> 'job', 'audience', p.card ->> 'audience',
             'teaches', p.card ->> 'teaches', 'strengths', coalesce(p.card -> 'strengths', '[]'::jsonb),
             'requires', coalesce(p.card -> 'requires', '[]'::jsonb),
             'footprint', p.card -> 'footprint', 'preview_image', p.card ->> 'previewImage',
             'install_door', 'custom.template_install',
             'space', p.card -> 'space',
             'thumb', case when v_thumb then public.template_public_thumb(t.spec) else null end,
             'installed', null) order by p.rn), '[]'::jsonb)
    into v_total, v_out
    from page p
    join custom.template t on t.id = p.id;
  return jsonb_build_object('total', v_total, 'limit', v_limit, 'offset', v_offset, 'cards', v_out);
end;
$function$;
