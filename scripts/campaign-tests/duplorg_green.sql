-- DUP-ORG — GREEN. A table copied WITH ROWS whose rows sit inside each other (a child older than its
-- parent) copies, with an explicit own organization AND with NULL; copying into an organization the caller
-- is not in is still refused.
-- RUN FROM THE REPO ROOT. Single transaction ending in ROLLBACK; throwaway organization; seat = authenticated.
\set ON_ERROR_STOP on
\timing off
\set suite 'duplorg_green.sql'
\set requires 'grant:authenticated:custom.table_duplicate'
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
  v_other uuid := gen_random_uuid();
  v_home uuid; v_t uuid; v_f uuid; v_parent uuid; v_child uuid;
  v_dup jsonb; v_dup_t uuid; v_i int; v_boss text := current_user; v_n int; v_k int; v_arg uuid;
  v_fld uuid; v_rel_t uuid; v_dup2 jsonb; v_a uuid; v_b uuid; v_copy_f uuid; v_halves int;
begin
  perform set_config('app.actor_system', 'campaign-test/duplorg_green', true);
  perform set_config('request.jwt.claims', c_admin_j, true);
  insert into iam.organizations (id, name, slug, abbreviation, created_by)
  values (v_org, 'Supplier Test Co', 'dup-org-' || substr(v_org::text,1,8), 'DOC', c_admin),
         (v_other, 'Someone Else Co', 'dup-oth-' || substr(v_other::text,1,8), 'SEC', c_admin);
  insert into iam.memberships (organization_id, container_type, container_id, user_id, role, status)
  values (v_org, 'organization', v_org, c_admin, 'owner', 'active');
  -- the caller is NOT a member of v_other: remove the owner row the trigger may have added.
  delete from iam.memberships where organization_id = v_other and user_id = c_admin;
  insert into platform.knob_override (feature, key, scope_kind, scope_id, organization_id, value, set_note)
  values ('custom', 'system_enabled', 'organization', v_org, v_org, 'true'::jsonb, 'campaign-test/duplorg_green');
  insert into custom.record (organization_id, table_id, data)
  values (v_org, null, jsonb_build_object('name', 'Supplier Test Co — Main Office')) returning id into v_home;

  perform set_config('role', 'authenticated', true);
  if current_user <> 'authenticated' then raise exception '0: seat not taken'; end if;

  v_t := custom.table_declare(v_org, jsonb_build_object('name','Supplier Price List','slug','supplier_price_list','type','entity',
    'label_singular','Price','label_plural','Prices','title_field','item','display','list','weight','light',
    'ordered',false,'row_order','sorted','default_sort','[]'::jsonb,'agent_writable',true,'retention_days',365,
    'fields', jsonb_build_array(jsonb_build_object('name','item')),'parent_id', v_home::text));
  -- the child is made FIRST (older), then a parent is made and the child is moved under it: the copy
  -- by (created_at, id) meets the child before its parent.
  v_child  := custom.record_write(v_org, v_t, jsonb_build_object('item','Bolt M8','parent_id',v_home::text));
  v_parent := custom.record_write(v_org, v_t, jsonb_build_object('item','Fasteners','parent_id',v_home::text));
  perform custom.record_update(v_org, v_child, jsonb_build_object('parent_id', v_parent::text));

  -- 1/2. explicit OWN org, then NULL: both copy with rows, and the child's container is the copy's parent.
  for v_k in 1..2 loop
    v_arg := case when v_k = 1 then v_org else null end;
    v_dup := custom.table_duplicate(v_t, true, 'Supplier Price List copy ' || v_k, v_arg);
    v_i := 0;
    while coalesce(v_dup ->> 'status', '') = 'copying' and v_i < 30 loop
      v_dup := custom.table_duplicate_continue((v_dup #>> '{table,id}')::uuid);
      v_i := v_i + 1;
    end loop;
    v_dup_t := (v_dup #>> '{table,id}')::uuid;
    perform set_config('role', v_boss, true);
    select count(*) into v_n from custom.record r
      join custom.record p on p.organization_id = r.organization_id and p.id = nullif(r.data ->> 'parent_id','')::uuid
     where r.table_id = v_dup_t and r.data ->> 'item' = 'Bolt M8' and p.table_id = v_dup_t and p.data ->> 'item' = 'Fasteners';
    if v_n <> 1 then raise exception '%: the copied child is not inside the copied parent (n=%, %)', v_k, v_n, v_dup; end if;
    select count(*) into v_n from custom.record r where r.table_id = v_dup_t and r.data_class = 'record' and r.deleted_at is null;
    if v_n <> 2 then raise exception '%: copy holds % rows, wanted 2', v_k, v_n; end if;
    perform set_config('role', 'authenticated', true);
  end loop;

  -- 3. into an organization the caller is not in: refused, and nothing is made.
  begin
    perform custom.table_duplicate(v_t, true, 'nope', v_other);
    raise exception '3: a copy into an organization the caller is not in was NOT refused';
  exception when sqlstate '42501' then
    null;
  end;
  perform set_config('role', v_boss, true);
  raise notice 'DUPORG PART 1-3 PASSED — child-before-parent copies with explicit own org and NULL; foreign org still refused.';

  -- 4. field_duplicate on a relation column keeps value and edge agreeing.
  perform set_config('role', 'authenticated', true);
  v_rel_t := custom.table_declare(v_org, jsonb_build_object('name','Suppliers','slug','suppliers','type','entity',
    'label_singular','Supplier','label_plural','Suppliers','title_field','sname','display','list','weight','light',
    'ordered',false,'row_order','sorted','default_sort','[]'::jsonb,'agent_writable',true,'retention_days',365,
    'fields', jsonb_build_array(jsonb_build_object('name','sname')),'parent_id', v_home::text));
  v_a := custom.record_write(v_org, v_rel_t, jsonb_build_object('sname','Acme Fasteners','parent_id',v_home::text));
  v_b := custom.record_write(v_org, v_rel_t, jsonb_build_object('sname','Bolt Barn','parent_id',v_home::text));
  v_fld := custom.field_declare(v_org, v_t, jsonb_build_object('key','suppliers','label','Suppliers','type','relation',
      'multi',true,'relation_target',v_rel_t,'relation_max',10,'on_target_delete','restrict'));
  perform custom.record_update(v_org, v_child, jsonb_build_object('suppliers', jsonb_build_array(v_a::text, v_b::text)));
  v_copy_f := (custom.field_duplicate(v_org, v_fld) ->> 'field_id')::uuid;
  set constraints all immediate;
  set constraints all deferred;
  perform set_config('role', v_boss, true);
  if v_copy_f is null then raise exception '4: field_duplicate returned no new field'; end if;
  select count(*) into v_halves from custom.relation_halves_disagreements(v_org, v_child);
  if v_halves <> 0 then raise exception '4: % relation halves disagree after field_duplicate', v_halves; end if;
  select count(*) into v_n from platform.associations a
   where a.source_id = v_child and a.relation_field_id = v_fld and a.deleted_at is null;
  if v_n <> 2 then raise exception '4: the original column lost an edge (% left)', v_n; end if;
  select count(*) into v_n from custom.record r where r.id = v_child and jsonb_array_length(r.data -> 'suppliers') = 2;
  if v_n <> 1 then raise exception '4: the original column lost a value'; end if;
  raise notice 'DUPORG PART 4 PASSED — field_duplicate on a relation column keeps value and edge agreeing.';
end
$t$;
rollback;
