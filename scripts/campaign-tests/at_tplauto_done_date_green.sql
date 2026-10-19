-- AT-TPLAUTO store proof: the spec a template "becomes" automation installs (property_edited to Done -> set date now),
-- declared, switched OFF (does nothing), switched ON (stamps today on Done only); and the "assigned" pair declares ok.
begin;
set local lock_timeout = '10s';
do $t$
declare
  c_admin constant uuid := '87a6e699-3622-4869-8843-d0867456c0dd';
  v_org uuid := gen_random_uuid(); v_home uuid; v_t uuid;
  f_status uuid; f_done uuid; f_who uuid; r1 uuid; v_res jsonb; v_a uuid; v_got text; v_day text;
begin
  perform set_config('app.actor_system', 'campaign-test/at-tplauto', true);
  perform set_config('request.jwt.claims', '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated"}', true);
  insert into iam.organizations (id, name, slug, abbreviation, created_by)
  values (v_org, 'Tplauto Board ' || substr(v_org::text,1,8), 'tplauto-board-' || substr(v_org::text,1,8), 'TPB', c_admin);
  insert into iam.memberships (organization_id, container_type, container_id, user_id, role, status) values (v_org, 'organization', v_org, c_admin, 'owner', 'active');
  insert into platform.knob_override (feature, key, scope_kind, scope_id, organization_id, value, set_note) values ('custom','system_enabled','organization',v_org,v_org,'true'::jsonb,'tplauto fixture');
  insert into custom.record (organization_id, table_id, data) values (v_org, null, jsonb_build_object('name','Home')) returning id into v_home;
  v_t := custom.table_declare(v_org, jsonb_build_object('name','Tasks','slug','tasks','type','entity','label_singular','Task','label_plural','Tasks','title_field','title','display','list','weight','light','ordered',true,'row_order','sorted','agent_writable',true,'retention_days',3650,
    'default_sort', jsonb_build_array(jsonb_build_object('field','title','direction','asc')),'parent_id',v_home::text,'fields',jsonb_build_array(jsonb_build_object('name','title'))));
  perform custom.field_declare(v_org, v_t, jsonb_build_object('key','title','label','Title','type','text','sort',10));
  f_status := custom.field_declare(v_org, v_t, jsonb_build_object('key','status','label','Status','type','select','sort',20,'options',jsonb_build_array('To do','Doing','Done')));
  f_done := custom.field_declare(v_org, v_t, jsonb_build_object('key','done_on','label','Done date','type','range','config',jsonb_build_object('kind','date'),'sort',30));
  f_who := custom.field_declare(v_org, v_t, jsonb_build_object('key','assignee','label','Assignee','type','member','sort',40));
  r1 := custom.record_write(v_org, v_t, jsonb_build_object('title','Paint the fence','status','To do'));
  perform set_config('role','authenticated',true);

  -- the exact spec payloads.ts automationSpecs() emits for "becomes"
  v_res := custom.automation_declare(v_org, v_t, jsonb_build_object('name','Set Done date when Done',
    'trigger', jsonb_build_object('on','property_edited','field',f_status,'to','Done'),
    'actions', jsonb_build_array(jsonb_build_object('do','set','values',jsonb_build_object(f_done::text, jsonb_build_object('now',true))))));
  if not (v_res->>'ok')::boolean then raise exception 'A1 declare refused: %', v_res; end if;
  v_a := (v_res->>'automation_id')::uuid;
  perform custom.automation_set_enabled(v_org, v_a, false);   -- born OFF, as the plan does
  perform custom.record_update(v_org, r1, jsonb_build_object('status','Done'));
  perform set_config('role','postgres',true);
  select data->>'done_on' into v_got from custom.record where id = r1;
  perform set_config('role','authenticated',true);
  if v_got is not null then raise exception 'A2 off automation still stamped: %', v_got; end if;
  perform custom.record_update(v_org, r1, jsonb_build_object('status','To do'));
  perform custom.automation_set_enabled(v_org, v_a, true);
  perform custom.record_update(v_org, r1, jsonb_build_object('status','Doing'));
  perform set_config('role','postgres',true);
  select data->>'done_on' into v_got from custom.record where id = r1;
  perform set_config('role','authenticated',true);
  if v_got is not null then raise exception 'A3 stamped on Doing: %', v_got; end if;
  perform custom.record_update(v_org, r1, jsonb_build_object('status','Done'));
  perform set_config('role','postgres',true);
  select data->>'done_on', to_char(now() at time zone coalesce(nullif(current_setting('custom.time_zone', true),''),'UTC'),'YYYY-MM-DD') into v_got, v_day from custom.record where id = r1;
  perform set_config('role','authenticated',true);
  if v_got is distinct from v_day then raise exception 'A4 Done should stamp % but wrote %', v_day, v_got; end if;
  raise notice 'A PASS — off does nothing; on stamps % only when Status becomes Done', v_got;

  -- the exact pair automationSpecs() emits for "assigned"
  v_res := custom.automation_declare(v_org, v_t, jsonb_build_object('name','Tell Assignee',
    'trigger', jsonb_build_object('on','property_edited','field',f_who),
    'actions', jsonb_build_array(jsonb_build_object('do','notify','to',jsonb_build_object('field',f_who),'text','You were set as Assignee on a task.'))));
  if not (v_res->>'ok')::boolean then raise exception 'B1 %', v_res; end if;
  v_res := custom.automation_declare(v_org, v_t, jsonb_build_object('name','Tell Assignee (new)','trigger',jsonb_build_object('on','row_added'),
    'actions', jsonb_build_array(jsonb_build_object('do','if','branches',jsonb_build_array(jsonb_build_object('label','Someone is assigned',
      'when',jsonb_build_object('all',jsonb_build_array(jsonb_build_object('value','{{trigger.'||f_who::text||'}}','is','not_empty'))),
      'actions',jsonb_build_array(jsonb_build_object('do','notify','to',jsonb_build_object('field',f_who),'text','You were set as Assignee on a task.'))))))));
  if not (v_res->>'ok')::boolean then raise exception 'B2 %', v_res; end if;
  raise notice 'B PASS — the assigned pair declares ok';
end $t$;
rollback;
