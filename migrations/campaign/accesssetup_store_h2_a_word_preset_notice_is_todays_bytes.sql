-- chair-step: REPLACES custom.store_part_notice (accesssetup_store_h) so a word preset's notice is byte-for-byte today's ({reason, needs, or} and the worked-out keys, no null part/who keys) — every hidden_field_notice reader sees exactly the legacy notice; a named part still adds {part, who}.
-- lane: access-store
-- lock: custom
-- based-on: custom.store_part_notice(custom.record, text) 0638453910a0b250f99852b3bcd669dfad42cc7b04771d5341d31e47eb39d557
--
-- Plan: common-docs/systems/platform/access/projects/access-setup/PLAN.md §12.1 ("Notices").
-- Inverse: migrations/inverse/accesssetup_store_h2_a_word_preset_notice_is_todays_bytes_down.sql

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
    'or',     'a share of this one field with you')
    -- a named part says its name and who reads it; a word preset keeps today's sentence (part and who null)
  || jsonb_strip_nulls(jsonb_build_object(
    'part',   nullif(btrim(p_field.data ->> 'part'), ''),
    'who',    case when nullif(btrim(p_field.data ->> 'part'), '') is null then null else custom.store_part_who(custom._store_part_cells(p_field.organization_id,
                 nullif(p_field.data ->> 'entity_definition_id', '')::uuid,
                 custom.store_field_part(p_field.data), p_field.data ->> 'sensitivity'), p_action) end))
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

