-- target: branch,production
-- additive: yes
-- guard: custom/system_enabled
-- lane: DEFECTS
-- lock: custom
-- based-on: custom._restore_guard_one(uuid, uuid, timestamp with time zone) 5dc2d153b721944321e3590aefd51de49065ec5136ab64d3557dd6039f78822e
--
-- DEFECTS 1 - "Bring it back" on one archived record whose unique value another live record took since
-- failed with "operator does not exist: jsonb ->> uuid" instead of the store's own sentence. The held
-- message was read with `v -> 'held' ->> p_id` (a uuid key); jsonb keys are text. Only the cast changes.
CREATE OR REPLACE FUNCTION custom._restore_guard_one(p_organization_id uuid, p_id uuid, p_at timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v jsonb;
begin
  -- DATA-DEFECTS-4: the single-row form of custom._restore_check, for the paths that bring one row back at a time.
  v := custom._restore_check(p_organization_id, array[p_id], array[p_at]);
  if v -> 'held' ? p_id::text then
    raise exception '%', v -> 'held' ->> p_id::text
      using errcode = '23505',
            hint = 'FLD-3 / B1: a value that has to be unique was taken by another record while this one was archived. Change the value there, or here after it is back.';
  end if;
  return v -> 'flagged';
end
$function$;
