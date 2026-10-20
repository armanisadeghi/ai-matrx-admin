-- READ-SPEED-8 b — THE COLUMNS A READER MAY SEE, DECIDED FOR A WHOLE TABLE AT ONCE, ARE EXACTLY THE COLUMNS
-- iam.may_touch_field ALLOWS ONE BY ONE; AND THE KEPT-VALUES JUDGEMENT IS THE SAME AS ASKING EACH COLUMN.
--
-- iam.visible_field_ids (the column mask under custom.read_mask_for) and custom._computed_reader_judge now ask
-- custom._may_touch_fields for every column of a Table in one statement. This holds that set answer equal to the
-- one-by-one door, iam.may_touch_field, for every column of:
--   * a disposable organization built and rolled back here: Customers with a confidential Credit limit, a formula
--     over it (Limit x2), a formula over that formula (Limit band), a plain formula (Name upper) and a roll-up;
--     test@test.com a member who reads Customers at viewer — she must NOT be given Limit x2 or Limit band;
--   * the four Tables of the admin organization's test data and the Tables with the most worked-out formulas in the
--     two largest organizations,
-- for admin@admin.com, test@test.com and a person who is in none of them, at viewer, editor and no level, to read and
-- to edit (Limit x2 is shared to her by itself, so only the formula's input withholds it); and the judgement for each of them against the same loop asked column by column.
-- RED on any difference. Plant a break: psql -v plant=1 makes the set answer skip what a formula reads: RED.
\set ON_ERROR_STOP on
\timing off
\set suite 'readspeed8_b_field_access_set_answer_equals_one_by_one.sql'
\i scripts/campaign-tests/_preamble.sql
\if :matrx_skip
\quit
\endif

begin;
set local statement_timeout = '58s';
set local lock_timeout = '10s';
create temp table rs8b (org uuid, tid uuid, label text) on commit drop;
create temp table rs8b_diff (what text) on commit drop;

\if :{?plant}
-- THE PLANTED BREAK (rolled back with everything else): the column itself only, never what a formula reads.
create or replace function custom._may_touch_fields(p_user_id uuid, p_organization_id uuid, p_field_ids uuid[],
                                                    p_level_on_record public.permission_level, p_action text default 'read')
returns table(field_id uuid, ok boolean) language sql stable security definer set search_path to '' as $p$
  select x.id, coalesce(iam.may_touch_field_itself(p_user_id, x.id, p_organization_id, p_level_on_record, p_action), true)
    from (select distinct unnest(p_field_ids) id) x
$p$;
\endif

do $fixture$
declare
  c_admin   constant uuid := '87a6e699-3622-4869-8843-d0867456c0dd';
  c_test    constant uuid := '4060701e-706a-4c76-b3ca-0bbc69fa5a14';
  v_org uuid := gen_random_uuid(); v_home uuid; v_cust uuid; v_jobs uuid;
begin
  if to_regprocedure('custom._may_touch_fields(uuid,uuid,uuid[],permission_level,text)') is null then
    raise exception 'RED — custom._may_touch_fields is absent (READ-SPEED-8 b not applied)';
  end if;
  perform set_config('app.actor_system', 'campaign-test/readspeed8_b', true);
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated"}', true);
  insert into iam.organizations (id, name, slug, abbreviation, created_by)
  values (v_org, 'Larkspur Garage Doors ' || substr(v_org::text, 1, 8), 'larkspur-rs8b-' || substr(v_org::text, 1, 8), 'LGD', c_admin);
  insert into iam.memberships (organization_id, container_type, container_id, user_id, role, status)
  values (v_org, 'organization', v_org, c_admin, 'owner', 'active'), (v_org, 'organization', v_org, c_test, 'member', 'active');
  insert into platform.knob_override (feature, key, scope_kind, scope_id, organization_id, value, set_note)
  values ('custom', 'system_enabled', 'organization', v_org, v_org, 'true'::jsonb, 'readspeed8_b fixture'),
         ('custom', 'member_default_visibility', 'organization', v_org, v_org, '"shared_only"'::jsonb, 'readspeed8_b fixture');
  insert into custom.record (organization_id, table_id, data) values (v_org, null, jsonb_build_object('name', 'Home')) returning id into v_home;
  v_jobs := custom.table_declare(v_org, jsonb_build_object('name', 'Jobs', 'slug', 'jobs', 'type', 'entity', 'label_singular', 'Job',
    'label_plural', 'Jobs', 'title_field', 'title', 'display', 'list', 'weight', 'light',
    'ordered', true, 'row_order', 'sorted', 'default_sort', jsonb_build_array(jsonb_build_object('field', 'created_at', 'direction', 'asc')),
    'agent_writable', true, 'retention_days', 3650, 'parent_id', v_home::text,
    'fields', jsonb_build_array(jsonb_build_object('name', 'title'))));
  v_cust := custom.table_declare(v_org, jsonb_build_object('name', 'Customers', 'slug', 'customers', 'type', 'entity', 'label_singular', 'Customer',
    'label_plural', 'Customers', 'title_field', 'name', 'display', 'list', 'weight', 'light',
    'ordered', true, 'row_order', 'sorted', 'default_sort', jsonb_build_array(jsonb_build_object('field', 'created_at', 'direction', 'asc')),
    'agent_writable', true, 'retention_days', 3650, 'parent_id', v_home::text,
    'fields', jsonb_build_array(jsonb_build_object('name', 'name'))));
  perform custom.field_declare(v_org, v_jobs, jsonb_build_object('key', 'title', 'label', 'Title', 'type', 'text', 'sort', 10));
  perform custom.field_declare(v_org, v_jobs, jsonb_build_object('key', 'cost', 'label', 'Cost', 'type', 'currency', 'unit', '$', 'sort', 20, 'sensitivity', 'confidential'));
  perform custom.field_declare(v_org, v_cust, jsonb_build_object('key', 'name', 'label', 'Name', 'type', 'text', 'sort', 10));
  perform custom.field_declare(v_org, v_cust, jsonb_build_object('key', 'credit_limit', 'label', 'Credit limit', 'type', 'currency', 'unit', '$', 'sort', 20, 'sensitivity', 'confidential'));
  perform custom.field_declare(v_org, v_cust, jsonb_build_object('key', 'jobs', 'label', 'Jobs', 'type', 'relation', 'relation_target', v_jobs, 'multi', true, 'sort', 30));
  perform custom.field_declare(v_org, v_cust, jsonb_build_object('key', 'cost_total', 'label', 'Cost total', 'type', 'rollup', 'via', 'jobs', 'agg', 'sum', 'of', 'cost', 'sort', 40));
  perform custom.field_declare(v_org, v_cust, jsonb_build_object('key', 'limit_x2', 'label', 'Limit x2', 'type', 'formula', 'formula_text', '{Credit limit} * 2', 'sort', 50));
  perform custom.field_declare(v_org, v_cust, jsonb_build_object('key', 'limit_band', 'label', 'Limit band', 'type', 'formula', 'formula_text', 'IF({Limit x2} > 1000, "High", "Low")', 'sort', 60));
  perform custom.field_declare(v_org, v_cust, jsonb_build_object('key', 'name_upper', 'label', 'Name upper', 'type', 'formula', 'formula_text', 'UPPER({Name})', 'sort', 70));
  perform custom.share_grant(v_org, v_cust, 'person', c_test, 'viewer'::public.permission_level);
  perform custom.share_grant(v_org, v_jobs, 'person', c_test, 'viewer'::public.permission_level);
  -- the share of ONE column: Limit x2 itself is shared to her, so only what it reads (Credit limit) can withhold it
  perform custom.share_grant(v_org, (select f.id from custom.record f where f.organization_id = v_org and f.table_id = custom.field_kernel_id()
                                       and f.deleted_at is null and f.data ->> 'entity_definition_id' = v_cust::text and f.data ->> 'key' = 'limit_x2'),
                             'person', c_test, 'editor'::public.permission_level);
  insert into rs8b values (v_org, v_cust, 'fixture Customers'), (v_org, v_jobs, 'fixture Jobs');
  insert into rs8b
  select '884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f'::uuid, t, 'admin org test Table'
    from unnest(array['28e2af9e-ddab-4f02-adea-b3387916c5d4', '0aaa5c59-0df9-4ae6-a4f4-dcba08ac1a9d',
                      '1ce82c3f-440e-4107-a8e7-79c178116c54', 'cb606573-dad2-4df7-8373-1803e6e1c1b4']::uuid[]) t;
  insert into rs8b
  select x.organization_id, x.tid, 'most formulas' from (
    select f.organization_id, (f.data ->> 'entity_definition_id')::uuid tid,
           row_number() over (partition by f.organization_id order by count(*) desc) rn
      from custom.record f
     where f.organization_id in ('0a54df90-eab8-4d07-ab29-81a45fb41e04', '8cb71c8b-5b49-4563-a5fe-d77ff600f8ee')
       and f.table_id = custom.field_kernel_id() and f.deleted_at is null
       and f.data ->> 'type' = 'formula' and f.data -> 'config' ?| array['expr', 'pick', 'agg']
     group by 1, 2) x where x.rn <= 2;
end
$fixture$;

-- one statement per Table: the set answer against the one-by-one door, every person, level and action
select format($s$do $c$
declare r record; v_set text[]; v_one text[]; v_jset boolean; v_jone boolean; v_lvl public.permission_level; v_bad boolean; c record;
begin
  perform set_config('role', 'postgres', true);
  for r in select u, l, a from unnest(array['87a6e699-3622-4869-8843-d0867456c0dd', '4060701e-706a-4c76-b3ca-0bbc69fa5a14',
                                           '00000000-0000-4000-8000-0000000000aa']::uuid[]) u,
                               unnest(array['viewer', 'editor', null]::public.permission_level[]) l,
                               unnest(array['read', 'edit']) a loop
    select coalesce(array_agg(v.field_key order by v.field_key), '{}') into v_set from iam.visible_field_ids(r.u, %1$L, %2$L, r.l, r.a) v;
    select coalesce(array_agg(f.data ->> 'key' order by f.data ->> 'key'), '{}') into v_one from custom.record f
     where f.organization_id = %1$L and f.table_id = custom.field_kernel_id() and f.deleted_at is null
       and (f.data ->> 'entity_definition_id')::uuid = %2$L and iam.may_touch_field(r.u, f.id, %1$L, r.l, r.a);
    if v_set is distinct from v_one then
      insert into rs8b_diff values (format('%3$s %%s level %%s %%s: set %%s, one by one %%s', r.u, r.l, r.a, v_set, v_one));
    end if;
  end loop;
  -- the judgement, against the same loop asked column by column
  for r in select u from unnest(array['87a6e699-3622-4869-8843-d0867456c0dd', '4060701e-706a-4c76-b3ca-0bbc69fa5a14',
                                       '00000000-0000-4000-8000-0000000000aa']::uuid[]) u loop
    v_jset := custom._computed_reader_judge(r.u, %1$L, %2$L);
    v_jone := true;
    if exists (select 1 from unnest(custom._computed_component(%1$L, %2$L)) t
                where not coalesce((select s.o_all_visible from custom.visible_set(r.u, %1$L, t, 'viewer'::public.permission_level) s), false)) then
      v_jone := false;
    else
      for c in
        with f as (select f.id, f.data, (f.data ->> 'entity_definition_id')::uuid tid from custom.record f
                    where f.organization_id = %1$L and f.table_id = custom.field_kernel_id() and f.deleted_at is null
                      and (f.data ->> 'entity_definition_id')::uuid = any (custom._computed_component(%1$L, %2$L))),
        k as (select f.data -> 'config' ->> 'of' k from f where custom.parity_type(f.data) in ('rollup', 'lookup')
              union select f.data -> 'config' ->> 'via' from f where custom.parity_type(f.data) in ('rollup', 'lookup')
              union select jsonb_object_keys(case when jsonb_typeof(f.data -> 'config' -> 'filter') = 'object' then f.data -> 'config' -> 'filter' else '{}'::jsonb end)
                      from f where custom.parity_type(f.data) in ('rollup', 'lookup')
              union select jsonb_array_elements_text(case when jsonb_typeof(f.data -> 'depends_on') = 'array' then f.data -> 'depends_on' else '[]'::jsonb end) from f),
        ids as (select (x #>> '{}') id from f cross join lateral jsonb_path_query(coalesce(f.data -> 'config' -> 'expr', 'null'::jsonb), 'strict $.**.field') x
                 where custom.parity_type(f.data) = 'formula' and jsonb_typeof(x) = 'string')
        select f.id, f.tid from f where f.data ->> 'key' in (select k from k where k is not null) or f.id::text in (select id from ids)
            or custom.parity_type(f.data) in ('rollup', 'lookup', 'formula') order by f.tid
      loop
        v_lvl := custom.effective_level(r.u, %1$L, c.tid);
        if not coalesce(iam.may_touch_field(r.u, c.id, %1$L, v_lvl, 'read'), false) then v_jone := false; exit; end if;
      end loop;
    end if;
    if v_jset is distinct from v_jone then
      insert into rs8b_diff values (format('%3$s %%s judgement: set %%s, one by one %%s', r.u, v_jset, v_jone));
    end if;
  end loop;
end $c$;$s$, org, tid, label || ' ' || tid) from rs8b \gexec

do $t$
declare v_n integer; v_test text[]; v_fix uuid; v_org uuid; d text;
begin
  select org, tid into v_org, v_fix from rs8b where label = 'fixture Customers';
  select coalesce(array_agg(v.field_key order by v.field_key), '{}') into v_test
    from iam.visible_field_ids('4060701e-706a-4c76-b3ca-0bbc69fa5a14', v_org, v_fix, 'viewer', 'read') v;
  raise notice 'fixture Customers, test@test.com at viewer reads: %', v_test;
  if v_test && array['credit_limit', 'limit_x2', 'limit_band', 'cost_total'] then
    insert into rs8b_diff values ('test@test.com is given a column worked out from a confidential one: ' || v_test::text);
  end if;
  if not v_test @> array['name', 'name_upper'] then
    insert into rs8b_diff values ('test@test.com is refused a column she may read: ' || v_test::text);
  end if;
  select count(*) into v_n from rs8b_diff;
  for d in select what from rs8b_diff limit 8 loop raise notice 'DIFF %', d; end loop;
  if v_n > 0 then
    raise exception 'RED — % answers differ between the set door and the one-by-one door', v_n;
  end if;
  raise notice 'GREEN — % Tables x 3 people x 3 levels x 2 actions, and 3 judgements each: the set answer equals the one-by-one answer', (select count(*) from rs8b);
end
$t$;

rollback;
