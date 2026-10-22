-- chair-step: DASH-SHARE-COUNT inverse of 20261022193500_dashshare_a_a: puts back the seven bodies as they were and drops the two share functions.
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
end $function$;

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

CREATE OR REPLACE FUNCTION custom.read_records(p_organization_id uuid, p_table_id uuid, p_by_id boolean DEFAULT false, p_limit integer DEFAULT 200, p_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, document jsonb, level permission_level)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_me       uuid := auth.uid();
  v_rec      record;
  v_level    public.permission_level;
  v_visible  text[];
  v_declared text[];
  v_notices  jsonb;
  v_key_ids  jsonb;
  v_mask     jsonb;
  v_set      record;
  v_cache    jsonb := '{}'::jsonb;
  v_vs       record;
  v_cr       jsonb;
  -- ONLY-ME-LISTED (2026-10-02): the "Shown to" context this page is listed with, once.
  v_lctx     jsonb;
begin
  if v_me is null then
    raise exception 'Nobody is signed in, so there is nothing to read.'
      using errcode = '42501',
            hint = 'DOOR-1: the read door resolves the reader from the session and takes no principal argument. Sign in, or call it from a lane that carries a person.';
  end if;
  -- CHAIR-WORLD-LANE-2: the wall first (custom.assert_may_know_table asks it next, unchanged). A person it admitted
  -- ONLY through the world lane who lists the Tables of this organization (the Table kernel) is answered the
  -- organization's live Public Tables and nothing else — through custom.read_records_by_ids, the same page order.
  perform custom.assert_client_may_reach(p_organization_id, 'custom.read_records');
  if p_table_id = custom.table_kernel_id() and custom.world_reader_only(p_organization_id) then
    return query
      select b.id, b.document, b.level
        from custom.read_records_by_ids(p_organization_id, p_table_id,
               array(select t.id from custom.record t
                      where t.organization_id = p_organization_id
                        and t.table_id = custom.table_kernel_id()
                        and t.deleted_at is null
                        and t.published_to_web
                      order by t.created_at desc, t.id
                      limit least(greatest(coalesce(p_limit, 200), 0), 200) offset greatest(coalesce(p_offset, 0), 0)),
               p_by_id) b;
    return;
  end if;
  perform custom.assert_may_know_table(p_organization_id, p_table_id, 'custom.read_records');
  p_limit := custom.page_size(p_organization_id, 'custom.read_records', p_limit, 200);

  -- STEP 2, once per table per request: which fields this caller may see, at which level.
  -- The level used for the field question is the caller's level on the TABLE, so a page of
  -- a hundred records asks the field question once, not a hundred times (DOOR-10's shape).
  v_level := custom.effective_level(v_me, p_organization_id, p_table_id);

  -- READ-MASK-ONCE: the field mask is the one door's answer, asked once per statement for this
  -- (person, organization, Table, level) and memoised — never worked out here a second way.
  v_mask := custom.read_mask_for(v_me, p_organization_id, p_table_id, v_level, 'read');
  select coalesce(array_agg(x #>> '{}'), '{}'::text[]) into v_visible
    from jsonb_array_elements(v_mask -> 'visible') x;
  select coalesce(array_agg(x #>> '{}'), '{}'::text[]) into v_declared
    from jsonb_array_elements(v_mask -> 'declared') x;
  -- Only the fields that are actually hidden carry a notice; every declared field carries its id.
  v_notices := v_mask -> 'notices';
  v_key_ids := v_mask -> 'all_key_ids';

  -- STEP 1, ONCE: Visibility. `custom.visible_set` asks the ONE ladder a bounded number of
  -- times — once per visibility class, once per granted id, once per container — and hands back
  -- a predicate the planner can drive an index with. The comment this door used to carry is now
  -- true of the code under it (VIS-N-1; DOOR-10: filtered INSIDE the query, never post-filtered).
  v_set := custom.visible_set(v_me, p_organization_id, p_table_id, 'viewer'::public.permission_level);

  -- ONLY-ME-LISTED (VISION-REACH, 2026-10-02). visible_set answers who may OPEN a row; a LIST also
  -- asks whether the row is listed for this person — "Only me" hides, never locks (T-36). The same
  -- filter custom.query_visible_ids and custom.listed_predicate_sql apply, on every branch below.
  v_lctx := custom._record_shown_to_ctx(array[p_organization_id], p_table_id);

  if v_set.o_fallback then
    raise notice '%', v_set.o_note;
    -- CHAIR-ACCESS b: a Confidential Table stops the set lane here, so this is the one branch that
    -- walks its rows. A row this person may not open but which is listed for her ("Shown to") is
    -- returned as its HEADER only - {id, exists: true, submitted_at}, level null - so a page can say
    -- "submitted on <date>" without reading a word of it (HR proof gap 4). Every other row answers as
    -- before: custom.has_visibility, the one ladder.
    for v_rec in
      select q.id, q.rw, q.wv_values, q.wv_sources, q.opens, q.hdr
        from (select r.id, r as rw, r.data -> '_values' as wv_values, r.data -> '_sources' as wv_sources,
                     r.created_at,
                     custom.has_visibility(v_me, 'record', r.id, 'viewer') as opens,
                     custom.confidential_header(v_me, r.id) as hdr
                from custom.record r
               where r.organization_id = p_organization_id
                 and r.table_id = p_table_id
                 and r.deleted_at is null
                 and platform.shown_to_lists(r.shown_to, r.visibility, r.created_by, r.organization_id, v_me, v_lctx)) q
       where q.opens or q.hdr is not null
       order by q.created_at desc, q.id
       limit p_limit offset p_offset
    loop
      if not v_rec.opens then
        id := v_rec.id;
        document := v_rec.hdr;
        level := null;
        return next;
        continue;
      end if;
      select * into v_vs from custom.record_values_step(v_rec.rw, v_cache);
      v_cache := v_vs.o_cache;
      if v_cr is null then
        v_cr := custom.choice_render_plan(p_organization_id, p_table_id);
      end if;
      id := v_rec.id;
      document := custom.choice_render_with(p_organization_id, p_table_id,
                    custom.mask_document(v_vs.o_doc, v_visible, v_notices, p_by_id, v_key_ids, v_declared), v_cr);
      -- BIG-VALUES-READERS: a value kept as a file carries its pointer, so every reader finds it.
      document := custom.with_whole_value_pointers(document, v_rec.wv_values, v_rec.wv_sources, v_visible, p_by_id, v_key_ids);
      -- CHAIR-RETIRED-VALUES: the values a tightened rule set aside, masked like the value they were.
      document := custom.with_retired(document, (v_rec.rw).data -> '_retired', v_visible, v_declared);
      level := v_level;
      return next;
    end loop;

  elsif v_set.o_all_visible then
    -- THE ORDINARY PAGE. Every live row of this Table is this caller's to see, so the scan
    -- carries no visibility predicate at all and the LIMIT stops it at p_limit rows.
    for v_rec in
      select r.id, r as rw, r.data -> '_values' as wv_values, r.data -> '_sources' as wv_sources
        from custom.record r
       where r.organization_id = p_organization_id
         and r.table_id = p_table_id
         and r.deleted_at is null
         and platform.shown_to_lists(r.shown_to, r.visibility, r.created_by, r.organization_id, v_me, v_lctx)
       order by r.created_at desc, r.id
       limit p_limit offset p_offset
    loop
      select * into v_vs from custom.record_values_step(v_rec.rw, v_cache);
      v_cache := v_vs.o_cache;
      if v_cr is null then
        v_cr := custom.choice_render_plan(p_organization_id, p_table_id);
      end if;
      id := v_rec.id;
      document := custom.choice_render_with(p_organization_id, p_table_id,
                    custom.mask_document(v_vs.o_doc, v_visible, v_notices, p_by_id, v_key_ids, v_declared), v_cr);
      -- BIG-VALUES-READERS: a value kept as a file carries its pointer, so every reader finds it.
      document := custom.with_whole_value_pointers(document, v_rec.wv_values, v_rec.wv_sources, v_visible, p_by_id, v_key_ids);
      -- CHAIR-RETIRED-VALUES: the values a tightened rule set aside, masked like the value they were.
      document := custom.with_retired(document, (v_rec.rw).data -> '_retired', v_visible, v_declared);
      level := v_level;
      return next;
    end loop;

  elsif coalesce(array_length(v_set.o_true_visibility, 1), 0) > 0 then
    -- A CLASS THIS CALLER HOLDS, WITH EXCEPTIONS. A granted id is never answered by its class:
    -- a grant addressed to this person on that record replaces what membership confers (VIS-19),
    -- so it is excluded from the class arm and admitted only by its own answer. Containment is a
    -- separate arm and only ever adds (VIS-6).
    for v_rec in
      select r.id, r as rw, r.data -> '_values' as wv_values, r.data -> '_sources' as wv_sources
        from custom.record r
       where r.organization_id = p_organization_id
         and r.table_id = p_table_id
         and r.deleted_at is null
         and platform.shown_to_lists(r.shown_to, r.visibility, r.created_by, r.organization_id, v_me, v_lctx)
         and ( r.created_by = v_me
            or (r.visibility = any (v_set.o_true_visibility) and not (r.id = any (v_set.o_granted_all)))
            or r.id = any (v_set.o_granted_visible)
            or r.id = any (v_set.o_carried_visible) )
       order by r.created_at desc, r.id
       limit p_limit offset p_offset
    loop
      select * into v_vs from custom.record_values_step(v_rec.rw, v_cache);
      v_cache := v_vs.o_cache;
      if v_cr is null then
        v_cr := custom.choice_render_plan(p_organization_id, p_table_id);
      end if;
      id := v_rec.id;
      document := custom.choice_render_with(p_organization_id, p_table_id,
                    custom.mask_document(v_vs.o_doc, v_visible, v_notices, p_by_id, v_key_ids, v_declared), v_cr);
      -- BIG-VALUES-READERS: a value kept as a file carries its pointer, so every reader finds it.
      document := custom.with_whole_value_pointers(document, v_rec.wv_values, v_rec.wv_sources, v_visible, p_by_id, v_key_ids);
      -- CHAIR-RETIRED-VALUES: the values a tightened rule set aside, masked like the value they were.
      document := custom.with_retired(document, (v_rec.rw).data -> '_retired', v_visible, v_declared);
      level := v_level;
      return next;
    end loop;

  else
    -- NOTHING THIS CALLER HOLDS BY CLASS — `shared_only`, or a Table nobody shared with them.
    -- What is left is small and named: the rows this person made, the rows somebody gave them,
    -- and the rows a container they reach carries.
    for v_rec in
      select r.id, r as rw, r.data -> '_values' as wv_values, r.data -> '_sources' as wv_sources
        from custom.record r
       where r.organization_id = p_organization_id
         and r.table_id = p_table_id
         and r.deleted_at is null
         and platform.shown_to_lists(r.shown_to, r.visibility, r.created_by, r.organization_id, v_me, v_lctx)
         and ( r.created_by = v_me
            or r.id = any (v_set.o_granted_visible)
            or r.id = any (v_set.o_carried_visible) )
       order by r.created_at desc, r.id
       limit p_limit offset p_offset
    loop
      select * into v_vs from custom.record_values_step(v_rec.rw, v_cache);
      v_cache := v_vs.o_cache;
      if v_cr is null then
        v_cr := custom.choice_render_plan(p_organization_id, p_table_id);
      end if;
      id := v_rec.id;
      document := custom.choice_render_with(p_organization_id, p_table_id,
                    custom.mask_document(v_vs.o_doc, v_visible, v_notices, p_by_id, v_key_ids, v_declared), v_cr);
      -- BIG-VALUES-READERS: a value kept as a file carries its pointer, so every reader finds it.
      document := custom.with_whole_value_pointers(document, v_rec.wv_values, v_rec.wv_sources, v_visible, p_by_id, v_key_ids);
      -- CHAIR-RETIRED-VALUES: the values a tightened rule set aside, masked like the value they were.
      document := custom.with_retired(document, (v_rec.rw).data -> '_retired', v_visible, v_declared);
      level := v_level;
      return next;
    end loop;
  end if;
end;
$function$;

CREATE OR REPLACE FUNCTION custom.read_records_keyset(p_organization_id uuid, p_table_id uuid, p_filter jsonb DEFAULT '{}'::jsonb, p_search text DEFAULT NULL::text, p_sort jsonb DEFAULT '[]'::jsonb, p_after jsonb DEFAULT NULL::jsonb, p_limit integer DEFAULT 50, p_time_zone text DEFAULT NULL::text, p_ids uuid[] DEFAULT NULL::uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_door      constant text := 'custom.read_records_keyset';
  v_me        uuid := auth.uid();
  v_level     public.permission_level;
  v_mask      jsonb;
  v_visible   text[];
  v_computed  text[];
  v_choices   jsonb;
  v_limit     integer;
  v_where     text;
  v_order     text := '';
  v_term      text := nullif(btrim(coalesce(p_search, '')), '');
  v_sort      jsonb;
  v_key       text;
  v_dir       text;
  v_as        text;
  v_expr      text;
  v_labels    jsonb;
  v_exprs     text[] := '{}';   -- the order's keys, in order (r.id is always the last tie-break)
  v_dirs      text[] := '{}';
  v_types     text[] := '{}';   -- 'text' | 'numeric' | 'timestamptz': how a cursor value is read back
  v_keysql    text;
  v_total     bigint;
  v_ids       uuid[];
  v_keyvals   jsonb[];
  v_rows      jsonb;
  v_ignored   jsonb := '[]'::jsonb;
  v_plain     boolean;
  v_by_ids    boolean := p_ids is not null;
  v_fp        text;
  v_after     text := 'true';
  v_cur_keys  jsonb;
  v_cur_id    uuid;
  v_c         text;
  v_cursor    jsonb := null;
  i           integer;
begin
  if v_me is null then
    raise exception 'Nobody is signed in, so there is nothing to read.'
      using errcode = '42501',
            hint = 'DOOR-1: the read door resolves the reader from the session and takes no principal argument. Sign in, or call it from a lane that carries a person.';
  end if;
  -- THE ORGANIZATION WALL, THEN THE TABLE — the same two questions, in the same order, as custom.read_records_page.
  perform pg_catalog.set_config('mx.filter_ignored', '', true);
  perform custom.assert_client_may_reach(p_organization_id, v_door);
  perform custom.assert_may_know_table(p_organization_id, p_table_id, v_door);
  -- Re-reading named rows: the page is as long as the list of ids, under the same ceiling.
  v_limit := custom.page_size(p_organization_id, v_door,
                              case when v_by_ids then greatest(coalesce(cardinality(p_ids), 0), 1) else p_limit end, 50);

  -- The field question, once (as the page door).
  v_level := custom.effective_level(v_me, p_organization_id, p_table_id);
  v_mask := custom.read_mask_for(v_me, p_organization_id, p_table_id, v_level, 'read');
  select coalesce(array_agg(x #>> '{}'), '{}'::text[]) into v_visible
    from jsonb_array_elements(v_mask -> 'visible') x;
  select coalesce(array_agg(k.key), '{}'::text[]) into v_computed
    from jsonb_each_text(coalesce(v_mask -> 'all_key_ids', '{}'::jsonb)) k
    join custom.record f on f.id = k.value::uuid
   where f.data ->> 'type' = 'formula'
     and coalesce(f.data ->> 'compute_on', 'read') = 'read';
  v_choices := coalesce(custom.choice_field_map(p_organization_id, p_table_id), '{}'::jsonb);

  -- ── the rows this reader may see that answer the question — the page door's WHERE, word for word ──
  -- (CHAIR-ACCESS b: a PLAIN page — no search, no filter, no sort — also lists the HEADER of a Confidential row
  -- that is shown to this person but that she may not open.)
  v_plain := v_term is null
             and coalesce(p_filter, '{}'::jsonb) = '{}'::jsonb
             and (p_sort is null or jsonb_typeof(p_sort) <> 'array' or jsonb_array_length(p_sort) = 0);
  v_where := format($w$
      from custom.record r
     where r.organization_id = %L::uuid
       and r.table_id = %L::uuid
       and r.deleted_at is null
       and coalesce(r.metadata ->> 'quarantine', 'false') <> 'true'
       and ((%s) or (%s))
       and %s$w$,
    p_organization_id, p_table_id,
    custom.listed_predicate_sql(v_me, p_organization_id, p_table_id,
                                 'viewer'::public.permission_level, 'r'),
    case when v_plain
         then format('custom.confidential_header(%L::uuid, r.id) is not null and platform.shown_to_lists(r.shown_to, null, r.created_by, r.organization_id, %L::uuid, %L::jsonb)',
                     v_me, v_me, custom._record_shown_to_ctx(array[p_organization_id], p_table_id))
         else 'false' end,
    custom.record_filter_sql(p_organization_id, p_table_id,
      case when custom.filter_is_rule(coalesce(p_filter, '{}'::jsonb)) then p_filter
           else custom.choice_filter_normalize(v_choices, coalesce(p_filter, '{}'::jsonb)) end));

  if v_term is not null then
    v_where := v_where || ' and ' || custom.record_search_sql(p_organization_id, p_table_id, p_search, 'r', p_time_zone);
  end if;

  -- ── the order: the page door's keys, each remembered so the cursor can say where a row sits ──
  if p_sort is not null and jsonb_typeof(p_sort) = 'array' and jsonb_array_length(p_sort) > 0 then
    for v_sort in select s from jsonb_array_elements(p_sort) s loop
      v_key := v_sort ->> 'field';
      v_dir := case when lower(coalesce(v_sort ->> 'direction', 'asc')) = 'desc' then 'desc' else 'asc' end;
      v_as  := lower(coalesce(v_sort ->> 'as', 'text'));
      if v_key is null or not (v_key = any (v_visible)) then
        v_ignored := v_ignored || to_jsonb(coalesce(v_key, ''));
        continue;
      end if;
      if v_key = any (v_computed) then
        raise exception 'The column "%" is worked out each time it is read, so the store keeps no value to sort the whole table by.', v_key
          using errcode = '0A000',
                hint = 'Sort by one of the columns it is worked out from, or have the column worked out when a record is saved (compute_on: write) so its value is kept. Nothing was read.';
      end if;
      if v_choices ? v_key then
        select coalesce(jsonb_object_agg(o.key, o.value ->> 'label'), '{}'::jsonb) into v_labels
          from jsonb_each(coalesce(v_choices -> v_key -> 'options', '{}'::jsonb)) o;
        v_expr := format('lower(coalesce(%L::jsonb ->> (r.data ->> %L), r.data ->> %L))', v_labels, v_key, v_key);
        v_types := v_types || 'text'::text;
      elsif v_as in ('number', 'integer') then
        v_expr := format($x$case when (r.data ->> %L) ~ '^-?[0-9]+\.?[0-9]*$' then (r.data ->> %L)::numeric end$x$, v_key, v_key);
        v_types := v_types || 'numeric'::text;
      elsif v_as in ('date', 'datetime') then
        v_expr := format($x$case when (r.data ->> %L) ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' then (r.data ->> %L) end$x$, v_key, v_key);
        v_types := v_types || 'text'::text;
      else
        v_expr := format('lower(r.data ->> %L)', v_key);
        v_types := v_types || 'text'::text;
      end if;
      v_exprs := v_exprs || v_expr;
      v_dirs  := v_dirs || v_dir;
      v_order := v_order || v_expr || ' ' || v_dir || ' nulls last, ';
    end loop;
    v_order := case when v_order = '' then 'r.created_at desc, r.id' else v_order || 'r.id' end;
  else
    v_order := 'r.created_at desc, r.id';
  end if;
  if v_order = 'r.created_at desc, r.id' then
    -- The read door's own order. created_at is NOT NULL, so "nulls last" in the cursor predicate below is the
    -- same order as the plain `desc` here. created_at and id never change, so on this order a row can never
    -- move across the cursor: nothing is skipped or repeated, whatever others write meanwhile.
    v_exprs := array['r.created_at']; v_dirs := array['desc']; v_types := array['timestamptz'];
  end if;
  -- NOTE: on a sort by a column, a row whose sorted value is CHANGED while someone pages can legitimately move
  -- across the cursor (it is answered again on a later page, or not at all). That is the row moving, not the
  -- door losing its place: rows that do not change are never skipped or repeated.

  -- The question a cursor is made under. A cursor is honoured only for exactly this question.
  v_fp := md5(jsonb_build_array(1, p_organization_id, p_table_id, coalesce(p_filter, '{}'::jsonb),
                                 v_term, p_time_zone, coalesce(p_sort, '[]'::jsonb), v_order)::text);

  if v_by_ids then
    -- RE-READ THESE ROWS: the same WHERE, narrowed to the named ids; the cursor is not consulted.
    v_where := v_where || format(' and r.id = any (%L::uuid[])', p_ids);
  else
    execute 'select count(*) ' || v_where into v_total;

    if p_after is not null and jsonb_typeof(p_after) <> 'null' then
      if jsonb_typeof(p_after) <> 'object' or (p_after ->> 'f') is distinct from v_fp then
        raise exception 'This page cursor was made for a different question, so it cannot say where the next page starts.'
          using errcode = '22023',
                hint = 'A cursor keeps its place only under the sort, filter and search it was made with, and while the columns you can see stay the same. Start from the first page, without a cursor. Nothing was read.';
      end if;
      v_cur_keys := p_after -> 'k';
      if jsonb_typeof(v_cur_keys) is distinct from 'array'
         or jsonb_array_length(v_cur_keys) <> cardinality(v_exprs)
         or jsonb_typeof(p_after -> 'id') is distinct from 'string' then
        raise exception 'This page cursor is damaged, so it cannot say where the next page starts.'
          using errcode = '22023',
                hint = 'Pass back the cursor exactly as the last page answered it, or start from the first page, without a cursor. Nothing was read.';
      end if;
      begin
        v_cur_id := (p_after ->> 'id')::uuid;
        for i in 1 .. cardinality(v_exprs) loop
          v_c := v_cur_keys ->> (i - 1);
          if v_c is not null and v_types[i] = 'numeric' then perform v_c::numeric;
          elsif v_c is not null and v_types[i] = 'timestamptz' then perform v_c::timestamptz;
          end if;
        end loop;
      exception when others then
        raise exception 'This page cursor is damaged, so it cannot say where the next page starts.'
          using errcode = '22023',
                hint = 'Pass back the cursor exactly as the last page answered it, or start from the first page, without a cursor. Nothing was read.';
      end;
      -- "AFTER THIS ROW", key by key: after on key 1, or equal on key 1 and after on key 2, …, or equal on every
      -- key and a greater id. Every key sorts NULLS LAST in either direction, so: a non-null cursor value has
      -- after it the values beyond it in its direction AND every null; a null cursor value has nothing after it
      -- on that key, and only nulls equal to it. (A row-value comparison is wrong for mixed directions and for
      -- nulls, so it is not used.) The values are quoted literals, read back as the type the key sorts as.
      v_after := format('r.id > %L::uuid', v_cur_id);
      for i in reverse cardinality(v_exprs) .. 1 loop
        v_c := v_cur_keys ->> (i - 1);
        if v_c is null then
          v_after := format('((%s) is null and (%s))', v_exprs[i], v_after);
        else
          v_after := format('((%1$s) %2$s %3$L::%4$s or (%1$s) is null or ((%1$s) = %3$L::%4$s and (%5$s)))',
                            v_exprs[i], case when v_dirs[i] = 'desc' then '<' else '>' end, v_c, v_types[i], v_after);
        end if;
      end loop;
    end if;
  end if;

  select 'jsonb_build_array(' || string_agg('to_jsonb(' || e || ')', ', ' order by n) || ')' into v_keysql
    from unnest(v_exprs) with ordinality u(e, n);

  -- One row more than the page, to know whether there is a next page.
  execute format('select array_agg(q.id order by q.n), array_agg(q.k order by q.n) from (select r.id, %s as k, row_number() over (order by %s) as n %s and (%s) order by n limit %s) q',
                 case when v_by_ids then 'null::jsonb' else v_keysql end, v_order, v_where, v_after,
                 case when v_by_ids then v_limit else v_limit + 1 end)
     into v_ids, v_keyvals;

  if not v_by_ids and coalesce(cardinality(v_ids), 0) > v_limit then
    v_cursor := jsonb_build_object('v', 1, 'f', v_fp, 'k', v_keyvals[v_limit], 'id', v_ids[v_limit]);
    v_ids := v_ids[1:v_limit];
  end if;

  if v_ids is null then
    v_rows := '[]'::jsonb;
  else
    -- As the page door: an id the read door opens is a row; an id it does not open is a header row (a
    -- Confidential row this person is not named on); an id that is neither is simply not a row of the page.
    -- Each opened row carries its version and organization, read from custom.record in this same statement (a
    -- STABLE function reads one snapshot throughout), so the document and its version cannot disagree. A header
    -- row carries no version: it says only that the row exists.
    select coalesce(jsonb_agg(x.row order by x.n), '[]'::jsonb)
      into v_rows
      from (select o.n,
                   case when d.id is not null
                        then jsonb_build_object('id', d.id, 'document', d.document, 'level', d.level,
                                                'version', rec.version, 'organization_id', rec.organization_id)
                        when h.hdr is not null
                        then jsonb_build_object('id', o.rid, 'document', h.hdr, 'level', null,
                                                'version', null, 'organization_id', p_organization_id) end as row
              from unnest(v_ids) with ordinality o(rid, n)
              left join custom.read_records_by_ids(p_organization_id, p_table_id, v_ids, false) d on d.id = o.rid
              left join custom.record rec on rec.id = d.id and rec.organization_id = p_organization_id
              left join lateral (select custom.confidential_header(v_me, o.rid) as hdr) h on d.id is null) x
     where x.row is not null;
  end if;

  return jsonb_build_object('rows', v_rows, 'total', v_total, 'limit', v_limit, 'cursor', v_cursor,
                            'sort_ignored', v_ignored, 'filter_ignored', coalesce(nullif(pg_catalog.current_setting('mx.filter_ignored', true), ''), '[]')::jsonb);
end;
$function$;

CREATE OR REPLACE FUNCTION custom.read_records_archived(p_organization_id uuid, p_table_id uuid, p_lane text DEFAULT 'org'::text, p_by_id boolean DEFAULT false, p_limit integer DEFAULT 200, p_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, document jsonb, level permission_level, archived_at timestamp with time zone, archived_by uuid, archived_by_name text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_me       uuid := auth.uid();
  v_rec      record;
  v_level    public.permission_level;
  v_visible  text[];
  v_declared text[];
  v_notices  jsonb;
  v_key_ids  jsonb;
  v_mask     jsonb;
  v_limit    integer;
  v_lane     text := lower(coalesce(p_lane, 'org'));
  v_lane_sql text;
  v_sql      text;
  v_order    text;     -- TABLE-ACTIONS: the page's order, named by custom.archived_tables_everywhere
  v_in_ord   text;
  v_out_ord  text;
  v_count    integer;   -- CHAIR-DOORS-3A: the count-only answer
begin
  if v_me is null then
    raise exception 'Nobody is signed in, so there is nothing to read.'
      using errcode = '42501',
            hint = 'DOOR-1: the read door resolves the reader from the session and takes no principal argument. Sign in, or call it from a lane that carries a person.';
  end if;

  -- THE ORGANIZATION WALL, ASKED BY NAME, BEFORE ANYTHING IS READ. This door decided the
  -- organization through custom.assert_may_know_table and the row through a
  -- custom.visible_predicate_sql placeholder inside a `format`-built statement: both real,
  -- neither legible to a census that reads a body. custom.record_aggregate asks this same
  -- line before it builds its statement, for the same reason. The yes is memoised per
  -- transaction, so the member below pays nothing twice. (DOORS-DECIDE-3, 2026-09-22.)
  perform custom.assert_client_may_reach(p_organization_id, 'custom.read_records_archived');

  -- THE LANE IS VOCABULARY, NOT A FREE STRING. An unknown word is refused by name; answering
  -- it as 'org' would quietly show a person more than they asked for.
  if v_lane not in ('mine', 'org') then
    raise exception 'custom.read_records_archived: "%" is not a lane', p_lane
      using errcode = '22023',
            hint = 'Two lanes: "mine" (what I archived) and "org" (what anybody in this organization archived).';
  end if;

  perform custom.assert_may_know_table(p_organization_id, p_table_id, 'custom.read_records_archived');

  -- A COUNT, THROUGH THIS DOOR'S OWN WHERE (CHAIR-DOORS-3A, asked by lane 9 SCOPES-ON-THE-STORE).
  -- custom.count_records_archived names the caller in the statement memo before it asks this door
  -- once per Table; this door then answers ONE row whose document is {"archived_count": n}, n being
  -- count(*) of exactly the rows the page below would have listed - the same wall, the same Table
  -- decision, the same ladder predicate, the same "Only me" list rule, the same lane, the same
  -- quarantine test - with no rendering, no mask, no level and no archiver lookup (the "mine" lane
  -- alone still asks custom.record_archiver, because it IS the lane). The count lives here and not in
  -- a door of its own because this WHERE reads the row column T-13 retires, which only the readers
  -- platform._t13_allowlist already names may read, and that list only shrinks.
  if platform.memo_k_get('custom.archived_count_only:' || v_me::text) = '1' then
    execute format($q$
      select count(*)::integer
        from custom.record r
       where r.organization_id = %1$L::uuid
         and r.table_id = %2$L::uuid
         and r.deleted_at is not null
         and coalesce(r.metadata ->> 'quarantine', 'false') <> 'true'
         and %3$s
         and %4$s
    $q$,
      p_organization_id, p_table_id,
      custom.visible_predicate_sql(v_me, p_organization_id, p_table_id,
                                   'viewer'::public.permission_level, 'r')
      || format(' and platform.shown_to_lists(r.shown_to, r.visibility, r.created_by, r.organization_id, %L::uuid, %L::jsonb)',
                v_me, custom._record_shown_to_ctx(array[p_organization_id], p_table_id)),
      case when v_lane = 'mine'
           then format('custom.record_archiver(%L::uuid, r.id) = %L::uuid', p_organization_id, v_me)
           else 'true' end)
      into v_count;
    id               := null;
    document         := jsonb_build_object('archived_count', v_count);
    level            := null;
    archived_at      := null;
    archived_by      := null;
    archived_by_name := null;
    return next;
    return;
  end if;
  v_limit := custom.page_size(p_organization_id, 'custom.read_records_archived', p_limit, 200);

  v_level := custom.effective_level(v_me, p_organization_id, p_table_id);

  -- READ-MASK-ONCE: the field mask is the one door's answer, asked once per statement for this
  -- (person, organization, Table, level) and memoised — never worked out here a second way.
  v_mask := custom.read_mask_for(v_me, p_organization_id, p_table_id, v_level, 'read');
  select coalesce(array_agg(x #>> '{}'), '{}'::text[]) into v_visible
    from jsonb_array_elements(v_mask -> 'visible') x;
  select coalesce(array_agg(x #>> '{}'), '{}'::text[]) into v_declared
    from jsonb_array_elements(v_mask -> 'declared') x;
  -- Only the fields that are actually hidden carry a notice; every declared field carries its id.
  v_notices := v_mask -> 'notices';
  v_key_ids := v_mask -> 'all_key_ids';

  -- THE LANE, AS A PREDICATE OVER THE SET THE LADDER ALREADY ALLOWED. `mine` narrows; it
  -- cannot widen, because it is an additional conjunct beside custom.visible_predicate_sql.
  -- TABLE-ACTIONS (2026-10-03): the "mine" lane asks custom.record_archiver in the WHERE, the same
  -- sentence the count above uses; the archiver SHOWN beside each row is asked only for the page.
  v_lane_sql := case when v_lane = 'mine'
                     then format('custom.record_archiver(%L::uuid, r.id) = %L::uuid', p_organization_id, v_me)
                     else 'true' end;

  -- THE ORDER OF THE PAGE (TABLE-ACTIONS, 2026-10-03). Newest archived first, unless the caller in
  -- this statement — custom.archived_tables_everywhere sorting the Data home's Archived list by a
  -- column — named another in the statement memo. Four words, each a fixed sentence; anything else is
  -- the default. The id breaks every tie, so an offset always lands on the same row.
  v_order := coalesce(platform.memo_k_get('custom.archived_order:' || v_me::text), 'archived_desc');
  case v_order
    when 'archived_asc' then
      v_in_ord := 'r.deleted_at asc, r.id';  v_out_ord := 'q.archived_at asc, q.id';
    when 'name_asc' then
      v_in_ord := $o$lower(coalesce(r.data ->> 'name', '')) asc, r.id$o$;
      v_out_ord := $o$lower(coalesce((q.rr).data ->> 'name', '')) asc, q.id$o$;
    when 'name_desc' then
      v_in_ord := $o$lower(coalesce(r.data ->> 'name', '')) desc, r.id$o$;
      v_out_ord := $o$lower(coalesce((q.rr).data ->> 'name', '')) desc, q.id$o$;
    else
      v_in_ord := 'r.deleted_at desc, r.id'; v_out_ord := 'q.archived_at desc, q.id';
  end case;

  -- ONE STATEMENT. Visibility, the lane, the archive test and the page in the same WHERE.
  -- Nothing here is built from a caller's bytes: the only interpolated values are two uuids
  -- this function resolved itself, two integers, and predicates this database wrote.
  -- THE ARCHIVER IS ASKED FOR THE PAGE, NEVER FOR THE PILE (TABLE-ACTIONS, 2026-10-03). It sat in
  -- the FROM beside every archived row, so a page of one asked custom.record_archiver once per
  -- archived row of the organization (645 calls, 134 ms for two one-row pages on the clone). The page
  -- is cut first; the archiver and the archiver's name are asked of the rows on it. Same rows, same
  -- order, same columns.
  -- NIGHT-SMALL: the document is built by custom.record_values_step, the step every sibling read door
  -- asks, so a column that cannot be worked out keeps its reason in `_errors`.
  v_sql := format($q$
    select q.id,
           (select s.o_doc from custom.record_values_step(q.rr) s) as doc, (q.rr).data -> '_values' as wv_values, (q.rr).data -> '_sources' as wv_sources,
           q.archived_at              as archived_at,
           a.who                      as archived_by,
           p.nm                       as archived_by_name
      from (select r.id, r as rr, r.deleted_at as archived_at
              from custom.record r
             where r.organization_id = %1$L::uuid
               and r.table_id = %2$L::uuid
               and r.deleted_at is not null
               and coalesce(r.metadata ->> 'quarantine', 'false') <> 'true'
               and %3$s
               and %4$s
             order by %7$s
             limit %5$s offset %6$s) q
      -- `offset 0` keeps the archiver one call a row: flattened, it was asked once for the column and
      -- again inside the name lookup (600 calls for a page of 200).
      cross join lateral (select custom.record_archiver(%1$L::uuid, q.id) as who offset 0) a
      left join lateral (
             select coalesce(nullif(u.raw_user_meta_data ->> 'display_name', ''),
                             nullif(u.raw_user_meta_data ->> 'full_name', ''),
                             split_part(u.email::text, '@', 1)) as nm
               from iam.organization_member m
               join auth.users u on u.id = m.user_id
              where m.organization_id = %1$L::uuid
                and m.user_id = a.who
              limit 1) p on true
     order by %8$s
  $q$,
    p_organization_id, p_table_id,
    custom.visible_predicate_sql(v_me, p_organization_id, p_table_id,
                                 'viewer'::public.permission_level, 'r')
    -- ONLY-ME-LISTED (2026-10-02): the archive is a LIST too; an "Only me" row stays its owner's alone here.
    || format(' and platform.shown_to_lists(r.shown_to, r.visibility, r.created_by, r.organization_id, %L::uuid, %L::jsonb)',
              v_me, custom._record_shown_to_ctx(array[p_organization_id], p_table_id)),
    v_lane_sql,
    v_limit, greatest(coalesce(p_offset, 0), 0),
    v_in_ord, v_out_ord);

  for v_rec in execute v_sql loop
    id               := v_rec.id;
    document         := custom.choice_render(p_organization_id, p_table_id,
                          custom.mask_document(v_rec.doc, v_visible, v_notices, p_by_id, v_key_ids, v_declared));
    -- BIG-VALUES-READERS: a value kept as a file carries its pointer, so every reader finds it.
    document := custom.with_whole_value_pointers(document, v_rec.wv_values, v_rec.wv_sources, v_visible, p_by_id, v_key_ids);
    level            := v_level;
    archived_at      := v_rec.archived_at;
    archived_by      := v_rec.archived_by;
    archived_by_name := v_rec.archived_by_name;
    return next;
  end loop;
end;
$function$;

CREATE OR REPLACE FUNCTION custom.read_records_page(p_organization_id uuid, p_table_id uuid, p_filter jsonb DEFAULT '{}'::jsonb, p_search text DEFAULT NULL::text, p_sort jsonb DEFAULT '[]'::jsonb, p_view_id uuid DEFAULT NULL::uuid, p_by_id boolean DEFAULT false, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0, p_time_zone text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_me        uuid := auth.uid();
  v_level     public.permission_level;
  v_mask      jsonb;
  v_visible   text[];
  v_computed  text[];
  v_choices   jsonb;
  v_limit     integer;
  v_offset    integer := greatest(coalesce(p_offset, 0), 0);
  v_where     text;
  v_order     text := '';
  v_term      text := nullif(btrim(coalesce(p_search, '')), '');
  v_sort      jsonb;
  v_key       text;
  v_dir       text;
  v_as        text;
  v_expr      text;
  v_labels    jsonb;
  v_view      record;
  v_positions jsonb := null;
  v_total     bigint;
  v_ids       uuid[];
  v_rows      jsonb;
  v_ignored   jsonb := '[]'::jsonb;
  v_plain     boolean;   -- CHAIR-ACCESS b: a page that asks nothing of the rows' values
  -- HOT-DOORS-3 (2026-10-08)
  v_new       boolean := coalesce(current_setting('mx.read_page_set', true), '') <> 'off';
  v_ctx       jsonb;
  v_listed    text;
  v_ksel      text := '';
  v_kord      text := '';
  v_ki        integer := 0;
  v_locked    bigint := 0;  -- WALK-FIXES D8
  v_pcm       text;         -- HOT-DOORS-4
  v_csort_n   bigint;       -- READ-SPEED f
  v_cv        text;
  v_cstore    boolean;      -- READ-SPEED-3: the kept values may answer this reader's sort
begin
  if v_me is null then
    raise exception 'Nobody is signed in, so there is nothing to read.'
      using errcode = '42501',
            hint = 'DOOR-1: the read door resolves the reader from the session and takes no principal argument. Sign in, or call it from a lane that carries a person.';
  end if;
  -- THE ORGANIZATION WALL, THEN THE TABLE — the same two questions, in the same order, that
  perform pg_catalog.set_config('mx.filter_ignored', '', true);
  -- custom.read_records_matching asks on its first lines.
  -- HOT-DOORS-4 (2026-10-08): one cached plan per statement of this call (partitions pruned at run time) instead of
  -- a custom plan per call; put back when it returns. A plan choice, never an answer.
  if iam.kernel_batch_on(v_me) then
    v_pcm := pg_catalog.current_setting('plan_cache_mode');
    perform pg_catalog.set_config('plan_cache_mode', 'force_generic_plan', true);
  end if;
  perform custom.assert_client_may_reach(p_organization_id, 'custom.read_records_page');
  perform custom.assert_may_know_table(p_organization_id, p_table_id, 'custom.read_records_page');
  v_limit := custom.page_size(p_organization_id, 'custom.read_records_page', p_limit, 50);

  -- The field question, once: which columns this reader may see (search and sort read ONLY these).
  v_level := custom.effective_level(v_me, p_organization_id, p_table_id);
  v_mask := custom.read_mask_for(v_me, p_organization_id, p_table_id, v_level, 'read');
  select coalesce(array_agg(x #>> '{}'), '{}'::text[]) into v_visible
    from jsonb_array_elements(v_mask -> 'visible') x;
  -- READ-SPEED f (2026-10-19): THE WORKED-OUT COLUMNS — formulas, roll-ups and lookups, worked out on read or kept
  -- at write. A sort by one of them sorts by its worked-out value (custom.record_value_one: exactly the value the
  -- page shows), never by the document key, which holds nothing for them.
  -- READ-SPEED-ORG (2026-10-19): ONE INDEX PROBE PER COLUMN OF THIS TABLE, never the organization's every Field.
  -- As a join under the generic plan this read every Field record of the organization (13,210 in the test admin's)
  -- and asked custom.parity_type of each: ~280 ms of a 10-row page, growing with the organization, not the table.
  select coalesce(array_agg(k.key), '{}'::text[]) into v_computed
    from jsonb_each_text(coalesce(v_mask -> 'all_key_ids', '{}'::jsonb)) k
   where custom.parity_type((select f.data from custom.record f
                              where f.organization_id = p_organization_id and f.id = k.value::uuid
                                and f.table_id = custom.field_kernel_id())) in ('lookup', 'rollup', 'formula');
  v_choices := coalesce(custom.choice_field_map(p_organization_id, p_table_id), '{}'::jsonb);

  -- ── the rows this reader may see that answer the question ──
  -- CHAIR-ACCESS b: on a PLAIN page (no search, no filter, no sort, no view) a row of a Confidential
  -- Table this person may not open, but which is listed for her ("Shown to"), is a row of the page
  -- too - as its HEADER only, {id, exists: true, submitted_at} (HR proof gap 4). Never when the page
  -- asks a question of the rows: a search hit, a filter match or a sort position on a row she may
  -- not read would say something about its values.
  v_plain := v_term is null
             and coalesce(p_filter, '{}'::jsonb) = '{}'::jsonb
             and (p_sort is null or jsonb_typeof(p_sort) <> 'array' or jsonb_array_length(p_sort) = 0)
             and p_view_id is null;
  -- HOT-DOORS-3 (2026-10-08): THE LIST FILTER IN THE SAME PASS AS THE PAGE. custom.listed_predicate_sql asks
  -- "is it listed for her" as `r.id in (select from custom.query_visible_ids(..))`: a second walk of the whole
  -- Table (25,000 rows through the "shown to" filter, then hashed) before the page's own walk. For one ordinary
  -- Table that list is, row for row, the rows the open predicate admits (custom.visible_set's answer, the same
  -- memoised answer custom.visible_predicate_sql reads) that are live, not quarantined and "shown to" her
  -- (platform.shown_to_lists with custom._record_shown_to_ctx for this organization and Table); the page's own
  -- WHERE already says live, not quarantined, this organization and this Table. So the page asks
  -- custom.visible_predicate_sql for the open predicate WITH the "shown to" filter (the context handed over in
  -- the statement memo around that one call: 'custom.visible_predicate_listed:<person>:<organization>:<Table>'),
  -- both are asked on the page's one walk, and the context is worked out once for both arms. The Table kernel
  -- (its list has memo branches of its own) and a principal that is not the session's person (the builder
  -- refuses that by name) still go through custom.listed_predicate_sql. mx.read_page_set = off: the page
  -- exactly as before (the proofs compare both on one snapshot).
  if v_new and p_table_id is not null and p_table_id is distinct from custom.table_kernel_id()
     and custom.query_principal() is not distinct from v_me then
    v_ctx := custom._record_shown_to_ctx(array[p_organization_id], p_table_id);
    perform platform.memo_k_put('custom.visible_predicate_listed:' || v_me::text || ':' || p_organization_id::text
                                || ':' || p_table_id::text, v_ctx::text);
    v_listed := custom.visible_predicate_sql(v_me, p_organization_id, p_table_id, 'viewer'::public.permission_level, 'r');
    perform platform.memo_k_put('custom.visible_predicate_listed:' || v_me::text || ':' || p_organization_id::text
                                || ':' || p_table_id::text, '');
  else
    v_listed := custom.listed_predicate_sql(v_me, p_organization_id, p_table_id,
                                            'viewer'::public.permission_level, 'r');
    if v_new and v_plain then
      v_ctx := custom._record_shown_to_ctx(array[p_organization_id], p_table_id);
    end if;
  end if;
  v_where := format($w$
      from custom.record r
     where r.organization_id = %L::uuid
       and r.table_id = %L::uuid
       and r.deleted_at is null
       and coalesce(r.metadata ->> 'quarantine', 'false') <> 'true'
       and ((%s) or (%s))
       and %s$w$,
    p_organization_id, p_table_id,
    v_listed,
    case when v_plain
         -- (the second argument of shown_to_lists is the row column T-13 retires - a legacy fallback
         -- for rows with no shown_to; this door never read it and does not start now: null)
         then format('custom.confidential_header(%L::uuid, r.id) is not null and platform.shown_to_lists(r.shown_to, null, r.created_by, r.organization_id, %L::uuid, %L::jsonb)',
                     v_me, v_me, coalesce(v_ctx, custom._record_shown_to_ctx(array[p_organization_id], p_table_id)))
         else 'false' end,
    custom.record_filter_sql(p_organization_id, p_table_id,
      case when custom.filter_is_rule(coalesce(p_filter, '{}'::jsonb)) then p_filter
           else custom.choice_filter_normalize(v_choices, coalesce(p_filter, '{}'::jsonb)) end));

  -- ── the search: THE ONE SHARED PREDICATE (CHAIR-GRID). custom.record_search_sql is this door's own older
  -- ILIKE over the visible columns and the choice words, plus the typed matches (a date as a person writes
  -- it, a phone by its digits, an amount as the grid shows it), judged for this reader. custom.record_aggregate
  -- asks the same function with the same arguments, so a footer counts exactly the rows this page shows.
  if v_term is not null then
    v_where := v_where || ' and ' || custom.record_search_sql(p_organization_id, p_table_id, p_search, 'r', p_time_zone);
  end if;

  -- ── the order ──
  if p_sort is not null and jsonb_typeof(p_sort) = 'array' and jsonb_array_length(p_sort) > 0 then
    for v_sort in select s from jsonb_array_elements(p_sort) s loop
      v_key := v_sort ->> 'field';
      v_dir := case when lower(coalesce(v_sort ->> 'direction', 'asc')) = 'desc' then 'desc' else 'asc' end;
      v_as  := lower(coalesce(v_sort ->> 'as', 'text'));
      -- MONITOR-TRIAGE (2026-10-01): a sort on a column this reader cannot see — removed, or masked
      -- from their seat — is SKIPPED and named in `sort_ignored`, never a refused page. Ordering by
      -- it would leak the masked values' order, so it is not applied; the rest of the sort stands.
      if v_key is null or not (v_key = any (v_visible)) then
        v_ignored := v_ignored || to_jsonb(coalesce(v_key, ''));
        continue;
      end if;
      if v_key = any (v_computed) then
        -- READ-SPEED f: SORT BY A WORKED-OUT COLUMN (Airtable and Notion do). Every matching row's value is worked out
        -- once (in the matches, beside its id), then ordered like a plain column: a number as a number, a date as its
        -- ISO text, anything else as its lower-cased words, empty last in both directions. Worked out for every
        -- match, so it is bounded: above custom.computed_sort_ceiling() matches it refuses by name, never times out.
        if v_cstore is null then
          v_cstore := custom._computed_reader_ok(v_me, p_organization_id, p_table_id);
        end if;
        -- READ-SPEED-3: with kept values only the rows still to be worked out count against the ceiling.
        if v_csort_n is null and v_cstore
           and not (coalesce(custom._computed_tainted(p_organization_id, p_table_id) -> p_table_id::text, '[]'::jsonb) ? v_key) then
          execute 'select count(*) ' || v_where
               || ' and not exists (select 1 from custom.record_computed rc where rc.record_id = r.id and not rc.stale and rc.vals is not null)'
             into v_csort_n;
          if v_csort_n > custom.computed_sort_ceiling() then
            raise exception 'Sorting by "%" works out its value for every matching record, and % records match (the most is %).', v_key, v_csort_n, custom.computed_sort_ceiling()
              using errcode = '54000',
                    hint = 'Filter or search down to fewer records, or sort by a stored column. Nothing was read.';
          end if;
        end if;
        if v_csort_n is null then
          execute 'select count(*) ' || v_where into v_csort_n;   -- (v_where already carries the search)
          if v_csort_n > custom.computed_sort_ceiling() then
            raise exception 'Sorting by "%" works out its value for every matching record, and % records match (the most is %).', v_key, v_csort_n, custom.computed_sort_ceiling()
              using errcode = '54000',
                    hint = 'Filter or search down to fewer records, or sort by a stored column. Nothing was read.';
          end if;
        end if;
        v_ki := v_ki + 1;
        v_cv := case when v_cstore and not (coalesce(custom._computed_tainted(p_organization_id, p_table_id) -> p_table_id::text, '[]'::jsonb) ? v_key)
                     then format('custom._computed_sort_value(%L::uuid, r.id, %L)', p_organization_id, v_key)
                     else format('custom.record_value_one(%L::uuid, r.id, %L)', p_organization_id, v_key) end;
        v_ksel := v_ksel || ', ' || v_cv || ' as k' || v_ki;
        if v_as in ('number', 'integer') then
          v_kord := v_kord || format('custom._sort_number(m.k%s) %s nulls last, ', v_ki, v_dir);
          v_order := v_order || format('custom._sort_number(%s) %s nulls last, ', v_cv, v_dir);
        elsif v_as in ('date', 'datetime') then
          v_kord := v_kord || format('custom._sort_date(m.k%s) %s nulls last, ', v_ki, v_dir);
          v_order := v_order || format('custom._sort_date(%s) %s nulls last, ', v_cv, v_dir);
        else
          -- Asked as words (the default): a worked-out number still sorts as a number, then words as words.
          v_kord := v_kord || format('custom._sort_number(m.k%1$s) %2$s nulls last, custom._sort_text(m.k%1$s) %2$s nulls last, ', v_ki, v_dir);
          v_order := v_order || format('custom._sort_number(%1$s) %2$s nulls last, custom._sort_text(%1$s) %2$s nulls last, ', v_cv, v_dir);
        end if;
        continue;
      end if;
      if v_choices ? v_key then
        select coalesce(jsonb_object_agg(o.key, o.value ->> 'label'), '{}'::jsonb) into v_labels
          from jsonb_each(coalesce(v_choices -> v_key -> 'options', '{}'::jsonb)) o;
        v_expr := format('lower(coalesce(%L::jsonb ->> (r.data ->> %L), r.data ->> %L))', v_labels, v_key, v_key);
      elsif v_as in ('number', 'integer') then
        v_expr := format($x$case when (r.data ->> %L) ~ '^-?[0-9]+\.?[0-9]*$' then (r.data ->> %L)::numeric end$x$, v_key, v_key);
      elsif v_as in ('date', 'datetime') then
        -- An ISO date or instant sorts as its own text; anything else is not a date and sorts last.
        v_expr := format($x$case when (r.data ->> %L) ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' then (r.data ->> %L) end$x$, v_key, v_key);
      else
        v_expr := format('lower(r.data ->> %L)', v_key);
      end if;
      v_order := v_order || v_expr || ' ' || v_dir || ' nulls last, ';
      -- HOT-DOORS-3: the same key, kept beside the id so the page can be taken from the matches without
      -- numbering all of them.
      v_ki := v_ki + 1;
      v_ksel := v_ksel || ', ' || v_expr || ' as k' || v_ki;
      v_kord := v_kord || 'm.k' || v_ki || ' ' || v_dir || ' nulls last, ';
    end loop;
    -- Every key skipped: the read door's own order, exactly as if no sort was asked.
    if v_order = '' then
      v_ksel := ', r.created_at as k0';
      v_kord := 'm.k0 desc, m.id';
    else
      v_kord := v_kord || 'm.id';
    end if;
    v_order := case when v_order = '' then 'r.created_at desc, r.id' else v_order || 'r.id' end;
  elsif p_view_id is not null then
    select sv.* into v_view from platform.saved_view sv
     where sv.id = p_view_id and sv.organization_id = p_organization_id
       and sv.surface_key = 'custom/records' and sv.deleted_at is null
       and coalesce(sv.subject_id, nullif(sv.definition ->> 'table_id', '')::uuid) = p_table_id;
    if v_view.id is null then
      raise exception 'There is no such saved view on this table.' using errcode = '23503',
              hint = 'It may have been removed, or it may belong to another table or organization. Nothing was read.',
            detail = jsonb_build_object('view_id', p_view_id)::text;
    end if;
    if v_view.definition ->> 'order' is distinct from 'manual' then
      raise exception 'This view is ordered by its sort, not by hand.' using errcode = '22023',
        hint = 'Ask for its sort in p_sort instead of naming the view. Nothing was read.';
    end if;
    v_positions := coalesce(v_view.metadata -> 'record_positions', '{}'::jsonb);
    v_order := '($1 ->> r.id::text)::numeric nulls last, r.created_at, r.id';
    v_ksel := ', ($1 ->> r.id::text)::numeric as k1, r.created_at as k2';
    v_kord := 'm.k1 nulls last, m.k2, m.id';
  else
    -- No question about order: the read door's own order.
    v_order := 'r.created_at desc, r.id';
    v_ksel := ', r.created_at as k0';
    v_kord := 'm.k0 desc, m.id';
  end if;

  -- HOT-DOORS (2026-10-08): THE COUNT AND THE PAGE IN ONE PASS. The rows the page may show are found once
  -- (every predicate above, the visible-set walk inside it included) and both the total and this page's ids
  -- are read from that one set. Asked as two statements, custom.query_visible_ids walked the whole Table
  -- twice per page (a 25,000-row Table: 2 x 25,000 rows through the "shown to" filter). Same total, same
  -- ids in the same order. mx.read_page_one_pass = off: the two statements as before (the proofs compare
  -- both on one snapshot).
  if v_new and coalesce(current_setting('mx.read_page_one_pass', true), '') <> 'off' then
    -- HOT-DOORS-3 (2026-10-08): ONLY THE PAGE IS SORTED. The matches are found once, each with the keys it is
    -- ordered by; the total counts them and the page is the first v_limit after v_offset in that order (a
    -- top-N sort), instead of numbering every match with row_number() (a full sort of all 25,000) to keep
    -- 50. Every order ends in the row's id, so the order is total and the page holds the same ids in the
    -- same order.
    execute format('with m as materialized (select r.id%s %s) '
                   'select (select count(*) from m), '
                   'array(select m.id from m order by %s limit %s offset %s)',
                   v_ksel, v_where, v_kord, v_limit, v_offset)
       into v_total, v_ids
      using v_positions;
    if cardinality(v_ids) = 0 then
      v_ids := null;
    end if;
  elsif coalesce(current_setting('mx.read_page_one_pass', true), '') = 'off' then
    execute 'select count(*) ' || v_where into v_total;

    execute format('select array_agg(q.id order by q.n) from (select r.id, row_number() over (order by %s) as n %s order by n limit %s offset %s) q',
                   v_order, v_where, v_limit, v_offset)
       into v_ids
      using v_positions;
  else
    execute format('with m as materialized (select r.id, row_number() over (order by %s) as n %s) '
                   'select (select count(*) from m), '
                   '(select array_agg(q.id order by q.n) from (select m.id, m.n from m order by m.n limit %s offset %s) q)',
                   v_order, v_where, v_limit, v_offset)
       into v_total, v_ids
      using v_positions;
  end if;

  if v_ids is null then
    v_rows := '[]'::jsonb;
  else
    -- CHAIR-ACCESS b: an id the read door does not open is a header row (a Confidential row this
    -- person is not named on); an id that is neither is simply not a row of the page.
    if v_new then
      -- HOT-DOORS-3: the header is asked only of an id the read door did not open. Asked through a lateral join
      -- it was asked of every id of the page and thrown away (the planner flattens the lateral: 50 calls,
      -- ~26 ms); a scalar subquery in the CASE arm runs only when that arm is reached. Same rows.
      select coalesce(jsonb_agg(x.row order by x.n), '[]'::jsonb)
        into v_rows
        from (select o.n,
                     case when d.id is not null
                          then jsonb_build_object('id', d.id, 'document', d.document, 'level', d.level)
                          -- (the header from a function scan: read once; a subquery column was written out twice)
                          else (select jsonb_build_object('id', o.rid, 'document', h.hdr, 'level', null)
                                  from custom.confidential_header(v_me, o.rid) h(hdr)
                                 where h.hdr is not null) end as row
                from unnest(v_ids) with ordinality o(rid, n)
                left join custom.read_records_by_ids(p_organization_id, p_table_id, v_ids, coalesce(p_by_id, false)) d on d.id = o.rid
              -- (offset 0: the row is built once; flattened, the CASE was written out twice, in the list and the filter)
              offset 0) x
       where x.row is not null;
    else
    select coalesce(jsonb_agg(x.row order by x.n), '[]'::jsonb)
      into v_rows
      from (select o.n,
                   case when d.id is not null
                        then jsonb_build_object('id', d.id, 'document', d.document, 'level', d.level)
                        when h.hdr is not null
                        then jsonb_build_object('id', o.rid, 'document', h.hdr, 'level', null) end as row
              from unnest(v_ids) with ordinality o(rid, n)
              left join custom.read_records_by_ids(p_organization_id, p_table_id, v_ids, coalesce(p_by_id, false)) d on d.id = o.rid
              left join lateral (select custom.confidential_header(v_me, o.rid) as hdr) h on d.id is null) x
     where x.row is not null;
    end if;
  end if;

  -- WALK-FIXES D8 (2026-10-08): A SORTED PAGE OF THE WHOLE TABLE COUNTS WHAT IT LEAVES OUT. A sort places
  -- no header row (a position would say something about a value), so a Confidential table with a default
  -- sort answered a member "0 rows" where the plain page says "4 you can't open". The NUMBER of those rows
  -- says nothing about their values — the plain page shows them — so a sort-only page answers it as
  -- `locked`. Asked only on a Confidential or Private table; any other answer is unchanged.
  if not v_plain and v_term is null and coalesce(p_filter, '{}'::jsonb) = '{}'::jsonb and p_view_id is null
     and exists (select 1 from custom.record t where t.organization_id = p_organization_id and t.id = p_table_id
                    and t.data ->> 'level' in ('confidential', 'private')) then
    execute format($l$
      select count(*) from custom.record r
       where r.organization_id = %L::uuid and r.table_id = %L::uuid and r.deleted_at is null
         and coalesce(r.metadata ->> 'quarantine', 'false') <> 'true'
         and not coalesce((%s), false)
         and custom.confidential_header(%L::uuid, r.id) is not null
         and platform.shown_to_lists(r.shown_to, null, r.created_by, r.organization_id, %L::uuid, %L::jsonb)$l$,
      p_organization_id, p_table_id, v_listed, v_me, v_me,
      coalesce(v_ctx, custom._record_shown_to_ctx(array[p_organization_id], p_table_id)))
      into v_locked;
  end if;

  if v_pcm is not null then
    perform pg_catalog.set_config('plan_cache_mode', v_pcm, true);
  end if;
  return jsonb_build_object('total', v_total, 'limit', v_limit, 'offset', v_offset, 'rows', v_rows,
                            'sort_ignored', v_ignored, 'filter_ignored', coalesce(nullif(pg_catalog.current_setting('mx.filter_ignored', true), ''), '[]')::jsonb)
         || case when v_locked > 0 then jsonb_build_object('locked', v_locked) else '{}'::jsonb end;
end;
$function$;

CREATE OR REPLACE FUNCTION custom.visible_predicate_sql(p_user uuid, p_organization_id uuid, p_table_id uuid, p_required permission_level DEFAULT 'viewer'::permission_level, p_alias text DEFAULT 'r'::text)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_set   record;
  v_alias text;
  v_out   text;
  v_lctx  text;   -- HOT-DOORS-3
begin
  -- The alias is an IDENTIFIER and is quoted as one. It is the door's own word — never a
  -- caller's — and quoting it is what keeps that true of every future caller too.
  v_alias := quote_ident(coalesce(nullif(btrim(p_alias), ''), 'r'));

  if p_user is null then
    -- No principal: the same answer `custom.query_visible_ids` gives, which is the campaign's
    -- own maintenance connection judged by its ROLE.
    return format('(custom.query_is_store_owner())');
  end if;

  -- CD-LADDER (2026-10-03): AN ARCHIVED ORGANIZATION IS CLOSED TO EVERYONE (access ladder T-33),
  -- its owner included: the kernel and custom.read_record refuse every row, so no list carries one.
  if exists (select 1 from iam.organizations o
              where o.id = p_organization_id and o.archived_at is not null) then
    return 'false';
  end if;

  v_set := custom.visible_set(p_user, p_organization_id, p_table_id, p_required);

  -- HOT-DOORS-3 (2026-10-08): THE OPEN PREDICATE WITH THE LIST FILTER, FOR A DOOR THAT ASKS FOR BOTH ON ONE WALK.
  -- custom.read_records_page leaves the "shown to" context of this person, organization and Table in the statement
  -- memo ('custom.visible_predicate_listed:<person>:<organization>:<Table>') around its one call here; then the
  -- predicate below is ANDed with platform.shown_to_lists over the row's own columns and that context - exactly
  -- the filter custom.query_visible_ids puts on every row it lists. Nobody else leaves the key, so every other
  -- caller (custom.assert_may_know_table, custom.visible_record_ids, the parity censuses) gets the open predicate
  -- alone, word for word as before.
  if p_table_id is not null then
    v_lctx := nullif(platform.memo_k_get('custom.visible_predicate_listed:' || p_user::text || ':'
                                         || p_organization_id::text || ':' || p_table_id::text), '');
  end if;

  if v_set.o_fallback then
    -- THE PER-ROW LADDER, verbatim — the same sentence the two doors fall back to.
    v_out := format('custom.has_visibility(%L::uuid, ''record'', %s.id, %L::public.permission_level)',
                    p_user, v_alias, p_required);
  elsif v_set.o_all_visible then
    v_out := 'true';
  else
    v_out := format(
    '(%s.created_by = %L::uuid'
    ' or (%s.visibility = any (%L::platform.visibility[]) and not (%s.id = any (%L::uuid[])))'
    ' or %s.id = any (%L::uuid[])'
    ' or %s.id = any (%L::uuid[]))',
    v_alias, p_user,
    v_alias, v_set.o_true_visibility, v_alias, v_set.o_granted_all,
    v_alias, v_set.o_granted_visible,
    v_alias, v_set.o_carried_visible);
  end if;

  if v_lctx is null then
    return v_out;
  end if;
  return format('((%s) and platform.shown_to_lists(%s.shown_to, %s.visibility, %s.created_by, %s.organization_id, %L::uuid, %L::jsonb))',
                v_out, v_alias, v_alias, v_alias, v_alias, p_user, v_lctx);
end;
$function$;

DROP FUNCTION IF EXISTS custom.share_lists_row(uuid);
DROP FUNCTION IF EXISTS custom.share_reaches_org(uuid);
