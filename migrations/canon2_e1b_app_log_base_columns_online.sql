-- lane: canonicalization wave 2, lane E. Split from canon2_e1 so a hot table's ACCESS EXCLUSIVE is held alone, for milliseconds.
-- Same reasoning as canon2_e1_big_tables_base_columns_online.sql (instant column adds, NOT VALID FKs, access unchanged).
set lock_timeout = '2s';

-- ops.app_log (entity): base_updated_at, base_version, soft_delete column, _touch_row, actor FKs
alter table ops.app_log add column if not exists updated_at timestamptz not null default now();
alter table ops.app_log add column if not exists version integer not null default 1;
alter table ops.app_log add column if not exists deleted_at timestamptz;
do $$ begin
  if not exists (select 1 from pg_trigger where tgrelid = 'ops.app_log'::regclass and tgname = '_touch_row') then
    create trigger _touch_row before insert or update on ops.app_log
      for each row execute function platform._touch_row();
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'app_log_created_by_fkey') then
    alter table ops.app_log add constraint app_log_created_by_fkey
      foreign key (created_by) references iam.users(id) on delete set null not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'app_log_updated_by_fkey') then
    alter table ops.app_log add constraint app_log_updated_by_fkey
      foreign key (updated_by) references iam.users(id) on delete set null not valid;
  end if;
end $$;

