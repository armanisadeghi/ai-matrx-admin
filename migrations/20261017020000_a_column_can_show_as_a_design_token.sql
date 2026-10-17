-- based-on: custom.display_format_ids() 6155275908c787eedf65fc1de0edb709ff9b90967314797ba8255f4a03da90f2
-- why: PLUG-IN FIELD LOOKS (design system / brand sheets, 2026-10-17). Four new "Shows as" looks a text or number
--   column can wear, registered in @ai-matrx/design-system/field-formats and drawn by @ai-matrx/records-ui's look
--   registry: color_pair (a light + dark colour, kept as JSON text), measure (a number with a unit: 16 px),
--   type_style (font, weight, size, line height, letter spacing, kept as JSON text) and shadow (x, y, blur, spread,
--   colour, kept as JSON text). Additive: the list only grows; every existing column keeps its look.
create or replace function custom.display_format_ids()
 returns text[]
 language sql
 immutable
 set search_path to 'pg_catalog'
as $function$
  select array['text', 'long_text', 'markdown', 'email', 'address', 'url', 'phone', 'color',
               'number', 'decimal', 'currency', 'percent', 'progress', 'duration', 'integer',
               'rating', 'file_size', 'boolean', 'date', 'datetime', 'time', 'autonumber',
               'created_time', 'modified_time', 'relative_time', 'json', 'array', 'attachment',
               'tags', 'choice', 'person', 'relation', 'multi_choice', 'formula',
               -- LANE 10 P4: a barcode column shows its code as a barcode line.
               'barcode',
               -- 2026-10-17 plug-in looks: design tokens any table can hold.
               'color_pair', 'measure', 'type_style', 'shadow']::text[]
$function$;
