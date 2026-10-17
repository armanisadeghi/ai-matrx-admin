-- additive: yes
--
-- It REPLACES one function body, `custom._template_bind(jsonb, jsonb, uuid, date, text)`, adding the token
-- `${installer}`. Inverse: migrations/inverse/template_gaps_e_a_seed_row_may_belong_to_the_installer_down.sql.
--
-- TEMPLATE-GAPS R3 (3) — "ASSIGNED TO ME" IS NOT EMPTY ON INSTALL. A pack's member column could not be seeded (no
-- person exists at authoring time), so every "me" view opened empty. @ai-matrx/records compiles a seed value
-- "@installer" to ${installer}; the install door fills it with the installing person.
--
-- based-on: custom._template_bind(jsonb, jsonb, uuid, date, text) 4099e773da90678d2ed67e819818031a507950c3840287a50e9a492a7c2f6daa

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
  -- TEMPLATE-GAPS R3 (3): "@installer" in a member column's seed — the person installing (their Person record in this
  -- organization, else their sign-in id; custom.rule_is_me answers both), so a "My tasks" view is not empty on install.
  if strpos(v_text, '${installer}') > 0 then
    v_val := null;
    begin
      v_val := custom.work_person(p_org, custom.query_principal(), false)::text;
    exception when others then
      v_val := null;
    end;
    v_val := coalesce(v_val, custom.query_principal()::text);
    if v_val is null then
      raise exception 'A sample row belongs to "@installer", and nobody is signed in to install it.' using errcode = '42501';
    end if;
    v_text := replace(v_text, '${installer}', v_val);
  end if;
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
