-- chair-step: projects.task_user_state onto the personal base contract — the composite primary key (task_id, user_id) becomes the id primary key plus a unique (task_id, created_by), and the legacy owner column user_id is dropped after it is copied into created_by; the app's three readers/writers move to created_by + organization_id in the same commit
-- lane: canonicalization lane 7.
-- Organization rule (named, provable): a task_user_state row belongs to its task's organization
-- (projects.tasks.organization_id via task_id). The client now passes that organization on every write.
-- Owner rule: created_by = the old user_id (the person whose per-task state it is) — 1:1.
set lock_timeout = '2s';

alter table projects.task_user_state add column if not exists id uuid not null default gen_random_uuid();
alter table projects.task_user_state add column if not exists created_by uuid;
alter table projects.task_user_state add column if not exists updated_by uuid;
update projects.task_user_state set created_by = user_id where created_by is distinct from user_id;

select platform.retrofit_entity('projects', 'task_user_state', 'task_user_state',
  'parent', null, 'user_id', 'projects.tasks', 'task_id', null, null);

alter table projects.task_user_state add column if not exists deleted_at timestamptz;
update platform.entity_types set has_soft_delete = true where token = 'task_user_state';

alter table projects.task_user_state drop constraint task_user_state_pkey;
alter table projects.task_user_state add constraint task_user_state_pkey primary key (id);
alter table projects.task_user_state add constraint task_user_state_task_id_created_by_key unique (task_id, created_by);
select iam.apply_rls('projects', 'task_user_state', 'task_user_state', 'personal');
alter table projects.task_user_state drop column user_id;

create index if not exists task_user_state_organization_id_idx on projects.task_user_state (organization_id);
create index if not exists task_user_state_created_by_idx on projects.task_user_state (created_by);
create index if not exists task_user_state_updated_by_idx on projects.task_user_state (updated_by);
