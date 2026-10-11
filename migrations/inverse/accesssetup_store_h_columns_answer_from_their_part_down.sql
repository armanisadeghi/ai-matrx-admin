-- chair-step: inverse of accesssetup_store_h — un-swaps: restores iam.may_touch_field_itself, custom.hidden_field_notice, custom._field_write_door and custom.store_part_notice to their bodies before the swap (the column answer is the sensitivity ladder again).
-- lane: access-store
-- lock: iam,custom
-- ground-standing-ok: b - this inverse runs BEFORE accesssetup_store_d_parts_answer_for_columns_down, which drops custom.store_part_notice's callees together.

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
    'part',   coalesce(nullif(btrim(p_field.data ->> 'part'), ''),
                       case when custom.store_field_part(p_field.data) = 'columns' then null
                            else initcap(coalesce(p_field.data ->> 'sensitivity', 'internal')) end),
    'who',    custom.store_part_who(custom._store_part_cells(p_field.organization_id,
                 nullif(p_field.data ->> 'entity_definition_id', '')::uuid,
                 custom.store_field_part(p_field.data), p_field.data ->> 'sensitivity'), p_action))
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
declare
  v_sensitivity text;
  v_required    public.permission_level;
  v_granted     public.permission_level;
begin
  if p_field_id is null then return true; end if;

  select f.data ->> 'sensitivity'
    into v_sensitivity
    from custom.record f
   where f.organization_id = p_organization_id
     and f.id = p_field_id
     and f.table_id = custom.field_kernel_id()
     and f.deleted_at is null;
  if not found then
    -- A field nobody declared is not a field this store will hand out.
    return false;
  end if;

  -- PORTAL (2026-09-20) — AN OUTSIDER'S FIELDS ARE THE ONES HER PORTAL DECLARED, AND THIS
  -- NARROWS ONLY. A portal says which fields a client sees and which she may change; the
  -- answer belongs here, in the one question the platform already asks about a field, so a
  -- portal screen and an edit through `custom.record_update` cannot disagree and neither of
  -- them needs to know a portal exists.
  --
  -- The first test is one index probe on `custom.portal_principal (user_id, organization_id)`
  -- and finds nothing for every member of every organization, which is the whole platform
  -- except the handful of people a portal named. A person who is BOTH a member here and a
  -- portal principal here is a member: the portal is for outsiders, and narrowing a colleague
  -- because somebody put their address in a client row would be a new way to lose access.
  if coalesce((platform.knob_resolve('custom', 'external_principal_enabled', p_organization_id) #>> '{}')::boolean, false)
     and exists (select 1 from custom.portal_principal pp
                  where pp.user_id = p_user_id
                    and pp.organization_id = p_organization_id
                    and pp.is_active)
     and not iam.has_org_access_for(p_user_id, p_organization_id) then
    if not exists (
      select 1
        from custom.portal_table pt
        join custom.portal p on p.id = pt.portal_id and p.is_active
        join custom.portal_principal pp on pp.portal_id = p.id
       where pt.organization_id = p_organization_id
         and pp.user_id = p_user_id
         and pp.is_active
         and case when p_action = 'read'
                  then p_field_id = any (pt.visible_field_ids)
                  else p_field_id = any (pt.editable_field_ids)
             end) then
      return false;
    end if;
  end if;

  v_required := iam.field_sensitivity_level(v_sensitivity, p_action, p_organization_id);

  -- VIS-21 / VIS-26: the OVERRIDE is a row in the one grant table, on the field record.
  v_granted := iam.granted_level(p_user_id, 'record', p_field_id);
  if v_granted is not null and v_granted >= v_required then
    return true;
  end if;

  return p_level_on_record is not null and p_level_on_record >= v_required;
end $function$;

CREATE OR REPLACE FUNCTION custom.hidden_field_notice(p_field custom.record, p_action text DEFAULT 'read'::text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
  -- STORE-LEAK-FORMULA: a withheld worked-out column also says WHAT it is worked out from, so a
  -- reader is told "Budget with contingency is worked out from Budget" — never shown a value
  -- and never a bare "—". Every other column's notice is exactly what it was.
  select jsonb_build_object(
    'reason', p_field.data ->> 'sensitivity',
    'needs',  iam.level_label('record',
                iam.field_sensitivity_level(p_field.data ->> 'sensitivity', p_action,
                                            p_field.organization_id)),
    'or',     'a share of this one field with you')
  || coalesce((
    select jsonb_build_object(
             'reads', jsonb_agg(c.input_label order by c.input_label),
             'says',  format('%s is worked out from %s, which you have not been given.',
                             coalesce(nullif(p_field.data ->> 'label', ''), p_field.data ->> 'key'),
                             string_agg(c.input_label, ', ' order by c.input_label)))
      from custom.field_input_closure(p_field.organization_id, p_field.data, p_field.id) c
     where not c.retired
       and custom.sensitivity_rank(c.sensitivity) > custom.sensitivity_rank('internal')
    having count(*) > 0), '{}'::jsonb);
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

    if not iam.may_touch_field(v_me, v_field.id, new.organization_id, v_level, 'edit') then
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
