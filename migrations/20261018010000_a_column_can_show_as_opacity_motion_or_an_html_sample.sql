-- based-on: custom.display_format_ids() caa52ff4a20c898629a792152736f87f36fc78c3a900455f6236004afe3372a5
-- why: design-system sections, round 2 (Arman 2026-10-18). Three more plug-in looks a column can wear:
--   opacity (a number 0–1, drawn over a checkerboard), motion (a duration + easing, kept as JSON text, drawn as
--   a moving dot) and html_sample (an HTML snippet an agent or a person writes, drawn seamlessly in a sandboxed
--   frame that grows to its content — a design system's component samples). Additive: the list only grows.
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
               'color_pair', 'measure', 'type_style', 'shadow',
               -- 2026-10-18: opacity, motion, and an HTML sample (component previews).
               'opacity', 'motion', 'html_sample']::text[]
$function$;
