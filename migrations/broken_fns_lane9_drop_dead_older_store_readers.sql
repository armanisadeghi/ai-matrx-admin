-- chair-step: drops two functions nothing live can reach; both read workbench.udt_* tables that moved to schema deprecated, so every call would fail with 42P01
-- Lane 9 (broken database functions), 2026-10-22.
--
-- platform._cutover_copy_resync(uuid, uuid, uuid)
--   Only caller: deprecated._cutover_seam_apply (its 'older_tables' press step). Nothing calls that copy:
--   platform._cutover_seam_apply names it only in a comment and itself raises "the switch has no press step"
--   for every seam. Seam 'older_tables' is retired (platform.cutover_seam.retired_at 2026-10-05), and every
--   entry point (cutover_seam_press, cutover_seam_press_everyone, cutover_seams) reads only unretired seams.
--   No trigger, policy, view, cron job or EXECUTE grant to a client role; no code in matrx-frontend, aidream
--   (incl. apps/shared), matrx-local or matrx-extend names it (git grep, migrations excluded).
--   Body source: migrations/access_ladder_t13_3b_inserts_tell_default_from_written.sql.
--   Its door row is deleted with it. Backup of that row:
--   {"id":"55c68fb2-18db-4148-8fe1-0d9b73eb1c34","schema_name":"platform","function_name":"_cutover_copy_resync",
--    "identity_args":"p_org uuid, p_press uuid, p_actor uuid","identity_argtypes":["2950","2950","2950"],
--    "declared_by":"migrations/campaign/copywritable_people_test_the_copy_until_the_switch.sql (lane COPY-WRITABLE)",
--    "declared_at":"2026-09-26T04:55:46.415605+00:00",
--    "reason":"Called only by platform._cutover_seam_apply, inside the owner's press (platform.cutover_seam_press, which checks the owner, the session and the page).",
--    "non_client_lane":"server_only: EXECUTE is revoked from every client role and from the server key.",
--    "signed_in_callers":false,"anonymous_callers":false,"anonymous_purpose":null,"gate_predicate":null,
--    "probe_args":null,"argument_rules":null,"contract_probe":null,"refusal_only":false}
--
-- workbench.dataset_readable_by(uuid, uuid)
--   No caller: no function body calls it (platform._t13_allowlist only lists its name as an allowed reader of
--   the row column), no trigger, policy, view, cron job or client grant; no code in the four repos names it.
--   It reads workbench.udt_datasets, which is now deprecated.udt_datasets.
--   Body source: migrations/access_ladder_t13_transitional_readers.sql.
set lock_timeout = '2s';

drop function platform._cutover_copy_resync(uuid, uuid, uuid);
delete from platform.client_callable_door
 where id = '55c68fb2-18db-4148-8fe1-0d9b73eb1c34'
   and schema_name = 'platform' and function_name = '_cutover_copy_resync';

drop function workbench.dataset_readable_by(uuid, uuid);
