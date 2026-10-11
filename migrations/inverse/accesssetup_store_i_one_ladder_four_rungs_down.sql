-- chair-step: inverse of accesssetup_store_i — restores the bodies that still named edit_content and drops custom._store_rung.
-- lane: access-store
-- lock: iam,custom
-- ground-standing-ok: b - runs BEFORE accesssetup_store_h2/h/g2/g/f/d inverses, which drop these bodies' callees together.

CREATE OR REPLACE FUNCTION iam.part_may_edit(p_person uuid, p_row uuid, p_field_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_level public.permission_level;
begin
  select custom.effective_level(p_person, r.organization_id, r.id, 'record') into v_level
    from custom.record r where r.id = p_row and r.deleted_at is null;
  if v_level is null or v_level < 'edit_content' then return false; end if;
  return iam.part_may_touch(p_person, p_row, p_field_id, v_level, 'edit');
end $function$;

CREATE OR REPLACE FUNCTION iam.parts_visible_for(p_person uuid, p_table uuid, p_level permission_level)
 RETURNS TABLE(part text, label text, may_read boolean, may_edit boolean, per_row boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
#variable_conflict use_column
declare
  v_key text;
  v_hit text;
  v_org uuid;
  v_out jsonb;
begin
  if p_table is null then return; end if;
  v_key := 'pvf:' || coalesce(p_person::text, '-') || ':' || p_table::text || ':' || coalesce(p_level::text, '-');
  v_hit := platform.memo_k_get(v_key);
  if v_hit is null then
    select t.organization_id into v_org from custom.record t where t.id = p_table;
    with parts as (
      select custom.store_field_part(f.data) as part,
             min(coalesce(nullif(btrim(f.data ->> 'part'), ''), f.data ->> 'sensitivity', 'internal')) as label,
             max(coalesce(f.data ->> 'sensitivity', 'internal')) filter (where true) as word
        from custom.record f
       where f.organization_id = v_org and f.table_id = custom.field_kernel_id() and f.deleted_at is null
         and (f.data ->> 'entity_definition_id')::uuid = p_table and coalesce(f.data ->> 'type', '') <> 'formula'
       group by 1),
    cells as (select p.part, p.label, c
                from parts p, jsonb_array_elements(custom._store_part_cells(v_org, p_table, p.part, p.word)) c)
    select coalesce(jsonb_agg(jsonb_build_object(
             'part', x.part, 'label', x.label,
             'may_read', x.r, 'may_edit', x.e, 'per_row', x.pr) order by x.part), '[]'::jsonb)
      into v_out
      from (select part, label,
                   bool_or(not custom._store_cell_per_row(c) and (c ->> 'level')::public.permission_level >= 'viewer'
                           and (case when c #>> '{seat,kind}' = 'row_level'
                                     then p_level is not null and p_level >= (c #>> '{seat,min}')::public.permission_level
                                     when c #>> '{seat,kind}' = 'org_role'
                                     then exists (select 1 from iam.memberships m where m.organization_id = v_org
                                                    and m.container_type = 'organization' and m.user_id = p_person
                                                    and m.role = c #>> '{seat,role}' and m.status = 'active' and m.deleted_at is null)
                                     else false end)) as r,
                   bool_or(not custom._store_cell_per_row(c) and (c ->> 'level')::public.permission_level >= 'editor'
                           and p_level is not null and p_level >= 'edit_content'
                           and (case when c #>> '{seat,kind}' = 'row_level'
                                     then p_level >= (c #>> '{seat,min}')::public.permission_level
                                     else false end)) as e,
                   bool_or(custom._store_cell_per_row(c)) as pr
              from cells group by part, label) x;
    perform platform.memo_k_put(v_key, v_out::text);
  else
    v_out := v_hit::jsonb;
  end if;
  return query select e ->> 'part', e ->> 'label', (e ->> 'may_read')::boolean, (e ->> 'may_edit')::boolean,
                      (e ->> 'per_row')::boolean
                 from jsonb_array_elements(v_out) e;
end $function$;

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

  -- everyone who reaches the Table: members, people granted on the Table or on this column, portal people
  with cand as (
    select m.user_id u from iam.memberships m
     where m.organization_id = v_org and m.container_type = 'organization' and m.status = 'active'
       and m.deleted_at is null and m.user_id is not null
    union
    select p.granted_to_user_id from iam.permissions p
     where p.resource_type = 'record' and p.resource_id in (v_table, p_field_id) and p.granted_to_user_id is not null
       and p.status <> 'rejected' and (p.expires_at is null or p.expires_at > now())),
  lv as (select u, custom.effective_level(u, v_org, v_table, 'record') l from cand),
  ans as (
    select u, l,
           iam.part_may_touch(u, null, p_field_id, l, 'read') r_now,
           iam.part_may_touch(u, null, p_field_id, l, 'edit') and l >= 'edit_content' e_now,
           case when v_pdata is null then null else
             (l >= iam.field_sensitivity_level(v_word, 'read', v_org)
              or coalesce(iam.granted_level(u, 'record', p_field_id) >= iam.field_sensitivity_level(v_word, 'read', v_org), false)) end r_next,
           case when v_pdata is null then null else
             (l >= 'edit_content' and (l >= iam.field_sensitivity_level(v_word, 'edit', v_org)
              or coalesce(iam.granted_level(u, 'record', p_field_id) >= iam.field_sensitivity_level(v_word, 'edit', v_org), false))) end e_next,
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
                 'edit_needs', iam.level_label('record', iam.field_sensitivity_level(k, 'edit', v_org)))
                 order by custom.sensitivity_rank(k)), '[]'::jsonb)
               from jsonb_object_keys(coalesce(v_map -> 'read', '{}'::jsonb)) k),
    'people', v_people,
    'proposed', case when v_pdata is null then null else jsonb_build_object(
        'word', v_word, 'part', v_pdata ->> 'part',
        'loses_sight', (select count(*) from jsonb_array_elements(v_people) e where (e ->> 'sees')::boolean and not (e ->> 'sees_next')::boolean),
        'loses_edit',  (select count(*) from jsonb_array_elements(v_people) e where (e ->> 'edits')::boolean and not (e ->> 'edits_next')::boolean),
        'gains_sight', (select count(*) from jsonb_array_elements(v_people) e where not (e ->> 'sees')::boolean and (e ->> 'sees_next')::boolean)) end);
end $function$;

CREATE OR REPLACE FUNCTION iam._access_setup_problems_store(p_scope jsonb, s jsonb)
 RETURNS text[]
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
-- a store Table's setup: no subject seat, no stages, parts named by the Table's field records
-- ('columns', 'word:<sensitivity>', 'part:<lower name>'), seats on the row with all three resolver forms
declare
  p text[] := '{}';
  v_table uuid := nullif(p_scope ->> 'table_id', '')::uuid;
  v_org uuid;
  v_seats text[]; v_admin text[]; v_parts text[];
  v_seat jsonb; v_key text; c record; x text; v_why text;
  v_levels text[] := array['viewer','commenter','edit_content','editor','admin'];
begin
  if s is null then return array['no_setup']; end if;
  select t.organization_id into v_org from custom.record t
   where t.id = v_table and t.table_id = custom.table_kernel_id() and t.deleted_at is null;
  if v_org is null then return array['store_table_missing: ' || coalesce(v_table::text, '(none)')]; end if;
  for x in select k from jsonb_object_keys(s) k where k in ('subject_seat','stages','stages_fn','rows_fn','members','recorders','blind_wins','columns') loop
    p := p || ('store_setup_has: ' || x);
  end loop;
  v_parts := array['columns'] || coalesce((select array_agg(distinct custom.store_field_part(f.data)) from custom.record f
               where f.organization_id = v_org and f.table_id = custom.field_kernel_id() and f.deleted_at is null
                 and (f.data ->> 'entity_definition_id')::uuid = v_table and coalesce(f.data ->> 'type', '') <> 'formula'), '{}');
  v_seats := coalesce((select array_agg(e ->> 'key') from jsonb_array_elements(s -> 'seats') e), '{}');
  v_admin := coalesce((select array_agg(e) from jsonb_array_elements_text(s -> 'admin_seats') e), '{}');
  if cardinality(v_seats) <> (select count(distinct u.k) from unnest(v_seats) u(k)) then p := p || 'seat_declared_twice'::text; end if;
  if cardinality(v_admin) = 0 then p := p || 'no_admin_seats'::text; end if;
  foreach x in array v_admin loop
    if not x = any(v_seats) then p := p || ('admin_seat_undeclared: ' || x); end if;
  end loop;
  for v_seat in select e from jsonb_array_elements(coalesce(s -> 'seats', '[]'::jsonb)) e loop
    v_key := v_seat ->> 'key';
    if coalesce(v_seat #>> '{resolver,kind}', '') <> 'store' then
      p := p || ('resolver_kind_unknown: ' || coalesce(v_key, '(none)'));
      continue;
    end if;
    v_why := custom.store_seat_invalid(v_seat #> '{resolver,seat}');
    if v_why is not null then p := p || ('store_seat_invalid: ' || v_key || ' (' || v_why || ')'); end if;
    if v_seat #>> '{resolver,seat,field_id}' is not null
       and custom._store_seat_field_key((v_seat #>> '{resolver,seat,field_id}')::uuid, v_table) is null then
      p := p || ('store_seat_column_not_on_table: ' || v_key);
    end if;
    -- all three forms, the person-scoped one included (iam.seats_of never enumerates every holder)
    if to_regprocedure(coalesce(v_seat #>> '{resolver,fn}', '')) is distinct from 'custom.store_seat_holders(uuid,jsonb)'::regprocedure then
      p := p || ('resolver_missing: ' || v_key);
    end if;
    if to_regprocedure(coalesce(v_seat #>> '{resolver,set_fn}', '')) is distinct from 'custom.store_seat_records(uuid,uuid,jsonb)'::regprocedure then
      p := p || ('resolver_set_form_missing: ' || v_key);
    end if;
    if to_regprocedure(coalesce(v_seat #>> '{resolver,has_fn}', '')) is distinct from 'custom.store_seat_has(uuid,uuid,jsonb)'::regprocedure then
      p := p || ('resolver_person_form_missing: ' || v_key);
    end if;
    if coalesce((v_seat ->> 'required')::boolean, false) and coalesce(v_seat ->> 'fallback', '') <> 'org_owners_admins' then
      p := p || ('required_seat_without_fallback: ' || v_key);
    end if;
  end loop;
  for c in select g.key seat, e.key part, e.value cell
             from jsonb_each(coalesce(s -> 'grid', '{}'::jsonb)) g, jsonb_each(g.value) e loop
    if not c.seat = any(v_seats) then p := p || ('grid_seat_undeclared: ' || c.seat); end if;
    if not c.part = any(v_parts) then p := p || ('grid_part_not_on_table: ' || c.seat || '.' || c.part); end if;
    if not coalesce(c.cell ->> 'level', '') = any(v_levels) then p := p || ('grid_level_invalid: ' || c.seat || '.' || c.part); end if;
    if coalesce(c.cell ->> 'rows', 'all') <> 'all' then p := p || ('store_rows_must_be_all: ' || c.seat || '.' || c.part); end if;
    if c.cell ? 'from_stage' then p := p || ('store_cell_has_stage: ' || c.seat || '.' || c.part); end if;
  end loop;
  -- every part the grid opens is readable by some admin seat (hiding from admins is a courtesy, never a lock)
  for x in select distinct e.key from jsonb_each(coalesce(s -> 'grid', '{}'::jsonb)) g, jsonb_each(g.value) e loop
    if not exists (select 1 from unnest(v_admin) ad where s -> 'grid' -> ad -> x is not null) then
      p := p || ('part_unreadable_by_admin_seats: ' || x);
    end if;
  end loop;
  return p;
end $function$;

CREATE OR REPLACE FUNCTION custom.store_seat_invalid(p_seat jsonb)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
-- why a seat is not one the store can resolve, in words; null when it is
declare v_kind text := p_seat ->> 'kind';
begin
  if p_seat is null or jsonb_typeof(p_seat) <> 'object' then return 'A seat is an object with a kind.'; end if;
  if v_kind is null or v_kind not in ('row_level', 'row_field', 'row_creator', 'org_role', 'field_grant') then
    return format('"%s" is not a kind of seat a Table knows (row_level, row_field, row_creator, org_role, field_grant).',
                  coalesce(v_kind, 'nothing'));
  end if;
  if v_kind in ('row_level') and (p_seat ->> 'min') is null then
    return 'A row_level seat names the lowest level it admits (min).';
  end if;
  if v_kind in ('row_level', 'field_grant') and (p_seat ->> 'min') is not null
     and not ((p_seat ->> 'min') = any (enum_range(null::public.permission_level)::text[])) then
    return format('"%s" is not a level.', p_seat ->> 'min');
  end if;
  if v_kind in ('row_field', 'field_grant')
     and coalesce(p_seat ->> 'field_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return format('A %s seat names its column (field_id).', v_kind);
  end if;
  if v_kind = 'org_role' and coalesce(p_seat ->> 'role', '') not in ('owner', 'admin', 'member') then
    return 'An org_role seat names owner, admin or member.';
  end if;
  return null;
end $function$;

CREATE OR REPLACE FUNCTION custom._store_part_cells(p_org uuid, p_table uuid, p_part text, p_word text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
-- A part's cells. When the Table has a scoped setup (iam.access_setup, scope {table_id}) whose grid names this
-- part, its cells come from that grid: one cell per seat with a cell on the part, carrying the seat's store
-- grammar, the level, and whether the seat is required with the organization fallback. Every other part —
-- and every Table with no setup — answers from its PRESET: the sensitivity word its columns carry, through
-- custom/field_sensitivity_levels read LIVE for the organization.
declare
  s jsonb := iam._access_setup_of_table(p_table);
  v jsonb;
begin
  if s is not null and exists (select 1 from jsonb_each(coalesce(s -> 'grid', '{}'::jsonb)) g where g.value ? p_part) then
    select coalesce(jsonb_agg(jsonb_build_object(
             'seat', st -> 'resolver' -> 'seat',
             'seat_key', st ->> 'key',
             'level', g.value -> p_part ->> 'level',
             'fallback', coalesce((st ->> 'required')::boolean, false) and st ->> 'fallback' = 'org_owners_admins')
             order by st ->> 'key'), '[]'::jsonb)
      into v
      from jsonb_array_elements(coalesce(s -> 'seats', '[]'::jsonb)) st
      join jsonb_each(s -> 'grid') g on g.key = st ->> 'key'
     where g.value ? p_part;
    return v;
  end if;
  return jsonb_build_array(
           jsonb_build_object('seat', jsonb_build_object('kind', 'row_level', 'min',
                                iam.field_sensitivity_level(coalesce(p_word, 'internal'), 'read', p_org)),
                              'level', 'viewer', 'preset', coalesce(p_word, 'internal')),
           jsonb_build_object('seat', jsonb_build_object('kind', 'row_level', 'min',
                                iam.field_sensitivity_level(coalesce(p_word, 'internal'), 'edit', p_org)),
                              'level', 'editor', 'preset', coalesce(p_word, 'internal')));
end $function$;
drop function if exists custom._store_rung(public.permission_level);
