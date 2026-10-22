-- based-on: audit.refresh_static() 8ec8be5811b55ce505ad2421e96464b36638ba1fb48d04b51af54bd1cc4ffcff
-- audit_stale_registry_ignores_retired_records.sql
--
-- audit.stale_registry counted 23 "stale" registry rows on 2026-10-22. 16 of them are the
-- registry's deliberate record of a RETIRED table: type = 'deprecated' and is_active = false,
-- whose table was dropped. That is the doctrine shape for a dead table, not drift. The check
-- now skips exactly those; an ACTIVE row whose table is missing (the real drift — e.g. the
-- seven context.* rows left active after the Scopes tables moved) is still reported.
-- Live body patched in place at a count-asserted anchor.

do $patch$
declare
  v_def    text;
  v_anchor text := E'  WHERE to_regclass(format(''%I.%I'',et.schema_name,et.table_name)) IS NULL\n';
  v_new    text := E'  WHERE to_regclass(format(''%I.%I'',et.schema_name,et.table_name)) IS NULL\n'
                || E'    AND NOT (et.type = ''deprecated'' AND NOT et.is_active)  -- a retired table''s record, not drift\n';
  v_n integer;
begin
  v_def := pg_get_functiondef('audit.refresh_static()'::regprocedure);
  v_n := (length(v_def) - length(replace(v_def, v_anchor, ''))) / length(v_anchor);
  if v_n <> 1 then raise exception 'anchor found % times, expected 1', v_n; end if;
  execute replace(v_def, v_anchor, v_new);
end $patch$;
