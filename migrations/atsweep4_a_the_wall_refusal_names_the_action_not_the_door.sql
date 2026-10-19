-- why: AT-SWEEP-4: the organization wall's refusals (custom.assert_client_may_reach, custom._not_a_member_refusal in both forms) printed the door name ("... so custom.field_declare has nothing to do there"). They now name the action in plain words, from the SAME map custom.assert_client_may_change uses: the map moves out of that function into custom._door_action_words, one home, both call it. An unmapped door says "there is nothing for you to do there" (the words the client layer already used).
-- Proof: scripts/campaign-tests/atsweep4_a_the_wall_refusal_names_the_action_not_the_door.sql. Inverse: migrations/inverse/atsweep4_a_the_wall_refusal_names_the_action_not_the_door_down.sql
-- chair-step: its only REVOKE takes EXECUTE from PUBLIC, anon and authenticated on the one helper this file creates (internal, called only by the three refusal functions, whose own grants are postgres-only); no existing function loses a grant.
-- based-on: custom.assert_client_may_change(uuid, uuid, text, permission_level, text) d8699474e0470554afb328301d4d15a7d06d01703fcce1769a333ef502d3624a
-- based-on: custom.assert_client_may_reach(uuid, text) d76446a129ebe9927ed8fd4f7175c3e6ffa89910ce4bbf54a572c7b336c7a1c8
-- based-on: custom._not_a_member_refusal(text) 1b7b02a893955ba98e4208bdd900fc75dba2f93eee16b0457d8f6889d9443242
-- based-on: custom._not_a_member_refusal(text, uuid) 20a0ae9268615cc49ec39893b3ca85568b5f2f6ba39160eb4622c1fc8b1d9f94
CREATE OR REPLACE FUNCTION custom._door_action_words(p_door text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'pg_catalog'
AS $function$
  -- THE DOOR NEVER REACHES A PERSON (AT-SWEEP-3, moved here by AT-SWEEP-4): the one map from a door to the action in plain words.
  -- custom.assert_client_may_change and custom.assert_client_may_reach / custom._not_a_member_refusal all say THIS, so there is
  -- one place to add a door. Null when the door is not in the map; each caller says its own generic words then.
  select case lower(btrim(coalesce(p_door, ''))) when 'custom.action_declare' then 'Changing a table''s buttons' when 'custom.agent_table_claim' then 'Letting an agent take over a table' when 'custom.automation_declare' then 'Changing an automation' when 'custom.automation_test' then 'Testing an automation' when 'custom.autonumber_backfill' then 'Numbering existing rows' when 'custom.base_move' then 'Moving a base' when 'custom.base_move_access_kept' then 'Seeing who keeps access after a move' when 'custom.base_move_remove_access' then 'Taking back access after a move' when 'custom.booking_declare' then 'Changing a booking page' when 'custom.button_press' then 'Pressing a button' when 'custom.capture_publish' then 'Publishing a capture form' when 'custom.capture_sheet_declare' then 'Changing a capture sheet' when 'custom.checklist_declare' then 'Changing a checklist' when 'custom.checklist_step_complete' then 'Completing a checklist step' when 'custom.dashboard_declare' then 'Changing a dashboard' when 'custom.dashboard_delete' then 'Deleting a dashboard' when 'custom.dashboard_restore' then 'Restoring a dashboard' when 'custom.doc_sign' then 'Signing a document' when 'custom.doc_template_delete' then 'Deleting a document template' when 'custom.doc_template_restore' then 'Restoring a document template' when 'custom.doc_template_save' then 'Saving a document template' when 'custom.enrich_declare' then 'Changing a column''s AI fill' when 'custom.enrich_pin' then 'Pinning an AI-filled value' when 'custom.field_declare' then 'Changing a column' when 'custom.field_make_automatic' then 'Making a column fill itself' when 'custom.field_notify_on_assign' then 'Changing assignment notifications' when 'custom.field_restore' then 'Restoring a column' when 'custom.field_retire' then 'Removing a column' when 'custom.field_update' then 'Changing a column''s settings' when 'custom.form_archive' then 'Archiving a form' when 'custom.form_declare' then 'Changing a form' when 'custom.form_restore' then 'Restoring a form' when 'custom.home_add' then 'Adding a table to a base' when 'custom.inbound_declare' then 'Changing an inbound address' when 'custom.inbound_set' then 'Switching an inbound address on or off' when 'custom.io_import_begin' then 'Starting an import' when 'custom.io_import_declare_columns' then 'Adding columns for an import' when 'custom.io_import_finish' then 'Finishing an import' when 'custom.io_import_forget' then 'Discarding an import' when 'custom.io_import_open' then 'Opening an import' when 'custom.io_import_rows' then 'Importing rows' when 'custom.migrate_choice_keys' then 'Changing a column''s choices' when 'custom.migrate_delete' then 'Deleting a record' when 'custom.migrate_demote' then 'Restructuring a table' when 'custom.migrate_extract_parent' then 'Restructuring a table' when 'custom.migrate_merge' then 'Merging records' when 'custom.migrate_promote' then 'Restructuring a table' when 'custom.migrate_purge' then 'Clearing out a table' when 'custom.migrate_rename' then 'Renaming a record' when 'custom.migrate_reparent' then 'Moving a record under another' when 'custom.migrate_retype' then 'Changing a column''s type' when 'custom.migrate_split' then 'Splitting a record' when 'custom.migrate_undo' then 'Undoing a change' when 'custom.pipeline_declare' then 'Changing a pipeline' when 'custom.portal_archive' then 'Archiving a portal' when 'custom.portal_declare' then 'Changing a portal' when 'custom.portal_invite' then 'Inviting someone to a portal' when 'custom.portal_preview' then 'Previewing a portal' when 'custom.portal_principal_bind' then 'Linking a portal member' when 'custom.portal_restore' then 'Restoring a portal' when 'custom.portal_revoke' then 'Removing someone from a portal' when 'custom.record_change_many' then 'Changing several records' when 'custom.record_delete' then 'Deleting a record' when 'custom.record_reparent' then 'Moving a record' when 'custom.record_restore' then 'Restoring a record' when 'custom.record_restore_preview' then 'Previewing a restore' when 'custom.record_row_controls_set' then 'Changing a row''s controls' when 'custom.record_update' then 'Changing a record' when 'custom.record_upsert' then 'Saving a record' when 'custom.record_write' then 'Adding a record' when 'custom.record_write_graph' then 'Adding a record with its linked records' when 'custom.record_write_graph_superseding' then 'Replacing a record with its linked records' when 'custom.record_write_many' then 'Adding several records' when 'custom.relation_carry' then 'Linking records' when 'custom.relation_own' then 'Linking a record' when 'custom.relation_restore' then 'Restoring a link' when 'custom.relation_reverse_set' then 'Changing a link' when 'custom.relation_uncarry' then 'Unlinking records' when 'custom.row_template_declare' then 'Changing a row template' when 'custom.rule_declare' then 'Changing a rule' when 'custom.rule_restore' then 'Restoring a rule' when 'custom.share_grant' then 'Sharing this' when 'custom.share_lane_set' then 'Changing who can see this' when 'custom.share_revoke' then 'Taking back someone''s access' when 'custom.sign_requests' then 'Seeing signature requests' when 'custom.subscription_declare' then 'Changing a notification' when 'custom.table_archive' then 'Archiving a table' when 'custom.table_decorate' then 'Changing a table''s look' when 'custom.table_dimensions_set' then 'Changing a table''s dimensions' when 'custom.table_ensure' then 'Creating a table' when 'custom.table_restore' then 'Restoring a table' when 'custom.table_share_outside_grant' then 'Sharing a table outside the workspace' when 'custom.table_share_outside_invite' then 'Inviting someone outside the workspace' when 'custom.table_share_outside_resend' then 'Resending an outside invitation' when 'custom.table_share_outside_revoke' then 'Taking back an outside share' when 'custom.table_sync' then 'Syncing a table' when 'custom.table_sync_cell' then 'Syncing a cell' when 'custom.table_sync_settings_set' then 'Changing a table''s sync settings' when 'custom.table_webhook_archive' then 'Removing a webhook' when 'custom.table_webhook_declare' then 'Changing a webhook' when 'custom.table_webhooks' then 'Seeing a table''s webhooks' when 'custom.template_restore' then 'Restoring a template' when 'custom.template_uninstall' then 'Removing a template' when 'custom.view_designate' then 'Choosing a table''s main view' when 'custom.whole_value_complete' then 'Completing a value' when 'custom.whole_values_waiting' then 'Seeing values still waiting' when 'custom.work_assign' then 'Assigning work' when 'custom.work_set_state' then 'Changing the state of work' when 'custom.work_slot_expire' then 'Expiring a held slot' when 'custom.work_slot_hold' then 'Holding a slot' when 'custom.work_slot_release' then 'Releasing a held slot' when 'custom.work_slots_declare' then 'Changing a table''s slots' when 'custom.work_take_assignment' then 'Taking an assignment' when 'custom.work_template_declare' then 'Changing a work template' when 'custom.work_template_instantiate' then 'Starting work from a template' when 'platform.relation_on_delete' then 'Cleaning up links on delete' when 'platform.relation_set' then 'Linking records' when 'platform.relation_unset' then 'Unlinking records' when 'share_grant' then 'Sharing this' when 'share_lane_set' then 'Changing who can see this' when 'share_revoke' then 'Taking back someone''s access' else null end
$function$;

REVOKE ALL ON FUNCTION custom._door_action_words(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION custom._not_a_member_refusal(p_door text)
 RETURNS void
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'pg_catalog'
AS $function$
begin
  -- THE WALL'S REFUSAL, ONE SENTENCE IN ONE PLACE (moved here word for word from
  -- custom.assert_client_may_reach by CHAIR-WORLD-LANE, so the Table check says exactly the same).
  -- AT-SWEEP-4: the action in plain words, never the door; a door that is not in the map says what the client layer says.
  raise exception '%',
    case when custom._door_action_words(p_door) is null
         then 'You are not a member of that organization, so there is nothing for you to do there.'
         else format('You are not a member of that organization, so %s is not possible there.', custom._door_action_words(p_door)) end
    using errcode = '42501',
          hint = 'REC-29 / T15: organizations are hard walls, and a door decides who may reach one before it decides anything else. Switch to an organization you belong to, or ask an owner of that one to add you.';
end
$function$
;

CREATE OR REPLACE FUNCTION custom._not_a_member_refusal(p_door text, p_organization_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
begin
  -- HONEST-REFUSALS: a person who HAS a membership row on an organization that is ARCHIVED is not "not a
  -- member": the archive closed the organization (iam.has_org_access_for), the membership is kept so a
  -- restore gives everything back. She is told that, who can restore it, and the door that does.
  -- A non-member (or a null organization) meets the old sentence, word for word, below.
  if p_organization_id is not null and exists (
       select 1
         from iam.organization_member m
         join iam.organizations o on o.id = m.organization_id and o.archived_at is not null
        where m.organization_id = p_organization_id and m.user_id = (select auth.uid())) then
    raise exception '%',
      case when custom._door_action_words(p_door) is null
           then 'This organization is archived, so there is nothing for you to do there until an owner restores it.'
           else format('This organization is archived, so %s is not possible there until an owner restores it.', custom._door_action_words(p_door)) end
      using errcode = '42501',
            detail = 'organization_archived:' || p_organization_id::text,
            hint = 'Restore door: iam.organization_restore(p_org, p_confirm_name). Only an owner of the organization, or a super admin, can restore it; then every door works there again.';
  end if;
  perform custom._not_a_member_refusal(p_door);
end
$function$
;

CREATE OR REPLACE FUNCTION custom.assert_client_may_change(p_organization_id uuid, p_subject_id uuid, p_door text, p_required permission_level DEFAULT 'editor'::permission_level, p_subject_word text DEFAULT 'record'::text)
 RETURNS void
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_me          uuid;
  v_subject_org uuid;
  v_held        public.permission_level;
  v_action      text;
begin
  -- THE DOOR NEVER REACHES A PERSON. What the sentence says is the action in plain words; a door that is not in
  -- this map says "Making this change", never its own name (AT-SWEEP-3).
  v_action := coalesce(custom._door_action_words(p_door), 'Making this change');

  -- ONE order, always: the organization wall first, then the row.
  perform custom.assert_client_may_reach(p_organization_id, p_door);

  -- Way through 1: the role that owns the store (every campaign and server lane).
  if custom.query_is_store_owner() then
    return;
  end if;

  if p_subject_id is null then
    return;
  end if;

  -- Way through 2: no signed-in person at all — the anonymous capture door, which has
  -- already decided this write against the form's own token.
  v_me := custom.query_principal();
  if v_me is null then
    return;
  end if;

  -- WHERE THE SUBJECT ACTUALLY LIVES, BY ITS ID AND NOTHING ELSE (2026-09-23). A subject
  -- outside p_organization_id used to be waved through on the promise that the door would
  -- filter by that organization; the same promise was broken on the read side
  -- (`custom.record_as_of`, a cross-organization leak proven live). Access is decided by the
  -- PERSON and the ROW (organization-is-the-container rule 5).
  select r.organization_id into v_subject_org
    from custom.record r
   where r.id = p_subject_id;

  -- Not there at all: the door raises its own 02000 a line later.
  if v_subject_org is null then
    return;
  end if;

  -- The globally readable platform tenant's kernel Tables: unchanged — the door decides.
  if v_subject_org is distinct from p_organization_id
     and exists (select 1 from iam.system_orgs s
                  where s.organization_id = v_subject_org and s.global_readable) then
    return;
  end if;

  if custom.has_visibility(v_me, 'record', p_subject_id, p_required) then
    return;
  end if;

  -- THE REFUSAL NAMES THE RUNG HELD, NOT ONLY THE RUNG NEEDED (lane TAILS, 2026-09-21).
  v_held := custom.effective_level(v_me, v_subject_org, p_subject_id, 'record');

  if v_held is null then
    raise exception 'You do not have access to this %, so you cannot make this change.',
      coalesce(nullif(btrim(p_subject_word), ''), 'record')
      using errcode = '42501',
            hint = format(
              'Reading and writing are decided by the same question: a %s you may not open is a %s you may not change. %s needs %s (View < Comment < Edit < Full access) - ask whoever has it to share it with you, or ask an owner of this organization. Being a member of the organization is not by itself permission to rewrite somebody else''s row.',
              coalesce(nullif(btrim(p_subject_word), ''), 'record'),
              coalesce(nullif(btrim(p_subject_word), ''), 'record'),
              v_action,
              case p_required::text when 'viewer' then 'View access' when 'commenter' then 'Comment access' when 'editor' then 'Edit access' when 'admin' then 'Full access' else p_required::text end);
  end if;

  raise exception '% needs %; you have % on this %.',
    v_action,
    case p_required::text when 'viewer' then 'View access' when 'commenter' then 'Comment access' when 'editor' then 'Edit access' when 'admin' then 'Full access' else p_required::text end,
    case v_held::text::text when 'viewer' then 'View access' when 'commenter' then 'Comment access' when 'editor' then 'Edit access' when 'admin' then 'Full access' else v_held::text::text end,
    coalesce(nullif(btrim(p_subject_word), ''), 'record')
    using errcode = '42501',
          hint = format(
            'Reading and writing are decided by the same question, on one ladder: View < Comment < Edit < Full access. %s needs %s and you have %s on this %s, so ask someone with Full access on this %s - or an owner of this organization - to raise your access. Being a member of the organization is not by itself permission to rewrite somebody else''s row.',
            v_action,
            case p_required::text when 'viewer' then 'View access' when 'commenter' then 'Comment access' when 'editor' then 'Edit access' when 'admin' then 'Full access' else p_required::text end,
            case v_held::text::text when 'viewer' then 'View access' when 'commenter' then 'Comment access' when 'editor' then 'Edit access' when 'admin' then 'Full access' else v_held::text::text end,
            coalesce(nullif(btrim(p_subject_word), ''), 'record'),
            coalesce(nullif(btrim(p_subject_word), ''), 'record'));
end
$function$
;

CREATE OR REPLACE FUNCTION custom.assert_client_may_reach(p_organization_id uuid, p_door text)
 RETURNS void
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_owner oid;
  v_who   name;
  v_memo  text := 'w:r:' || coalesce(p_organization_id::text, '-');
  v_conv  uuid;
begin
  -- THE SAME YES, ALREADY GIVEN IN THIS TRANSACTION, TO THIS SEAT, ABOUT THIS ORGANIZATION.
  if platform.memo_k_get(v_memo) = '1' then
    return;
  end if;
  -- A PLATFORM CONTEXT READ IN PROGRESS (lane SCOPES-READS-ACCESS; chair ruling 2026-09-29 (1)). custom.context_scopes
  -- sets this for the length of ONE read of ONE platform context Table (custom.table_is_platform_context — a context
  -- Table of a global-readable system organization) the one ladder already lets the caller see, and clears it after;
  -- no client can set it (set_config is no client door). It admits nothing else: no memo is written, and every other
  -- door, Table and organization meets this wall as before.
  if nullif(current_setting('mx.platform_context_org', true), '') = p_organization_id::text then
    return;
  end if;
  v_who := custom.caller_role();

  -- The campaign's own lanes run as the role that owns the store. Read the owner from the
  -- catalogue, never as a role literal (rule 15), so this cannot drift from the table.
  select c.relowner into v_owner from pg_class c where c.oid = 'custom.record'::regclass;
  if pg_has_role(v_who, v_owner, 'member') then
    perform platform.memo_k_put(v_memo, '1');
    return;
  end if;

  if p_organization_id is null then
    raise exception 'custom: % was called without an organization, and the store is keyed (organization_id, id).',
      coalesce(custom._door_action_words(p_door), 'Making this change')
      using errcode = '22004',
            hint = 'Name the organization you are working in. A door that took null would be a door onto every organization at once.';
  end if;

  if iam.has_org_access(p_organization_id) then
    perform platform.memo_k_put(v_memo, '1');
    return;
  end if;

  -- 🔗 A CONVERSATION SHARED TO THIS SEAT (defect 55, 2026-10-18; ORGANIZATION IS TENANCY, NEVER
  -- PERMISSION; access-ladder.md: sharing sits outside the ladder, children inherit their parent).
  -- A person who holds a conversation at editor through a share runs its turns, and a turn runs in
  -- the CONVERSATION's organization — so its context reads and its kind-record store reach this
  -- wall as somebody who is not a member. Admitted only when the transaction declares that
  -- conversation (custom.declared_conversation: the server's app.conversation_id, or a client's
  -- x-matrx-conversation-id), the conversation belongs to THIS organization, and the one access
  -- answer (iam.has_access_for) gives this seat editor on it. Nothing is memoized, so it never
  -- carries to another conversation; the ladder is still the next line of every door.
  v_conv := custom.declared_conversation();
  if v_conv is not null
     and exists (select 1 from chat.conversation c
                  where c.id = v_conv and c.organization_id = p_organization_id and c.deleted_at is null)
     and iam.has_access_for((select auth.uid()), 'conversation', v_conv, 'editor'::public.permission_level) then
    return;
  end if;

  -- VIS-31 / PORTAL (2026-09-20). A live portal principal of THIS organization may reach its
  -- doors. Not because she is a member — she is not, and nothing here says she is — but
  -- because the organization named her, through a portal, as somebody whose own records live
  -- here. The next line of every door is the ladder, and she holds exactly one grant.
  --
  -- ONE SENTENCE, ONE PLACE (lane SC-3', 2026-09-24). `custom.portal_admits` reads
  -- `custom/external_principal_enabled` itself for its portal and shared-table arms, so asking
  -- the knob here as well was a second copy of the same condition — and it is what kept a
  -- class student out: portal_admits' scope-membership arm is deliberately outside that knob.
  -- For every person the first two arms admit, this answer is unchanged.
  if custom.portal_admits(p_organization_id) then
    perform platform.memo_k_put(v_memo, '1');
    return;
  end if;

  -- 🌐 THE WORLD LANE, FOR READING ONLY (CHAIR-WORLD-LANE, chair ruling 2026-10-05; access ladder: a Public
  -- table opens to anyone without being shared). An organization that holds a Table at the ladder's Public
  -- level (its Table record published to the web — the ladder's word; T-13) is reachable by any signed-in person through a READ
  -- door (custom.door_reads_only) and through nothing else: every write door still meets the refusal below.
  -- IT ADMITS AND NOTHING MORE, and it is the narrowest admission in this function: no memo 'w:r' is written,
  -- so it never carries to another door in the statement, and it leaves the marker 'w:pub' that the table
  -- doors read (custom.assert_public_reader_names_a_public_table, asked by custom.assert_may_know_table,
  -- custom.assert_client_may_open, custom.views and custom.read_record right after this wall). Those turn a
  -- Table that is NOT Public back into this very refusal, word for word — so for every other Table of the
  -- organization (the Matrx System kernel Tables included) every door answers exactly as before. The ladder
  -- is the next line of every door and gives a Public Table's rows at viewer and never above.
  -- A door the read door calls on its way (custom.query_visible_ids, custom.table_type_field, …) names itself
  -- here too; it passes only once the read door it serves has, in this same statement, named a Public Table
  -- (memo 'w:pubt', written by custom.assert_public_reader_names_a_public_table). Called on its own, in a
  -- statement of its own, it meets the refusal below exactly as before.
  if (custom.door_reads_only(p_door)
      or platform.memo_k_get('w:pubt:' || coalesce(p_organization_id::text, '-')) = '1')
     and custom.organization_has_a_public_table(p_organization_id) then
    perform platform.memo_k_put('w:pub:' || p_organization_id::text, '1');
    return;
  end if;

  -- HONEST-REFUSALS: the refusal knows WHICH organization, so a member of an ARCHIVED one is told it is archived.
  perform custom._not_a_member_refusal(p_door, p_organization_id);
end $function$
;
