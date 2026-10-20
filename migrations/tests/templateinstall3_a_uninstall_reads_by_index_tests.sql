-- ============================================================
-- TEMPLATE-INSTALL-3 a/b - the reads an uninstall repeats for every row it archives are answered from an index, not by scanning every organization.
-- Read only, nothing written. Run: cd ../aidream && uv run python ~/lane-resume/ti3/runsql.py ../matrx-frontend/migrations/tests/templateinstall3_a_uninstall_reads_by_index_tests.sql
-- Red before templateinstall3_a/b: custom.home_relations() read every organization's records (about 550 ms a call; 33 calls = 18 s of one
-- uninstall's 40 s), platform.relation_delete_effects read the whole live target index for each record, and "which Tables are in these Homes"
-- worked out the containment parent of every Table record in the organization.
-- ============================================================
do $$
declare
  c_org constant uuid := '5dc930e9-bd65-44a1-8369-af773f6e1a5b';
  v_plan text; v_line text; v_t0 timestamptz; v_ms double precision; v_i integer;
begin
  -- a: the Home-relation read never scans custom.record
  v_plan := '';
  for v_line in execute 'explain select * from custom.home_relations()' loop v_plan := v_plan || v_line || E'\n'; end loop;
  -- the function body is its own plan; explain its statement the way the view's caller runs it
  v_plan := '';
  for v_line in execute $q$explain select r.id from custom.record r
       where r.deleted_at is null and r.data_class = 'relation' and r.data ->> 'kind' = 'referenced'
         and coalesce((r.data ->> 'carrying')::boolean, false) and r.data ->> 'role' = 'home'
         and r.data ->> 'from' is not null and r.data ->> 'to' is not null$q$ loop v_plan := v_plan || v_line || E'\n'; end loop;
  if v_plan ~ 'Seq Scan on record' then raise exception 'RED a1: the Home-relation read scans custom.record:%', E'\n' || v_plan; end if;
  v_t0 := clock_timestamp();
  for v_i in 1..5 loop perform count(*) from custom.home_relations(); end loop;
  v_ms := extract(epoch from clock_timestamp() - v_t0) * 1000 / 5;
  if v_ms > 250 then raise exception 'RED a2: custom.home_relations() took % ms a call (an index read is under 50; the scan was about 550)', round(v_ms); end if;

  -- a: "everything pointing at this record" reads its own index, not the whole live target index
  v_plan := '';
  for v_line in execute format($q$explain select a.id from platform.associations a
       where a.organization_id = %L and a.target_id = %L and a.relation_field_id is not null and a.deleted_at is null$q$, c_org, c_org) loop v_plan := v_plan || v_line || E'\n'; end loop;
  if v_plan !~ 'idx_assoc_target_relation_live' then raise exception 'RED a3: relation_delete_effects'' read does not use idx_assoc_target_relation_live:%', E'\n' || v_plan; end if;

  -- b: "which Tables are in these Homes" reads the containment index, not every Table record of the organization
  v_plan := '';
  for v_line in execute format($q$explain select * from custom.home h where h.organization_id = %L and h.home_record_id = any (array[%L::uuid])$q$, c_org, c_org) loop v_plan := v_plan || v_line || E'\n'; end loop;
  if v_plan ~ 'Seq Scan on record' or v_plan !~ 'containment_parent' then raise exception 'RED b1: the declared half of custom.home does not read its index:%', E'\n' || v_plan; end if;
  raise notice 'TEMPLATE-INSTALL-3 a/b index-read tests passed (home_relations % ms a call)', round(v_ms);
end
$$;
