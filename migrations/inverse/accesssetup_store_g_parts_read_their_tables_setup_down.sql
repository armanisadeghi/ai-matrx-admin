-- chair-step: inverse of accesssetup_store_g — restores the preset-only bodies of custom._store_part_cells and custom._store_column_itself (accesssetup_store_d); scoped setups stop answering.
-- lane: access-store
-- lock: custom
-- ground-standing-ok: b - this inverse runs BEFORE accesssetup_store_d_parts_answer_for_columns_down, which drops these bodies and their callees together.

CREATE OR REPLACE FUNCTION custom._store_part_cells(p_org uuid, p_table uuid, p_part text, p_word text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select jsonb_build_array(
           jsonb_build_object('seat', jsonb_build_object('kind', 'row_level', 'min',
                                iam.field_sensitivity_level(coalesce(p_word, 'internal'), 'read', p_org)),
                              'level', 'viewer', 'preset', coalesce(p_word, 'internal')),
           jsonb_build_object('seat', jsonb_build_object('kind', 'row_level', 'min',
                                iam.field_sensitivity_level(coalesce(p_word, 'internal'), 'edit', p_org)),
                              'level', 'editor', 'preset', coalesce(p_word, 'internal')));
$function$;

CREATE OR REPLACE FUNCTION custom._store_column_itself(p_person uuid, p_row uuid, p_field_id uuid, p_org uuid, p_level permission_level, p_action text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_f      custom.record;
  v_table  uuid;
  v_cells  jsonb;
  v_cell   jsonb;
  v_want   public.permission_level := case when p_action = 'read' then 'viewer' else 'editor' end;
  v_share  public.permission_level;
  v_grant  public.permission_level;
begin
  if p_field_id is null then return true; end if;
  select * into v_f from custom.record f
   where f.organization_id = p_org and f.id = p_field_id and f.table_id = custom.field_kernel_id() and f.deleted_at is null;
  if not found then return false; end if;   -- a field nobody declared is not a field this store hands out
  if not custom._store_portal_allows(p_person, p_field_id, p_org, p_action) then return false; end if;
  v_table := nullif(v_f.data ->> 'entity_definition_id', '')::uuid;
  v_cells := custom._store_part_cells(p_org, v_table, custom.store_field_part(v_f.data), v_f.data ->> 'sensitivity');

  -- the share of ONE column (a grant on the field record) at or above the part's lowest level-only rung
  select min((c #>> '{seat,min}')::public.permission_level) into v_share
    from jsonb_array_elements(v_cells) c
   where (c ->> 'level')::public.permission_level >= v_want and c #>> '{seat,kind}' = 'row_level';
  v_grant := iam.granted_level(p_person, 'record', p_field_id);
  if v_grant is not null and v_share is not null and v_grant >= v_share then return true; end if;

  for v_cell in select c from jsonb_array_elements(v_cells) c
                 where (c ->> 'level')::public.permission_level >= v_want loop
    if v_cell #>> '{seat,kind}' = 'row_level' then
      if p_level is not null and p_level >= (v_cell #>> '{seat,min}')::public.permission_level then return true; end if;
    elsif p_row is not null and custom.store_seat_has(p_person, p_row, v_cell -> 'seat') then
      return true;
    end if;
  end loop;
  return false;
end $function$;

