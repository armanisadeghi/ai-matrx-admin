-- target: branch,production
-- lane: WITHHELD-HONEST
-- lock: custom
-- based-on: custom.view_keys() 80c01af8d11a87aa7a97d066294c1fcdc2c0dba0e8187bc2e9764d942a89aecf
-- based-on: custom.views(uuid, uuid) 20c4e25e435847578d0fabe577340b10639be87254e4dbe2be61f42aff6a98ef
-- Inverse of WITHHELD-HONEST 3: the view keys and the view list as they were live on 2026-10-20.

CREATE OR REPLACE FUNCTION custom.view_keys()
 RETURNS TABLE(path text, shape text, layouts text[], writer text, sentence text)
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'pg_catalog'
AS $function$
  select * from (values
    ('layout',                  'kind',          array['grid','kanban','calendar','gallery','timeline','list','chart','map','orgchart','pivot'],'caller', 'Which of the ways to look at the table this view is: grid, kanban, calendar, gallery, timeline, list, chart, map, org chart or pivot. The retired word sheet is stored as grid.'),
    ('filters',                 'filter',        array['grid','kanban','calendar','gallery','timeline','list','chart','map','orgchart','pivot'],'caller', 'The flat question the digests and the notifier read: a map of Field key to value, null or a window. Sent as spec.filters. Never a Rule expression — that is `where`.'),
    ('where',                   'rule',          array['grid','kanban','calendar','gallery','timeline','list','chart','map','orgchart','pivot'],'caller', 'The view''s own question as the condition builder writes it (S2-PRIME): a Rule expression {op, args}, ALL / ANY / NOT nested to any depth, Fields by id; the board filter. custom.record_filter_sql compiles it for the grid, the board and the numbers.'),
    ('group_field',             'field',         array['kanban','timeline','chart','pivot'],                     'caller', 'The Field whose values are the board''s columns, the timeline''s rows, or what a chart groups by.'),
    ('column_field',            'field',         array['chart','pivot'],                              'caller', 'The Field whose values are the pivot''s columns, or a stacked bar chart''s series.'),
    ('x_field',                 'field:number',  array['chart'],                                      'caller', 'The number Field along the bottom of a scatter chart; the measure Field is up the side.'),
    ('swimlane_field',          'field:lane',    array['kanban'],                                     'caller', 'The Field whose values cut the board into swimlanes across the columns (a choice, a person, a relation, a yes/no or a word).'),
    ('collapsed_columns',       'values',        array['kanban'],                                     'caller', 'The board columns this view keeps shut to a strip, by the column''s stored value.'),
    ('measure',                 'field:number',  array['kanban','chart','pivot'],                                'caller', 'The number, money or percentage Field summed under every board column heading, or the Field a chart sums or averages.'),
    ('pivot_measure',           'pivot_measure', array['pivot'],                                      'caller', 'What each pivot cell shows: count, sum, avg, min or max (all but count read the measure Field). The totals row, column and corner are asked of the store, never added up from the cells.'),
    ('chart_kind',              'chart_kind',    array['chart'],                                      'caller', 'How a chart view draws: bars, a line, a donut, an area, a pie, stacked bars or a scatter. Stacked bars read column_field; a scatter reads x_field and measure.'),
    ('chart_measure',           'chart_measure', array['chart'],                                      'caller', 'What a chart view measures per group: count, sum or avg (sum and avg read the measure Field).'),
    ('date_field',              'field:date',    array['calendar'],                                   'caller', 'The date Field that places a record on the calendar.'),
    ('start_field',             'field:date',    array['timeline'],                                   'caller', 'The date Field where a record''s bar starts on the timeline.'),
    ('end_field',               'field:date',    array['calendar','timeline'],                        'caller', 'The date Field where a record ends: the calendar stretches it from its date to this one, the timeline''s bar runs to it. Absent, a record is one day.'),
    ('map_field',               'field',         array['map'],                                        'caller', 'The address, place or latitude Field that puts a record on the map (a latitude Field also needs map_lng_field).'),
    ('map_lng_field',           'field:number',  array['map'],                                        'caller', 'The number Field holding the longitude when map_field is a latitude Field.'),
    ('parent_field',            'field',         array['orgchart'],                                   'caller', 'The link Field to the same table that says who a record reports to; the org chart draws the tree by it.'),
    ('image_field',             'field',         array['gallery'],                                    'caller', 'The Field drawn large as the gallery card''s cover.'),
    ('sorts',                   'sorts',         array['grid','kanban','calendar','gallery','timeline','list','chart','map','orgchart','pivot'],'caller', 'The sort stack: an ordered list of {field, direction} (asc or desc), at most five, each Field once.'),
    ('rule_id',                 'uuid',          array['grid','kanban','calendar','gallery','timeline','list','chart','map','orgchart','pivot'],'caller', 'The membership Rule whose members the view shows.'),
    ('is_default',              'boolean',       array['grid','kanban','calendar','gallery','timeline','list','chart','map','orgchart','pivot'],'caller', 'Whether this is the table''s default view.'),
    ('presentation',            'presentation',  array['grid','kanban','calendar','gallery','timeline','list','chart','map','orgchart','pivot'],'caller', 'How the view looks. Each of its keys is declared below.'),
    ('presentation.style',      'style',         array['grid','kanban','calendar','gallery','timeline','list','chart','map','orgchart','pivot'],'caller', 'The view''s colours over the table''s own (G1 table_decorations): colorBy {field, target} names a choice or yes/no Field — the calendar''s, the timeline''s and the cards'' colour field — plus rules and hand highlights.'),
    ('presentation.formats',    'object',        array['grid'],                               'caller', 'Per-column display formats, by Field key.'),
    ('presentation.frozen',     'fields',        array['grid'],                               'caller', 'The pinned Fields that stay put while the grid scrolls sideways, in order, at most ten.'),
    ('presentation.grouping',   'grouping',      array['grid','gallery','list'],                     'caller', 'Sections by a Field ({field, order, aggregates, collapsed}) and up to two sub-groups (then: [{field, order}]); at most three levels; collapsed holds the sections kept shut at every level.'),
    ('presentation.widths',     'widths',        array['grid'],                               'caller', 'The width a person dragged a column to, in pixels, by Field key.'),
    ('presentation.rowHeight',  'row_height',    array['grid'],                               'caller', 'The body row height this view remembers, 24 to 240 pixels.'),
    ('presentation.cardHidden', 'fields',       array['kanban','calendar','timeline','list','map','orgchart','gallery'],             'caller', 'The Fields a card or a list row leaves off under its title, by key — the card''s own choice, never the grid''s hidden columns.'),
    ('presentation.hiddenFields','fields',       array['grid','gallery','kanban','calendar','timeline','list'],                     'caller', 'The Fields hidden from this view, by key.'),
    ('presentation.columnOrder','fields',       array['grid'],                               'caller', 'The order of the columns this view keeps, by Field key: a column dragged somewhere else stays there. A column not named keeps its own place after the named ones.'),
    ('presentation.gallerySize','gallery_size',  array['gallery'],                                    'caller', 'The gallery''s card size: small, medium or large.'),
    ('presentation.boardSize',  'gallery_size',  array['kanban'],                                     'caller', 'The board''s card size: small, medium or large. It sets the column width and the cover''s height; small leaves the card''s extra fields off.'),
    ('presentation.boardPreview','field',        array['kanban'],                                     'caller', 'The Field (a file column) drawn as a cover at the top of every board card. Absent, cards have no preview.'),
    ('presentation.boardHideEmpty','boolean',    array['kanban'],                                     'caller', 'Whether the board leaves out a column or a swimlane that holds no card.'),
    ('presentation.boardColorColumns','boolean', array['kanban'],                                     'caller', 'Whether the board''s column headings and cards wear the group choice''s colour. Absent means they do.'),
    ('presentation.boardCounts','boolean',       array['kanban'],                                     'caller', 'Whether each board column heading shows how many cards it holds. Absent means it does.'),
    ('presentation.boardLanesShut','values',     array['kanban'],                                     'caller', 'The swimlanes the board keeps shut to a strip, by the lane''s name.'),
    ('presentation.chartLabels','boolean',       array['chart'],                                      'caller', 'Whether a chart view draws each mark''s value on it (the chart menu''s Data labels). Absent means it does not.'),
    ('presentation.chartLegend','boolean',       array['chart'],                                      'caller', 'Whether a chart view draws its legend. Absent means it does; false leaves it off.'),
    ('presentation.locked',     'boolean',       array['grid','kanban','calendar','gallery','timeline','list','chart','map','orgchart','pivot'],'caller', 'Whether this view is locked: its layout, filters, sorts and settings are not saved over until somebody unlocks it. A convenience against accidental edits, never a permission.'),
    ('presentation.wrap',       'boolean',       array['grid'],                               'caller', 'Whether long values wrap onto more lines.'),
    ('presentation.headerWrap','boolean',       array['grid'],                               'caller', 'Whether the column titles wrap onto more lines instead of being cut short (Layout, Wrap column titles).'),
    ('presentation.wrapColumns','fields',       array['grid'],                               'caller', 'The columns that wrap long values onto more lines while the rest of the view stays on one line (Wrap column), by Field key.'),
    ('presentation.fit',        'fit',           array['grid'],                               'caller', 'How the grid shares its width: auto, fit or scroll.'),
    ('presentation.freezeFirst','boolean',       array['grid'],                               'caller', 'Whether the first column stays put.'),
    ('presentation.footer',     'footer',        array['grid'],                               'caller', 'Where the grid''s footer (the counts and the pages) sits: sticky, pinned to the bottom of the screen, or inline, right after the last row.'),
    ('presentation.summaries',  'summaries',     array['grid'],                               'caller', 'The summary shown under each column, by Field key (count, sum, avg, min, max, median, filled, empty, unique).'),
    ('presentation.gantt',      'object',      array['timeline'],                                   'caller', 'The timeline''s Gantt mode, kept as {mode, critical, progress, milestone, baselineStart, baselineEnd, dependency} by Field key: the left task list, the critical path, the baseline ghost bars, diamonds and progress fill.'),
    ('grid',                    'grid',          array['grid'],                               'caller', 'G1/G7 grid choices (mode, row_height, freeze_first_column, wrap, widths by Field id), judged by custom.grid_layout_check.'),
    ('personal',                'boolean',       array['grid','kanban','calendar','gallery','timeline','list','chart','map','orgchart','pivot'],'caller', 'Whether this view is personal: only the person who made it lists it. Absent, it is collaborative: everyone with the table sees it.'),
    ('section',                 'section',       array['grid','kanban','calendar','gallery','timeline','list','chart','map','orgchart','pivot'],'caller', 'The named section of the view list this view sits under (at most 60 characters). Absent, it sits in the unsectioned list.'),
    ('position',                'position',      array['grid','kanban','calendar','gallery','timeline','list','chart','map','orgchart','pivot'],'caller', 'Where this view sits in the view list among the views of its section: a whole number from 0, lowest first. Absent, it sits after the placed ones, by name.'),
    ('hidden_fields',           'input',         array['grid','gallery','kanban','calendar','timeline','list'],                     'input',  'Hidden columns by Field id (the mover''s shape); written as presentation.hiddenFields by key.'),
    ('table_id',                'server',        array['grid','kanban','calendar','gallery','timeline','list','chart','map','orgchart','pivot'],'server', 'The view''s Table, fixed at birth.'),
    ('order',                   'server',        array['grid'],                               'server', 'G13''s hand-set order, written only by custom.view_record_order_set.'),
    ('moved_from',              'server',        array['grid','kanban','calendar','gallery','timeline','list','chart','map','orgchart','pivot'],'server', 'Where the view was moved in from; set once, at birth, by the mover.')
  ) as k(path, shape, layouts, writer, sentence);
$function$;

CREATE OR REPLACE FUNCTION custom.views(p_organization_id uuid, p_table_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(view_id uuid, name text, table_id uuid, filters jsonb, definition jsonb, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
begin
  perform custom.assert_client_may_reach(p_organization_id, 'custom.views');
  -- CHAIR-WORLD-LANE: a person admitted only through the world lane lists the views of one Public Table.
  perform custom.assert_public_reader_names_a_public_table(p_organization_id, p_table_id, 'custom.views');
  return query
    select sv.id, sv.name, nullif(sv.definition ->> 'table_id', '')::uuid,
           coalesce(sv.definition -> 'filters', '{}'::jsonb),
           -- THE WHOLE DOCUMENT. The layout, the Field the board groups by, the Field the
           -- calendar reads, the sorts and the look all live in here, and the screen that
           -- drew it is the one thing that knows which of them it needs.
           coalesce(sv.definition, '{}'::jsonb),
           sv.created_at
      from platform.saved_view sv
     where sv.organization_id = p_organization_id
       and sv.deleted_at is null
       and sv.surface_key = 'custom/records'
       and (p_table_id is null or (sv.definition ->> 'table_id')::uuid = p_table_id)
       -- VIEWS-AIRTABLE: a personal view is listed to the person who made it, and to nobody else.
       and (coalesce((sv.definition ->> 'personal')::boolean, false) = false
            or custom.query_principal() is null
            or sv.created_by is not distinct from custom.query_principal())
       -- A LIST IS A DOOR, NEVER A GRANT ON THE THING BEHIND IT: narrowed in SQL, as
       -- the definer, to Tables this caller can already open — so the list of views
       -- can never reveal a Table.
       and (sv.definition ->> 'table_id')::uuid in
             (select v from (
                -- PERF-FIX-5: one Table named = asked among that Table (custom.tables_listed_among: the list's own
                -- answer restricted to it, without walking every Table of the organization); none named = the list, as before.
                select t from custom.tables_listed_among(p_organization_id, array[p_table_id]) t
                 where p_table_id is not null and coalesce(current_setting('mx.read_by_ids_set', true), '') <> 'off'
                union all
                select q from custom.query_visible_ids(p_organization_id, custom.table_kernel_id()) q
                 where p_table_id is null or coalesce(current_setting('mx.read_by_ids_set', true), '') = 'off'
              ) v(v))
     -- PERF-REVIEW-FIX 2: a total order. Two views named alike (Jobs: two "All records") came back in plan order, so the
     -- seeded first paint and a later read could disagree about which is first. Name, the default view first, then id.
     order by coalesce(nullif(sv.definition ->> 'position', '')::numeric, 1000000), sv.name, coalesce((sv.definition ->> 'is_default')::boolean, false) desc, sv.id;
end;
$function$;
