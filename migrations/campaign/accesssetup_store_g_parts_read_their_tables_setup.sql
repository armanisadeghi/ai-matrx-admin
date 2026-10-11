-- chair-step: REPLACES custom._store_part_cells and custom._store_column_itself (accesssetup_store_d) so a part's cells come from the Table's scoped setup (accesssetup_store_f) when its grid names the part — seats on the row: row_level, org_role, field_grant answered set-wide; row_field and row_creator only on a row, with the organization fallback for a required seat nobody holds; a part with no level-only cell is HIDDEN for set-wide uses. Every Table with no setup row answers exactly as before (the preset). Nothing outside the store answers calls these before the swap.
-- lane: access-store
-- lock: custom
-- based-on: custom._store_part_cells(uuid, uuid, text, text) 9fabe2ec7eb0f8d6eb30428d0bfef41953d138c73870ad386c0e40190842f05a
-- based-on: custom._store_column_itself(uuid, uuid, uuid, uuid, permission_level, text) 27a4adfb9a95ede3a8b6df8a02514af48d67b4921dac448556010b5207089d80
--
-- Plan: common-docs/systems/platform/access/projects/access-setup/PLAN.md §12.1 ("Seats are on the row", "One page, one answer").
-- Inverse: migrations/inverse/accesssetup_store_g_parts_read_their_tables_setup_down.sql

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

CREATE OR REPLACE FUNCTION custom._store_column_itself(p_person uuid, p_row uuid, p_field_id uuid, p_org uuid, p_level permission_level, p_action text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
-- one column itself (no worked-out closure): the part's cells, the share of this one column, the portal.
-- Level-only cells answer from p_level (row_level), the organization (org_role) or the column's grants
-- (field_grant); per-row cells (row_field, row_creator) only with a row — with none they count as HIDDEN
-- (every set-wide use) — and a required per-row seat nobody holds on that row falls to the organization's
-- owners and admins.
declare
  v_f      custom.record;
  v_table  uuid;
  v_cells  jsonb;
  v_cell   jsonb;
  v_want   public.permission_level := case when p_action = 'read' then 'viewer' else 'editor' end;
  v_share  public.permission_level;
  v_grant  public.permission_level;
  v_kind   text;
begin
  if p_field_id is null then return true; end if;
  select * into v_f from custom.record f
   where f.organization_id = p_org and f.id = p_field_id and f.table_id = custom.field_kernel_id() and f.deleted_at is null;
  if not found then return false; end if;   -- a field nobody declared is not a field this store hands out
  if not custom._store_portal_allows(p_person, p_field_id, p_org, p_action) then return false; end if;
  v_table := nullif(v_f.data ->> 'entity_definition_id', '')::uuid;
  v_cells := custom._store_part_cells(p_org, v_table, custom.store_field_part(v_f.data), v_f.data ->> 'sensitivity');

  -- the share of ONE column (a grant on the field record): at or above the part's lowest level-only rung,
  -- or the action's own rung when the part has none
  select min((c #>> '{seat,min}')::public.permission_level) into v_share
    from jsonb_array_elements(v_cells) c
   where (c ->> 'level')::public.permission_level >= v_want and c #>> '{seat,kind}' = 'row_level';
  v_share := coalesce(v_share, v_want);
  v_grant := iam.granted_level(p_person, 'record', p_field_id);
  if v_grant is not null and v_grant >= v_share then return true; end if;

  for v_cell in select c from jsonb_array_elements(v_cells) c
                 where (c ->> 'level')::public.permission_level >= v_want loop
    v_kind := v_cell #>> '{seat,kind}';
    if v_kind = 'row_level' then
      if p_level is not null and p_level >= (v_cell #>> '{seat,min}')::public.permission_level then return true; end if;
    elsif v_kind = 'org_role' then
      if exists (select 1 from iam.memberships m
                  where m.organization_id = p_org and m.container_type = 'organization' and m.user_id = p_person
                    and m.role = v_cell #>> '{seat,role}' and m.status = 'active' and m.deleted_at is null) then
        return true;
      end if;
    elsif v_kind = 'field_grant' then
      if coalesce(iam.granted_level(p_person, 'record', (v_cell #>> '{seat,field_id}')::uuid)
                  >= coalesce(v_cell #>> '{seat,min}', 'viewer')::public.permission_level, false) then
        return true;
      end if;
    elsif p_row is not null then
      if custom.store_seat_has(p_person, p_row, v_cell -> 'seat') then return true; end if;
      if coalesce((v_cell ->> 'fallback')::boolean, false)
         and not exists (select 1 from custom.store_seat_holders(p_row, v_cell -> 'seat'))
         and p_person in (select custom.store_seat_fallback(p_org)) then
        return true;
      end if;
    end if;
  end loop;
  return false;
end $function$;
