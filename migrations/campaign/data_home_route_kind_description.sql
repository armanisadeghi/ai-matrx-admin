-- chair-step: align the Data assistant offer description with the single live /data route.
-- lane: ONE-HOME
begin;

do $migration$
declare
  v_count integer;
  v_old constant text := '/data-v2/<table>';
  v_new constant text := '/data/<table>';
begin
  update content_ir.kind_definition
     set emitted_json_schema = replace(emitted_json_schema::text, v_old, v_new)::jsonb
   where kind = 'data.build_or_ask.offer'
     and is_active
     and deleted_at is null
     and emitted_json_schema::text like '%' || v_old || '%';
  get diagnostics v_count = row_count;
  if v_count <> 1 then
    raise exception 'data_home_route_kind_description: expected one active offer schema, updated %', v_count;
  end if;
end
$migration$;

commit;
