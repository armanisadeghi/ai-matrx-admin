-- AT-PRINT grant check: a signed-in person can call the door the Print-with-layout dialog uses (docRenderBody -> custom.doc_render_body).
-- RED before atprint_a (authenticated could not execute it); GREEN after.
do $$ begin
  if not has_function_privilege('authenticated', 'custom.doc_render_body(uuid,uuid,uuid)', 'execute') then
    raise exception 'RED: authenticated cannot execute custom.doc_render_body, so Print with layout draws every page as "no access"';
  end if;
  raise notice 'GREEN: custom.doc_render_body is callable by authenticated';
end $$;
