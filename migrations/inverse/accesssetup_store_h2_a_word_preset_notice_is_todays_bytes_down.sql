-- chair-step: inverse of accesssetup_store_h2 — restores the accesssetup_store_h body of custom.store_part_notice (null part/who keys on word presets).
-- lane: access-store
-- lock: custom
-- ground-standing-ok: b - runs BEFORE accesssetup_store_h's and _d's inverses, which drop its callees together.

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

