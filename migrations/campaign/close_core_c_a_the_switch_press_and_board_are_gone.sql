-- chair-step: CLOSE-CORE CD-CORE-21 "one source of truth", step 1 of 2: drops the old-system switch's press, board, readiness and apply. The final switch was pressed for every organization and every seam retired on 2026-10-05 (platform.cutover_seam.retired_at); the only screen still reading it (the organization settings "Data" card, platform.cutover_seams) left in the same commit. Drops 11 functions: cutover_seam_press(_everyone), cutover_seams, cutover_seam_measure_record, _cutover_seam_apply (platform and deprecated), _cutover_seam_readiness, _cutover_seam_reverse_readiness, _final_switch_undo_retired and the two "switched for me" readers. No cron job, view, default, policy or trigger names any of them; no function outside this set calls them (pg_proc scan 2026-10-22). Step 2 (close_core_c_b_the_last_switch_triggers_are_gone.sql, window-class: DROP TRIGGER freezes the supautils set) drops the four leftover triggers and the seven functions only they read. KEPT: the press and measure rows as the switch's audit (platform.cutover_seam, cutover_seam_measure, cutover_seam_press and their append-only triggers) and the admin press history (platform.cutover_press_history). Inverse: migrations/inverse/close_core_c_a_the_switch_press_and_board_are_gone_down.sql, generated from the live definitions and grants.

DROP FUNCTION platform.cutover_seam_press_everyone(text, text, text, boolean, uuid[], uuid);
DROP FUNCTION platform.cutover_seam_press(text, uuid, text, text, boolean);
DROP FUNCTION platform.cutover_seams(uuid);
DROP FUNCTION platform.cutover_seam_measure_record(text, uuid, text, boolean, text, jsonb, text);
DROP FUNCTION platform._cutover_seam_apply(text, uuid, text, uuid, uuid);
DROP FUNCTION deprecated._cutover_seam_apply(text, uuid, text, uuid, uuid);
DROP FUNCTION platform._cutover_seam_readiness(text, uuid);
DROP FUNCTION platform._cutover_seam_reverse_readiness(text, uuid);
DROP FUNCTION platform._final_switch_undo_retired();
DROP FUNCTION platform.data_tables_switched_for_me();
DROP FUNCTION platform.data_tables_born_in_the_new_system_for_me();

-- Self-check: nothing is left to press or read the switch board with, and the switch's audit is intact.
DO $$
DECLARE
  v_left text;
BEGIN
  SELECT string_agg(p.oid::regprocedure::text, ', ') INTO v_left
    FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname IN ('platform', 'deprecated')
     AND p.proname IN ('cutover_seams', 'cutover_seam_press', 'cutover_seam_press_everyone', 'cutover_seam_measure_record',
                       '_cutover_seam_apply', '_cutover_seam_readiness', '_cutover_seam_reverse_readiness',
                       '_final_switch_undo_retired', 'data_tables_switched_for_me', 'data_tables_born_in_the_new_system_for_me');
  IF v_left IS NOT NULL THEN
    RAISE EXCEPTION 'CD-CORE-21: the switch press or board is still present: %', v_left;
  END IF;
  IF to_regclass('platform.cutover_seam_press') IS NULL OR to_regclass('platform.cutover_seam_measure') IS NULL
     OR to_regclass('platform.cutover_seam') IS NULL OR to_regprocedure('platform.cutover_press_history(integer)') IS NULL THEN
    RAISE EXCEPTION 'CD-CORE-21: the switch''s audit (press and measure rows, press history) must stay';
  END IF;
END $$;
