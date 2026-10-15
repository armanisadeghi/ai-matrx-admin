-- AT-SHARE / row 2 — A VIEWER ASKS FOR EDIT ACCESS ON A TABLE; THE OWNER APPROVES (grants Edit) OR DECLINES.
-- Uses the platform's one request primitive (public.access_request_*) on the entity token 'record' (tables and records are custom.record rows).
-- Seats: admin@admin.com (owner), test@test.com (a viewer from outside the organization).
do $green$
declare
  c_admin   constant uuid := '87a6e699-3622-4869-8843-d0867456c0dd';
  c_mara    constant uuid := '4060701e-706a-4c76-b3ca-0bbc69fa5a14';
  c_admin_j constant text := '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated"}';
  c_mara_j  constant text := '{"sub":"4060701e-706a-4c76-b3ca-0bbc69fa5a14","role":"authenticated"}';
  v_org uuid := gen_random_uuid(); v_home uuid; v_jobs uuid; v_rid uuid;
  v_req jsonb; v_id uuid; v_level text; v_list jsonb; v_dec jsonb; v_msg text;
begin
  perform set_config('app.actor_system', 'campaign.atshare.request', true);
  perform set_config('request.jwt.claims', c_admin_j, true);
  insert into iam.organizations (id, name, slug, abbreviation, created_by)
  values (v_org, 'AT-SHARE Request Fixture', 'at-request-fixture-' || substr(v_org::text,1,8), 'ATR', c_admin);
  insert into iam.memberships (organization_id, container_type, container_id, user_id, role, status)
  values (v_org, 'organization', v_org, c_admin, 'owner', 'active');
  insert into platform.knob_override (feature, key, scope_kind, scope_id, organization_id, value, set_note)
  values ('custom','system_enabled','organization',v_org,v_org,'true'::jsonb,'AT-SHARE fixture');
  insert into custom.record (organization_id, table_id, data) values (v_org, null, jsonb_build_object('name','ATR Home')) returning id into v_home;
  perform set_config('role','authenticated', true);
  v_jobs := custom.table_declare(v_org, jsonb_build_object('name','Jobs','slug','jobs','type','entity','display','list',
    'label_singular','Job','label_plural','Jobs','ordered',false,'weight','light','retention_days',365,'row_order','sorted',
    'agent_writable',true,'parent_id',v_home::text,'title_field','work_order','default_sort','[]'::jsonb,
    'fields', jsonb_build_array(jsonb_build_object('name','work_order'))));
  v_rid := custom.record_write(v_org, v_jobs, jsonb_build_object('work_order','ATR-1'));
  perform custom.share_grant(v_org, v_jobs, 'person', c_mara, 'viewer'::public.permission_level);

  -- CLAUSE 1 — the viewer asks for Edit on the table.
  perform set_config('request.jwt.claims', c_mara_j, true);
  v_req := public.access_request_create('record', v_jobs, 'editor', 'I keep the schedule.');
  v_id := (v_req->>'request_id')::uuid;
  if v_id is null or v_req->>'level' <> 'editor' then raise exception 'CLAUSE 1 FAILED: %', v_req; end if;
  if jsonb_array_length(coalesce(v_req->'recipients','[]'::jsonb)) < 1 then raise exception 'CLAUSE 1 FAILED: nobody was told: %', v_req; end if;
  raise notice 'CLAUSE 1 OK: request filed, % recipient(s)', jsonb_array_length(v_req->'recipients');

  -- CLAUSE 2 — the owner holds it in the inbox, and the viewer still reads at View.
  perform set_config('request.jwt.claims', c_admin_j, true);
  v_list := public.access_request_list('inbox');
  if not (v_list::text like '%' || v_id::text || '%') then raise exception 'CLAUSE 2 FAILED: the owner''s inbox does not hold the request: %', left(v_list::text, 400); end if;
  raise notice 'CLAUSE 2 OK: the owner''s inbox holds the request';

  -- CLAUSE 3 — approving grants Edit, at once.
  v_dec := public.access_request_decide(v_id, 'grant', 'editor', null);
  perform set_config('request.jwt.claims', c_mara_j, true);
  v_level := custom.my_level(v_org, v_jobs, 'table')::text;
  if v_level is distinct from 'editor' then raise exception 'CLAUSE 3 FAILED: level % after approve; decision %', v_level, v_dec; end if;
  raise notice 'CLAUSE 3 OK: approved, the viewer now holds %', v_level;

  -- CLAUSE 4 — a decline leaves access where it was, and the asker can see it was declined.
  perform set_config('request.jwt.claims', c_admin_j, true);
  perform custom.share_grant(v_org, v_jobs, 'person', c_mara, 'viewer'::public.permission_level);
  perform set_config('request.jwt.claims', c_mara_j, true);
  v_req := public.access_request_create('record', v_jobs, 'editor', 'Asking again.');
  v_id := (v_req->>'request_id')::uuid;
  perform set_config('request.jwt.claims', c_admin_j, true);
  v_dec := public.access_request_decide(v_id, 'decline', null, 'Not now.');
  perform set_config('request.jwt.claims', c_mara_j, true);
  v_level := custom.my_level(v_org, v_jobs, 'table')::text;
  if v_level is distinct from 'viewer' then raise exception 'CLAUSE 4 FAILED: level % after decline', v_level; end if;
  raise notice 'CLAUSE 4 OK: declined, the viewer still holds %: %', v_level, v_dec;

  -- CLAUSE 5 — a person with no right to decide cannot (the viewer cannot approve her own request).
  begin
    v_req := public.access_request_create('record', v_jobs, 'editor', 'Third ask.');
    perform public.access_request_decide((v_req->>'request_id')::uuid, 'grant', 'editor', null);
    raise exception 'CLAUSE 5 FAILED: the asker approved her own request';
  exception when insufficient_privilege then
    get stacked diagnostics v_msg = message_text; raise notice 'CLAUSE 5 OK: %', v_msg;
  end;
  raise notice 'AT-SHARE row 2 GREEN';
end;
$green$;
