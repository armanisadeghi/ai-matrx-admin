-- lane: FIX-S3
-- additive: no
-- chair-step: it DROPS the three pre-ADV-3 connected-app door forms custom.automation_app_event(uuid, jsonb, jsonb),
--   custom.automation_app_note(uuid, text, jsonb) and custom.automation_app_stop(uuid, text). Each hands the 4/3-argument
--   owner-bound door whoever owns the automation at call time, which is exactly the hand-over race ADV-3 N1 closed.
-- lock: custom,platform
--
-- WHY NOW (ADV-4 §1). 20261019051500 kept these forms only for a server deployed before ADV-3. That server is gone:
--   the live aidream (/health/version b8092f2349, deployed 2026-10-19 15:40Z) contains c5262f2065, and every caller on
--   main (aidream/services/automations/app_triggers.py :455 stop, :485 event, :493/:545/:563/:584 note) passes the
--   owner it read. No store function calls the old forms except the forms themselves (pg_proc.prosrc read 2026-10-19),
--   and no grant reaches them beyond postgres. Their client_callable_door rows go with them.
-- Inverse: migrations/inverse/20261019174500_s3_the_connected_app_doors_keep_only_the_owner_bound_form_down.sql — run it
--   BEFORE the 20261019051500 inverse, whose based-on lines name these three bodies.

set local lock_timeout = '2s';
set local statement_timeout = '60s';

DELETE FROM platform.client_callable_door
 WHERE schema_name = 'custom'
   AND (function_name, identity_args) IN (
     ('automation_app_event', 'p_automation_id uuid, p_items jsonb, p_cursor jsonb'),
     ('automation_app_note',  'p_automation_id uuid, p_says text, p_cursor jsonb'),
     ('automation_app_stop',  'p_automation_id uuid, p_says text'));

DROP FUNCTION custom.automation_app_event(uuid, jsonb, jsonb);
DROP FUNCTION custom.automation_app_note(uuid, text, jsonb);
DROP FUNCTION custom.automation_app_stop(uuid, text);
