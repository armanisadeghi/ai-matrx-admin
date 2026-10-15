-- target: branch,production
-- additive: yes
-- guard: custom/system_enabled
-- lane: AT-MERGE
-- lock: custom
-- based-on: custom.migrate_merge(uuid, uuid, uuid, text) 095a2f05e002f9e0822b027681a5eba5f6ec3d7b4df3222570c399c8e5065127
-- based-on: custom.migrate_undo(uuid, uuid) a7be06415f1fda52349eff5b2be8318c64c4c94d953d8e983b0197bf46c17c4c
--
-- AT-MERGE — A MERGE WRITES EACH LINK'S VALUE BESIDE ITS EDGE.
-- ROOT CAUSE. REL-11: a relation is a value in the record's own document and an edge in
-- platform.associations, two halves of one fact that may never disagree
-- (custom._relation_halves_agree, deferred to commit). migrate_merge moved the EDGES that pointed
-- at the loser straight to the winner and never wrote the source record's document, so the commit
-- guard refused the whole merge: "a relation's ASSOCIATION landed with no value beside it".
-- It also treated a list-of-links column as a scalar, parking the loser's links in an alternate.
-- THE FIX. Incoming relation links are moved by rewriting the source's own document (loser id ->
-- winner id, once, in place) and letting the store's triggers move the edge; a list column's links
-- unite on the winner (winner's first, each once, capped at relation_max with the overflow kept in
-- _retired). Non-relation associations are retargeted as before. The undo puts the same documents
-- back (only where the cell still reads as the merge left it).
-- The other verbs that move or copy documents (split, extract_parent, duplicate) write documents
-- only, so the store's triggers write every edge beside the value; proven in
-- scripts/campaign-tests/atmerge_green.sql.
-- The inverse is migrations/inverse/atmerge_a_a_merge_writes_each_links_value_beside_its_edge_down.sql.
--
CREATE OR REPLACE FUNCTION custom.migrate_merge(p_organization_id uuid, p_winner_id uuid, p_loser_id uuid, p_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_win      custom.record%rowtype;
  v_lose     custom.record%rowtype;
  v_log      uuid;
  v_moved    integer := 0;
  v_alts_n   integer := 0;
  v_copied   integer := 0;
  v_retired_n integer := 0;
  v_retargeted integer := 0;
  v_detached integer := 0;
  v_data     jsonb;
  v_vals     jsonb;
  v_env      jsonb;
  v_alts     jsonb;
  v_retired  jsonb;
  v_key      text;
  v_val      jsonb;
  v_declared text[];
  v_rtype    text;
  v_typefld  text;
  v_after    jsonb;
  v_checked  text[] := '{}';
  a          record;
  v_retargeted_ids uuid[] := '{}';
  v_detached_ids   uuid[] := '{}';
  v_reparented_ids uuid[] := '{}';
  v_win_after      jsonb;
  -- AT-MERGE: the winner's table's RELATION columns, the keys a merge unions, and every
  -- document a merge rewrote so that a link's value and its edge move together (REL-11).
  v_relf           jsonb;
  v_union_keys     text[] := '{}';
  v_rel_rewrites   jsonb := '[]'::jsonb;
  v_w_ids          text[];
  v_l_ids          text[];
  v_new_ids        text[];
  v_max            integer;
  v_src            record;
  v_sdoc           jsonb;
  v_sval           jsonb;
  v_snew           jsonb;
  v_rel_moved      integer := 0;
begin
  -- THE CALLER AND THE TWO ROWS, decided on the one ladder — lane REACH's prologue, kept
  -- verbatim: this verb became a client door while DOOR-FIX 2 was landing, and a merge that
  -- skipped the access question would be a door with no lock. Then the switch:
  -- custom.assert_store_door resolves custom/system_enabled and, while it is false, this
  -- store takes writes only from the role that owns custom.record.
  perform custom.assert_client_may_reach(p_organization_id, 'custom.migrate_merge');
  perform custom.assert_client_may_change(p_organization_id, p_winner_id, 'custom.migrate_merge', 'admin'::public.permission_level, 'record');
  perform custom.assert_client_may_change(p_organization_id, p_loser_id, 'custom.migrate_merge', 'admin'::public.permission_level, 'record');
  perform custom.assert_store_door(p_organization_id, 'custom.migrate_merge');

  if p_winner_id = p_loser_id then
    raise exception 'A record cannot be merged into itself.'
      using errcode = '22023', hint = 'REC-21: nothing was changed.';
  end if;

  select * into v_win  from custom.record r
   where r.organization_id = p_organization_id and r.id = p_winner_id and r.deleted_at is null;
  select * into v_lose from custom.record r
   where r.organization_id = p_organization_id and r.id = p_loser_id and r.deleted_at is null;
  if v_win.id is null or v_lose.id is null then
    raise exception 'Both records have to be here to merge them, and % is not.',
                    coalesce(case when v_win.id is null then p_winner_id else p_loser_id end)
      using errcode = '02000';
  end if;

  -- THE INVERSE, BEFORE ANYTHING MOVES: the loser's whole document, so undo can put both
  -- records and both ids back exactly (T5's last sentence). `unalias` is what
  -- history.migration_undo revokes, so the loser's id stops resolving to the winner.
  v_log := history.migration_record(p_organization_id, 'merge', v_lose.data_class, p_loser_id,
             jsonb_build_object('kind', 'restore', 'record_id', p_loser_id::text,
                                'unalias', p_loser_id::text,
                                'document', v_lose.data),
             coalesce(p_note, format('merged into %s', p_winner_id)));

  -- WHICH KEYS MAY CARRY AN ENVELOPE. VAL-1: a declared Field of the winner's table, chosen
  -- by the winner's own type field where its table has one.
  v_typefld := custom.table_type_field(p_organization_id, v_win.table_id);
  if v_typefld is not null then
    v_rtype := v_win.data ->> v_typefld;
  end if;
  select coalesce(array_agg(f.data ->> 'key'), '{}') into v_declared
    from custom.applicable_fields(p_organization_id, v_win.table_id, v_rtype) f;

  -- AT-MERGE: WHICH KEYS ARE RELATIONS, and whether each holds one id or a list. The merge
  -- used to treat a link as a scalar, so a list column kept the winner's list and parked the
  -- loser's links in an alternate no reader follows; the links were lost, not merged.
  select coalesce(jsonb_object_agg(coalesce(nullif(f.data ->> 'key', ''), f.data ->> 'name'),
                                   jsonb_build_object(
                                     'multi', coalesce((f.data ->> 'multi')::boolean, false),
                                     'max', nullif(f.data ->> 'relation_max', ''))),
                  '{}'::jsonb)
    into v_relf
    from custom.record f
   where f.organization_id = p_organization_id
     and f.table_id = custom.field_kernel_id()
     and f.data_class <> 'kernel'
     and f.deleted_at is null
     and nullif(f.data ->> 'entity_definition_id', '')::uuid = v_win.table_id
     and f.data ->> 'type' = 'relation';

  v_data    := v_win.data;
  v_retired := coalesce(v_data -> '_retired', '[]'::jsonb);
  if jsonb_typeof(v_retired) <> 'array' then
    v_retired := '[]'::jsonb;
  end if;

  for v_key, v_val in select * from jsonb_each(v_lose.data) loop
    if left(v_key, 1) = '_' or v_key in ('parent_id') then
      continue;
    end if;

    if not (v_data ? v_key) then
      -- The winner did not hold this at all: it simply moves across.
      v_data := v_data || jsonb_build_object(v_key, v_val);
      v_copied := v_copied + 1;
      v_moved := v_moved + 1;
      v_checked := v_checked || v_key;

    elsif (v_data -> v_key) is distinct from v_val and v_relf ? v_key
          and coalesce((v_relf -> v_key ->> 'multi')::boolean, false) then
      -- AT-MERGE: A LIST OF LINKS UNITES. Both records' ids, the winner's first, each once, held
      -- in the winner's own document; the store's triggers write the edges from it, so value and
      -- edge land together. Past the column's own limit the overflow is kept aside with its
      -- reason, never dropped and never written where the column refuses it.
      select coalesce(array_agg(x.v order by x.o), '{}') into v_w_ids
        from jsonb_array_elements_text(case jsonb_typeof(v_data -> v_key)
               when 'array' then v_data -> v_key
               when 'string' then jsonb_build_array(v_data -> v_key)
               else '[]'::jsonb end) with ordinality x(v, o);
      select coalesce(array_agg(x.v order by x.o), '{}') into v_l_ids
        from jsonb_array_elements_text(case jsonb_typeof(v_val)
               when 'array' then v_val
               when 'string' then jsonb_build_array(v_val)
               else '[]'::jsonb end) with ordinality x(v, o);
      v_new_ids := v_w_ids || coalesce((
        select array_agg(t.u order by t.o)
          from (select u, min(o) as o from unnest(v_l_ids) with ordinality q(u, o)
                 where not (u = any (v_w_ids)) group by u) t), '{}');
      v_max := nullif(v_relf -> v_key ->> 'max', '')::integer;
      if v_max is not null and v_max > 0 and cardinality(v_new_ids) > v_max then
        v_retired := v_retired || jsonb_build_object(
          'key', v_key,
          'value', to_jsonb(v_new_ids[v_max + 1:]),
          'reason', format('merged from record %s; "%s" holds at most %s links, so the rest are kept here rather than written past that limit', p_loser_id, v_key, v_max),
          'at', to_jsonb(now()));
        v_retired_n := v_retired_n + 1;
        v_new_ids := v_new_ids[1:v_max];
      end if;
      if v_new_ids is distinct from v_w_ids then
        v_data := v_data || jsonb_build_object(v_key, to_jsonb(v_new_ids));
        v_moved := v_moved + 1;
        v_checked := v_checked || v_key;
        v_union_keys := v_union_keys || v_key;
      end if;

    elsif (v_data -> v_key) is distinct from v_val then
      if v_key = any (v_declared) then
        -- T5: the two phone numbers become ALTERNATES inside the winner's one document, each
        -- with its source — never a second record, and never a value quietly overwritten.
        -- BUILT, not poked: jsonb_set cannot create `_values` when it is absent, which is how
        -- this value used to disappear while being counted as taken.
        v_vals := coalesce(v_data -> '_values', '{}'::jsonb);
        if jsonb_typeof(v_vals) <> 'object' then
          v_vals := '{}'::jsonb;
        end if;
        v_env := coalesce(v_vals -> v_key, '{}'::jsonb);
        if jsonb_typeof(v_env) <> 'object' then
          v_env := '{}'::jsonb;
        end if;
        v_alts := coalesce(v_env -> 'alternates', '[]'::jsonb);
        if jsonb_typeof(v_alts) <> 'array' then
          v_alts := '[]'::jsonb;
        end if;
        -- VAL-4: THE RANK IS THE ARRIVAL ORDER, which is the only ordering a merge knows. The
        -- winner's own value is the trusted one and holds no rank; the first record merged in
        -- ranks 1, the next 2. Never a score, never a confidence.
        v_alts := v_alts || jsonb_build_array(jsonb_build_object(
                    'value', v_val,
                    'rank', jsonb_array_length(v_alts) + 1,
                    -- The SOURCE, written as a source. custom.intern_provenance interns it to
                    -- a pointer and files the description in _sources; a caller that wrote the
                    -- pointer itself would be naming something this store owns (VAL-1).
                    'src', jsonb_build_object('kind', 'record', 'id', p_loser_id::text)));
        v_env  := v_env  || jsonb_build_object('alternates', v_alts);
        v_vals := v_vals || jsonb_build_object(v_key, v_env);
        v_data := v_data || jsonb_build_object('_values', v_vals);
        v_alts_n := v_alts_n + 1;
        v_moved := v_moved + 1;
        v_checked := v_checked || v_key;
      else
        -- NOT A DECLARED FIELD OF THIS TABLE, so it cannot carry an envelope (VAL-1) and
        -- cannot become an alternate. It is kept with its reason rather than dropped.
        v_retired := v_retired || jsonb_build_object(
          'key', v_key,
          'value', v_val,
          'envelope', v_lose.data -> '_values' -> v_key,
          'reason', format('merged from record %s; "%s" is not a declared field of this table, so its other value is kept here rather than as an alternate (VAL-1)', p_loser_id, v_key),
          'at', to_jsonb(now()));
        v_retired_n := v_retired_n + 1;
        v_moved := v_moved + 1;
      end if;
    end if;
  end loop;

  if jsonb_array_length(v_retired) > 0 then
    v_data := v_data || jsonb_build_object('_retired', v_retired);
  end if;

  perform custom.record_update(p_organization_id, p_winner_id, v_data);

  -- THE READ-BACK. A merge that says it took a value and wrote nothing is the exact defect
  -- this file exists to close, so it is asserted against the stored document rather than
  -- trusted.
  select r.data into v_after from custom.record r
   where r.organization_id = p_organization_id and r.id = p_winner_id;
  foreach v_key in array v_checked loop
    if not (v_after ? v_key) then
      raise exception 'The merge says it took "%" from the other record and the winner does not hold it. Nothing was merged.', v_key
        using errcode = '23514',
              hint = 'T5 / VAL-4: a value taken in a merge is in the winner''s one document — as the value itself, or as a ranked alternate with its source.';
    end if;
  end loop;
  foreach v_key in array v_checked loop
    if (v_win.data ? v_key) and (v_win.data -> v_key) is distinct from (v_lose.data -> v_key)
       and (v_lose.data ? v_key)
       and v_key = any (v_declared)
       and not (v_key = any (v_union_keys))
       and not exists (select 1 from jsonb_array_elements(
                         coalesce(v_after -> '_values' -> v_key -> 'alternates', '[]'::jsonb)) x
                        where x -> 'value' = v_lose.data -> v_key) then
      raise exception 'The merge says "%" had another value on the other record and the winner carries no alternate for it. Nothing was merged.', v_key
        using errcode = '23514',
              hint = 'T5 / VAL-4: the losing value is kept as a ranked alternate with its source, never overwritten and never dropped.';
    end if;
  end loop;

  -- Everything the loser contained now hangs off the winner, or the merge would orphan it —
  -- and, since the delete door honours containment, would take it with the loser.
  -- TABLE-EXPERIENCE (v7 item 3): which children moved is kept, so an undo moves them back.
  with moved as (
    update custom.record r
       set data = r.data || jsonb_build_object('parent_id', p_winner_id::text)
     where r.organization_id = p_organization_id
       and r.deleted_at is null
       and nullif(r.data ->> 'parent_id', '')::uuid = p_loser_id
    returning r.id)
  select coalesce(array_agg(id), '{}') into v_reparented_ids from moved;

  -- WHAT POINTED AT THE LOSER POINTS AT THE WINNER. REC-21's "forever" for relations, not
  -- only for readers who remember to resolve the id.
  --
  -- AT-MERGE: A RELATION LINK IS A VALUE FIRST. Its edge is written by the store from the
  -- source record's own document (REL-11) and the two may never disagree, so moving only the
  -- edge — what this loop did to every association — left a document naming the loser beside an
  -- edge naming the winner, which the commit-time guard refused: "a relation's ASSOCIATION landed
  -- with no value beside it". The source's document is rewritten instead, the loser's id replaced
  -- by the winner's (once, in place), and the store's triggers move the edge from that. What each
  -- document held before is kept for the undo.
  for v_src in
    select distinct x.source_id, x.role
      from platform.associations x
     where x.organization_id = p_organization_id
       and x.target_id = p_loser_id and x.deleted_at is null
       and x.source_type = 'record' and x.target_type = 'record'
       and x.relation_field_id is not null
  loop
    select r.data into v_sdoc from custom.record r
     where r.organization_id = p_organization_id and r.id = v_src.source_id and r.deleted_at is null;
    if v_sdoc is null or not (v_sdoc ? v_src.role) then
      continue;
    end if;
    v_sval := v_sdoc -> v_src.role;
    if jsonb_typeof(v_sval) = 'array' then
      select coalesce(jsonb_agg(to_jsonb(y.v) order by y.o), '[]'::jsonb) into v_snew
        from (select z.v, min(z.o) as o
                from (select case when t.v = p_loser_id::text then p_winner_id::text else t.v end as v, t.o
                        from jsonb_array_elements_text(v_sval) with ordinality t(v, o)) z
               group by z.v) y;
    elsif jsonb_typeof(v_sval) = 'string' and (v_sval #>> '{}') = p_loser_id::text then
      v_snew := to_jsonb(p_winner_id::text);
    else
      continue;
    end if;
    if v_snew is distinct from v_sval then
      update custom.record r
         set data = r.data || jsonb_build_object(v_src.role, v_snew)
       where r.organization_id = p_organization_id and r.id = v_src.source_id;
      v_rel_rewrites := v_rel_rewrites || jsonb_build_object(
        'source_id', v_src.source_id::text, 'key', v_src.role, 'before', v_sval, 'after', v_snew);
      v_rel_moved := v_rel_moved + 1;
    end if;
  end loop;

  for a in
    select x.id, x.source_type, x.source_id, x.role
      from platform.associations x
     where x.organization_id = p_organization_id
       and x.target_id = p_loser_id and x.deleted_at is null
       and x.relation_field_id is null
  loop
    if exists (select 1 from platform.associations y
                where y.source_type = a.source_type and y.source_id = a.source_id
                  and y.target_id = p_winner_id and y.role is not distinct from a.role
                  and y.id <> a.id) then
      update platform.associations set deleted_at = now() where id = a.id;
      v_detached := v_detached + 1;
      v_detached_ids := v_detached_ids || a.id;
    else
      update platform.associations set target_id = p_winner_id where id = a.id;
      v_retargeted := v_retargeted + 1;
      v_retargeted_ids := v_retargeted_ids || a.id;
    end if;
  end loop;

  -- REC-21: FOREVER. The alias goes in BEFORE the loser is deleted, so there is no instant in
  -- which the id resolves to nothing. `revoked_at` is cleared, because an id merged again
  -- after an undo resolves again.
  insert into custom.record_alias (organization_id, old_id, new_id, verb, reason, migration_id)
  values (p_organization_id, p_loser_id, p_winner_id, 'merge',
          coalesce(p_note, 'merged'), v_log)
  on conflict (organization_id, old_id) do update
        set new_id = excluded.new_id, verb = excluded.verb,
            reason = excluded.reason, migration_id = excluded.migration_id,
            revoked_at = null;

  perform custom.record_delete(p_organization_id, p_loser_id);

  -- TABLE-EXPERIENCE (v7 item 3) — EVERYTHING THE MERGE DID, FOR ITS UNDO. The loser's own
  -- document was stored before anything moved; what the merge did to the WINNER and to what
  -- pointed at the loser is only known now, so it joins the same inverse. `custom.migrate_undo`
  -- reads `merge_undo`: the winner's keys as they were (put back only while the winner is still
  -- exactly as the merge left it), the links moved to the winner, the duplicate links withdrawn,
  -- and the children re-parented.
  select r.data into v_win_after from custom.record r
   where r.organization_id = p_organization_id and r.id = p_winner_id;
  update history.migration_log l
     set inverse = l.inverse || jsonb_build_object('merge_undo', jsonb_build_object(
           'winner_id', p_winner_id::text,
           'winner_before', (select coalesce(jsonb_object_agg(k, coalesce(v_win.data -> k, 'null'::jsonb)), '{}'::jsonb)
                               from unnest(v_checked || array['_values', '_retired']) k),
           'winner_after', v_win_after,
           'retargeted', to_jsonb(v_retargeted_ids),
           'detached', to_jsonb(v_detached_ids),
           'relation_rewrites', v_rel_rewrites,
           'reparented', to_jsonb(v_reparented_ids)))
   where l.organization_id = p_organization_id and l.id = v_log;

  return jsonb_build_object('verb', 'merge', 'winner', p_winner_id, 'loser', p_loser_id,
                            'migration_id', v_log, 'values_taken', v_moved,
                            'values_copied', v_copied, 'alternates_added', v_alts_n,
                            'values_retired', v_retired_n,
                            'relations_retargeted', v_retargeted + v_rel_moved,
                            'relations_detached_as_duplicates', v_detached,
                            'resolves_to', custom.resolve_id(p_organization_id, p_loser_id),
                            'at', now());
end;
$function$
;

CREATE OR REPLACE FUNCTION custom.migrate_undo(p_organization_id uuid, p_log_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_target uuid;
  v_verb   text;
  v_mu     jsonb;
  v_answer jsonb;
  v_win    uuid;
  v_loser  uuid;
  v_links  integer := 0;
  v_kids   integer := 0;
  v_winner_back boolean := false;
  v_after  uuid;
  v_rw     record;
  v_rel_back integer := 0;
  v_n      integer;
  v_by     uuid;
  v_level  public.permission_level := 'admin';
begin
  perform custom.assert_client_may_reach(p_organization_id, 'custom.migrate_undo');
  if p_log_id is null then
    raise exception 'custom.migrate_undo: which Migration?' using errcode = '22004';
  end if;

  select coalesce(nullif(l.inverse ->> 'record_id', '')::uuid, l.target_id), l.verb, l.inverse -> 'merge_undo', l.applied_by
    into v_target, v_verb, v_mu, v_by
    from history.migration_log l
   where l.organization_id = p_organization_id and l.id = p_log_id;
  if v_target is null and v_verb is null then
    raise exception 'There is no such Migration on the record for this organization.' using errcode = '02000',
            detail = jsonb_build_object('log_id', p_log_id)::text;
  end if;

  -- THE ONE LADDER, on the record the Migration was about. Undoing a merge WRITES — it
  -- restores the loser and revokes its alias — so it asks the same question every other
  -- write in this store asks, at the same level.
  -- CHAIR RULING (MEMBER-DEFECTS-4, 2026-10-10): undoing a ROW migration YOU performed — a split, an
  -- extracted parent, a merge — is content, so Edit (editor) may undo their own. Undoing someone
  -- else's, or any table-level migration (rename, retype, move), stays Full (admin).
  if v_verb in ('split', 'extract_parent', 'merge')
     and v_by is not null and v_by = custom.query_principal() then
    v_level := 'editor';
  end if;
  perform custom.assert_client_may_change(p_organization_id, v_target, 'custom.migrate_undo',
                                          v_level, 'record');
  perform custom.assert_store_door(p_organization_id, 'custom.migrate_undo');

  -- The undo itself is unchanged: `history.migration_undo` writes through the store's own
  -- verbs, and schema `history` stays closed to clients — this door is the reach into it.
  v_answer := history.migration_undo(p_organization_id, p_log_id);

  -- CORE-VISION (2026-10-10): A SPLIT OR AN EXTRACTED PARENT COMES UNDONE WHOLE. Both verbs make a
  -- NEW record and log it as the inverse's `delete_after`; history.migration_undo put the original
  -- back and never read that key, so the new record stayed (a duplicate after a split, an orphan
  -- parent after an extract). It is archived here — soft, restorable from trash like any record —
  -- and the split's alias for it is revoked, so its id stops resolving to the record that kept it.
  v_after := (select nullif(l.inverse ->> 'delete_after', '')::uuid
                from history.migration_log l
               where l.organization_id = p_organization_id and l.id = p_log_id);
  if v_after is not null then
    if exists (select 1 from custom.record r
                where r.organization_id = p_organization_id and r.id = v_after and r.deleted_at is null) then
      perform custom.record_delete(p_organization_id, v_after);
    end if;
    update custom.record_alias a
       set revoked_at = now()
     where a.organization_id = p_organization_id and a.old_id = v_after and a.revoked_at is null;
    v_answer := coalesce(v_answer, '{}'::jsonb) || jsonb_build_object('removed', v_after);
  end if;

  -- TABLE-EXPERIENCE (v7 item 3) — A MERGE COMES UNDONE WHOLE. `history.migration_undo` brings
  -- the merged-away record back and revokes its alias; what the merge did to everything else is
  -- put back here from `merge_undo` (written by `custom.migrate_merge`). A merge recorded before
  -- this carries no `merge_undo` and is undone as before.
  if v_verb = 'merge' and v_mu is not null then
    v_win   := nullif(v_mu ->> 'winner_id', '')::uuid;
    v_loser := v_target;
    -- The links that were moved to the winner point at the record they were made for again.
    update platform.associations x
       set target_id = v_loser
     where x.organization_id = p_organization_id
       and x.id in (select (e #>> '{}')::uuid from jsonb_array_elements(coalesce(v_mu -> 'retargeted', '[]')) e)
       and x.target_id = v_win and x.deleted_at is null
       and x.relation_field_id is null;
    get diagnostics v_links = row_count;
    -- AT-MERGE: a RELATION link is a value first (REL-11), so it comes back the way it left: the
    -- source's own document gets the id it held before the merge, and the store moves the edge
    -- from that. Put back only where the cell is still as the merge left it; a later edit is
    -- somebody's work and is never undone.
    for v_rw in
      select (e ->> 'source_id')::uuid as source_id, e ->> 'key' as key, e -> 'before' as before, e -> 'after' as after
        from jsonb_array_elements(coalesce(v_mu -> 'relation_rewrites', '[]'::jsonb)) e
    loop
      update custom.record r
         set data = r.data || jsonb_build_object(v_rw.key, v_rw.before)
       where r.organization_id = p_organization_id and r.id = v_rw.source_id
         and r.deleted_at is null and r.data -> v_rw.key = v_rw.after;
      get diagnostics v_n = row_count;
      v_rel_back := v_rel_back + v_n;
    end loop;
    v_links := v_links + v_rel_back;
    -- The duplicate links the merge withdrew come back (they pointed at the loser all along).
    update platform.associations x
       set deleted_at = null
     where x.organization_id = p_organization_id
       and x.id in (select (e #>> '{}')::uuid from jsonb_array_elements(coalesce(v_mu -> 'detached', '[]')) e)
       and x.deleted_at is not null;
    -- Children hang off the record they belonged to again.
    update custom.record r
       set data = r.data || jsonb_build_object('parent_id', v_loser::text)
     where r.organization_id = p_organization_id
       and r.id in (select (e #>> '{}')::uuid from jsonb_array_elements(coalesce(v_mu -> 'reparented', '[]')) e)
       and nullif(r.data ->> 'parent_id', '')::uuid = v_win;
    get diagnostics v_kids = row_count;
    -- The winner's own values, alternates and kept-aside values as they were — only while the
    -- winner is exactly as the merge left it: an edit made since is somebody's work, never undone.
    if v_win is not null
       and (select r.data from custom.record r where r.organization_id = p_organization_id and r.id = v_win)
           = (v_mu -> 'winner_after')
       and (v_mu -> 'winner_before') <> '{}'::jsonb then
      perform custom.record_update(p_organization_id, v_win, v_mu -> 'winner_before');
      v_winner_back := true;
    end if;
    v_answer := coalesce(v_answer, '{}'::jsonb) || jsonb_build_object(
      'links_moved_back', v_links, 'children_moved_back', v_kids, 'winner_put_back', v_winner_back);
  end if;
  return v_answer;
end;
$function$
;
