-- LANE DEFECTS - the shared fixture of its suites. \i it INSIDE the suite's own `begin; ... rollback;`
-- after the preamble; it leaves nothing behind.
--
-- THE USE CASE. Ridgeback Dispatch (synthesized): the owner (admin@admin.com) tracks Jobs - a Work order #
-- that has to be different on every job, a Status choice (Waiting / Done) and two numbers.
-- Leaves the ids in the temp table `dj` (k, v): org, home, jobs.
create temp table dj (k text primary key, v uuid) on commit drop;
grant select on dj to authenticated;
do $fixture$
declare
  c_admin   constant uuid := '87a6e699-3622-4869-8843-d0867456c0dd';
  c_admin_j constant text := '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated"}';
  v_org uuid := gen_random_uuid(); v_home uuid; v_jobs uuid;
begin
  perform set_config('app.actor_system', 'campaign-test/defects', true);
  perform set_config('request.jwt.claims', c_admin_j, true);
  insert into iam.organizations (id, name, slug, abbreviation, created_by)
  values (v_org, 'Ridgeback Dispatch ' || substr(v_org::text, 1, 8), 'ridgeback-defects-' || substr(v_org::text, 1, 8), 'RBD', c_admin);
  insert into iam.memberships (organization_id, container_type, container_id, user_id, role, status) values
    (v_org, 'organization', v_org, c_admin, 'owner', 'active');
  insert into platform.knob_override (feature, key, scope_kind, scope_id, organization_id, value, set_note) values
    ('custom', 'system_enabled', 'organization', v_org, v_org, 'true'::jsonb, 'defects fixture');
  insert into custom.record (organization_id, table_id, data) values (v_org, null, jsonb_build_object('name', 'Home')) returning id into v_home;
  v_jobs := custom.table_declare(v_org, jsonb_build_object('name', 'Jobs', 'slug', 'jobs', 'type', 'entity',
    'label_singular', 'Job', 'label_plural', 'Jobs', 'title_field', 'wo', 'display', 'list', 'weight', 'light',
    'ordered', true, 'row_order', 'sorted', 'default_sort', jsonb_build_array(jsonb_build_object('field', 'created_at', 'direction', 'asc')),
    'agent_writable', true, 'retention_days', 3650, 'parent_id', v_home::text, 'fields', jsonb_build_array(jsonb_build_object('name', 'wo'))));
  insert into dj values ('org', v_org), ('home', v_home), ('jobs', v_jobs);
  perform custom.field_declare(v_org, v_jobs, jsonb_build_object('key', 'wo', 'label', 'Work order #', 'type', 'text', 'sort', 10,
    'rules', jsonb_build_array(jsonb_build_object('kind', 'unique'))));
  perform custom.field_declare(v_org, v_jobs, jsonb_build_object('key', 'status', 'label', 'Status', 'type', 'select', 'sort', 20,
    'options', jsonb_build_array(jsonb_build_object('key', 'waiting', 'label', 'Waiting'), jsonb_build_object('key', 'done', 'label', 'Done'))));
  perform custom.field_declare(v_org, v_jobs, jsonb_build_object('key', 'a', 'label', 'A', 'type', 'number', 'sort', 30));
  perform custom.field_declare(v_org, v_jobs, jsonb_build_object('key', 'b', 'label', 'B', 'type', 'number', 'sort', 40));
end
$fixture$;
