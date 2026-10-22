-- lane: canonicalization lane 7. projects.task_user_state: the shared actor stamp (retrofit_entity does not
-- attach _stamp_actor for the personal variant; the certifier requires it).
set lock_timeout = '2s';
create trigger _stamp_actor before insert or update on projects.task_user_state
  for each row execute function platform._stamp_actor();
do $$ begin
  if not iam.canonical_certify_ok('projects', 'task_user_state', 'task_user_state') then
    raise exception 'lane7: projects.task_user_state does not certify';
  end if;
end $$;
