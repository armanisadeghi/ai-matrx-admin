-- additive: yes
-- Two function bodies only (custom.table_archive, custom.template_uninstall). Nothing dropped, revoked, or granted; no table DDL.
-- lane: TEMPLATE-INSTALL-2
-- lock: custom
-- Inverse: migrations/inverse/20261020030000_templateinstall2_a_an_uninstall_always_moves_and_a_table_archives_in_passes_down.sql
-- based-on: custom.table_archive(uuid, uuid, integer, boolean) f5d4efdcf17b08d71c4e9917fafca85d727b685f8a32d643dea28143e2aaeff8
-- based-on: custom.template_uninstall(uuid, uuid, integer) 5a6cbb2b3c7e157e7a24e094fe64e16fefaa3fe19f0220811336230981483b19
--
-- TEMPLATE-INSTALL-2 - AN UNINSTALL ALWAYS MOVES, OR NAMES WHY IT DID NOT.
-- Cause of the stall (two Home Inventory copies, installs 95a968d4 / 5c9c96ef): archiving a Table record took its Fields, saved
-- views and Rules inside ONE custom.record_delete, each at the full door price (about 1 s in this organization), so a table with
-- ten fields was a single 10 s statement. PostgREST cancels a client call at ~8 s and the whole call rolls back: the install
-- stayed `uninstalling`, the same table was started again, and every retry lost the same 10 s. `next_step 28` is only the install's
-- last step number (it is never an uninstall position), so nothing on the row said where it was stuck.
--   * custom.table_archive: the table's contents (views, rules, fields) go one door call each out of the call's pass window,
--     the first always runs, the Table record flips in a later call that finds nothing left under it. Same archive event.
--   * custom.template_uninstall: the first step of a call always runs (a budget of 0 used to do nothing at all); a table pass that
--     moved nothing is written to `left` and to the install's `refusal` (code uninstall_stalled) and the call stops there.
-- The pass window can be narrowed per transaction (set_config 'custom.archive_pass_ms'), which is how the test proves the class.
set local lock_timeout = '3s';

CREATE OR REPLACE FUNCTION custom.table_archive(p_organization_id uuid, p_table_id uuid, p_chunk integer DEFAULT 50, p_include_table boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  -- THE MOST ONE CALL WILL TAKE ON. Not the most a SCREEN should ask for: a client call goes
  -- through PostgREST, which cancels at ~8 s whatever this function would have been happy to
  -- do, so `p_chunk`'s DEFAULT (50) is the honest number and this cap is for a caller with a
  -- real budget.
  c_max     constant integer := 1000;
  v_chunk   integer;
  v_id      uuid;
  v_did     integer := 0;
  v_live    integer;
  v_gone    integer;
  v_name    text;
  v_table   boolean;                   -- is the Table record itself still live?
  v_whole   boolean;                   -- was this call asked to archive the Table too?
  v_done    boolean := false;
  v_table_now boolean := false;      -- did THIS call archive the Table record itself?
  v_event   uuid;                    -- STORE-TAILS-3: the one archive event of this operation
  v_prev_event text;
  -- DATA-V2-BASICS-2: an archive of this table was started and has not finished.
  v_open    boolean := false;
  v_list    uuid;                    -- DATA-V2-BASICS-2: a pick list this table's columns made
  -- THE REVERSIBLE ACTION (2026-10-02): the organization's line above which a screen asks before
  -- archiving this table (knob custom/archive_confirm_over). At or under it a screen archives at once
  -- and announces it with Undo. Answered on every call, the chunk-0 look included.
  v_confirm_over integer;
  -- T2.1 (2026-10-02): WHAT IS BUILT ON THIS TABLE GOES WITH IT, in this same archive event.
  v_built   uuid;
  v_now     timestamptz := now();
  v_on      jsonb := '[]'::jsonb;
  -- CHAIR-ACCESS d (lane 2): a child Table the store names by THIS table's id (a bookings Table's slots)
  v_child   uuid;
  v_child_res jsonb;
  -- TABLE-ACTIONS (2026-10-03): THE LAST STEP IS CHUNKED TOO. What is left of p_chunk after this call's
  -- records is the budget for what is built on the table; nothing new starts once the call has run
  -- for c_pass and done something.
  -- TEMPLATE-INSTALL-2: the pass window is 1 s unless a caller (a test) narrows it for this transaction with
  -- set_config('custom.archive_pass_ms', '0', true); at 0 every call takes exactly one step of the tail.
  c_pass    interval := make_interval(secs => coalesce(nullif(current_setting('custom.archive_pass_ms', true), '')::numeric, 1000) / 1000.0);
  v_contents uuid[];                  -- TEMPLATE-INSTALL-2: what the table holds that is still live (views, rules, fields)
  v_cprev   text;
  v_until   timestamptz := clock_timestamp() + c_pass;
  v_left    integer;
  v_on_did  integer := 0;               -- built-on rows (and child-table passes) THIS call archived
  v_more    boolean := false;           -- something built on the table is left for the next call
  v_n       integer;
  -- DATA-DEFECTS-3: the set-based record phase.
  c_call_rows constant integer := 5000;          -- the most records one call takes on
  c_batch     constant integer := 50;            -- records per set-based step
  c_rows_pass constant interval := interval '2500 milliseconds';  -- the record phase stops starting steps after this
  v_take    integer;
  v_ids     uuid[];
  v_slow    uuid[];
  v_fast    uuid[];
  v_parents uuid[];
  v_skip    boolean;
begin
  -- THE SWITCH, THE WALL, THE RUNG — all three by name, before anything is read or written.
  -- The rung is the one `custom.record_delete` asks of the Table record, asked ONCE here so a
  -- person who may not do this is told before the first row moves rather than after.
  perform custom.assert_store_door(p_organization_id, 'custom.table_archive');
  perform custom.assert_client_may_reach(p_organization_id, 'custom.table_archive');

  if p_organization_id is null or p_table_id is null then
    raise exception 'Archiving a table needs the organization and the table, and this call does not say which.'
      using errcode = '22004';
  end if;

  select coalesce(nullif(r.data ->> 'name', ''), 'this table'), r.deleted_at is null
    into v_name, v_table
    from custom.record r
   where r.organization_id = p_organization_id
     and r.id = p_table_id
     and r.data_class = 'table';
  if not found then
    raise exception 'There is no such table in this organization, so there is nothing to archive.' using errcode = '02000',
            hint = 'The store is keyed (organization_id, id), so a table of another organization is not found by this one. Nothing was changed.',
            detail = jsonb_build_object('table_id', p_table_id)::text;
  end if;

  perform custom.assert_client_may_change(p_organization_id, p_table_id, 'custom.table_archive', 'admin'::public.permission_level, 'table');

  -- LANE 12 P5 (Arman, 2026-10-02: a table the app's code relies on "cannot easily be deleted").
  -- A table whose document carries `code_depends: true` is refused HERE, before the first record
  -- moves — not at the last step, where earlier chunks would already have emptied it. Emptying it
  -- and keeping it (p_include_table = false) is not archiving it, and is unchanged. The one way
  -- through is custom.table_archive_deliberately; custom._code_depends_hold (asked by the
  -- zzz_table_columns_word row trigger) holds every other door.
  if coalesce(p_include_table, true) then
    perform custom._code_depends_refuse(p_table_id,
      (select r.data from custom.record r
        where r.organization_id = p_organization_id and r.id = p_table_id and r.data_class = 'table'),
      'archived');
  end if;

  v_confirm_over := greatest(0,
    (platform.knob_resolve('custom', 'archive_confirm_over', p_organization_id) #>> '{}')::integer);

  v_whole := coalesce(p_include_table, true);
  -- HOW MUCH THIS CALL TAKES ON. 0 means "tell me, change nothing" — which is what a screen
  -- asks before it shows a person a number and a button. Above c_max is clamped rather than
  -- refused, because a caller asking for too much wants the work done, not a lecture; the
  -- answer says what it actually did.
  v_chunk := least(greatest(coalesce(p_chunk, 50), 0), c_max);

  -- STORE-TAILS-3: ONE EVENT FOR THE WHOLE OPERATION. A screen calls this door until `done`;
  -- every call's rows are written to the SAME open event, so the restore brings back the records
  -- chunk one archived together with the columns the last call archived. Opened only when this
  -- call is going to archive something.
  if v_chunk > 0
     and (exists (select 1 from custom.record r
                   where r.organization_id = p_organization_id and r.table_id = p_table_id
                     and r.data_class = 'record' and r.deleted_at is null)
          or (v_whole and v_table)) then
    select m.id into v_event
      from history.migration_log m
     where m.organization_id = p_organization_id
       and m.verb = 'archive'
       and m.target_kind = 'table'
       and m.target_id = p_table_id
       and m.undone_at is null
       and coalesce((m.inverse ->> 'open')::boolean, false)
     order by m.applied_at desc
     limit 1;
    if v_event is null then
      v_event := history.migration_record(p_organization_id, 'archive', 'table', p_table_id,
                   jsonb_build_object('kind', 'restore', 'record_id', p_table_id::text,
                                      'also', '[]'::jsonb, 'took', '[]'::jsonb, 'open', true,
                                      'whole', v_whole),
                   format('STORE-TAILS-3: %s archived as one unit — its records, fields, saved views and rules with it; restoring it brings back exactly this set.', v_name));
    end if;
    v_prev_event := coalesce(current_setting('custom.archive_event', true), '');
    perform set_config('custom.archive_event', v_event::text, true);
  end if;

  if v_chunk > 0 then
    -- SET-BASED (DATA-DEFECTS-3, 2026-10-10). The records no longer go one door-call each. Per row the old
    -- loop paid custom.record_delete's whole delete rule — custom.containment_edges(organization), a scan of
    -- the organization's every containment edge, ~80 ms a row and growing with the organization — plus a
    -- rewrite of the archive event's ever-longer `took` list, and stopped after 1 s, so the client's 20-row
    -- pass archived ~10 rows: a 20-row table took 6 passes, a 162-row table 17. Now, per sub-batch:
    --   · the access question is asked of EVERY row, by the same door as before (assert_client_may_change);
    --   · a row the delete rule could act on — something inbound points at it by a relation, it contains
    --     other records, or tables live in it — still goes through custom.record_delete, exactly as before;
    --   · every other row (the whole of an ordinary table) is archived by ONE update, and the event learns
    --     the batch with ONE write (`also` and `took` carry the same entries record_delete would have written);
    --   · the call works for its own time budget (c_rows_pass), not the client's chunk: `p_chunk` is now the
    --     least this call takes on, so the deployed client's 20-row passes finish a table in one call.
    -- The old 1 s cut-off is gone for records; the call still answers done = false when its budget is spent
    -- and the caller's loop carries on, so nothing a caller relies on changed.
    v_take := least(greatest(v_chunk, c_call_rows), c_call_rows);
    v_until := clock_timestamp() + c_rows_pass;
    select coalesce(array_agg(distinct e.parent_id), '{}') into v_parents
      from custom.containment_edges(p_organization_id) e where e.via = 'contained';
    loop
      exit when v_did >= v_take;
      exit when v_did > 0 and clock_timestamp() > v_until;
      select coalesce(array_agg(s.id order by s.created_at, s.id), '{}') into v_ids
        from (select r.id, r.created_at
                from custom.record r
               where r.organization_id = p_organization_id
                 and r.table_id = p_table_id
                 and r.data_class = 'record'
                 and r.deleted_at is null
               order by r.created_at, r.id
               limit least(c_batch, v_take - v_did)) s;
      exit when cardinality(v_ids) = 0;

      -- Access: the same question record_delete asks, of every row.
      perform custom.assert_client_may_change(p_organization_id, x, 'custom.record_delete') from unnest(v_ids) x;

      -- The rows the delete rule could act on keep the full door.
      select coalesce(array_agg(x), '{}') into v_slow
        from unnest(v_ids) x
       where x = any (v_parents)
          or exists (select 1 from platform.associations a
                      where a.organization_id = p_organization_id and a.target_id = x
                        and a.relation_field_id is not null and a.deleted_at is null)
          or exists (select 1 from custom.home h
                      where h.organization_id = p_organization_id and h.home_record_id = x);
      foreach v_id in array v_slow loop
        -- TEMPLATE-FRESH-3: the call's time budget is honoured PER ROW here too. Each of these goes through the full door
        -- (~0.6 s on a big organization), a 50-row batch of them ran 10 s past the 2.5 s window and PostgREST cancelled the
        -- call at 8 s. Rows not reached stay live and the next loop pass / the caller's next call takes them.
        exit when v_did > 0 and clock_timestamp() > v_until;
        if exists (select 1 from custom.record r
                    where r.organization_id = p_organization_id and r.id = v_id and r.deleted_at is null) then
          perform custom.record_delete(p_organization_id, v_id);
          v_did := v_did + 1;
        end if;
      end loop;

      -- Everyone else: one update, one note in the event. The row triggers that have nothing to do for this
      -- batch (custom._bulk_rows_skip_trigger_work) are told to stand aside; the approvals they would withdraw
      -- are withdrawn set-wise right after.
      v_skip := custom._bulk_rows_skip_trigger_work(p_organization_id, v_ids, false);
      perform set_config('custom.archive_bulk', case when v_skip then 'on' else 'off' end, true);
      with gone as (
        update custom.record r
           set deleted_at = v_now
         where r.organization_id = p_organization_id
           and r.id = any (v_ids)
           and not (r.id = any (v_slow))
           and r.deleted_at is null
        returning r.id)
      select coalesce(array_agg(g.id order by array_position(v_ids, g.id)), '{}') into v_fast from gone g;
      perform set_config('custom.archive_bulk', 'off', true);
      if v_skip and cardinality(v_fast) > 0 then
        perform set_config('custom.archive_bulk', 'withdraw', true);
        perform custom._withdraw_approvals_for_batch(p_organization_id, v_fast);
        perform set_config('custom.archive_bulk', 'off', true);
      end if;
      v_n := cardinality(v_fast);
      if v_n > 0 then
        v_did := v_did + v_n;
        if v_event is not null then
          update history.migration_log m
             set inverse = m.inverse || jsonb_build_object(
                   'also', coalesce(m.inverse -> 'also', '[]'::jsonb)
                           || (select jsonb_agg(t.x::text order by t.o) from unnest(v_fast) with ordinality as t(x, o)),
                   'took', coalesce(m.inverse -> 'took', '[]'::jsonb)
                           || (select jsonb_agg(jsonb_build_array(t.x::text, v_now) order by t.o)
                                 from unnest(v_fast) with ordinality as t(x, o)))
           where m.organization_id = p_organization_id and m.id = v_event;
        end if;
      end if;
      -- A batch that moved nothing would repeat itself forever.
      exit when v_n = 0 and cardinality(v_slow) = 0;
    end loop;
    -- The tail (what is built on the table, the table itself) gets its own second after the records.
    v_until := clock_timestamp() + c_pass;
  end if;

  select count(*) filter (where r.deleted_at is null),
         count(*) filter (where r.deleted_at is not null)
    into v_live, v_gone
    from custom.record r
   where r.organization_id = p_organization_id
     and r.table_id = p_table_id
     and r.data_class = 'record';

  -- THE TABLE GOES LAST, AND ONLY WHEN IT IS EMPTY — AND ONLY AFTER WHAT IS BUILT ON IT HAS GONE.
  -- … AND ONLY WHEN THIS CALL WAS ASKED TO CHANGE SOMETHING. `p_chunk = 0` means "tell me,
  -- change nothing" (ARGS-RULED-2, 2026-09-23): until this line an empty Table with the table
  -- included was archived by the very call that promised to change nothing.
  --
  -- THE LAST STEP IS CHUNKED TOO (TABLE-ACTIONS, 2026-10-03). It used to take the pick lists, every
  -- dashboard and checklist, every form, inbound address, saved view and portal, every child Table
  -- (looped to its end) AND the Table itself in ONE call; with 5 records left it hit the 8 s signed-in
  -- limit under load, and nothing bounded it but how much happened to be built on the table. Now the
  -- built-on rows go in their own passes, out of the same budget the records use: at most what is
  -- left of `p_chunk` after this call's records, and nothing new is started once the call has run
  -- for c_pass and done something. A pass that stops early answers done = false and the caller's loop
  -- calls again (the contract it already keeps). The Table itself flips only in a pass that found
  -- nothing more built on it and still has time: never after a long one. Every row, in every pass,
  -- goes into the SAME open archive event — the records and dashboards through custom.record_delete
  -- (its `took`), the rest named in its `built_on` with the moment each went — so custom.record_restore
  -- brings back exactly these and never something archived on its own earlier.
  if v_chunk > 0 and v_live = 0 and v_whole and v_table then
    v_left := greatest(coalesce(v_take, v_chunk) - v_did, 50);

    -- DATA-V2-BASICS-2 (2026-09-29, BREAKER-2 B2-24): ITS PICK LISTS GO WITH IT. Every choice column
    -- makes a list of its own ("Visit Status choices"); archiving the table left all six of them live
    -- in the Tables index. A list that only this table's columns use (live or removed, in use or kept
    -- by a column that became Text) is archived in this same event, so bringing the table back brings
    -- them back. A list another table's column also uses stays.
    for v_list in
      select distinct l.id
        from custom.record f
        cross join lateral (select nullif(f.data -> 'config' ->> 'options_table_id', '')::uuid as id
                            union select nullif(f.data -> 'config' ->> 'list_kept', '')::uuid) l
       where f.organization_id = p_organization_id
         and f.table_id = custom.field_kernel_id()
         and coalesce(f.data_class, '') <> 'kernel'
         and f.data ->> 'entity_definition_id' = p_table_id::text
         and l.id is not null
    loop
      if exists (select 1 from custom.record t
                  where t.organization_id = p_organization_id and t.id = v_list
                    and t.table_id = custom.table_kernel_id() and t.deleted_at is null)
         and not exists (select 1 from custom.record o
                          where o.organization_id = p_organization_id
                            and o.table_id = custom.field_kernel_id()
                            and o.deleted_at is null
                            and o.data ->> 'entity_definition_id' is distinct from p_table_id::text
                            and (o.data -> 'config' ->> 'options_table_id' = v_list::text
                                 or o.data -> 'config' ->> 'list_kept' = v_list::text)) then
        if v_left < 1 or (v_did + v_on_did > 0 and clock_timestamp() > v_until) then
          v_more := true;
          exit;
        end if;
        perform custom.record_delete(p_organization_id, v_list);
        v_left := v_left - 1;
        v_on_did := v_on_did + 1;
      end if;
    end loop;

    -- WHAT IS BUILT ON IT GOES WITH IT (handoff T2.1, 2026-10-02: "Restore (or Undo) brings it
    -- back with its forms and dashboards"). Before this a table's forms and booking pages kept
    -- taking submissions into an archived table, its dashboards and saved views stayed listed, and
    -- a portal kept opening onto it.
    --   · dashboards and checklists are store records: through the store's own door, so they join
    --     the event's `took` list like every other row;
    if not v_more then
      for v_built in
        select r.id
          from custom.record r
         where r.organization_id = p_organization_id
           and r.deleted_at is null
           and ((r.data_class = 'dashboard' and r.data ->> 'subject_table_id' = p_table_id::text)
                or (r.data_class in ('checklist_template', 'checklist_run')
                    and r.data ->> 'about_table_id' = p_table_id::text))
         order by r.created_at, r.id
      loop
        if v_left < 1 or (v_did + v_on_did > 0 and clock_timestamp() > v_until) then
          v_more := true;
          exit;
        end if;
        perform custom.record_delete(p_organization_id, v_built);
        v_left := v_left - 1;
        v_on_did := v_on_did + 1;
      end loop;
    end if;

    --   · forms and booking pages (custom.anon_form), inbound addresses (custom.anon_inbound),
    --     saved views (platform.saved_view) and portals opened onto it (custom.portal) live outside
    --     the record table, so the event names them in `built_on` with the moment they went. Each
    --     kind is taken at most v_left rows a pass.
    if not v_more and exists (select 1 from custom.anon_form x
                               where x.organization_id = p_organization_id and x.table_id = p_table_id and x.deleted_at is null) then
      if v_left < 1 or (v_did + v_on_did > 0 and clock_timestamp() > v_until) then
        v_more := true;
      else
        with g as (
          update custom.anon_form f set deleted_at = v_now
           where f.organization_id = p_organization_id
             and f.id in (select x.id from custom.anon_form x
                           where x.organization_id = p_organization_id and x.table_id = p_table_id
                             and x.deleted_at is null
                           order by x.id limit v_left)
          returning f.id)
        select v_on || coalesce(jsonb_agg(jsonb_build_object('kind', 'anon_form', 'id', g.id, 'at', v_now)), '[]'::jsonb),
               count(*)
          into v_on, v_n from g;
        v_left := v_left - v_n;
        v_on_did := v_on_did + v_n;
      end if;
    end if;
    if not v_more and exists (select 1 from custom.anon_inbound x
                               where x.organization_id = p_organization_id and x.table_id = p_table_id and x.deleted_at is null) then
      if v_left < 1 or (v_did + v_on_did > 0 and clock_timestamp() > v_until) then
        v_more := true;
      else
        with g as (
          update custom.anon_inbound i set deleted_at = v_now
           where i.organization_id = p_organization_id
             and i.id in (select x.id from custom.anon_inbound x
                           where x.organization_id = p_organization_id and x.table_id = p_table_id
                             and x.deleted_at is null
                           order by x.id limit v_left)
          returning i.id)
        select v_on || coalesce(jsonb_agg(jsonb_build_object('kind', 'anon_inbound', 'id', g.id, 'at', v_now)), '[]'::jsonb),
               count(*)
          into v_on, v_n from g;
        v_left := v_left - v_n;
        v_on_did := v_on_did + v_n;
      end if;
    end if;
    if not v_more and exists (select 1 from platform.saved_view x
                               where x.organization_id = p_organization_id and x.subject_id = p_table_id and x.deleted_at is null) then
      if v_left < 1 or (v_did + v_on_did > 0 and clock_timestamp() > v_until) then
        v_more := true;
      else
        with g as (
          update platform.saved_view v set deleted_at = v_now
           where v.organization_id = p_organization_id
             and v.id in (select x.id from platform.saved_view x
                           where x.organization_id = p_organization_id and x.subject_id = p_table_id
                             and x.deleted_at is null
                           order by x.id limit v_left)
          returning v.id)
        select v_on || coalesce(jsonb_agg(jsonb_build_object('kind', 'saved_view', 'id', g.id, 'at', v_now)), '[]'::jsonb),
               count(*)
          into v_on, v_n from g;
        v_left := v_left - v_n;
        v_on_did := v_on_did + v_n;
      end if;
    end if;
    if not v_more and exists (select 1 from custom.portal x
                               where x.organization_id = p_organization_id and x.client_table_id = p_table_id and x.archived_at is null) then
      if v_left < 1 or (v_did + v_on_did > 0 and clock_timestamp() > v_until) then
        v_more := true;
      else
        with g as (
          update custom.portal p
             set archived_at = v_now, archived_by = custom.query_principal(),
                 archive_reason = 'Its table was archived.'
           where p.organization_id = p_organization_id
             and p.id in (select x.id from custom.portal x
                           where x.organization_id = p_organization_id and x.client_table_id = p_table_id
                             and x.archived_at is null
                           order by x.id limit v_left)
          returning p.id)
        select v_on || coalesce(jsonb_agg(jsonb_build_object('kind', 'portal', 'id', g.id, 'at', v_now)), '[]'::jsonb),
               count(*)
          into v_on, v_n from g;
        v_left := v_left - v_n;
        v_on_did := v_on_did + v_n;
      end if;
    end if;

    --   · CHILD TABLES THE STORE NAMES BY THIS TABLE'S ID (CHAIR-ACCESS d, lane 2 MAKE-HOME): a bookings
    --     Table's slots Table (slug booking_slots_<this table's id without dashes>, made by
    --     custom.booking_declare through custom.work_slots_declare) stayed live when its bookings Table
    --     was archived, still holding and expiring slots for a page that was gone. It goes with its
    --     parent: archived as a whole through this same door (its own event, every chunk, the rung asked
    --     of it by name), and named here in `built_on` (kind table) so custom.record_restore brings it
    --     back with the parent. This is the one pattern by which the store names a child Table after
    --     its parent's id; a second one joins this predicate, never a door of its own. ONE PASS OF THE
    --     CHILD PER PASS OF THE PARENT, out of the parent's budget; the child is named once it is done.
    if not v_more then
      for v_child in
        select r.id
          from custom.record r
         where r.organization_id = p_organization_id
           and r.table_id = custom.table_kernel_id()
           and r.data_class = 'table'
           and r.deleted_at is null
           and r.id <> p_table_id
           and r.data ->> 'slug' = 'booking_slots_' || replace(p_table_id::text, '-', '')
         order by r.created_at, r.id
      loop
        if v_left < 1 or (v_did + v_on_did > 0 and clock_timestamp() > v_until) then
          v_more := true;
          exit;
        end if;
        v_child_res := custom.table_archive(p_organization_id, v_child, v_left, true);
        v_n := coalesce((v_child_res ->> 'archived')::integer, 0)
             + coalesce((v_child_res ->> 'built_on_archived')::integer, 0)
             + case when coalesce((v_child_res ->> 'table_archived')::boolean, false) then 1 else 0 end;
        v_left := v_left - greatest(v_n, 1);
        v_on_did := v_on_did + greatest(v_n, 1);
        if coalesce((v_child_res ->> 'done')::boolean, true) then
          v_on := v_on || jsonb_build_object('kind', 'table', 'id', v_child, 'at', v_now);
        else
          v_more := true;
          exit;
        end if;
      end loop;
    end if;

    -- WHAT THIS PASS TOOK OUTSIDE THE RECORD TABLE IS NAMED IN THE EVENT NOW, pass by pass, each
    -- entry with the moment it went (custom.record_restore matches on that moment).
    if jsonb_array_length(v_on) > 0 and v_event is not null then
      update history.migration_log m
         set inverse = m.inverse || jsonb_build_object('built_on', coalesce(m.inverse -> 'built_on', '[]'::jsonb) || v_on)
       where m.organization_id = p_organization_id and m.id = v_event;
    end if;

    -- TEMPLATE-INSTALL-2 (2026-10-19): THE TABLE'S OWN CONTENTS GO IN PASSES TOO. Archiving the Table record used to take its
    -- Fields, saved views and Rules in ONE custom.record_delete, each at the full door price (about 1 s each in a big
    -- organization), so a table with ten fields was one 10 s statement. PostgREST cancels a client call at ~8 s and the
    -- whole call rolls back, so an uninstall (or any Archive) of such a table never advanced: every retry lost the same
    -- 10 s. Now they go here, one door call each, out of this call's budget (the first always runs, so every call moves),
    -- with the whole set named in custom.delete_set exactly as record_delete names it, in the SAME open archive event.
    -- The Table itself then flips in a later call that finds nothing left under it.
    if not v_more then
      select coalesce(array_agg(c.record_id order by c.goes_at, c.record_id), '{}') into v_contents
        from custom.table_contents(p_organization_id, p_table_id) c;
      if cardinality(v_contents) > 0 then
        v_cprev := coalesce(current_setting('custom.delete_set', true), '');
        perform set_config('custom.delete_set', v_cprev || ',' || p_table_id::text || ',' || array_to_string(v_contents, ','), true);
        foreach v_built in array v_contents loop
          if v_left < 1 or (v_did + v_on_did > 0 and clock_timestamp() > v_until) then
            v_more := true;
            exit;
          end if;
          if exists (select 1 from custom.record r
                      where r.organization_id = p_organization_id and r.id = v_built and r.deleted_at is null) then
            perform custom.record_delete(p_organization_id, v_built);
            v_left := v_left - 1;
            v_on_did := v_on_did + 1;
          end if;
        end loop;
        perform set_config('custom.delete_set', v_cprev, true);
      end if;
    end if;

    -- THE TABLE ITSELF: by now its own cascade is the Fields, the saved views kept as records and the
    -- Rules it carries — tens of rows. It flips in a pass that found nothing more built on it and has
    -- time left (or has done nothing else).
    if not v_more
       and (v_did + v_on_did = 0 or clock_timestamp() <= v_until) then
      perform custom.record_delete(p_organization_id, p_table_id);
      v_table := false;
      v_table_now := true;
    end if;
  end if;

  v_done := v_live = 0 and (not v_whole or not v_table);

  -- STORE-TAILS-3: THE EVENT CLOSES WHEN THE OPERATION IS DONE — the table archived, or (for
  -- "empty it but keep it") every record archived. From then on a restore of the table brings
  -- back exactly what it names, and a later archive is a new event.
  if v_event is not null then
    perform set_config('custom.archive_event', v_prev_event, true);
    if v_done then
      update history.migration_log m
         set inverse = m.inverse || jsonb_build_object(
               'open', false,
               'archived_at', (select to_jsonb(r.deleted_at) from custom.record r
                                where r.organization_id = p_organization_id and r.id = p_table_id))
       where m.organization_id = p_organization_id and m.id = v_event;
    end if;
  end if;

  -- UNDER WAY (DATA-V2-BASICS-2, 2026-09-29). BREAKER-1 B-F13: a reload in the middle of a run showed a
  -- fresh "Archive this table" button, because nothing the page could ask said a run was open. The open
  -- archive event IS that fact; every answer — the chunk-0 look included — now says it.
  v_open := not v_done and exists (
    select 1 from history.migration_log m
     where m.organization_id = p_organization_id
       and m.verb = 'archive' and m.target_kind = 'table' and m.target_id = p_table_id
       and m.undone_at is null
       and coalesce((m.inverse ->> 'open')::boolean, false));

  return jsonb_build_object(
    'table_id',   p_table_id,
    'in_progress', v_open,               -- an earlier run of this archive was started and not finished
    'table_name', v_name,
    'archived',   v_did,                 -- what THIS call archived
    'remaining',  v_live,                -- records still live in this table
    'total',      v_live + v_gone,       -- records this table has ever held
    'archived_total', v_gone,            -- records of this table already archived, all runs
    'table_archived', not v_table,
    'done',       v_done,
    'chunk',      v_chunk,
    'archive_event', v_event,            -- STORE-TAILS-3: what "Bring it back" will restore
    'built_on_archived', v_on_did,      -- TABLE-ACTIONS: what is built on the table THIS call archived
    'confirm_over', v_confirm_over,      -- THE REVERSIBLE ACTION: ask first above this many live records
    'message',    case
      when v_chunk = 0 and v_live > 0 then
        format('%s record%s in %s would be archived. Nothing has been changed yet.',
               v_live, case when v_live = 1 then '' else 's' end, v_name)
      -- SAY WHAT THIS CALL DID (ARGS-RULED-2). An empty Table archived by THIS call used to be
      -- told "is already archived. Nothing was changed." — the opposite of what had happened.
      when v_chunk = 0 and v_whole and v_table then
        format('%s has no records left, so archiving it now would archive the table itself. Nothing has been changed yet.', v_name)
      when v_table_now and v_did = 0 then
        format('%s had no records left to archive, so the table itself is now archived — it can be brought back.', v_name)
      when v_done and v_did = 0 and not v_whole then
        format('Nothing is left to archive in %s. Nothing was changed.', v_name)
      when v_done and v_did = 0 then
        format('%s is already archived. Nothing was changed.', v_name)
      -- WHICH OF THE TWO ACTUALLY HAPPENED. Archiving everything IN a table is not archiving
      -- the table, and a screen that says it is has lied to the person who kept it on purpose.
      when v_done and not v_whole then
        format('%s record%s archived. %s is now empty and still here, and everything in it can be brought back.',
               v_did, case when v_did = 1 then '' else 's' end, v_name)
      when v_done then
        format('%s record%s archived. %s is archived, and everything in it can still be brought back.',
               v_did, case when v_did = 1 then '' else 's' end, v_name)
      -- TABLE-ACTIONS: the records are gone and what is built on the table is going, pass by pass.
      when not v_done and v_live = 0 and v_whole then
        format('%s record%s and %s thing%s built on %s archived. Call again to carry on — the table itself goes last.',
               v_did, case when v_did = 1 then '' else 's' end,
               v_on_did, case when v_on_did = 1 then '' else 's' end, v_name)
      else
        format('%s record%s archived, %s to go in %s. Call again to carry on — it picks up where this left off.',
               v_did, case when v_did = 1 then '' else 's' end, v_live, v_name)
    end);
end;
$function$;

CREATE OR REPLACE FUNCTION custom.template_uninstall(p_organization_id uuid, p_install_id uuid, p_budget_ms integer DEFAULT 4000)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
 SET statement_timeout TO '90s'
AS $function$
declare
  v_i      custom.template_install;
  v_m      jsonb;
  v_id     uuid;
  v_tbl    uuid;
  v_r      jsonb;
  v_t0     timestamptz := clock_timestamp();
  -- TEMPLATE-FRESH-3: at most 6 s. A client call is cancelled at ~8 s by PostgREST, and the budget is only checked BETWEEN steps.
  v_budget integer := least(greatest(coalesce(p_budget_ms, 4000), 0), 6000);
  v_c0     timestamptz;
  v_slow   double precision := 0;   -- the longest table_archive chunk of this call, in ms
  v_arch   jsonb;
  v_left   jsonb := '[]'::jsonb;
  v_done   boolean := true;
  v_kind   text;
  v_was    boolean;
  v_may    boolean;
  v_applets jsonb;
  v_stalled boolean := false;   -- TEMPLATE-INSTALL-2: a table pass moved nothing
  v_stepped boolean := false;   -- TEMPLATE-INSTALL-2: a step has run in this call
begin
  perform custom.assert_store_door(p_organization_id, 'custom.template_uninstall');
  perform custom.assert_client_may_reach(p_organization_id, 'custom.template_uninstall');
  select * into v_i from custom.template_install i
   where i.id = p_install_id and i.organization_id = p_organization_id for update;
  if not found then
    raise exception 'There is no such install in this organization, so there is nothing to uninstall.' using errcode = 'P0002';
  end if;
  if v_i.state = 'uninstalled' then
    return custom._template_answer(v_i, jsonb_build_object('already', true));
  end if;
  -- A STUCK INSTALL IS REMOVABLE (CHAIR-DESCRIBE-4, 2026-10-05): an install left "installing" (the page
  -- closed mid-install, a step never came back) archives what its finished steps made, like any other. The
  -- row lock above waits out a step that is running right now, so nothing half-made escapes `made`.
  v_arch := v_i.archived;
  -- THE APPLET THE INSTALL COPIED (2026-10-07): "Use this template" copies the template Applet into the organization and
  -- stamps metadata.from_template.install_id. Remove archives it with the rest (status archived + deleted_at), so its
  -- /apps/<slug> never reads a table that is gone; restore brings it back from `archived`.
  with u as (
    update app.definition a set status = 'archived', deleted_at = now(), updated_at = now()
     where a.organization_id = p_organization_id and a.deleted_at is null
       and a.metadata -> 'from_template' ->> 'install_id' = p_install_id::text
    returning a.id, a.name)
  select coalesce(jsonb_agg(jsonb_build_object('kind', 'applet', 'id', u.id, 'title', u.name)), '[]'::jsonb) into v_applets from u;
  v_arch := v_arch || v_applets;

  for v_m in select x from jsonb_array_elements(v_i.made) with ordinality as e(x, n) order by n desc loop
    v_kind := v_m ->> 'kind';
    v_id := nullif(v_m ->> 'id', '')::uuid;
    continue when v_id is null or exists (select 1 from jsonb_array_elements(v_arch) a where a ->> 'id' = v_id::text);
    -- TEMPLATE-INSTALL-2: the FIRST step of a call always runs, so a call always moves; the budget decides only about the next.
    if v_stepped and extract(epoch from clock_timestamp() - v_t0) * 1000 > v_budget then
      v_done := false;
      exit;
    end if;
    v_stepped := true;
    case v_kind
      when 'table' then
        loop
          v_c0 := clock_timestamp();
          v_r := custom.table_archive(p_organization_id, v_id, 10, true);   -- small chunks (the interim installer's ARCHIVE_CHUNK): a call stays inside the 8 s ceiling
          v_slow := greatest(v_slow, extract(epoch from clock_timestamp() - v_c0) * 1000);
          exit when coalesce((v_r ->> 'done')::boolean, false) or coalesce((v_r ->> 'table_archived')::boolean, false);
          -- TEMPLATE-INSTALL-2: A PASS THAT MOVED NOTHING IS NAMED, NEVER LOOPED ON. table_archive's first step always runs, so
          -- this is a store answer we do not know; the install says which table, and the caller stops instead of calling again.
          if coalesce((v_r ->> 'archived')::integer, 0) + coalesce((v_r ->> 'built_on_archived')::integer, 0) = 0 then
            v_left := v_left || jsonb_build_array(jsonb_build_object('kind', v_kind, 'id', v_id, 'title', v_m ->> 'title',
                        'says', 'Stopped: archiving this table moved nothing on this call (' || coalesce(v_r ->> 'message', 'no message') || ').'));
            v_stalled := true;
            exit;
          end if;
          -- TEMPLATE-FRESH-3: the next chunk starts only when it should fit what is left (1.5 x the slowest chunk so far), so a
          -- big table's call ends after the chunk that used its budget instead of starting one it cannot finish; the install
          -- stays `uninstalling` and the caller's next call resumes it.
          if extract(epoch from clock_timestamp() - v_t0) * 1000 + 1.5 * v_slow > v_budget then
            v_done := false;
            exit;
          end if;
        end loop;
        if v_stalled then
          v_done := false;
          exit;
        end if;
        exit when not v_done;
        v_arch := v_arch || jsonb_build_array(jsonb_build_object('kind', v_kind, 'id', v_id, 'title', v_m ->> 'title', 'event', v_r ->> 'archive_event'));
      when 'dashboard', 'document' then
        -- Both are records of the store; one already archived (by hand, or with its table) is left as it is.
        if exists (select 1 from custom.record r where r.organization_id = p_organization_id and r.id = v_id and r.deleted_at is null) then
          if v_kind = 'dashboard' then
            perform custom.dashboard_delete(p_organization_id, v_id);
          else
            perform custom.doc_template_delete(p_organization_id, v_id);
          end if;
          v_arch := v_arch || jsonb_build_array(jsonb_build_object('kind', v_kind, 'id', v_id, 'title', v_m ->> 'title'));
        end if;
      when 'portal' then
        perform custom.portal_archive(p_organization_id, v_id, v_m ->> 'title', 'The template that made it was uninstalled.');
        v_arch := v_arch || jsonb_build_array(jsonb_build_object('kind', v_kind, 'id', v_id, 'title', v_m ->> 'title'));
      when 'form' then
        select f.table_id into v_tbl from custom.anon_form f
         where f.organization_id = p_organization_id and f.id = v_id and f.deleted_at is null;
        if found then
          perform custom.assert_client_may_change(p_organization_id, v_tbl, 'custom.template_uninstall');
          update custom.anon_form f set deleted_at = now(), updated_at = now(), updated_by = auth.uid()
           where f.organization_id = p_organization_id and f.id = v_id;
          v_arch := v_arch || jsonb_build_array(jsonb_build_object('kind', v_kind, 'id', v_id, 'title', v_m ->> 'title'));
        end if;
      when 'view' then
        select v.subject_id into v_tbl from platform.saved_view v
         where v.organization_id = p_organization_id and v.id = v_id and v.deleted_at is null;
        if found then
          perform custom.assert_client_may_change(p_organization_id, v_tbl, 'custom.template_uninstall');
          update platform.saved_view v set deleted_at = now(), updated_at = now(), updated_by = auth.uid()
           where v.organization_id = p_organization_id and v.id = v_id;
          v_arch := v_arch || jsonb_build_array(jsonb_build_object('kind', v_kind, 'id', v_id, 'title', v_m ->> 'title'));
        end if;
      when 'record' then
        if exists (select 1 from custom.record r where r.organization_id = p_organization_id and r.id = v_id and r.deleted_at is null) then
          -- The template's Home can also hold a table the whole organization shares and the template did not
          -- make — "Checklist steps" (custom.checklist_steps_table puts it in the first Home it finds). Then the
          -- Home stays, named in `left`, and the uninstall finishes instead of being refused as a whole.
          begin
            perform custom.record_delete(p_organization_id, v_id);
            v_arch := v_arch || jsonb_build_array(jsonb_build_object('kind', v_kind, 'id', v_id, 'title', v_m ->> 'title'));
          exception when foreign_key_violation then
            v_left := v_left || jsonb_build_array(jsonb_build_object('kind', v_kind, 'id', v_id, 'title', v_m ->> 'title',
                        'says', 'Kept: it also holds tables the organization uses outside this template.'));
          end;
        end if;
      when 'agent' then
        -- The agents list's own Archive (is_archived; restorable from its Archived view), only for a copy in this
        -- organization the person may edit (agent.definition's std_update); anything else is named in `left`.
        select d.is_archived, (d.created_by = auth.uid() or iam.has_access('agent', d.id, 'editor'::public.permission_level))
          into v_was, v_may
          from agent.definition d
         where d.id = v_id and d.organization_id = p_organization_id and d.deleted_at is null;
        if not found then
          null;   -- already gone, or never this organization's: nothing to archive
        elsif v_was then
          v_arch := v_arch || jsonb_build_array(jsonb_build_object('kind', v_kind, 'id', v_id, 'title', v_m ->> 'title'));
        elsif v_may then
          update agent.definition d set is_archived = true, updated_at = now() where d.id = v_id;
          v_arch := v_arch || jsonb_build_array(jsonb_build_object('kind', v_kind, 'id', v_id, 'title', v_m ->> 'title'));
        else
          v_left := v_left || jsonb_build_array(jsonb_build_object('kind', v_kind, 'id', v_id, 'title', v_m ->> 'title',
                      'says', 'Kept: you may not change this agent, so it was not archived.'));
        end if;
      when 'workflow' then
        -- The workflows list's own Archive (is_archived), with the same rule as an agent (workflow.definition's std_update).
        select d.is_archived, (d.created_by = auth.uid() or iam.has_access('workflow', d.id, 'editor'::public.permission_level))
          into v_was, v_may
          from workflow.definition d
         where d.id = v_id and d.organization_id = p_organization_id and d.deleted_at is null;
        if not found then
          null;
        elsif v_was then
          v_arch := v_arch || jsonb_build_array(jsonb_build_object('kind', v_kind, 'id', v_id, 'title', v_m ->> 'title'));
        elsif v_may then
          update workflow.definition d set is_archived = true, updated_at = now() where d.id = v_id;
          v_arch := v_arch || jsonb_build_array(jsonb_build_object('kind', v_kind, 'id', v_id, 'title', v_m ->> 'title'));
        else
          v_left := v_left || jsonb_build_array(jsonb_build_object('kind', v_kind, 'id', v_id, 'title', v_m ->> 'title',
                      'says', 'Kept: you may not change this workflow, so it was not archived.'));
        end if;
      else
        null;   -- fields, rules, row actions, stage rules, dimensions: they go with their table.
    end case;
  end loop;

  update custom.template_install i
     set archived = v_arch,
         state = case when v_done then 'uninstalled' else 'uninstalling' end,
         refusal = case when v_stalled then jsonb_build_object('code', 'uninstall_stalled', 'door', 'custom.template_uninstall',
                          'message', v_left -> (jsonb_array_length(v_left) - 1) ->> 'says') end,
         uninstalled_at = case when v_done then now() end,
         uninstalled_by = case when v_done then auth.uid() end,
         updated_at = now()
   where i.id = v_i.id
  returning * into v_i;
  return custom._template_answer(v_i, jsonb_build_object('left', v_left, 'done', v_done));
end;
$function$;
