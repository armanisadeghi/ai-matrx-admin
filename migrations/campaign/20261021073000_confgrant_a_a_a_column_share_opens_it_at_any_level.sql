-- chair-step: REPLACES the one field-access rule, custom._store_column_itself (asked by iam.may_touch_field_itself -> iam.may_touch_field, its set form custom._may_touch_fields, and the per-row iam.part_may_touch), so an explicit share of ONE column opens it at the action's own rung for every sensitivity word: a viewer share reads it, an editor share reads and edits it. Before, a word preset needed the share to reach the word's own rung (Confidential: admin), so a viewer or editor share of a Confidential column opened nothing. Nothing is dropped. Inverse: migrations/inverse/20261021073000_confgrant_a_a_a_column_share_opens_it_at_any_level_down.sql.
-- lane: confidential-grant
-- lock: custom
-- based-on: custom._store_column_itself(uuid, uuid, uuid, uuid, permission_level, text) 8c128d644313cb9a3571e34d7ae3da853ffd51b37160e1daf17cd67e9a9c20e6
--
-- CONFIDENTIAL-GRANT (R23, common-docs systems/data/custom-data/VISION.md: "confidential -> hidden below admin unless
-- granted; grants override"; Arman 2026-10-20 "Confidential columns hide below admin by default"). The default stays the
-- knob custom/field_sensitivity_levels (Confidential reads and edits from admin); an explicit grant on the field now
-- overrides it as the rule says. Every door asks this one function (grid, Sheet, record panel, REST, MCP, export,
-- aggregate, filter, kept masks), so they all agree. A formula column still also needs every column it reads
-- (iam.may_touch_field's closure is unchanged).
-- Kept masks follow a share write: iam.permissions INSERT/UPDATE/DELETE bump the access version
-- (custom._access_version_bump_rows, triggers zzzzzz_access_version*), proven in the lane report.
-- Test: scripts/airtable-walk/confidential-grant.mjs (RED before, GREEN after).

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

  -- the share of ONE column (a grant on the field record) — R23, "grants override": an explicit share opens the
  -- column at the ACTION's own rung, whatever the sensitivity word or the Table's part asks of everyone else, so a
  -- viewer share reads it and an editor share reads and edits it (CONFIDENTIAL-GRANT, 2026-10-21). A level-only
  -- cell that already asks less of a share keeps asking less.
  select min((c #>> '{seat,min}')::public.permission_level) into v_share
    from jsonb_array_elements(v_cells) c
   where (c ->> 'level')::public.permission_level >= v_want and c #>> '{seat,kind}' = 'row_level';
  v_share := least(coalesce(v_share, v_want), v_want);
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
