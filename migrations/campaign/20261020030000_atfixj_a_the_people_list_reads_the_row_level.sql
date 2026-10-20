-- target: production
-- additive: yes
--   REPLACES one body, `custom.field_access_setup(uuid, jsonb)` (byte for byte as live, plus the People list asking
--   the level the row doors use). No table, trigger, policy, index, grant or row.
--   Inverse: migrations/inverse/20261020030000_atfixj_a_the_people_list_reads_the_row_level_down.sql.
-- guard: custom/system_enabled
-- lock: custom
-- lane: at-fix-j
-- based-on: custom.field_access_setup(uuid, jsonb) d47187c30e3e957140f2bbb15627f90002f500ec4ddfb8f5ebf6cb34176ae14f
--
-- AT-FIX-J item 2. The "Who can see and edit" screen's People list read each person's level on the Table's own
-- record (a member: Viewer) while every row door masks a column at the level on the ROW (a member: Editor, knob
-- custom/member_default_level). So marking Qty Confidential (read from Editor, knob custom/field_sensitivity_levels)
-- showed test@test.com "Loses sight" while the grid still showed her the column. The list now asks the level the
-- row doors use (custom.levels_of on one row of the Table; the Table's own level when it has no row yet).
-- Nothing about who actually sees a column changes: the screen stops contradicting it.

CREATE OR REPLACE FUNCTION custom.field_access_setup(p_field_id uuid, p_proposed jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
-- One column's People involved: its part, the columns in that part, the words a part can take (with the
-- level each needs today, read live from the knob), and every person who reaches the Table with whether
-- they see and edit this column now. With p_proposed {part?, word} it also says who would LOSE sight or
-- editing (and who would gain it) before anything is saved. Table admins may change it; never an agent.
declare
  v_me     uuid := auth.uid();
  v_f      custom.record;
  v_table  uuid;
  v_org    uuid;
  v_mine   public.permission_level;
  v_title  boolean;
  v_why    text;
  v_word   text;
  v_pdata  jsonb;
  v_people jsonb;
  v_map    jsonb;
  v_row    uuid;
begin
  if v_me is null then return jsonb_build_object('ok', false, 'reason', 'no_caller'); end if;
  select * into v_f from custom.record f
   where f.id = p_field_id and f.table_id = custom.field_kernel_id() and f.deleted_at is null;
  if not found then return jsonb_build_object('ok', false, 'reason', 'not_reachable'); end if;
  v_table := nullif(v_f.data ->> 'entity_definition_id', '')::uuid;
  v_org := v_f.organization_id;
  v_mine := custom.effective_level(v_me, v_org, v_table, 'record');
  if v_mine is null then return jsonb_build_object('ok', false, 'reason', 'not_reachable'); end if;
  v_title := exists (select 1 from custom.record t where t.id = v_table and t.table_id = custom.table_kernel_id()
                        and t.data ->> 'title_field' = v_f.data ->> 'key');
  v_why := case
    when platform.declared_actor_tier() is not distinct from 'agent' then 'An agent never decides who sees a column.'
    when v_mine is distinct from 'admin' then 'Only a table admin decides who sees a column.'
    when v_title then 'This column names each record, so everyone who can open a row sees it.'
    when coalesce(v_f.data ->> 'type', '') = 'formula' then 'This column is worked out from others; it is as private as what it reads.'
  end;
  begin
    v_map := platform.knob_resolve('custom', 'field_sensitivity_levels', v_org);
  exception when others then v_map := '{}'::jsonb;
  end;

  if p_proposed is not null then
    v_word := coalesce(p_proposed ->> 'word', v_f.data ->> 'sensitivity', 'internal');
    if not coalesce(v_map -> 'read' ? v_word, false) then
      return jsonb_build_object('ok', false, 'reason', 'unknown_word', 'word', v_word);
    end if;
    v_pdata := (v_f.data - 'part') || jsonb_build_object('sensitivity', v_word)
               || case when nullif(btrim(coalesce(p_proposed ->> 'part', '')), '') is not null
                       then jsonb_build_object('part', btrim(p_proposed ->> 'part')) else '{}'::jsonb end;
  end if;

  select r.id into v_row from custom.record r
   where r.organization_id = v_org and r.table_id = v_table and r.deleted_at is null and r.data_class = 'record'
   order by r.created_at, r.id limit 1;

  -- everyone who reaches the Table: members, people granted on the Table or on this column, portal people
  with cand as (
    select m.user_id u from iam.memberships m
     where m.organization_id = v_org and m.container_type = 'organization' and m.status = 'active'
       and m.deleted_at is null and m.user_id is not null
    union
    select p.granted_to_user_id from iam.permissions p
     where p.resource_type = 'record' and p.resource_id in (v_table, p_field_id) and p.granted_to_user_id is not null
       and p.status <> 'rejected' and (p.expires_at is null or p.expires_at > now())),
  -- AT-FIX-J: a person's level HERE is the level the row doors mask the Table's rows at (custom.levels_of, asked of
  -- one row of the Table), not the level on the Table's own record. A member is a Viewer on the Table's structure and
  -- an Editor on its rows (custom/member_default_level), and the read door shows a column at the row level, so the
  -- list says "Sees" exactly when the grid shows it. A Table with no row yet has only its own level to go by.
  lv as (select u, case when v_row is null then custom.effective_level(u, v_org, v_table, 'record')
                        else (custom.levels_of(u, array[v_row]) -> v_row::text ->> 'l')::public.permission_level end l from cand),
  ans as (
    select u, l,
           iam.part_may_touch(u, null, p_field_id, l, 'read') r_now,
           iam.part_may_touch(u, null, p_field_id, l, 'edit') and l >= 'editor' e_now,
           case when v_pdata is null then null else
             (l >= iam.field_sensitivity_level(v_word, 'read', v_org)
              or coalesce(iam.granted_level(u, 'record', p_field_id) >= iam.field_sensitivity_level(v_word, 'read', v_org), false)) end r_next,
           case when v_pdata is null then null else
             (l >= 'editor' and (l >= custom._store_rung(iam.field_sensitivity_level(v_word, 'edit', v_org))
              or coalesce(iam.granted_level(u, 'record', p_field_id) >= custom._store_rung(iam.field_sensitivity_level(v_word, 'edit', v_org)), false))) end e_next,
           iam.granted_level(u, 'record', p_field_id) share
      from lv where l is not null)
  select coalesce(jsonb_agg(custom._store_person_card(a.u) || jsonb_build_object(
           'level', a.l, 'sees', a.r_now, 'edits', a.e_now, 'share', a.share,
           'sees_next', a.r_next, 'edits_next', a.e_next) order by a.l desc, a.u), '[]'::jsonb)
    into v_people from ans a;

  return jsonb_build_object(
    'ok', true,
    'field', jsonb_build_object('id', v_f.id, 'key', v_f.data ->> 'key',
               'label', coalesce(nullif(v_f.data ->> 'label', ''), v_f.data ->> 'key'),
               'part', nullif(btrim(coalesce(v_f.data ->> 'part', '')), ''),
               'word', coalesce(v_f.data ->> 'sensitivity', 'internal'),
               'names_each_record', v_title, 'worked_out', coalesce(v_f.data ->> 'type', '') = 'formula'),
    'table_id', v_table,
    'my_level', v_mine,
    'may_change', v_why is null,
    'why_not', v_why,
    'parts', (select coalesce(jsonb_agg(distinct btrim(f.data ->> 'part')), '[]'::jsonb) from custom.record f
               where f.organization_id = v_org and f.table_id = custom.field_kernel_id() and f.deleted_at is null
                 and (f.data ->> 'entity_definition_id')::uuid = v_table and nullif(btrim(f.data ->> 'part'), '') is not null),
    'part_columns', (select coalesce(jsonb_agg(coalesce(nullif(f.data ->> 'label', ''), f.data ->> 'key') order by f.data ->> 'label'), '[]'::jsonb)
               from custom.record f
               where f.organization_id = v_org and f.table_id = custom.field_kernel_id() and f.deleted_at is null
                 and (f.data ->> 'entity_definition_id')::uuid = v_table and f.id <> v_f.id
                 and nullif(btrim(v_f.data ->> 'part'), '') is not null
                 and lower(btrim(f.data ->> 'part')) = lower(btrim(v_f.data ->> 'part'))),
    'words', (select coalesce(jsonb_agg(jsonb_build_object('word', k,
                 'read_needs', iam.level_label('record', iam.field_sensitivity_level(k, 'read', v_org)),
                 'edit_needs', iam.level_label('record', custom._store_rung(iam.field_sensitivity_level(k, 'edit', v_org))))
                 order by custom.sensitivity_rank(k)), '[]'::jsonb)
               from jsonb_object_keys(coalesce(v_map -> 'read', '{}'::jsonb)) k),
    'people', v_people,
    'proposed', case when v_pdata is null then null else jsonb_build_object(
        'word', v_word, 'part', v_pdata ->> 'part',
        'loses_sight', (select count(*) from jsonb_array_elements(v_people) e where (e ->> 'sees')::boolean and not (e ->> 'sees_next')::boolean),
        'loses_edit',  (select count(*) from jsonb_array_elements(v_people) e where (e ->> 'edits')::boolean and not (e ->> 'edits_next')::boolean),
        'gains_sight', (select count(*) from jsonb_array_elements(v_people) e where not (e ->> 'sees')::boolean and (e ->> 'sees_next')::boolean)) end);
end $function$
