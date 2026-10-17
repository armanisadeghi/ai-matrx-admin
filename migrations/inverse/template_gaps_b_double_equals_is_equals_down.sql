-- Inverse of migrations/campaign/template_gaps_b_double_equals_is_equals.sql: the tokenizer without `==`.
CREATE OR REPLACE FUNCTION custom._fxp_tokens(p_src text)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_out   jsonb := '[]'::jsonb;
  i       integer := 1;
  j       integer;
  n       integer := char_length(p_src);
  ch      text;
  v_txt   text;
  v_q     text;
  v_closed boolean;
  v_dot   boolean;
  v_two   text;
begin
  -- The tokenizer of formulas.ts, character for character. Positions are 0-based, as there.
  while i <= n loop
    ch := substr(p_src, i, 1);
    if ch ~ '\s' then
      i := i + 1;
      continue;
    end if;
    if ch = '{' then
      j := strpos(substr(p_src, i + 1), '}');
      if j = 0 then
        raise exception 'This column reference is missing its closing brace `}`.' using errcode = '22023', detail = (i - 1)::text;
      end if;
      v_txt := btrim(substr(p_src, i + 1, j - 1));
      if v_txt = '' then
        raise exception 'This column reference has no name inside `{}`.' using errcode = '22023', detail = (i - 1)::text;
      end if;
      v_out := v_out || jsonb_build_array(jsonb_build_object('t', 'reference', 'x', v_txt, 'p', i - 1));
      i := i + j + 1;
      continue;
    end if;
    if ch in ('"', '''') then
      v_q := ch; j := i + 1; v_txt := ''; v_closed := false;
      while j <= n loop
        if substr(p_src, j, 1) = '\' and j + 1 <= n then
          v_txt := v_txt || substr(p_src, j + 1, 1); j := j + 2; continue;
        end if;
        if substr(p_src, j, 1) = v_q then
          v_closed := true; j := j + 1; exit;
        end if;
        v_txt := v_txt || substr(p_src, j, 1); j := j + 1;
      end loop;
      if not v_closed then
        raise exception 'This text is missing its closing % quote.', case when v_q = '"' then 'double' else 'single' end
          using errcode = '22023', detail = (i - 1)::text;
      end if;
      v_out := v_out || jsonb_build_array(jsonb_build_object('t', 'string', 'x', v_txt, 'p', i - 1));
      i := j;
      continue;
    end if;
    if ch ~ '[0-9]' or (ch = '.' and substr(p_src, i + 1, 1) ~ '[0-9]') then
      j := i; v_dot := false;
      while j <= n loop
        if substr(p_src, j, 1) ~ '[0-9]' then j := j + 1; continue; end if;
        if substr(p_src, j, 1) = '.' and not v_dot then v_dot := true; j := j + 1; continue; end if;
        exit;
      end loop;
      v_out := v_out || jsonb_build_array(jsonb_build_object('t', 'number', 'x', substr(p_src, i, j - i), 'p', i - 1));
      i := j;
      continue;
    end if;
    if ch ~ '[A-Za-z_]' then
      j := i;
      while j <= n and substr(p_src, j, 1) ~ '[A-Za-z0-9_]' loop j := j + 1; end loop;
      v_out := v_out || jsonb_build_array(jsonb_build_object('t', 'identifier', 'x', substr(p_src, i, j - i), 'p', i - 1));
      i := j;
      continue;
    end if;
    if ch in ('(', ')', ',') then
      v_out := v_out || jsonb_build_array(jsonb_build_object(
        't', case ch when '(' then 'paren-open' when ')' then 'paren-close' else 'comma' end, 'x', ch, 'p', i - 1));
      i := i + 1;
      continue;
    end if;
    v_two := substr(p_src, i, 2);
    if v_two in ('!=', '<>', '<=', '>=') then
      v_out := v_out || jsonb_build_array(jsonb_build_object('t', 'operator', 'x', v_two, 'p', i - 1));
      i := i + 2;
      continue;
    end if;
    if ch in ('+', '-', '*', '/', '%', '&', '=', '<', '>') then
      v_out := v_out || jsonb_build_array(jsonb_build_object('t', 'operator', 'x', ch, 'p', i - 1));
      i := i + 1;
      continue;
    end if;
    raise exception '`%` does not mean anything in a formula.', ch using errcode = '22023', detail = (i - 1)::text;
  end loop;
  return v_out || jsonb_build_array(jsonb_build_object('t', 'end', 'x', '', 'p', char_length(p_src)));
end
$function$;
