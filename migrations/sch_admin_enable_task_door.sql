--
-- sch_admin_enable_task_door.sql
--
-- WHY. The admin scheduling "All tasks" console can Disable any person's schedule
-- (scheduler.admin_disable_task) but has no way back: the staff write arm on
-- scheduler.sch_task is closed (sch_admin_doors_close_the_staff_write_arm_2026_09_26.sql), so
-- an admin's plain UPDATE of a customer task matches 0 rows. The row verb Enable and its bulk
-- twin need the mirror door.
--
-- WHAT. scheduler.admin_enable_task(p_task_id uuid, p_reason text) — the exact mirror of
-- admin_disable_task: SECURITY DEFINER, search_path '', gated by public.is_super_admin() before
-- any read, P0002 for a missing row, one admin.admin_audit_log row per call carrying the TARGET
-- row's own organization_id (no organization is chosen). Declared in
-- platform.client_callable_door before its GRANT. The audit row uses the existing action word
-- 'update' with metadata.op = 'scheduler_task_enable': widening admin_audit_log_action_check
-- needs a DROP CONSTRAINT (a chair step), and an enable is exactly an update of the row.

CREATE FUNCTION scheduler.admin_enable_task(p_task_id uuid, p_reason text DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_task scheduler.sch_task%rowtype;
begin
  -- Access before existence: a non-admin learns nothing about which ids exist.
  if not public.is_super_admin() then
    raise exception 'Enabling another person''s schedule needs a super admin on the admin lane (/administration).'
      using errcode = '42501';
  end if;
  if p_task_id is null then
    raise exception 'p_task_id is required' using errcode = '22023';
  end if;

  select * into v_task from scheduler.sch_task where id = p_task_id for update;
  if not found then
    raise exception 'Scheduled task does not exist (it may have been deleted).' using errcode = 'P0002',
            detail = jsonb_build_object('task_id', p_task_id)::text;
  end if;

  update scheduler.sch_task set enabled = true where id = p_task_id;

  insert into admin.admin_audit_log
    (actor_user_id, action, target_user_id, before, after, organization_id, metadata)
  values
    ((select auth.uid()), 'update', v_task.user_id,
     jsonb_build_object('enabled', v_task.enabled),
     jsonb_build_object('enabled', true),
     v_task.organization_id,
     jsonb_build_object('op', 'scheduler_task_enable', 'task_id', v_task.id, 'title', v_task.title, 'reason', p_reason));

  return jsonb_build_object('task_id', v_task.id, 'enabled', true, 'was_enabled', v_task.enabled);
end
$function$;

insert into platform.client_callable_door
  (schema_name, function_name, identity_args, identity_argtypes, declared_by, reason, gate_predicate, signed_in_callers, anonymous_callers)
values
  ('scheduler', 'admin_enable_task', 'p_task_id uuid, p_reason text', array['uuid'::regtype::oid, 'text'::regtype::oid],
   'sch_admin_enable_task_door.sql',
   'WRITE. The admin scheduling pages'' "Enable schedule" control (row and bulk) for ANY person''s task: the way back from admin_disable_task, replacing a direct RLS update the closed platform-staff arm would silently drop. Gated by public.is_super_admin() (admin lane) before any read; one admin.admin_audit_log row per call; a missing task raises P0002.',
   'public.is_super_admin()', true, false);

GRANT EXECUTE ON FUNCTION scheduler.admin_enable_task(uuid, text) TO authenticated;
