select set_config('request.jwt.claims', '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '87a6e699-3622-4869-8843-d0867456c0dd', true);
create temp table t_out (k text, v jsonb) on commit drop;
grant all on t_out to authenticated;
do $t$
declare v_src uuid := '7cd12da2-2213-4378-8fba-a9e2dc4ea657'; v_me uuid := '87a6e699-3622-4869-8843-d0867456c0dd'; v_note uuid; v_edge uuid;
begin
  insert into workbench.notes (organization_id, home_scope_id, label, content, created_by)
  values (v_src, '2645730c-97a9-4080-9471-2546d0ce2b66', 'Deposition prep notes', 'Witness list and exhibits.', v_me) returning id into v_note;
  insert into platform.associations (source_type, source_id, target_type, target_id, organization_id, created_by)
  values ('note', v_note, 'scope', '2f658029-7960-4fd5-a451-1e47c40a4746', v_src, v_me) returning id into v_edge;
  insert into t_out values ('ids', jsonb_build_object('note', v_note, 'edge', v_edge));
end $t$;
set local role authenticated;
do $t$
declare v_ids jsonb := (select v from t_out where k='ids'); v_note uuid := (v_ids->>'note')::uuid; v_p jsonb; v_c jsonb; v_tgt uuid := 'ef4b0d95-5ec3-4d8f-901b-d40e178a71df';
begin
  v_p := platform.change_records('move', 'note', array[v_note], v_tgt);
  insert into t_out values ('preview', jsonb_build_object('questions', v_p->'questions', 'warnings', v_p->'warnings', 'groups', v_p->'groups', 'total', v_p->'total_rows', 'mode', v_p->'mode'));
  insert into t_out values ('cancel', platform.change_records('move', 'note', array[v_note], v_tgt, null, '{"scope_link:assoc:scope":"cancel"}'::jsonb, false, v_p->>'fingerprint')
     || jsonb_build_object('org_after_cancel', (select organization_id from workbench.notes where id=v_note)));
  v_c := platform.change_records('move', 'note', array[v_note], v_tgt, null, '{}'::jsonb, false, v_p->>'fingerprint');
  insert into t_out values ('unanswered', v_c - 'groups' - 'roots' - 'questions' - 'warnings');
  v_c := platform.change_records('move', 'note', array[v_note], v_tgt, null, '{"scope_link:assoc:scope":"cut"}'::jsonb, false, v_p->>'fingerprint');
  insert into t_out values ('commit', v_c);
  insert into t_out values ('after', jsonb_build_object(
    'note', (select jsonb_build_object('org', organization_id, 'home', home_scope_id) from workbench.notes where id=v_note),
    'edge', (select jsonb_build_object('deleted', deleted_at is not null, 'via', deleted_via_type) from platform.associations where id=(v_ids->>'edge')::uuid)));
end $t$;
reset role;
insert into t_out select 'target_general', to_jsonb(platform.organization_general_scope('ef4b0d95-5ec3-4d8f-901b-d40e178a71df'));
select k, v from t_out;
