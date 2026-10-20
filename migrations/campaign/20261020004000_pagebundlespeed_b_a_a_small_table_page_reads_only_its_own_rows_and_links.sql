-- target: branch,production
-- additive: yes
-- guard: custom/system_enabled
-- lane: PAGE-BUNDLE-SPEED
-- lock: custom
-- based-on: custom.visible_set(uuid, uuid, uuid, permission_level) 7f1b41a16871a8d58d84170d6f2a6347c8c94666f868fbb632910e06da0ef4fd
-- based-on: custom.query_visible_ids(uuid, uuid, text) 809dbfcbcf0e9a80384f454fe197385aa261f23699eaff5bad251b21cd417f98
-- based-on: custom.reverse_columns(uuid, uuid) 5e906be06a540aafaeee05144ab849bedf74295b096881b27bd0a14cfe4ae5e2
-- based-on: custom.entity_reference_fields(uuid, uuid) b0d1a3c3aef5c3e41eaa290c0dee5d9282430a3ad6e9cd71a4f25fc4114ba7af
-- based-on: custom.read_door_granted_ids(uuid, uuid) e400a36e389b688d5ce93a9faa05a4a259e98ad764c81f752d2647caa7c8b006
--
-- PAGE-BUNDLE-SPEED b — A SMALL TABLE'S PAGE BUNDLE READS ITS OWN ROWS AND LINKS, NEVER THE WHOLE ORGANIZATION'S.
--
-- custom.table_page_bundle for an 18-row table grew from 17,472 to 38,391 buffers when its organization grew by 1,000
-- tables, 15,000 Fields and 20,000 rows (pg_stat_statements track=all, per inner statement). The steps that grew:
--   1. custom.visible_set, the class representative (3 arms) and custom.query_visible_ids' per-Table branches (4) filtered
--      `r.table_id is not distinct from <table>`: IS NOT DISTINCT FROM is never an index condition, so each read every live
--      row of the organization (136 -> 7,620 and 292 -> 7,562 buffers, twice per bundle). HOT-DOORS-3 fixed the sibling
--      all_visible check the same way. Now: `=` when the Table is named (the same rows: a non-null table equals exactly the
--      rows it is not distinct from); the null case keeps its own form.
--   2. custom.reverse_columns read every relation-capable Field of the organization (125 -> 3,509): its candidates now come
--      from record_fieldkernel_reltarget_rp_NN (pagebundlespeed_a_a), one range per target mode; the full predicate is kept.
--   3. custom.entity_reference_fields filtered nullif(entity_definition_id,'')::uuid, which no index keys (33 -> 1,232): now
--      the uuid key of record_fieldkernel_def_uuid_rp_NN (READ-SPEED-ORG a), which already holds every Field row's value.
--   4. custom.read_door_granted_ids, writing branch (both plans): `(p_table_id is null or r.table_id is not distinct from
--      p_table_id)` -> `... or r.table_id = p_table_id` (identical: the right arm only runs for a named Table), so the
--      join reads the Table's rows by index (1,603 -> 3,272 buffers per call before). The read-only branch is unchanged.
-- Proof (rolled back, 2026-10-20): in the seeded org, table_page_bundle, query_visible_ids for (org, null) (36,371 ids, the
-- null-table path), the Table kernel (1,021) and a 20,000-row table, granted ids and back-links equal old vs new; in 4 real
-- orgs (1,643 tables: 237 with back-links, 4 with entity references, 3 with granted ids, 337 query_visible_ids answers) 0
-- differences in reverse_columns, entity_reference_fields, read_door_granted_ids and query_visible_ids per table.
-- Guard (buffers, load-independent): old bodies RED 11,098 -> 20,982; these bodies GREEN 9,082 -> 9,562.
-- Test: scripts/campaign-tests/pagebundlespeed_a_small_table_bundle_flat_in_org_size.sql
-- Inverse: migrations/inverse/20261020004000_pagebundlespeed_b_a_a_small_table_page_reads_only_its_own_rows_and_links_down.sql

CREATE OR REPLACE FUNCTION custom.visible_set(p_user uuid, p_organization_id uuid, p_table_id uuid, p_required permission_level DEFAULT 'viewer'::permission_level, OUT o_all_visible boolean, OUT o_true_visibility platform.visibility[], OUT o_granted_all uuid[], OUT o_granted_visible uuid[], OUT o_carried_visible uuid[], OUT o_ladder_calls integer, OUT o_fallback boolean, OUT o_note text)
 RETURNS record
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_label   text;
  v_vis     platform.visibility;
  v_rep     uuid;
  v_id      uuid;
  v_n       integer;
  v_window  integer;
  v_carried record;
  -- SHARED-ONLY (2026-09-19): does the caller reach the TABLE itself at this level? Asked
  -- ONCE, before anything else, because it answers for every row at once.
  v_table_carries boolean := false;
  v_tables        integer;
  v_seen_memo     text;   -- STORE-READ-PERF-3
  v_ms_key        text;   -- PERF-FIX-1
  v_ms            jsonb;
begin
  o_all_visible     := false;
  o_true_visibility := '{}'::platform.visibility[];
  o_granted_all     := '{}'::uuid[];
  o_granted_visible := '{}'::uuid[];
  o_carried_visible := '{}'::uuid[];
  o_ladder_calls    := 0;
  o_fallback        := false;
  o_note            := null;

  -- PERF-FIX-1 (2026-10-07). THE ANSWER, ONCE PER STATEMENT. One list door asks this set for the same
  -- (person, organization, Table, rung) up to four times in a single statement - the predicate, the
  -- visible-ids list, the by-ids read - and each ask walked the whole ladder again (~50 ms each on a
  -- Table of a few dozen rows). The answer is a function of those four arguments and the snapshot, so
  -- the first ask leaves it in the statement memo (platform.memo_k_*: fenced by the statement, the
  -- backend, the seat and the transaction's first write) fenced here by the snapshot too, exactly as
  -- custom.tables_seen is, and the others read it back. Only the full walk is remembered (the early
  -- stops - archived, copying, fallback - are cheap and unchanged); a transaction that has written
  -- asks every time.
  if p_user is not null and p_organization_id is not null and p_table_id is not null
     and pg_catalog.pg_current_xact_id_if_assigned() is null then
    v_ms_key := 'custom.visible_set:' || p_user::text || ':' || p_organization_id::text || ':'
             || p_table_id::text || ':' || p_required::text || ':' || pg_catalog.pg_current_snapshot()::text;
    v_ms := platform.memo_k_get(v_ms_key)::jsonb;
    if v_ms is not null then
      o_all_visible     := (v_ms ->> 'a')::boolean;
      o_true_visibility := coalesce(array(select jsonb_array_elements_text(v_ms -> 't')), '{}'::text[])::platform.visibility[];
      o_granted_all     := coalesce(array(select jsonb_array_elements_text(v_ms -> 'g')), '{}'::text[])::uuid[];
      o_granted_visible := coalesce(array(select jsonb_array_elements_text(v_ms -> 'v')), '{}'::text[])::uuid[];
      o_carried_visible := coalesce(array(select jsonb_array_elements_text(v_ms -> 'c')), '{}'::text[])::uuid[];
      o_ladder_calls    := (v_ms ->> 'n')::integer;
      o_fallback        := (v_ms ->> 'f')::boolean;
      o_note            := v_ms ->> 'o';
      return;
    end if;
  end if;

  if p_user is null or p_organization_id is null then
    o_fallback := true;
    o_note := 'READ-PERF: no principal, so the set-based shape has nobody to answer for. The door is walking the per-row ladder, which is what it did before this file.';
    return;
  end if;

  -- CD-LADDER (2026-10-03): AN ARCHIVED ORGANIZATION IS CLOSED TO EVERYONE (access ladder T-33). The
  -- kernel and custom.read_record refuse every row of it, so the set every list door is built from is
  -- empty too (custom.list_door_disagreements found this set carrying rows the read door refused).
  if exists (select 1 from iam.organizations o
              where o.id = p_organization_id and o.archived_at is not null) then
    o_note := 'ARCHIVED: this organization is archived and closed to everyone (access ladder T-33).';
    return;
  end if;

  -- TABLE-ACTIONS: A TABLE STILL BEING COPIED IS ITS MAKER'S ALONE. For anybody else its row set is
  -- empty, exactly the shape of an archived organization above, so every list door built on this set
  -- (custom.read_records, custom.read_records_page, custom.query_visible_ids …) answers nothing.
  if p_table_id is not null and custom._copy_in_progress_hides(p_user, p_table_id) then
    o_note := 'COPYING: this table is still being copied, and only the person copying it can see it.';
    return;
  end if;

  -- THE FOURTH THING THAT MAKES IT STOP (SHARED-ONLY). With no Table named, the answer spans
  -- the kernel Table as well as every ordinary one, and a Table is no longer a member of a
  -- visibility CLASS — it is visible when something inside it is (arm 4 of the one ladder),
  -- so two Tables of one class answer differently and no representative can speak for them.
  if p_table_id is null then
    o_fallback := true;
    o_note := 'SHARED-ONLY: no Table was named, so this answer spans the kernel Table, whose rows '
           || 'are Tables — and a Table is visible when a record inside it is, which is not a '
           || 'property of its visibility class. The door is walking the per-row ladder. REMEDY: '
           || 'name the Table, or give custom.visible_set a per-Table carry list the way '
           || 'custom.visible_predicate_sql would need to emit `table_id = any(...)`.';
    return;
  end if;

  -- THE CONFIDENTIAL STOP (CHAIR-CONFIDENTIAL-STORE, 2026-10-02). A row of a Confidential Table —
  -- or a child of one — opens to its owner and the people ITS OWN fields name, so two rows of one
  -- visibility class no longer answer alike and no representative may speak for its class. Asked
  -- only when the organization holds a Confidential Table at all, so every other organization pays
  -- one bounded look at its own Tables and nothing else changes.
  if p_table_id is distinct from custom.table_kernel_id()
     and exists (select 1 from custom.record t
                  where t.organization_id = p_organization_id
                    and t.table_id = custom.table_kernel_id()
                    and t.deleted_at is null
                    and t.data ->> 'level' = 'confidential')
     and (exists (select 1 from custom.record t
                   where t.organization_id = p_organization_id
                     and t.id = p_table_id
                     and t.data ->> 'level' = 'confidential')
          or exists (select 1 from custom.record c
                      where c.organization_id = p_organization_id
                        and c.table_id = p_table_id
                        and c.deleted_at is null
                        and jsonb_typeof(c.data -> 'parent_id') = 'string'
                        and custom.confidential_anchor(c.id) is not null)) then
    o_fallback := true;
    o_note := 'CONFIDENTIAL: this Table is Confidential, or holds rows whose parent is, so each row '
           || 'opens to its owner and the people its own fields name and no visibility class can '
           || 'answer for another row. The door is walking the per-row ladder (custom.confidential_answer).';
    return;
  end if;

  -- THE FIRST THING THAT MAKES IT STOP. `iam.has_access_for_base` pushes a child's REGISTERED
  -- FK parents onto its frontier as well as the closure. There is no such registration for
  -- `record` today, so a record's containers come only from associations — which
  -- `custom.read_door_carried_ids` resolves. If one is ever registered, a row's container is a
  -- COLUMN of its own row, two rows of one class stop answering alike, and the argument this
  -- file rests on stops holding. So it says so and walks.
  if exists (select 1 from platform.entity_relationships er
              where er.child_type = 'record' and er.kind in ('composition', 'containment')) then
    o_fallback := true;
    o_note := 'READ-PERF: `record` now has a registered FK containment parent in '
           || 'platform.entity_relationships, so a row''s container is a column of its own row and '
           || 'two rows of one visibility class no longer answer alike. The door is walking the '
           || 'per-row ladder. REMEDY: teach custom.visible_set to classify on that column too, or '
           || 'seed custom.read_door_carried_ids from it the way it is seeded from associations.';
    return;
  end if;

  -- AN ARCHIVED TABLE WITH NO LIVE RECORD IS ALL-VISIBLE, SAID AT ONCE (CHAIR-DOORS-3A, asked by lane 9
  -- SCOPES-ON-THE-STORE, scopes-i). For a Table that is not the kernel, past the confidential and the
  -- containment-relationship stops above, whose own kernel row is not live and which holds no live
  -- record, the rest of this body can only answer o_all_visible = true with every array empty: the
  -- Table-carries question is asked of a live Table only; custom.read_door_granted_ids returns live
  -- ids only, so v_n = 0; custom.read_door_carried_ids has no live record to climb from, so o_ids = {}
  -- and o_containers = 0; every representative query reads live rows only; and the final `exists`
  -- is false. Production, 2026-10-03: 27 of 27 archived scope types, both seats, answered exactly
  -- so after the granted-ids read, the containment walk, 15 representative queries and the exists.
  -- The answer is the same; only the work is gone. o_ladder_calls stays 0, as it was.
  if p_table_id is distinct from custom.table_kernel_id()
     and not exists (select 1 from custom.record t
                      where t.organization_id = p_organization_id
                        and t.id = p_table_id
                        and t.deleted_at is null)
     and not exists (select 1 from custom.record r
                      where r.organization_id = p_organization_id
                        and r.table_id = p_table_id
                        and r.deleted_at is null) then
    o_all_visible := true;
    return;
  end if;

  -- THE TABLE ITSELF, ONCE (SHARED-ONLY). A Table shared with somebody carries every row in it
  -- (arm 3 of `custom.carrying_edges_of`), so one ladder call about the TABLE answers for the
  -- whole page.
  --
  -- 🚨 AND THE QUESTION IS `iam.has_access_for`, NOT `custom.reaches_directly` (LEAK-T10,
  -- 2026-09-20). This is the whole of acceptance test 10 and it is a live cross-project leak.
  -- `custom.reaches_directly` treats the Table as the SUBJECT of the walk, so its arm 3 climbs
  -- from the Table into the Table's own HOMES — and a person shared ONE Home of a Table was
  -- handed every record of that Table in every other Home, with its contents, by this line,
  -- while `custom.read_record` refused her the same row.
  --
  -- What the PER-ROW ladder asks about this Table is one thing, and asking exactly it is what
  -- makes the two doors agree by construction instead of by agreement:
  -- `custom.visibility_ancestors` returns the Table as a TERMINAL ancestor of every row in it,
  -- at `admin`, and `custom.reaches_directly` arm 3 then asks
  -- `iam.has_access_for(user, 'record', <the Table>, required)` about it — ownership, a grant
  -- row, the organization lanes, the platform's own containment closure, and nothing above
  -- them. A whole Table shared through `custom.share_grant` writes the `iam.permissions` row
  -- that admits it, so the case this shortcut exists for is untouched.
  --
  -- The rows it does NOT speak for are the ones whose own `visibility` is below `internal`,
  -- which that edge deliberately does not carry; they fall through to their class below.
  --
  -- THE SAME-ORGANISATION, LIVE-ROW JOIN STAYS. The kernel Tables (`Table`, `Field`, and the
  -- home-record kernel every fixture hangs off) live in the SYSTEM organization, which is
  -- global_readable, so `iam.has_access_for` says yes about them to EVERY signed-in person.
  -- Without this line `p_table_id = 11111111-…-0002` — the Field kernel — made every Field row
  -- of a `shared_only` organization visible to every member.
  if p_table_id is distinct from custom.table_kernel_id()
     and exists (select 1 from custom.record t
                  where t.organization_id = p_organization_id
                    and t.id = p_table_id
                    and t.deleted_at is null) then
    o_ladder_calls := o_ladder_calls + 1;
    v_table_carries := custom.table_carries_its_rows(p_user, p_table_id, p_required);
  end if;

  -- THE GRANTED IDS, and the second thing that makes it stop.
  -- STORE-READ-PERF-3: for the Table kernel, the same ids may already be in this statement's memo,
  -- left by custom.tables_seen_once_per_group, which asked read_door_granted_ids' own query once for
  -- every organization of the door statement that called us.
  -- STORE-READ-PERF-4: only while the transaction has written nothing (a writing transaction may
  -- have changed the answer after the memo was taken).
  if p_table_id = custom.table_kernel_id() and pg_catalog.pg_current_xact_id_if_assigned() is null then
    v_seen_memo := platform.memo_k_get('custom.kernel_granted:' || p_organization_id::text || ':' || pg_catalog.pg_current_snapshot()::text);
  end if;
  if v_seen_memo is not null then
    o_granted_all := array(select g from unnest(string_to_array(nullif(v_seen_memo, ''), ',')::uuid[]) g order by g);
    v_seen_memo := null;
  else
    o_granted_all := custom.read_door_granted_ids(p_organization_id, p_table_id);
  end if;
  v_n := coalesce(array_length(o_granted_all, 1), 0);
  if v_n > custom.read_door_ladder_ceiling() then
    o_fallback := true;
    o_note := format('READ-PERF: %s ids of this Table carry a grant, a membership or a closure row, '
                  || 'which is over the ceiling of %s, so asking them one at a time is no cheaper '
                  || 'than the walk this replaces. The door is walking the per-row ladder. REMEDY: '
                  || 'raise custom.read_door_ladder_ceiling(), or resolve grants set-based the way '
                  || 'custom.read_door_carried_ids resolves containment.',
                  v_n, custom.read_door_ladder_ceiling());
    return;
  end if;

  -- THE TABLE LIST (SHARED-ONLY). The rows of the kernel Table are the organization's Tables,
  -- and a Table is visible when a record inside it is — one Table at a time, never by class.
  -- An organization holds a few hundred Tables at the very most (263 is the largest on this
  -- database today, against a ceiling of 5,000), so this enumerates them and asks the ladder
  -- once each. Over the ceiling it says so and walks, like every other stop here.
  if p_table_id = custom.table_kernel_id() then
    select count(*) into v_tables
      from custom.record r
     where r.organization_id = p_organization_id
       and r.table_id = custom.table_kernel_id()
       and r.deleted_at is null;
    if v_tables > custom.read_door_ladder_ceiling() then
      o_fallback := true;
      o_note := format('SHARED-ONLY: this organization holds %s Tables, over the ceiling of %s, and a '
                    || 'Table is visible when a record inside it is - which no representative can '
                    || 'answer for. The door is walking the per-row ladder. REMEDY: raise '
                    || 'custom.read_door_ladder_ceiling(), or index the "does this Table hold a row '
                    || 'this person reaches" question the way custom.visibility_cache intends.',
                    v_tables, custom.read_door_ladder_ceiling());
      return;
    end if;
    -- STORE-READ-PERF-3 (2026-09-28). At viewer the same answer — custom.has_visibility about every
    -- live Table — comes from custom.tables_seen_once_per_group: the one ladder asked once per group
    -- of Tables it cannot tell apart (its header has the argument), or, when the door statement
    -- that called us already asked it for this person and organization, from that statement's memo.
    -- Any other level walks every Table as before. o_ladder_calls still counts one answer per Table.
    if p_required = 'viewer'::public.permission_level then
      v_seen_memo := case when pg_catalog.pg_current_xact_id_if_assigned() is null
                          then platform.memo_k_get('custom.tables_seen:' || p_user::text || ':' || p_organization_id::text
                                                   || ':' || pg_catalog.pg_current_snapshot()::text) end;
      if v_seen_memo is null then
        select coalesce(array_agg(g.id) filter (where g.seen), '{}'::uuid[])
          into o_carried_visible
          from custom.tables_seen_once_per_group(p_user, array[p_organization_id]) g;
      else
        o_carried_visible := coalesce(string_to_array(nullif(v_seen_memo, ''), ',')::uuid[], '{}'::uuid[]);
      end if;
      o_ladder_calls := o_ladder_calls + v_tables;
    else
      for v_id in
        select r.id
          from custom.record r
         where r.organization_id = p_organization_id
           and r.table_id = custom.table_kernel_id()
           and r.deleted_at is null
      loop
        o_ladder_calls := o_ladder_calls + 1;
        if custom.has_visibility(p_user, 'record', v_id, p_required) then
          o_carried_visible := o_carried_visible || v_id;
        end if;
      end loop;
    end if;
    o_all_visible := (v_tables = coalesce(array_length(o_carried_visible, 1), 0));
    if v_ms_key is not null then
      perform platform.memo_k_put(v_ms_key, jsonb_build_object('a', o_all_visible, 't', to_jsonb(o_true_visibility),
        'g', to_jsonb(o_granted_all), 'v', to_jsonb(o_granted_visible), 'c', to_jsonb(o_carried_visible),
        'n', o_ladder_calls, 'f', o_fallback, 'o', o_note)::text);
    end if;
    return;
  end if;

  -- CONTAINMENT, ONCE, DOWNWARD — and the third thing that makes it stop.
  v_carried := custom.read_door_carried_ids(p_user, p_organization_id, p_table_id, p_required);
  o_ladder_calls := o_ladder_calls + coalesce(v_carried.o_containers, 0);
  if v_carried.o_ids is null then
    o_fallback := true;
    o_note := format('READ-PERF: this Table''s records sit under %s distinct containers, which is '
                  || 'over the ceiling of %s, so asking the ladder about each of them is no cheaper '
                  || 'than the walk this replaces. The door is walking the per-row ladder. REMEDY: '
                  || 'raise custom.read_door_ladder_ceiling(), or give the containers an accessible-set '
                  || 'cache the way VIS-9''s epochs intend.',
                  v_carried.o_containers, custom.read_door_ladder_ceiling());
    return;
  end if;
  o_carried_visible := v_carried.o_ids;

  -- THE CLASSES. One ladder call for each label of `platform.visibility` this Table actually
  -- holds, asked about a row that is NOT the caller's own, NOT granted and NOT carried — the
  -- three things that would make a representative answer for a reason its class does not have.
  for v_label in select e.enumlabel
                   from pg_catalog.pg_enum e
                   join pg_catalog.pg_type t on t.oid = e.enumtypid
                   join pg_catalog.pg_namespace n on n.oid = t.typnamespace
                  where n.nspname = 'platform' and t.typname = 'visibility'
                  order by e.enumsortorder
  loop
    v_vis := v_label::platform.visibility;
    -- THE TABLE ALREADY ANSWERED FOR THIS CLASS (SHARED-ONLY). The Table edge carries every
    -- row at or above `internal`, so when the caller reaches the Table there is nothing left
    -- to ask about those classes and no representative to find.
    if v_table_carries and v_vis >= 'internal'::platform.visibility then
      o_true_visibility := o_true_visibility || v_vis;
      continue;
    end if;
    -- THE ROW THIS CLASS SPEAKS FOR, found in three bounded index scans instead of one scan of
    -- the class. `created_by is distinct from p_user` is two ranges and a null, and each of the
    -- three stops at its own first entry; the window is one row wider than the number of ids
    -- that may not represent their class, so it cannot miss a row it is allowed to choose.
    v_window := coalesce(array_length(o_granted_all, 1), 0)
              + coalesce(array_length(o_carried_visible, 1), 0) + 1;
    -- PAGE-BUNDLE-SPEED (2026-10-20): a named Table is read by its index key (organization, table_id, visibility,
    -- created_by); `is not distinct from` kept the Table out of the index condition, so each class read every row of
    -- the organization of that class. Same rows: table_id = p_table_id is `is not distinct from` when p_table_id is set.
    if p_table_id is not null then
      select c.id into v_rep
        from (
          (select r.id
             from custom.record r
            where r.organization_id = p_organization_id
              and r.table_id = p_table_id
              and r.deleted_at is null
              and r.visibility = v_vis
              and r.created_by is null
            limit v_window)
          union all
          (select r.id
             from custom.record r
            where r.organization_id = p_organization_id
              and r.table_id = p_table_id
              and r.deleted_at is null
              and r.visibility = v_vis
              and r.created_by < p_user
            order by r.created_by desc
            limit v_window)
          union all
          (select r.id
             from custom.record r
            where r.organization_id = p_organization_id
              and r.table_id = p_table_id
              and r.deleted_at is null
              and r.visibility = v_vis
              and r.created_by > p_user
            order by r.created_by asc
            limit v_window)
        ) c
       where not (c.id = any (o_granted_all))
         and not (c.id = any (o_carried_visible))
       limit 1;
    else
      select c.id into v_rep
        from (
          (select r.id
             from custom.record r
            where r.organization_id = p_organization_id
              and r.table_id is not distinct from p_table_id
              and r.deleted_at is null
              and r.visibility = v_vis
              and r.created_by is null
            limit v_window)
          union all
          (select r.id
             from custom.record r
            where r.organization_id = p_organization_id
              and r.table_id is not distinct from p_table_id
              and r.deleted_at is null
              and r.visibility = v_vis
              and r.created_by < p_user
            order by r.created_by desc
            limit v_window)
          union all
          (select r.id
             from custom.record r
            where r.organization_id = p_organization_id
              and r.table_id is not distinct from p_table_id
              and r.deleted_at is null
              and r.visibility = v_vis
              and r.created_by > p_user
            order by r.created_by asc
            limit v_window)
        ) c
       where not (c.id = any (o_granted_all))
         and not (c.id = any (o_carried_visible))
       limit 1;
    end if;
    if v_rep is not null then
      o_ladder_calls := o_ladder_calls + 1;
      if custom.has_visibility(p_user, 'record', v_rep, p_required) then
        o_true_visibility := o_true_visibility || v_vis;
      end if;
    end if;
  end loop;

  -- THE GRANTED IDS, ONE AT A TIME, ON THE ONE LADDER. Nothing here decides anything: it asks.
  foreach v_id in array o_granted_all loop
    o_ladder_calls := o_ladder_calls + 1;
    if custom.has_visibility(p_user, 'record', v_id, p_required) then
      o_granted_visible := o_granted_visible || v_id;
    end if;
  end loop;

  -- IS IT THE WHOLE TABLE? Then the page needs no visibility predicate at all and the LIMIT
  -- stops the scan at the first p_limit rows. This is the ordinary case — somebody reading a
  -- Table of their own organization — and it is the case that was costing seconds.
  -- HOT-DOORS-3 (2026-10-08): a named Table is read by its index key (organization, table_id): `is not distinct
  -- from` kept the Table out of the index condition and filtered every live row of the organization (26,000
  -- rows, 14 ms). Same answer; no Table named reads the rows with none, as before. mx.read_page_set = off: as before.
  if p_table_id is not null and coalesce(current_setting('mx.read_page_set', true), '') <> 'off' then
    o_all_visible := (v_n = 0)
                     and not exists (
                       select 1 from custom.record r
                        where r.organization_id = p_organization_id
                          and r.table_id = p_table_id
                          and r.deleted_at is null
                          and not (r.visibility = any (o_true_visibility)));
  else
    o_all_visible := (v_n = 0)
                     and not exists (
                       select 1 from custom.record r
                        where r.organization_id = p_organization_id
                          and r.table_id is not distinct from p_table_id
                          and r.deleted_at is null
                          and not (r.visibility = any (o_true_visibility)));
  end if;
  if v_ms_key is not null then
    perform platform.memo_k_put(v_ms_key, jsonb_build_object('a', o_all_visible, 't', to_jsonb(o_true_visibility),
      'g', to_jsonb(o_granted_all), 'v', to_jsonb(o_granted_visible), 'c', to_jsonb(o_carried_visible),
      'n', o_ladder_calls, 'f', o_fallback, 'o', o_note)::text);
  end if;
  return;
end;
$function$;
CREATE OR REPLACE FUNCTION custom.query_visible_ids(p_organization_id uuid, p_table_id uuid DEFAULT NULL::uuid, p_required text DEFAULT 'viewer'::text)
 RETURNS SETOF uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_user uuid := custom.query_principal();
  v_set  record;
  v_tbl  uuid;
  -- Access ladder T-36: "Shown to" is the list filter ("Only me" hides, never locks). One context
  -- per statement; platform.shown_to_lists decides each row exactly as every other list door does.
  v_ctx  jsonb;
  -- STORE-READ-PERF-4: the Table-kernel answer for every organization of this statement at once.
  v_snap  text;
  v_m     text;
  v_orgs  uuid[];
  v_o     uuid;
  v_sets  jsonb := '[]'::jsonb;
  v_one   record;
  v_among uuid[];
  -- STORE-READ-PERF-6
  v_seen  uuid[];
  v_b     jsonb;
  v_list  text;
  v_pk    text;
  v_pairs text[];
  v_x     text;
  v_t     uuid;
  v_hd7   boolean;  -- HOT-DOORS-7
begin
  -- The organization wall, before any row is fetched, because this is now a door a
  -- signed-in person may execute directly.
  perform custom.assert_client_may_reach(p_organization_id, 'custom.query_visible_ids');

  -- A connection with no principal at all is the campaign's own maintenance and is judged by
  -- the ROLE instead, exactly as `custom.query_access_ids` judged it. Unchanged.
  if v_user is null then
    if custom.query_is_store_owner() then
      return query
        select r.id
          from custom.record r
         where r.organization_id = p_organization_id
           and (p_table_id is null or r.table_id = p_table_id)
           and r.deleted_at is null
           and coalesce(r.metadata ->> 'quarantine', 'false') <> 'true';
    end if;
    return;
  end if;
  -- STORE-READ-PERF-5 (2026-09-30): THE TABLE LIST AMONG NAMED TABLES. A door that shows only some
  -- Tables (the scope screens: the Tables the context system keeps) asks through
  -- custom.tables_listed_among, which names them for this organization in the statement memo
  -- ('custom.qvi_kernel_among:<person>:<organization>') around its one call here and drops the entry
  -- after. Then this answer is the answer below restricted to those Tables: the same live,
  -- unquarantined, "shown to" rows, and of them the ones she created or the one ladder's viewer
  -- answer sees — custom.tables_seen_among asked for those Tables only (a Table's answer never
  -- depends on which Tables are walked beside it). Below, at viewer on the Table kernel,
  -- custom.visible_set answers exactly that set — its kernel branch hands back no granted or class
  -- answer, only "every Table is seen" (then each of these is among the seen ones) or the seen list
  -- — except at its stops, where it walks each row; so at a stop (an FK containment parent for
  -- record, more granted kernel ids or live Tables than the ceiling) this is not used and the full
  -- answer below is given, as always.
  if p_table_id = custom.table_kernel_id() and p_required = 'viewer' then
    v_m := platform.memo_k_get('custom.qvi_kernel_among:' || v_user::text || ':' || p_organization_id::text);
    if v_m is not null
       and not exists (select 1 from platform.entity_relationships er
                        where er.child_type = 'record' and er.kind in ('composition', 'containment'))
       and coalesce(cardinality(custom.read_door_granted_ids(p_organization_id, custom.table_kernel_id())), 0)
           <= custom.read_door_ladder_ceiling()
       and (select count(*) from custom.record r
             where r.organization_id = p_organization_id
               and r.table_id = custom.table_kernel_id()
               and r.deleted_at is null) <= custom.read_door_ladder_ceiling() then
      v_among := coalesce(string_to_array(nullif(v_m, ''), ',')::uuid[], '{}'::uuid[]);
      -- STORE-READ-PERF-6 (2026-10-01): THE AMONG WALK ONCE FOR EVERY ORGANIZATION OF THE STATEMENT. A
      -- door that asks this list for several organizations (custom.context_tree) may name them with
      -- their Tables in the statement memo ('custom.kernel_among_batch:<person>': {organization: [Table
      -- ids]}). Then, in a transaction that has written nothing, custom.tables_seen_among is asked once
      -- for all those organizations and all those Tables (a Table's answer never depends on which Tables
      -- or organizations are walked beside it — it is the one ladder's viewer answer about that Table),
      -- and kept in the statement memo; the filter below reads only this organization's Tables of it.
      -- Otherwise it is asked for this organization and these Tables, as before.
      v_seen := null;
      if pg_catalog.pg_current_xact_id_if_assigned() is null then
        v_b := nullif(platform.memo_k_get('custom.kernel_among_batch:' || v_user::text), '')::jsonb;
        -- only when the batch names this organization with every Table this call asks about
        if v_b ? p_organization_id::text
           and not exists (select 1 from unnest(v_among) a
                            where not (v_b -> p_organization_id::text) ? a::text) then
          v_pk := 'custom.kernel_among_seen:' || v_user::text || ':' || md5(v_b::text) || ':'
               || pg_catalog.pg_current_snapshot()::text;
          v_m := platform.memo_k_get(v_pk);
          if v_m is null then
            select coalesce(string_agg(g.organization_id::text || ':' || g.id::text, ','), '') into v_m
              from custom.tables_seen_among(
                     v_user,
                     array(select k::uuid from jsonb_object_keys(v_b) k order by 1),
                     array(select distinct e::uuid from jsonb_each(v_b) t, jsonb_array_elements_text(t.value) e order by 1)) g
             where g.seen;
            perform platform.memo_k_put(v_pk, v_m);
          end if;
          -- this organization's seen Tables only (a record id is unique only within its organization)
          v_seen := array(select split_part(x, ':', 2)::uuid from unnest(string_to_array(nullif(v_m, ''), ',')) x
                           where split_part(x, ':', 1) = p_organization_id::text);
        end if;
      end if;
      if v_seen is null then
        select coalesce(array_agg(g.id), '{}'::uuid[]) into v_seen
          from custom.tables_seen_among(v_user, array[p_organization_id], v_among) g
         where g.seen and g.organization_id = p_organization_id;
      end if;
      v_ctx := custom._record_shown_to_ctx(array[p_organization_id], custom.table_kernel_id());
      return query
        select r.id
          from custom.record r
         where r.organization_id = p_organization_id
           and r.table_id = custom.table_kernel_id()
           and r.id = any (v_among)
           and r.deleted_at is null
           and coalesce(r.metadata ->> 'quarantine', 'false') <> 'true'
           and platform.shown_to_lists(r.shown_to, r.visibility, r.created_by, r.organization_id, v_user, v_ctx)
           and ( r.created_by = v_user
              or r.id = any (v_seen) );
      return;
    end if;
    v_m := null;
  end if;
  -- STORE-READ-PERF-4 (2026-09-29): THE TABLE LIST, ANSWERED FOR EVERY ORGANIZATION OF THE STATEMENT
  -- AT ONCE. A door that walks many organizations (the data home, the scope tree) first asks
  -- custom.tables_seen_once_per_group for all of them, which names them in this statement's memo.
  -- The first of its per-organization calls here then works out THIS function's own answer — the
  -- same custom.visible_set per organization, the same filters, the same branches, word for word
  -- below — for every one of those organizations in one pass, and leaves each in the memo; the
  -- rest read theirs. Only at viewer, only on the Table kernel, only while the transaction has
  -- written nothing, and never for an organization at one of visible_set's stops (it walks here
  -- as always). Each organization is still decided in its own call, by the wall above, before its
  -- answer is read.
  if p_table_id = custom.table_kernel_id() and p_required = 'viewer'
     and pg_catalog.pg_current_xact_id_if_assigned() is null then
    v_snap := pg_catalog.pg_current_snapshot()::text;
    v_m := platform.memo_k_get('custom.qvi_kernel:' || v_user::text || ':' || p_organization_id::text || ':' || v_snap);
    if v_m is not null then
      return query select x::uuid from unnest(string_to_array(nullif(v_m, ''), ',')) x;
      return;
    end if;
    v_orgs := string_to_array(nullif(platform.memo_k_get('custom.tables_seen_orgs:' || v_user::text || ':' || v_snap), ''), ',')::uuid[];
    -- (an organization at one of visible_set's stops walks on its own, below, without a batch)
    -- HOT-DOORS-7 (2026-10-09): with the switch on, every organization's custom.visible_set answer comes from
    -- custom.kernel_viewer_sets, one call for all of them (the same answers, the same memo slots); this
    -- organization's own answer is then read from that set below. Off: one custom.visible_set per organization.
    v_hd7 := p_organization_id = any (coalesce(v_orgs, '{}'::uuid[])) and custom.hot_doors_7_on(v_user);
    if p_organization_id = any (coalesce(v_orgs, '{}'::uuid[]))
       and (v_hd7
            or not (custom.visible_set(v_user, p_organization_id, custom.table_kernel_id(),
                                       'viewer'::public.permission_level)).o_fallback) then
      -- STORE-READ-PERF-5: the "shown to" context of these organizations' Tables only, without the
      -- teammates where no row can read them (custom._record_shown_to_ctx; same answers).
      if v_hd7 then
        -- at the Table kernel and viewer custom.visible_set's o_true_visibility and o_granted_visible are always empty
        select coalesce(jsonb_agg(jsonb_build_object('org', k.organization_id, 'all', k.all_visible,
                          'tv', '[]'::jsonb,
                          'ga', coalesce(to_jsonb(k.granted_all), '[]'::jsonb),
                          'gv', '[]'::jsonb,
                          'cv', coalesce(to_jsonb(k.carried_visible), '[]'::jsonb))), '[]'::jsonb)
          into v_sets
          from custom.kernel_viewer_sets(v_user, v_orgs) k
         where not k.fallback;
        if exists (select 1 from jsonb_array_elements(v_sets) e where (e ->> 'org')::uuid = p_organization_id) then
          v_ctx := custom._record_shown_to_ctx(v_orgs, custom.table_kernel_id());
        end if;
      else
      v_ctx := custom._record_shown_to_ctx(v_orgs, custom.table_kernel_id());
      foreach v_o in array v_orgs loop
        v_set := custom.visible_set(v_user, v_o, custom.table_kernel_id(), 'viewer'::public.permission_level);
        continue when v_set.o_fallback;
        v_sets := v_sets || jsonb_build_object('org', v_o, 'all', v_set.o_all_visible,
                    'tv', coalesce(to_jsonb(v_set.o_true_visibility), '[]'::jsonb),
                    'ga', coalesce(to_jsonb(v_set.o_granted_all), '[]'::jsonb),
                    'gv', coalesce(to_jsonb(v_set.o_granted_visible), '[]'::jsonb),
                    'cv', coalesce(to_jsonb(v_set.o_carried_visible), '[]'::jsonb));
      end loop;
      end if;
      if exists (select 1 from jsonb_array_elements(v_sets) e where (e ->> 'org')::uuid = p_organization_id) then
        for v_one in
          with sets as materialized (
            select (e ->> 'org')::uuid as org, (e ->> 'all')::boolean as all_v,
                   array(select jsonb_array_elements_text(e -> 'tv'))::platform.visibility[] as tv,
                   array(select jsonb_array_elements_text(e -> 'ga'))::uuid[] as ga,
                   array(select jsonb_array_elements_text(e -> 'gv'))::uuid[] as gv,
                   array(select jsonb_array_elements_text(e -> 'cv'))::uuid[] as cv
              from jsonb_array_elements(v_sets) e
          )
          select s.org,
                 coalesce((select string_agg(r.id::text, ',')
                             from custom.record r
                            where r.organization_id = s.org
                              and r.table_id = custom.table_kernel_id()
                              and r.deleted_at is null
                              and coalesce(r.metadata ->> 'quarantine', 'false') <> 'true'
                              and platform.shown_to_lists(r.shown_to, r.visibility, r.created_by, r.organization_id, v_user, v_ctx)
                              and case
                                    when s.all_v then true
                                    when coalesce(array_length(s.tv, 1), 0) > 0 then
                                      ( r.created_by = v_user
                                     or (r.visibility = any (s.tv) and not (r.id = any (s.ga)))
                                     or r.id = any (s.gv)
                                     or r.id = any (s.cv) )
                                    else
                                      ( r.created_by = v_user
                                     or r.id = any (s.gv)
                                     or r.id = any (s.cv) )
                                  end), '') as ids
            from sets s
        loop
          perform platform.memo_k_put('custom.qvi_kernel:' || v_user::text || ':' || v_one.org::text || ':' || v_snap, v_one.ids);
          if v_one.org = p_organization_id then
            v_m := v_one.ids;
          end if;
        end loop;
        return query select x::uuid from unnest(string_to_array(nullif(v_m, ''), ',')) x;
        return;
      end if;
    end if;
  end if;

  -- STORE-READ-PERF-6 (2026-10-01): EVERY NAMED (ORGANIZATION, TABLE) OF THE STATEMENT AT ONCE. A door
  -- that reads many ordinary Tables in one statement (custom.context_tree: its scope Tables) names the
  -- pairs in the statement memo ('custom.qvi_pairs:<person>'). The first call here about a named pair,
  -- at viewer, in a transaction that has written nothing, works out THIS function's own answer for
  -- every named pair in one pass — the loop below (a Table with no live record of the organization
  -- answers nothing; custom.visible_set per pair; its four branches), with ONE query over all pairs —
  -- and leaves each pair's ids in the statement memo; the rest read theirs. A pair at one of
  -- visible_set's stops is left out and walks below in its own call, as always. The "shown to"
  -- context is one for all the named organizations: the whole platform.shown_to_context('record')
  -- when a live row of a named pair says my_team, else custom._record_shown_to_ctx for those
  -- organizations (which is the whole context when one of their defaults is my_team, else each
  -- organization's default without the teammates) — any of these answers platform.shown_to_lists
  -- exactly as the per-Table context does, because a row reads only its own organization's default
  -- and reads the teammates only when its list resolves to my_team. Each call still meets the wall
  -- above, for its own organization, before its answer is read.
  if p_table_id is not null and p_table_id <> custom.table_kernel_id() and p_required = 'viewer'
     and pg_catalog.pg_current_xact_id_if_assigned() is null then
    v_list := platform.memo_k_get('custom.qvi_pairs:' || v_user::text);
    if v_list is not null
       and strpos(',' || v_list || ',', ',' || p_organization_id::text || ':' || p_table_id::text || ',') > 0 then
      v_pk := 'custom.qvi_pair:' || v_user::text || ':' || md5(v_list) || ':' || pg_catalog.pg_current_snapshot()::text || ':';
      v_m := platform.memo_k_get(v_pk || p_organization_id::text || ':' || p_table_id::text);
      if v_m is null and platform.memo_k_get(v_pk || 'asked') is null then
        perform platform.memo_k_put(v_pk || 'asked', '1');
        v_pairs := array(select distinct x from unnest(string_to_array(v_list, ',')) x where x <> '' order by 1);
        v_orgs := array(select distinct split_part(x, ':', 1)::uuid from unnest(v_pairs) x order by 1);
        if exists (select 1
                     from unnest(v_pairs) x
                     join custom.record r
                       on r.organization_id = split_part(x, ':', 1)::uuid
                      and r.table_id = split_part(x, ':', 2)::uuid
                      and r.deleted_at is null
                      and r.shown_to = 'my_team'::platform.shown_to) then
          v_ctx := platform.shown_to_context('record');
        else
          v_ctx := custom._record_shown_to_ctx(v_orgs, split_part(v_pairs[1], ':', 2)::uuid);
        end if;
        foreach v_x in array v_pairs loop
          v_o := split_part(v_x, ':', 1)::uuid;
          v_t := split_part(v_x, ':', 2)::uuid;
          if not exists (select 1 from custom.record r
                          where r.organization_id = v_o and r.deleted_at is null and r.table_id = v_t) then
            perform platform.memo_k_put(v_pk || v_x, '');
            continue;
          end if;
          v_set := custom.visible_set(v_user, v_o, v_t, 'viewer'::public.permission_level);
          continue when v_set.o_fallback;
          v_sets := v_sets || jsonb_build_object('org', v_o, 'tbl', v_t, 'all', v_set.o_all_visible,
                      'tv', coalesce(to_jsonb(v_set.o_true_visibility), '[]'::jsonb),
                      'ga', coalesce(to_jsonb(v_set.o_granted_all), '[]'::jsonb),
                      'gv', coalesce(to_jsonb(v_set.o_granted_visible), '[]'::jsonb),
                      'cv', coalesce(to_jsonb(v_set.o_carried_visible), '[]'::jsonb));
        end loop;
        for v_one in
          with sets as materialized (
            select (e ->> 'org')::uuid as org, (e ->> 'tbl')::uuid as tbl, (e ->> 'all')::boolean as all_v,
                   array(select jsonb_array_elements_text(e -> 'tv'))::platform.visibility[] as tv,
                   array(select jsonb_array_elements_text(e -> 'ga'))::uuid[] as ga,
                   array(select jsonb_array_elements_text(e -> 'gv'))::uuid[] as gv,
                   array(select jsonb_array_elements_text(e -> 'cv'))::uuid[] as cv
              from jsonb_array_elements(v_sets) e
          )
          select s.org, s.tbl,
                 coalesce((select string_agg(r.id::text, ',')
                             from custom.record r
                            where r.organization_id = s.org
                              and r.table_id = s.tbl
                              and r.deleted_at is null
                              and coalesce(r.metadata ->> 'quarantine', 'false') <> 'true'
                              and platform.shown_to_lists(r.shown_to, r.visibility, r.created_by, r.organization_id, v_user, v_ctx)
                              and case
                                    when s.all_v then true
                                    when coalesce(array_length(s.tv, 1), 0) > 0 then
                                      ( r.created_by = v_user
                                     or (r.visibility = any (s.tv) and not (r.id = any (s.ga)))
                                     or r.id = any (s.gv)
                                     or r.id = any (s.cv) )
                                    else
                                      ( r.created_by = v_user
                                     or r.id = any (s.gv)
                                     or r.id = any (s.cv) )
                                  end), '') as ids
            from sets s
        loop
          perform platform.memo_k_put(v_pk || v_one.org::text || ':' || v_one.tbl::text, v_one.ids);
        end loop;
        v_m := platform.memo_k_get(v_pk || p_organization_id::text || ':' || p_table_id::text);
      end if;
      if v_m is not null then
        return query select x::uuid from unnest(string_to_array(nullif(v_m, ''), ',')) x;
        return;
      end if;
      v_m := null;
    end if;
  end if;

  -- STORE-READ-PERF-5: the "shown to" context of this organization (and Table) only, without the
  -- teammates where no row can read them (custom._record_shown_to_ctx; same answers).
  v_ctx := custom._record_shown_to_ctx(array[p_organization_id], p_table_id);

  -- PAGE-BUNDLE-SPEED (2026-10-20): each branch below reads the Table by its index key; `is not distinct from v_tbl`
  -- kept it out of the index condition and read every live row of the organization. Same rows (a NULL table_id still
  -- matches only a NULL v_tbl).
  for v_tbl in
    select distinct r.table_id
      from custom.record r
     where r.organization_id = p_organization_id
       and r.deleted_at is null
       and (p_table_id is null or r.table_id = p_table_id)
  loop
    v_set := custom.visible_set(v_user, p_organization_id, v_tbl,
                                p_required::public.permission_level);

    if v_set.o_fallback then
      raise notice '%', v_set.o_note;
      return query
        select r.id
          from custom.record r
         where r.organization_id = p_organization_id
           and (r.table_id = v_tbl or (v_tbl is null and r.table_id is null))
           and r.deleted_at is null
           -- DOOR-17: a quarantined submission is invisible to every read until a Rule clears it.
           and coalesce(r.metadata ->> 'quarantine', 'false') <> 'true'
           and platform.shown_to_lists(r.shown_to, r.visibility, r.created_by, r.organization_id, v_user, v_ctx)
           -- THE ONE LADDER, per row, exactly as before this file.
           and custom.has_visibility(v_user, 'record', r.id, p_required::public.permission_level);

    elsif v_set.o_all_visible then
      return query
        select r.id
          from custom.record r
         where r.organization_id = p_organization_id
           and (r.table_id = v_tbl or (v_tbl is null and r.table_id is null))
           and r.deleted_at is null
           and coalesce(r.metadata ->> 'quarantine', 'false') <> 'true'
           and platform.shown_to_lists(r.shown_to, r.visibility, r.created_by, r.organization_id, v_user, v_ctx);

    elsif coalesce(array_length(v_set.o_true_visibility, 1), 0) > 0 then
      return query
        select r.id
          from custom.record r
         where r.organization_id = p_organization_id
           and (r.table_id = v_tbl or (v_tbl is null and r.table_id is null))
           and r.deleted_at is null
           and coalesce(r.metadata ->> 'quarantine', 'false') <> 'true'
           and platform.shown_to_lists(r.shown_to, r.visibility, r.created_by, r.organization_id, v_user, v_ctx)
           and ( r.created_by = v_user
              or (r.visibility = any (v_set.o_true_visibility) and not (r.id = any (v_set.o_granted_all)))
              or r.id = any (v_set.o_granted_visible)
              or r.id = any (v_set.o_carried_visible) );

    else
      return query
        select r.id
          from custom.record r
         where r.organization_id = p_organization_id
           and (r.table_id = v_tbl or (v_tbl is null and r.table_id is null))
           and r.deleted_at is null
           and coalesce(r.metadata ->> 'quarantine', 'false') <> 'true'
           and platform.shown_to_lists(r.shown_to, r.visibility, r.created_by, r.organization_id, v_user, v_ctx)
           and ( r.created_by = v_user
              or r.id = any (v_set.o_granted_visible)
              or r.id = any (v_set.o_carried_visible) );
    end if;
  end loop;
end;
$function$;
CREATE OR REPLACE FUNCTION custom.reverse_columns(p_organization_id uuid, p_table_id uuid)
 RETURNS TABLE(key text, label text, source_field_id uuid, source_field_key text, source_field_label text, source_table_id uuid, source_table_name text, cardinality text, read_only boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_on boolean;
begin
  perform custom.assert_client_may_reach(p_organization_id, 'custom.reverse_columns');
  perform custom.assert_may_know_table(p_organization_id, p_table_id, 'custom.reverse_columns');
  -- CONF-STRUCTURE: no column list for a Confidential table whose structure this person may not see.
  if not custom.may_see_table_structure(p_organization_id, p_table_id) then
    return;
  end if;
  v_on := coalesce(nullif(platform.knob_resolve('custom', 'back_links', p_organization_id) #>> '{}', ''), 'true') = 'true';

  return query
  with links as materialized (
    -- PAGE-BUNDLE-SPEED (2026-10-20): the candidates are read from the relation-Field index, one range per target mode,
    -- never every Field of the organization. Each arm keeps the whole predicate above unchanged; the two arms are
    -- disjoint (a Field has one target mode) and every other mode answered false, so the rows are the same.
    select f.id as fid,
           coalesce(nullif(f.data ->> 'key', ''), f.data ->> 'name') as fkey,
           coalesce(nullif(btrim(f.data ->> 'label'), ''), f.data ->> 'key') as flabel,
           nullif(f.data ->> 'inverse_key', '') as ikey,
           coalesce((f.data ->> 'sort')::numeric, 100) as fsort,
           t.id as tid,
           coalesce(nullif(btrim(t.data ->> 'name'), ''), 'Linked records') as tname,
           rv.key as rkey,
           rv.label as rlabel
      from custom.record f
      join custom.record t
        on t.organization_id = p_organization_id
       and t.id = (f.data ->> 'entity_definition_id')::uuid
       and t.table_id = custom.table_kernel_id()
       and t.data_class = 'table'
       and t.deleted_at is null
      -- NOTION-PROPS: the two-way link's own Field on THIS table, when there is one.
      left join lateral (select x.key, x.label from custom._reverse_field_of(p_organization_id, f.id) x) rv
        on f.data ->> 'relation_target' = p_table_id::text
     where f.organization_id = p_organization_id
       and f.table_id = custom.field_kernel_id()
       and f.data_class = 'field'
       and f.deleted_at is null
       and f.data ->> 'type' = 'relation'
       and nullif(f.data -> 'config' ->> 'reverse_of', '') is null
       and (case coalesce(nullif(f.data -> 'config' ->> 'target_mode', ''), 'one')
              when 'one' then f.data ->> 'relation_target' = p_table_id::text
              when 'several' then coalesce(f.data -> 'config' -> 'target_tables', '[]'::jsonb) ? p_table_id::text
              else false end)
       and (v_on or nullif(f.data ->> 'inverse_key', '') is not null)
       -- arm 1: one target, this table (index record_fieldkernel_reltarget_rp_NN)
       and coalesce(nullif((f.data -> 'config') ->> 'target_mode', ''), 'one') = 'one'
       and f.data ->> 'relation_target' = p_table_id::text
    union all
    select f.id as fid,
           coalesce(nullif(f.data ->> 'key', ''), f.data ->> 'name') as fkey,
           coalesce(nullif(btrim(f.data ->> 'label'), ''), f.data ->> 'key') as flabel,
           nullif(f.data ->> 'inverse_key', '') as ikey,
           coalesce((f.data ->> 'sort')::numeric, 100) as fsort,
           t.id as tid,
           coalesce(nullif(btrim(t.data ->> 'name'), ''), 'Linked records') as tname,
           rv.key as rkey,
           rv.label as rlabel
      from custom.record f
      join custom.record t
        on t.organization_id = p_organization_id
       and t.id = (f.data ->> 'entity_definition_id')::uuid
       and t.table_id = custom.table_kernel_id()
       and t.data_class = 'table'
       and t.deleted_at is null
      -- NOTION-PROPS: the two-way link's own Field on THIS table, when there is one.
      left join lateral (select x.key, x.label from custom._reverse_field_of(p_organization_id, f.id) x) rv
        on f.data ->> 'relation_target' = p_table_id::text
     where f.organization_id = p_organization_id
       and f.table_id = custom.field_kernel_id()
       and f.data_class = 'field'
       and f.deleted_at is null
       and f.data ->> 'type' = 'relation'
       and nullif(f.data -> 'config' ->> 'reverse_of', '') is null
       and (case coalesce(nullif(f.data -> 'config' ->> 'target_mode', ''), 'one')
              when 'one' then f.data ->> 'relation_target' = p_table_id::text
              when 'several' then coalesce(f.data -> 'config' -> 'target_tables', '[]'::jsonb) ? p_table_id::text
              else false end)
       and (v_on or nullif(f.data ->> 'inverse_key', '') is not null)
       -- arm 2: several targets (the same index, its 'several' range)
       and coalesce(nullif((f.data -> 'config') ->> 'target_mode', ''), 'one') = 'several'
  ), seen as (
    -- the access questions are asked of the few linking tables, never of every table of the organization
    select l.* from links l where custom._may_know_table(p_organization_id, l.tid)
       and custom.may_see_table_structure(p_organization_id, l.tid)
  )
  select coalesce(s.rkey, s.ikey, 'linked_' || replace(s.fid::text, '-', '')),
         case when s.rlabel is not null then s.rlabel
              when s.tid = p_table_id
                or (select count(*) from seen s2 where s2.tid = s.tid) > 1
              then s.tname || ' (' || s.flabel || ')'
              else s.tname end,
         s.fid, s.fkey, s.flabel, s.tid, s.tname,
         'many'::text,
         s.rkey is null
    from seen s
   order by s.tname, s.fsort, s.flabel, s.fid;
end
$function$;
CREATE OR REPLACE FUNCTION custom.entity_reference_fields(p_organization_id uuid, p_table_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_key text := 'erf:' || coalesce(p_organization_id::text, '-') || ':' || coalesce(p_table_id::text, '-');
  v_hit text;
  v_out jsonb;
begin
  if p_organization_id is null or p_table_id is null then
    return '{}'::jsonb;
  end if;
  -- The structure memo: a Field row written anywhere empties it, so a Table that gains or
  -- loses an entity reference is read afresh on the next statement.
  v_hit := platform.memo_k_get(v_key);
  if v_hit is not null then
    return v_hit::jsonb;
  end if;
  select coalesce(jsonb_object_agg(coalesce(nullif(f.data ->> 'key', ''), f.data ->> 'name'),
           jsonb_build_object(
             'field_id', f.id::text,
             'label',    coalesce(nullif(f.data ->> 'label', ''), f.data ->> 'key'),
             'allowed',  f.data -> 'config' -> 'allowed_types',
             'ordered',  coalesce((f.data -> 'config' ->> 'ordered')::boolean, false))), '{}'::jsonb)
    into v_out
    from custom.record f
   where f.organization_id = p_organization_id
     and f.table_id = custom.field_kernel_id()
     and f.data_class <> 'kernel'
     and f.deleted_at is null
     -- PAGE-BUNDLE-SPEED (2026-10-20): the uuid key of record_fieldkernel_def_uuid_rp_NN (every Field row's value casts:
     -- that index holds them all), so the table's Fields are read by index, never every Field of the organization.
     and (f.data ->> 'entity_definition_id')::uuid = p_table_id
     and f.data ->> 'type' = 'relation'
     and jsonb_typeof(f.data -> 'config' -> 'allowed_types') = 'array'
     and jsonb_array_length(f.data -> 'config' -> 'allowed_types') > 0;
  perform platform.memo_k_put(v_key, v_out::text);
  return v_out;
end
$function$;
CREATE OR REPLACE FUNCTION custom.read_door_granted_ids(p_organization_id uuid, p_table_id uuid)
 RETURNS uuid[]
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
-- The ids of this organization's live records (of p_table_id, or of every Table when it is null)
-- that something ADDRESSES: a grant on the record, a membership held on the record, a library grant,
-- a closure row. Sorted, each once.
--
-- STORE-READ-PERF-4 (2026-09-29): THE SAME IDS, WORKED OUT ONCE PER ORGANIZATION PER READ-ONLY
-- STATEMENT. custom.visible_set asks this once per Table, and the context tree and the data home
-- walk every Table of an organization: the answer for all of them is one pass, kept in the
-- statement memo (platform.memo_k_*: fenced by the statement, backend, seat and snapshot) and ONLY while the
-- transaction has written nothing — a transaction that writes asks every time, exactly as before.
declare
  v_ro  boolean := pg_catalog.pg_current_xact_id_if_assigned() is null and p_organization_id is not null;
  v_key text := 'custom.granted_ids:' || coalesce(p_organization_id::text, '-') || ':' || pg_catalog.pg_current_snapshot()::text;  -- (the snapshot: see custom.carrying_edges_in)
  v_m   jsonb;
  -- READ-SPEED-ORG-3 (2026-10-20): THE PLAN FOLLOWS THE SIZE OF THE QUESTION. Its records (archived ones too:
  -- an index-only count, and only the plan depends on it) are counted no further than c_few + 1. At most c_few
  -- (most organizations: the median holds 6 records): the named ids are joined to those records (~2 ms, as
  -- before READ-SPEED-ORG-2). More: each named id (~2,300 on the whole platform) is probed by (organization,
  -- id), a fixed cost that beats hashing tens of thousands of records. Same ids either way.
  c_few constant integer := 10000;
  v_few boolean;
begin
  if not v_ro then
    v_few := (select count(*) from (
                select 1 from custom.record r0
                 where r0.organization_id = p_organization_id
                   and (p_table_id is null or r0.table_id = p_table_id)
                 limit c_few + 1) z) <= c_few;
    if v_few then
      return (
        select coalesce(array_agg(distinct r.id), '{}'::uuid[])
          from (
            select p.resource_id as id from iam.permissions p where p.resource_type = 'record'
            union all
            select m.container_id from iam.memberships m where m.container_type = 'record'
            union all
            select g.entity_id from platform.entity_grants g where g.entity_type = 'record'
            union all
            select rr.item_id from platform.reachability rr where rr.item_type = 'record'
          ) h
          join custom.record r
            on r.organization_id = p_organization_id
           and r.id = h.id
           and r.deleted_at is null
           -- PAGE-BUNDLE-SPEED (2026-10-20): `=` is an index condition, `is not distinct from` never is; the same rows
           -- (a named Table is not null, and a null one is answered by the left arm).
           and (p_table_id is null or r.table_id = p_table_id)
      );
    end if;
    -- READ-SPEED-ORG-2 (2026-10-19): A WRITING TRANSACTION PROBES EACH NAMED ID BY ITS KEY, as the
    -- read-only branch below does (HOT-DOORS-3). The plain join ran as a scan of every live record of
    -- the organization; each distinct named id is now one (organization, id) primary-key probe. Same ids.
    return (
      select coalesce(array_agg(distinct r.id), '{}'::uuid[])
        from (
          select distinct h0.id
            from (
              -- a grant on the record (public.has_permission_for, iam.granted_level, iam.grant_addressed_level)
              select p.resource_id as id from iam.permissions p where p.resource_type = 'record'
              union all
              -- a membership held ON the record itself
              select m.container_id from iam.memberships m where m.container_type = 'record'
              -- the open library (public.user_can_read_via_library_grant, public.library_is_open)
              union all
              select g.entity_id from platform.entity_grants g where g.entity_type = 'record'
              -- the platform closure the access kernel pushes onto its own frontier
              union all
              select rr.item_id from platform.reachability rr where rr.item_type = 'record'
            ) h0
           where h0.id is not null
        ) h
        cross join lateral (
          select r0.id
            from custom.record r0
           where r0.organization_id = p_organization_id
             and r0.id = h.id
             and r0.deleted_at is null
             and (p_table_id is null or r0.table_id = p_table_id)
          offset 0
        ) r
    );
  end if;

  v_m := nullif(platform.memo_k_get(v_key), '')::jsonb;
  -- HOT-DOORS-3 (2026-10-08): THE SAME IDS, EACH PROBED BY ITS KEY. The named ids (about 1,200 on the whole
  -- platform) were hash-joined against every live record of the organization (26,000 rows read to keep 10,
  -- 43 ms); each is now looked up by (organization, id) in this organization's one partition. Same ids.
  -- mx.read_page_set = off: the join as before (the proofs compare both on one snapshot).
  if v_m is null then
    v_few := (select count(*) from (
                select 1 from custom.record r0
                 where r0.organization_id = p_organization_id
                 limit c_few + 1) z) <= c_few;
  end if;
  -- READ-SPEED-ORG-3: a small organization takes the join below (the plan sized to it), a large one the probes
  if v_m is null and not v_few and coalesce(current_setting('mx.read_page_set', true), '') <> 'off' then
    select coalesce(jsonb_object_agg(z.tbl, z.ids), '{}'::jsonb) into v_m
      from (
        select coalesce(r.table_id::text, '-') as tbl, jsonb_agg(distinct r.id) as ids
          from (
            select distinct h0.id
              from (
                select p.resource_id as id from iam.permissions p where p.resource_type = 'record'
                union all
                select m.container_id from iam.memberships m where m.container_type = 'record'
                union all
                select g.entity_id from platform.entity_grants g where g.entity_type = 'record'
                union all
                select rr.item_id from platform.reachability rr where rr.item_type = 'record'
              ) h0
             where h0.id is not null
          ) h
          cross join lateral (
            select r0.id, r0.table_id
              from custom.record r0
             where r0.organization_id = p_organization_id
               and r0.id = h.id
               and r0.deleted_at is null
            offset 0
          ) r
         group by 1
      ) z;
    perform platform.memo_k_put(v_key, v_m::text);
  end if;
  if v_m is null then
    select coalesce(jsonb_object_agg(z.tbl, z.ids), '{}'::jsonb) into v_m
      from (
        select coalesce(r.table_id::text, '-') as tbl, jsonb_agg(distinct r.id) as ids
          from (
            select p.resource_id as id from iam.permissions p where p.resource_type = 'record'
            union all
            select m.container_id from iam.memberships m where m.container_type = 'record'
            union all
            select g.entity_id from platform.entity_grants g where g.entity_type = 'record'
            union all
            select rr.item_id from platform.reachability rr where rr.item_type = 'record'
          ) h
          join custom.record r
            on r.organization_id = p_organization_id
           and r.id = h.id
           and r.deleted_at is null
         group by 1
      ) z;
    perform platform.memo_k_put(v_key, v_m::text);
  end if;

  if p_table_id is null then
    return array(select distinct e::uuid from jsonb_each(v_m) t, jsonb_array_elements_text(t.value) e order by 1);
  end if;
  return array(select e::uuid from jsonb_array_elements_text(coalesce(v_m -> p_table_id::text, '[]'::jsonb)) e order by 1);
end
$function$;
