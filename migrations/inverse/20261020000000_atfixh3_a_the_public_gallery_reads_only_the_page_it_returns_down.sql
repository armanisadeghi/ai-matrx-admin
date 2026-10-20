-- inverse of 20261020000000_atfixh3_a_the_public_gallery_reads_only_the_page_it_returns: puts the prior live body back.
-- chair-step: AT-FIX-H3 undo - public.templates_public builds every card again before it cuts the page.
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
  v_out    jsonb;
  v_total  integer;
begin
  with latest as (
    select distinct on (t.catalogue_id) t.*
      from custom.template t
     where t.retired_at is null
       and t.scope = 'platform'
     order by t.catalogue_id, t.template_version desc
  ), picked as (
    select l.* from latest l
     where (f ->> 'catalogue_id' is null or l.catalogue_id = f ->> 'catalogue_id')
       and (f ->> 'slug' is null or l.spec ->> 'id' = f ->> 'slug')
       and (f ->> 'industry' is null or l.card ->> 'industry' = f ->> 'industry')
       and (f ->> 'job' is null or l.card ->> 'job' = f ->> 'job')
       and (f ->> 'teaches' is null or l.card ->> 'teaches' = f ->> 'teaches')
       and (f ->> 'kind' is null or (f ->> 'kind' = 'space') = (l.card ? 'space'))
       and (v_q is null or (coalesce(l.card ->> 'name', '') || ' ' || coalesce(l.card ->> 'persona', '') || ' '
                            || coalesce(l.card ->> 'vertical', '') || ' ' || coalesce(l.card ->> 'business', '')
                            || ' ' || coalesce(l.card -> 'space' ->> 'title', '') || ' ' || coalesce(l.card -> 'space' ->> 'description', '')) ilike '%' || v_q || '%')
  )
  select count(*)::integer,
         coalesce(jsonb_agg(c order by c ->> 'name') filter (where rn > v_offset and rn <= v_offset + v_limit), '[]'::jsonb)
    into v_total, v_out
    from (
      select row_number() over (order by p.card ->> 'name', p.catalogue_id) rn,
             jsonb_build_object(
               'id', p.id, 'catalogue_id', p.catalogue_id, 'version', p.template_version, 'scope', p.scope,
               'owner_organization_id', null,
               'slug', p.spec ->> 'id',
               'name', p.card ->> 'name', 'persona', p.card ->> 'persona',
               'business', p.card ->> 'business', 'vertical', p.card ->> 'vertical',
               'industry', p.card ->> 'industry', 'job', p.card ->> 'job', 'audience', p.card ->> 'audience',
               'teaches', p.card ->> 'teaches', 'strengths', coalesce(p.card -> 'strengths', '[]'::jsonb),
               'requires', coalesce(p.card -> 'requires', '[]'::jsonb),
               'footprint', p.card -> 'footprint', 'preview_image', p.card ->> 'previewImage',
               'install_door', 'custom.template_install',
               'space', p.card -> 'space',
               'thumb', case when v_thumb then public.template_public_thumb(p.spec) else null end,
               'installed', null) c
        from picked p
    ) x;
  return jsonb_build_object('total', v_total, 'limit', v_limit, 'offset', v_offset, 'cards', v_out);
end;
$function$;
