-- window-class: four DROP TRIGGERs (platform.cutover_seam_press, deprecated.udt_datasets, deprecated.udt_structured_lists) each take ACCESS EXCLUSIVE plus the 23-relation supautils set; apply 0100-0400 Pacific
-- chair-step: CLOSE-CORE CD-CORE-21 "one source of truth", step 2 of 2 (after close_core_c_a_the_switch_press_and_board_are_gone.sql): drops the last of the old-system switch. Four triggers: final_switch_holds_every_organization on the switch's own press table (nothing presses since step 1), and on the deprecated older tables final_switch_keeps_no_owner_lists_archived and _0_switched_org_makes_nothing_older (all three already DISABLED; platform._deprecated_takes_no_writes is what refuses writes there and stays). Then the seven functions only those triggers read: the three trigger functions, platform.older_tables_switched and _final_switch_is_on / _last / _platform_org. KEPT: the press and measure rows (the switch's audit) and the admin press history. Inverse: migrations/inverse/close_core_c_b_the_last_switch_triggers_are_gone_down.sql (live definitions, grants and each trigger's enabled state).

DROP TRIGGER final_switch_holds_every_organization ON platform.cutover_seam_press;
DROP TRIGGER final_switch_keeps_no_owner_lists_archived ON deprecated.udt_structured_lists;
DROP TRIGGER _0_switched_org_makes_nothing_older ON deprecated.udt_datasets;
DROP TRIGGER _0_switched_org_makes_nothing_older ON deprecated.udt_structured_lists;

DROP FUNCTION platform._final_switch_holds_every_organization();
DROP FUNCTION platform._final_switch_keeps_no_owner_lists_archived();
DROP FUNCTION workbench._switched_org_makes_nothing_older();
DROP FUNCTION platform.older_tables_switched(uuid);
DROP FUNCTION platform._final_switch_is_on();
DROP FUNCTION platform._final_switch_last();
DROP FUNCTION platform._final_switch_platform_org();

DO $$
DECLARE
  v_left text;
BEGIN
  SELECT string_agg(p.oid::regprocedure::text, ', ') INTO v_left
    FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname IN ('platform', 'workbench')
     AND (p.proname ~ '^_final_switch_' OR p.proname IN ('older_tables_switched', '_switched_org_makes_nothing_older'));
  IF v_left IS NOT NULL THEN
    RAISE EXCEPTION 'CD-CORE-21: the final switch is still present: %', v_left;
  END IF;
  IF to_regclass('platform.cutover_seam_press') IS NULL OR to_regprocedure('platform.cutover_press_history(integer)') IS NULL THEN
    RAISE EXCEPTION 'CD-CORE-21: the switch''s audit must stay';
  END IF;
END $$;
