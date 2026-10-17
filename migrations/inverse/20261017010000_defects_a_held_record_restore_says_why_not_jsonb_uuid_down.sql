-- inverse of 20261017010000_defects_a_held_record_restore_says_why_not_jsonb_uuid.sql
-- lane: DEFECTS
-- lock: custom
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
    raise exception '%', v -> 'held' ->> p_id
      using errcode = '23505',
            hint = 'FLD-3 / B1: a value that has to be unique was taken by another record while this one was archived. Change the value there, or here after it is back.';
  end if;
  return v -> 'flagged';
end
$function$

;
