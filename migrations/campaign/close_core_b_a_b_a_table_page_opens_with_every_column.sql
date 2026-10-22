-- additive: yes
-- based-on: custom.table_page_bundle(uuid, uuid, uuid) 93a1ca2db7aed93ef7ee0206cc1cd46b58936d82c6fd1a4e973aad5f301c33f7
--
-- CLOSE-CORE CD-CORE-15 (acceptance test 8, "Type field"), second half: the records client now asks a table's
-- columns as every record type ('*', close_core_b_a_a_every_column_of_a_typed_table.sql) and keeps "no type"
-- as that answer with the typed columns left out, so the grid, Column settings and a record's form share one
-- read. The table page's one-call bundle answers the same question, so opening a table still asks nothing
-- beside it. Only the applicable_fields part changes; inverse beside this file.

CREATE OR REPLACE FUNCTION custom.table_page_bundle(p_organization_id uuid, p_table_id uuid, p_view_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
DECLARE
  v_parts  jsonb := '[]'::jsonb;
  v_kernel uuid;
  v_org    jsonb := to_jsonb(p_organization_id);
  v_tbl    jsonb := to_jsonb(p_table_id);
  v_args   jsonb;
  v_data   jsonb;
  v_rows   integer;
  v_open   jsonb;
  v_open_err text;
BEGIN
  -- table_kernel_id takes no arguments and is the same for everyone: asked first, it also names the
  -- Table kernel the table's own row is read from.
  BEGIN
    v_kernel := custom.table_kernel_id();
    v_parts := v_parts || jsonb_build_array(jsonb_build_object('door', 'table_kernel_id', 'args', '{}'::jsonb, 'data', to_jsonb(v_kernel)));
  EXCEPTION WHEN OTHERS THEN
    v_parts := v_parts || jsonb_build_array(jsonb_build_object('door', 'table_kernel_id', 'args', '{}'::jsonb, 'error', SQLSTATE));
  END;

  -- the table's own row
  IF v_kernel IS NOT NULL THEN
    v_args := jsonb_build_object('p_organization_id', v_org, 'p_table_id', to_jsonb(v_kernel), 'p_record_ids', jsonb_build_array(v_tbl));
    BEGIN
      SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb) INTO v_data FROM custom.read_records_by_ids(p_organization_id, v_kernel, ARRAY[p_table_id]) t;
      v_parts := v_parts || jsonb_build_array(jsonb_build_object('door', 'read_records_by_ids', 'args', v_args, 'data', v_data));
    EXCEPTION WHEN OTHERS THEN
      v_parts := v_parts || jsonb_build_array(jsonb_build_object('door', 'read_records_by_ids', 'args', v_args, 'error', SQLSTATE));
    END;
  END IF;

  v_args := jsonb_build_object('p_organization_id', v_org, 'p_table_id', v_tbl);

  -- CLOSE-CORE CD-CORE-15: the columns are asked as EVERY record type ('*') — the one question every screen of
  -- the records client now asks (its "no type" answer is this one with the typed columns left out), so a table
  -- whose Kind decides its columns opens with Radius, Width and Height in this same one call.
  BEGIN
    SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb) INTO v_data FROM custom.applicable_fields(p_organization_id, p_table_id, '*') t;
    v_parts := v_parts || jsonb_build_array(jsonb_build_object('door', 'applicable_fields', 'args', v_args || jsonb_build_object('p_record_type', '*'), 'data', v_data));
  EXCEPTION WHEN OTHERS THEN
    v_parts := v_parts || jsonb_build_array(jsonb_build_object('door', 'applicable_fields', 'args', v_args || jsonb_build_object('p_record_type', '*'), 'error', SQLSTATE));
  END;

  BEGIN
    SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb) INTO v_data FROM custom.views(p_organization_id, p_table_id) t;
    v_parts := v_parts || jsonb_build_array(jsonb_build_object('door', 'views', 'args', v_args, 'data', v_data));
  EXCEPTION WHEN OTHERS THEN
    v_parts := v_parts || jsonb_build_array(jsonb_build_object('door', 'views', 'args', v_args, 'error', SQLSTATE));
  END;

  BEGIN
    v_parts := v_parts || jsonb_build_array(jsonb_build_object('door', 'view_look_read', 'args', v_args, 'data', custom.view_look_read(p_organization_id, p_table_id)));
  EXCEPTION WHEN OTHERS THEN
    v_parts := v_parts || jsonb_build_array(jsonb_build_object('door', 'view_look_read', 'args', v_args, 'error', SQLSTATE));
  END;

  BEGIN
    v_parts := v_parts || jsonb_build_array(jsonb_build_object('door', 'record_change_actions', 'args', v_args, 'data', custom.record_change_actions(p_organization_id, p_table_id)));
  EXCEPTION WHEN OTHERS THEN
    v_parts := v_parts || jsonb_build_array(jsonb_build_object('door', 'record_change_actions', 'args', v_args, 'error', SQLSTATE));
  END;

  BEGIN
    v_parts := v_parts || jsonb_build_array(jsonb_build_object('door', 'table_decorations', 'args', v_args, 'data', custom.table_decorations(p_organization_id, p_table_id)));
  EXCEPTION WHEN OTHERS THEN
    v_parts := v_parts || jsonb_build_array(jsonb_build_object('door', 'table_decorations', 'args', v_args, 'error', SQLSTATE));
  END;

  BEGIN
    v_parts := v_parts || jsonb_build_array(jsonb_build_object('door', 'row_actions', 'args', v_args, 'data', custom.row_actions(p_organization_id, p_table_id)));
  EXCEPTION WHEN OTHERS THEN
    v_parts := v_parts || jsonb_build_array(jsonb_build_object('door', 'row_actions', 'args', v_args, 'error', SQLSTATE));
  END;

  BEGIN
    SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb) INTO v_data FROM custom.reverse_columns(p_organization_id, p_table_id) t;
    v_parts := v_parts || jsonb_build_array(jsonb_build_object('door', 'reverse_columns', 'args', v_args, 'data', v_data));
  EXCEPTION WHEN OTHERS THEN
    v_parts := v_parts || jsonb_build_array(jsonb_build_object('door', 'reverse_columns', 'args', v_args, 'error', SQLSTATE));
  END;

  -- the grid's layout, for the view the screen opens (none named = the table's own)
  BEGIN
    v_parts := v_parts || jsonb_build_array(jsonb_build_object('door', 'grid_layout',
      'args', jsonb_build_object('p_organization_id', v_org, 'p_table_id', v_tbl, 'p_view_id', to_jsonb(p_view_id)),
      'data', custom.grid_layout(p_organization_id, p_table_id, p_view_id)));
  EXCEPTION WHEN OTHERS THEN
    v_parts := v_parts || jsonb_build_array(jsonb_build_object('door', 'grid_layout',
      'args', jsonb_build_object('p_organization_id', v_org, 'p_table_id', v_tbl, 'p_view_id', to_jsonb(p_view_id)), 'error', SQLSTATE));
  END;

  BEGIN
    SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb) INTO v_data FROM custom.my_levels(p_organization_id, jsonb_build_array(v_tbl), 'record') t;
    v_parts := v_parts || jsonb_build_array(jsonb_build_object('door', 'my_levels',
      'args', jsonb_build_object('p_organization_id', v_org, 'p_ids', jsonb_build_array(v_tbl), 'p_type', 'record'), 'data', v_data));
  EXCEPTION WHEN OTHERS THEN
    v_parts := v_parts || jsonb_build_array(jsonb_build_object('door', 'my_levels',
      'args', jsonb_build_object('p_organization_id', v_org, 'p_ids', jsonb_build_array(v_tbl), 'p_type', 'record'), 'error', SQLSTATE));
  END;

  BEGIN
    v_parts := v_parts || jsonb_build_array(jsonb_build_object('door', 'io_imports',
      'args', jsonb_build_object('p_organization_id', v_org, 'p_table_id', v_tbl, 'p_limit', 5),
      'data', custom.io_imports(p_organization_id, p_table_id, 5)));
  EXCEPTION WHEN OTHERS THEN
    v_parts := v_parts || jsonb_build_array(jsonb_build_object('door', 'io_imports',
      'args', jsonb_build_object('p_organization_id', v_org, 'p_table_id', v_tbl, 'p_limit', 5), 'error', SQLSTATE));
  END;


  -- THE PERSON'S SERVER-ROWS KNOBS (lane SSR-ROWS-2): `data.server_rows` and
  -- `data.server_rows_cap_ms`, resolved for the person asking in this organization (per-person and
  -- per-organization overrides decide as everywhere else). A server rendering the page reads them from
  -- the bundle it asks anyway, so deciding whether to draw rows on the server costs no extra read.
  BEGIN
    v_parts := v_parts || jsonb_build_array(jsonb_build_object('door', 'server_rows',
      'args', jsonb_build_object('p_organization_id', v_org),
      'data', jsonb_build_object(
        'on', COALESCE(platform.knob_resolve('data', 'server_rows', p_organization_id, auth.uid()) = 'true'::jsonb, false),
        'cap_ms', platform.knob_resolve('data', 'server_rows_cap_ms', p_organization_id, auth.uid()))));
  EXCEPTION WHEN OTHERS THEN
    v_parts := v_parts || jsonb_build_array(jsonb_build_object('door', 'server_rows',
      'args', jsonb_build_object('p_organization_id', v_org), 'error', SQLSTATE));
  END;

  -- SKELETON-HEIGHT: how many rows THIS CALLER sees, capped at the largest page a screen draws (200),
  -- so the table page's loading frame takes its final height before the rows land.
  -- BELONGINGS-ERROR 2: where_id_opens counts the same visible rows for the same caller (its `rows_visible`), so it is asked
  -- ONCE, here, and both parts below are made from its one answer. Only when it did not count (it answered nothing, named another
  -- organization, or raised) is the count made here, once.
  BEGIN
    v_open := custom.where_id_opens(p_table_id);
  EXCEPTION WHEN OTHERS THEN
    v_open_err := SQLSTATE;
  END;

  BEGIN
    IF v_open IS NOT NULL AND v_open ->> 'kind' = 'table' AND (v_open ->> 'organization_id')::uuid = p_organization_id
       AND (v_open ->> 'rows_visible_cap')::integer = 200 AND v_open ->> 'rows_visible' IS NOT NULL THEN
      v_rows := (v_open ->> 'rows_visible')::integer;
    ELSE
      SELECT COALESCE(count(*), 0) INTO v_rows FROM (SELECT 1 FROM custom.query_visible_ids(p_organization_id, p_table_id, 'viewer') LIMIT 200) q;
    END IF;
    v_parts := v_parts || jsonb_build_array(jsonb_build_object('door', 'rows_visible',
      'args', jsonb_build_object('p_organization_id', v_org, 'p_table_id', v_tbl),
      'data', jsonb_build_object('rows', v_rows, 'cap', 200)));
  EXCEPTION WHEN OTHERS THEN
    v_parts := v_parts || jsonb_build_array(jsonb_build_object('door', 'rows_visible',
      'args', jsonb_build_object('p_organization_id', v_org, 'p_table_id', v_tbl), 'error', SQLSTATE));
  END;

  -- SKELETON-HEIGHT-2: the layout the table opens in and, for a board, the cards each column holds.
  IF v_open_err IS NULL THEN
    v_parts := v_parts || jsonb_build_array(jsonb_build_object('door', 'opening_view_shape',
      'args', jsonb_build_object('p_organization_id', v_org, 'p_table_id', v_tbl),
      'data', v_open -> 'opening_view'));
  ELSE
    v_parts := v_parts || jsonb_build_array(jsonb_build_object('door', 'opening_view_shape',
      'args', jsonb_build_object('p_organization_id', v_org, 'p_table_id', v_tbl), 'error', v_open_err));
  END IF;

  RETURN jsonb_build_object('v', 1, 'table_id', p_table_id, 'parts', v_parts);
END;
$function$;
