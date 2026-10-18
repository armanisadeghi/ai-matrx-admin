-- Inverse of migrations/campaign/template_gaps_e_a_seed_row_may_belong_to_the_installer.sql.
CREATE OR REPLACE FUNCTION custom._template_bind(p_args jsonb, p_ids jsonb, p_org uuid, p_today date, p_tz text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_text text := coalesce(p_args, '{}'::jsonb)::text;
  m      text[];
  v_val  text;
begin
  v_text := replace(v_text, '${org}', p_org::text);
  for m in select distinct regexp_matches(v_text, '\$\{(ref|new):([^}]+)\}', 'g') loop
    v_val := p_ids ->> (m[1] || ':' || m[2]);
    if v_val is null then
      raise exception 'The template uses "%" before any step made it, so it cannot be installed as written.', m[2]
        using errcode = '22023', hint = 'This is a fault in the template''s compiled plan: the step that saves this name must come first. Re-declare the template from its file.';
    end if;
    v_text := replace(v_text, '${' || m[1] || ':' || m[2] || '}', v_val);
  end loop;
  for m in select distinct regexp_matches(v_text, '\$\{date:([^}]+)\}', 'g') loop
    v_text := replace(v_text, '${date:' || m[1] || '}', custom._template_date(m[1], p_today, p_tz));
  end loop;
  return v_text::jsonb;
end;
$function$;
