-- chair-step: REPLACES custom._store_column_itself (accesssetup_store_g) so a share of ONE column opens a column in a part the Table's setup declares at the action's own rung (a viewer share reads, an editor share edits) — the per-column layer on top of parts (§12.1). Word presets keep today's rule (the share must reach the rung the word needs). Nothing outside the store answers calls it before the swap.
-- lane: access-store
-- lock: custom
-- based-on: custom._store_column_itself(uuid, uuid, uuid, uuid, permission_level, text) a9787eb88e6802621963c53d9e4704debcde732de891deb57ee53a7b59737506
--
-- Plan: common-docs/systems/platform/access/projects/access-setup/PLAN.md §12.1 ("Per-column layer stays").
-- Inverse: migrations/inverse/accesssetup_store_g2_a_column_share_opens_a_scoped_part_down.sql

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

  -- the share of ONE column (a grant on the field record): for a word preset, at or above the rung the word
  -- needs (today's rule); for a part the Table's setup declares, the action's own rung (viewer reads, editor edits)
  select min((c #>> '{seat,min}')::public.permission_level) into v_share
    from jsonb_array_elements(v_cells) c
   where (c ->> 'level')::public.permission_level >= v_want and c #>> '{seat,kind}' = 'row_level';
  if exists (select 1 from jsonb_array_elements(v_cells) c where c ? 'seat_key') then
    v_share := v_want;
  end if;
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
