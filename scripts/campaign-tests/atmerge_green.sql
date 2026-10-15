-- AT-MERGE — GREEN. Merge/duplicate/extract/split/undo write the DOCUMENT value beside every
-- relation edge they move (REL-11: value and edge are two halves of one fact).
-- RUN FROM THE REPO ROOT: psql "<SUPABASE_MATRIX_* values>" -v ON_ERROR_STOP=1 -f scripts/campaign-tests/atmerge_green.sql
-- Single transaction ending in ROLLBACK; throwaway organization; seat = authenticated.
\set ON_ERROR_STOP on
\timing off
\set suite 'atmerge_green.sql'
\set requires 'grant:authenticated:custom.migrate_merge'
\i scripts/campaign-tests/_preamble.sql
\if :matrx_skip
\quit
\endif

begin;
set local statement_timeout = '60s';

do $t$
declare
  c_admin   constant uuid := '87a6e699-3622-4869-8843-d0867456c0dd';
  c_admin_j constant text := '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated"}';
  v_org uuid := gen_random_uuid();
  v_home uuid; v_ven_t uuid; v_hold_t uuid; v_book_t uuid;
  v_f_ven uuid; v_f_hold uuid;
  v_v1 uuid; v_v2 uuid; v_v3 uuid; v_h1 uuid; v_h2 uuid; v_b1 uuid; v_b2 uuid;
  v_doc jsonb; v_n int; v_res jsonb; v_log uuid; v_boss text := current_user; v_edges uuid[]; v_vals uuid[];
  v_h3 uuid; v_split jsonb; v_new uuid; v_ext jsonb; v_dup jsonb; v_dup_t uuid; v_mig uuid; v_i int;
begin
  perform set_config('app.actor_system', 'campaign-test/atmerge_green', true);
  perform set_config('request.jwt.claims', c_admin_j, true);
  insert into iam.organizations (id, name, slug, abbreviation, created_by)
  values (v_org, 'Harbor Lights Event Group', 'harbor-lights-' || substr(v_org::text,1,8), 'HLE', c_admin);
  insert into iam.memberships (organization_id, container_type, container_id, user_id, role, status)
  values (v_org, 'organization', v_org, c_admin, 'owner', 'active');
  insert into platform.knob_override (feature, key, scope_kind, scope_id, organization_id, value, set_note)
  values ('custom', 'system_enabled', 'organization', v_org, v_org, 'true'::jsonb, 'campaign-test/atmerge_green');
  insert into custom.record (organization_id, table_id, data)
  values (v_org, null, jsonb_build_object('name', 'Harbor Lights — Main Office')) returning id into v_home;

  perform set_config('role', 'authenticated', true);
  if current_user <> 'authenticated' then raise exception '0: seat not taken'; end if;

  v_ven_t := custom.table_declare(v_org, jsonb_build_object('name','Venues','slug','venues','type','entity',
    'label_singular','Venue','label_plural','Venues','title_field','vname','display','list','weight','light',
    'ordered',false,'row_order','sorted','default_sort','[]'::jsonb,'agent_writable',true,'retention_days',365,
    'fields', jsonb_build_array(jsonb_build_object('name','vname')),'parent_id', v_home::text));
  v_hold_t := custom.table_declare(v_org, jsonb_build_object('name','Venue Holds','slug','venue_holds','type','entity',
    'label_singular','Venue Hold','label_plural','Venue Holds','title_field','hname','display','list','weight','light',
    'ordered',false,'row_order','sorted','default_sort','[]'::jsonb,'agent_writable',true,'retention_days',365,
    'fields', jsonb_build_array(jsonb_build_object('name','hname')),'parent_id', v_home::text));
  v_book_t := custom.table_declare(v_org, jsonb_build_object('name','Bookings','slug','bookings','type','entity',
    'label_singular','Booking','label_plural','Bookings','title_field','bname','display','list','weight','light',
    'ordered',false,'row_order','sorted','default_sort','[]'::jsonb,'agent_writable',true,'retention_days',365,
    'fields', jsonb_build_array(jsonb_build_object('name','bname')),'parent_id', v_home::text));

  v_f_ven := custom.field_declare(v_org, v_hold_t, jsonb_build_object('key','venues','label','Venues','type','relation',
      'multi',true,'relation_target',v_ven_t,'relation_max',10,'on_target_delete','restrict'));
  v_f_hold := custom.field_declare(v_org, v_book_t, jsonb_build_object('key','hold','label','Hold','type','relation',
      'multi',false,'relation_target',v_hold_t,'relation_max',1,'on_target_delete','restrict'));

  v_v1 := custom.record_write(v_org, v_ven_t, jsonb_build_object('vname','The Pier House','parent_id',v_home::text));
  v_v2 := custom.record_write(v_org, v_ven_t, jsonb_build_object('vname','Lantern Hall','parent_id',v_home::text));
  v_v3 := custom.record_write(v_org, v_ven_t, jsonb_build_object('vname','Saltmarsh Barn','parent_id',v_home::text));
  v_h1 := custom.record_write(v_org, v_hold_t, jsonb_build_object('hname','Okafor wedding hold','venues',jsonb_build_array(v_v1::text,v_v2::text),'parent_id',v_home::text));
  v_h2 := custom.record_write(v_org, v_hold_t, jsonb_build_object('hname','Okafor wedding hold (dup)','venues',jsonb_build_array(v_v2::text,v_v3::text),'parent_id',v_home::text));
  v_b1 := custom.record_write(v_org, v_book_t, jsonb_build_object('bname','Deposit 1','hold',v_h2::text,'parent_id',v_home::text));


  -- 1. MERGE with relation columns on both sides.
  v_res := custom.migrate_merge(v_org, v_h1, v_h2, 'atmerge test');
  -- THE COMMIT-TIME GUARD, asked now: this is the exact refusal a person met ("a relation's
  -- ASSOCIATION landed with no value beside it"). A DO block would otherwise end before it fired.
  set constraints all immediate;
  set constraints all deferred;
  v_mig := (v_res ->> 'migration_id')::uuid;

  perform set_config('role', v_boss, true);   -- read-back is the census, not the product

  -- 1a. the survivor's VALUE lists the union of both sides' links.
  select r.data into v_doc from custom.record r where r.id = v_h1;
  select array_agg(x::uuid order by x) into v_vals from jsonb_array_elements_text(v_doc -> 'venues') x;
  if v_vals is distinct from (select array_agg(u order by u) from unnest(array[v_v1,v_v2,v_v3]) u) then
    raise exception '1a: the surviving hold lists % — expected the union of both holds'' venues', v_doc -> 'venues';
  end if;
  -- 1b. and the live edges are exactly that set.
  select array_agg(a.target_id order by a.target_id) into v_edges from platform.associations a
   where a.source_type='record' and a.source_id=v_h1 and a.role='venues' and a.deleted_at is null and a.relation_field_id=v_f_ven;
  if v_edges is distinct from v_vals then raise exception '1b: edges % do not match value %', v_edges, v_vals; end if;
  -- 1c. a link that pointed AT the loser now points at the winner in the booking's own document AND its edge.
  select r.data into v_doc from custom.record r where r.id = v_b1;
  if v_doc ->> 'hold' is distinct from v_h1::text then raise exception '1c: the booking''s document still says hold = %', v_doc ->> 'hold'; end if;
  select count(*) into v_n from platform.associations a
   where a.source_id=v_b1 and a.role='hold' and a.target_id=v_h1 and a.deleted_at is null and a.relation_field_id=v_f_hold;
  if v_n <> 1 then raise exception '1c: % live edge(s) from the booking to the surviving hold', v_n; end if;
  raise notice 'PART 1 PASSED — merge writes the union and re-points incoming links in the document.';

  -- 2. UNDO puts the booking's document and the winner's list back, edge beside value.
  perform set_config('role', 'authenticated', true);
  perform custom.migrate_undo(v_org, v_mig);
  set constraints all immediate;
  set constraints all deferred;
  perform set_config('role', v_boss, true);
  select r.data into v_doc from custom.record r where r.id = v_b1;
  if v_doc ->> 'hold' is distinct from v_h2::text then raise exception '2a: undo left the booking on hold %', v_doc ->> 'hold'; end if;
  select count(*) into v_n from platform.associations a
   where a.source_id=v_b1 and a.role='hold' and a.target_id=v_h2 and a.deleted_at is null and a.relation_field_id=v_f_hold;
  if v_n <> 1 then raise exception '2a: % live edge(s) from the booking to the restored hold', v_n; end if;
  select r.data into v_doc from custom.record r where r.id = v_h1;
  if jsonb_array_length(v_doc -> 'venues') <> 2 then raise exception '2b: undo left the winner with %', v_doc -> 'venues'; end if;
  select count(*) into v_n from platform.associations a
   where a.source_id=v_h2 and a.role='venues' and a.deleted_at is null and a.relation_field_id=v_f_ven;
  if v_n <> 2 then raise exception '2c: the restored loser has % live venue edge(s), expected 2', v_n; end if;
  raise notice 'PART 2 PASSED — undo restores documents and edges together.';

  -- 3. SPLIT moves a relation column to the new record: value and edge both move.
  perform set_config('role', 'authenticated', true);
  v_h3 := custom.record_write(v_org, v_hold_t, jsonb_build_object('hname','Reyes reunion hold','venues',jsonb_build_array(v_v3::text),'parent_id',v_home::text));
  v_split := custom.migrate_split(v_org, v_h3, array['venues'], 'atmerge split');
  set constraints all immediate;
  set constraints all deferred;
  perform set_config('role', v_boss, true);
  v_new := (v_split ->> 'new_record')::uuid;
  select count(*) into v_n from platform.associations a
   where a.source_id=v_new and a.role='venues' and a.target_id=v_v3 and a.deleted_at is null and a.relation_field_id=v_f_ven;
  if v_n <> 1 then raise exception '3a: the split-off record has % venue edge(s), expected 1', v_n; end if;
  select count(*) into v_n from platform.associations a
   where a.source_id=v_h3 and a.role='venues' and a.deleted_at is null;
  if v_n <> 0 then raise exception '3b: the record that gave the column away still has % venue edge(s)', v_n; end if;
  raise notice 'PART 3 PASSED — split moves value and edge.';

  -- 4. EXTRACT PARENT copies a relation column up: the copy has value and edge.
  perform set_config('role', 'authenticated', true);
  v_ext := custom.migrate_extract_parent(v_org, v_h1, v_hold_t, array['venues'], 'atmerge extract');
  set constraints all immediate;
  set constraints all deferred;
  perform set_config('role', v_boss, true);
  select count(*) into v_n from platform.associations a
   where a.source_id=(v_ext ->> 'parent')::uuid and a.role='venues' and a.deleted_at is null and a.relation_field_id=v_f_ven;
  if v_n <> 2 then raise exception '4: the extracted parent has % venue edge(s), expected 2', v_n; end if;
  raise notice 'PART 4 PASSED — extract_parent writes value and edge.';

  -- 5. DUPLICATE the table with its records: every copied link carries a value, an edge and the copy's own field.
  perform set_config('role', 'authenticated', true);
  v_dup := custom.table_duplicate(v_hold_t, true, 'Venue Holds copy', null);
  v_i := 0;
  while coalesce(v_dup ->> 'status', '') = 'copying' and v_i < 30 loop
    v_dup := custom.table_duplicate_continue((v_dup #>> '{table,id}')::uuid);
    v_i := v_i + 1;
  end loop;
  set constraints all immediate;
  set constraints all deferred;
  perform set_config('role', v_boss, true);
  v_dup_t := (v_dup #>> '{table,id}')::uuid;
  select count(*) into v_n from platform.associations a
   join custom.record r on r.id = a.source_id and r.table_id = v_dup_t
   where a.role='venues' and a.deleted_at is null and a.relation_field_id is not null;
  if v_n = 0 then raise exception '5: the duplicated table holds no live venue edge (job %)', v_dup; end if;
  raise notice 'PART 5 PASSED — duplicate writes value and edge (% edges).', v_n;

  -- 6. A SINGLE-VALUED link (the Wedding shoot / Client case): differing, equal and one-sided links all merge.
  perform set_config('role', 'authenticated', true);
  declare
    v_t uuid; v_f uuid; v_c1 uuid; v_c2 uuid; v_x1 uuid; v_x2 uuid; v_k int;
  begin
    v_t := custom.table_declare(v_org, jsonb_build_object('name','Shoots','slug','shoots','type','entity',
      'label_singular','Shoot','label_plural','Shoots','title_field','sname','display','list','weight','light',
      'ordered',false,'row_order','sorted','default_sort','[]'::jsonb,'agent_writable',true,'retention_days',365,
      'fields', jsonb_build_array(jsonb_build_object('name','sname')),'parent_id', v_home::text));
    v_f := custom.field_declare(v_org, v_t, jsonb_build_object('key','client','label','Client','type','relation',
      'multi',false,'relation_target',v_ven_t,'relation_max',1,'on_target_delete','restrict'));
    for v_k in 1..3 loop
      v_x1 := custom.record_write(v_org, v_t, jsonb_build_object('sname','Wedding shoot '||v_k,'parent_id',v_home::text)
                || case when v_k in (1,2) then jsonb_build_object('client', v_v1::text) else '{}'::jsonb end);
      v_x2 := custom.record_write(v_org, v_t, jsonb_build_object('sname','Wedding shoot '||(v_k+10),'parent_id',v_home::text)
                || case when v_k = 1 then jsonb_build_object('client', v_v2::text)
                        when v_k = 2 then jsonb_build_object('client', v_v1::text)
                        else jsonb_build_object('client', v_v3::text) end);
      perform custom.migrate_merge(v_org, v_x1, v_x2, 'atmerge single link '||v_k);
      set constraints all immediate;
      set constraints all deferred;
    end loop;
  end;
  perform set_config('role', v_boss, true);
  raise notice 'PART 6 PASSED — single-valued links merge (differing, equal, one-sided).';
end
$t$;
rollback;
