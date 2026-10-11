-- chair-step: THE SWAP (access-setup PLAN §12 order 5, §12.1). REPLACES iam.may_touch_field_itself so every column answer — iam.may_touch_field (worked-out closure, unchanged), iam.visible_field_ids, custom.read_mask_for / read_mask_at and every mask->'visible' reader (_drill_compile, dashboards, record_card, record_filter_sql, record_search_sql, aggregates, enrich_due, table_duplicate, portal_declare, context_tree, …) — comes from the column's PART (scoped setup or the sensitivity preset) plus the share of one column and the portal; per-row cells count as hidden there. custom._field_write_door asks the per-row form (iam.part_may_touch with the row). custom.hidden_field_notice becomes custom.store_part_notice ({part, who} for a named part; word presets keep today's notice). Tables with no setup answer exactly as before: proven against the frozen oracle (iam._legacy_*) on the clone, 0 differences.
-- lane: access-store
-- lock: iam,custom
-- based-on: custom.store_part_notice(custom.record, text) abeedd1a30b68c554490e8feddccd5dc3f898161fe53324084d41ce58eb2a187
-- based-on: iam.may_touch_field_itself(uuid, uuid, uuid, permission_level, text) c532c1e4f391514c571ed3bf7abfaaa96e0ee53204bbeb7f311d0789442d185e
-- based-on: custom.hidden_field_notice(custom.record, text) 783ccec796e9e104fd280c0f6a04ab003f6f9d9706794490c3d81bf513a28417
-- based-on: custom._field_write_door() f7eb540883fff88019055359d002070d49086640351b63e3f111cf66e71e9728
--
-- Plan: common-docs/systems/platform/access/projects/access-setup/PLAN.md §12 order 5, §12.1 ("One swap point each").
-- Inverse: migrations/inverse/accesssetup_store_h_columns_answer_from_their_part_down.sql

CREATE OR REPLACE FUNCTION custom.store_part_notice(p_field custom.record, p_action text DEFAULT 'read'::text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  -- today's notice (reason, needs, or, and for a worked-out column what it reads) with the part and who
  -- reads it; withheld.tsx says "Pay — people with Admin on this row" from {part, who}
  select jsonb_build_object(
    'reason', p_field.data ->> 'sensitivity',
    'needs',  iam.level_label('record', iam.field_sensitivity_level(p_field.data ->> 'sensitivity', p_action, p_field.organization_id)),
    'or',     'a share of this one field with you',
    -- a named part says its name and who reads it; a word preset keeps today's sentence (part and who null)
    'part',   nullif(btrim(p_field.data ->> 'part'), ''),
    'who',    case when nullif(btrim(p_field.data ->> 'part'), '') is null then null else custom.store_part_who(custom._store_part_cells(p_field.organization_id,
                 nullif(p_field.data ->> 'entity_definition_id', '')::uuid,
                 custom.store_field_part(p_field.data), p_field.data ->> 'sensitivity'), p_action) end)
  || coalesce((
    select jsonb_build_object(
             'reads', jsonb_agg(c.input_label order by c.input_label),
             'says',  format('%s is worked out from %s, which you have not been given.',
                             coalesce(nullif(p_field.data ->> 'label', ''), p_field.data ->> 'key'),
                             string_agg(c.input_label, ', ' order by c.input_label)))
      from custom.field_input_closure(p_field.organization_id, p_field.data, p_field.id) c
     where not c.retired and custom.sensitivity_rank(c.sensitivity) > custom.sensitivity_rank('internal')
    having count(*) > 0), '{}'::jsonb);
$function$;

CREATE OR REPLACE FUNCTION iam.may_touch_field_itself(p_user_id uuid, p_field_id uuid, p_organization_id uuid, p_level_on_record permission_level, p_action text DEFAULT 'read'::text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
-- THE SWAP (access-setup PLAN §12 order 5, §12.1 "One swap point each"): a column's answer is its PART's —
-- the Table's scoped setup when its grid names the part, else the sensitivity word's preset (read live from
-- custom/field_sensitivity_levels) — plus the share of this one column and the portal, exactly as before.
-- No row here: per-row cells (row_field, row_creator) count as hidden; the write door asks the per-row form
-- (iam.part_may_touch with the row). The body before the swap is iam._legacy_may_touch_field_itself.
begin
  return custom._store_column_itself(p_user_id, null, p_field_id, p_organization_id, p_level_on_record, p_action);
end $function$;

CREATE OR REPLACE FUNCTION custom.hidden_field_notice(p_field custom.record, p_action text DEFAULT 'read'::text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
  -- ACCESS-SETUP §12.1: the store's notice — today's {reason, needs, or} (and, for a worked-out column, what it
  -- reads), plus {part, who} when the column is in a named part. The body before the swap is
  -- custom._legacy_hidden_field_notice.
  select custom.store_part_notice(p_field, p_action);
$function$;

CREATE OR REPLACE FUNCTION custom._field_write_door()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_me    uuid := auth.uid();
  v_level public.permission_level;
  v_key   text;
  v_field custom.record;
  v_old   jsonb := coalesce(case when tg_op = 'UPDATE' then old.data end, '{}'::jsonb);
begin
  -- WHO THIS SKIPS, AND WHY IT IS NOT THE ROLE. Every write door into this store is
  -- SECURITY DEFINER and every server lane runs as the role that OWNS custom.record, so a
  -- role test here would skip the only write path that exists and DOOR-3 would be a law
  -- nothing ever enforced. What matters is whether a PERSON is being acted for: when the
  -- request carries one, that person's field-level security binds the write, whichever
  -- door and whichever role it arrived through. A write carrying no person at all is the
  -- store's own housekeeping and has no field-level answer to give.
  if v_me is null then
    return new;
  end if;
  if new.table_id is null or new.table_id = custom.field_kernel_id() then
    return new;
  end if;

  -- CREATING is not editing somebody else's field. `platform._stamp_actor` has already run
  -- (it sorts ahead of this trigger), so `created_by` is the person, and VIS-25 makes the
  -- creator the owner and therefore the top level on what they just made. Without this arm
  -- nobody could ever write a confidential field's first value, including its author — and
  -- it is also why the ladder below is only ever asked about a row that already exists.
  if tg_op = 'INSERT' and new.created_by = v_me then
    return new;
  end if;

  -- THE ONE LADDER'S LEVEL FORM. This used to be `iam.effective_level`, which is arm 2 of
  -- the one function rather than the one function: it cannot see the store's own carrying,
  -- so a person admitted to this record THROUGH its Table was masked out of every field on
  -- it. `custom.effective_level` is the same question the read door asks, so the fields a
  -- person may change are decided on the ladder that decided they may be here at all.
  v_level := custom.effective_level(v_me, new.organization_id, new.id, 'record');

  for v_key in
    select e.key from jsonb_each(coalesce(new.data, '{}'::jsonb)) e
     where left(e.key, 1) <> '_'
       and (v_old -> e.key) is distinct from e.value
  loop
    select f.* into v_field
      from custom.record f
     where f.organization_id = new.organization_id
       and f.table_id = custom.field_kernel_id()
       and f.deleted_at is null
       and (f.data ->> 'entity_definition_id')::uuid = new.table_id
       and f.data ->> 'key' = v_key;
    if not found then continue; end if;

    -- ACCESS-SETUP §12.1: the per-row form — a part's per-row cells (the person on THIS row) answer here.
    if not iam.part_may_touch(v_me, new.id, v_field.id, v_level, 'edit') then
      raise exception 'You can see this record, but "%" is not yours to change.',
                      coalesce(v_field.data ->> 'label', v_key)
        using errcode = '42501',
              hint = 'DOOR-3: the store refuses an edit to a field you may not edit, whichever door you came through. '
                     || 'It would take ' || iam.level_label('record',
                          iam.field_sensitivity_level(v_field.data ->> 'sensitivity', 'edit', new.organization_id))
                     || ', or a share of this one field with you.';
    end if;
  end loop;
  return new;
end;
$function$;
