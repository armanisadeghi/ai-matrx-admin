-- chair-step: this file creates ONE new client-callable function (custom.table_create, SECURITY INVOKER), declares it
-- in platform.client_callable_door and GRANTs EXECUTE on it to authenticated (PUBLIC's default EXECUTE is cleared at
-- birth by the DDL guard). It replaces no live body, alters no table and revokes nothing. Its inverse revokes the
-- grant, deletes the declaration row and drops the function.
-- lane: TABLE-CREATE-SPEED-2
-- lock: custom
-- Inverse: migrations/inverse/tablecreatespeed2_a_a_table_its_home_and_its_columns_in_one_door_down.sql
-- based-on: custom.record_write(uuid, uuid, jsonb) d30f5616c274a9bec3b64333eff955257482cf3394e74f3bd6adda934e29697e
-- based-on: custom.table_declare(uuid, jsonb) 560581a71a3549096f202338234abbb962bf304f2210d3eb022a4640283c9a07
-- based-on: custom.field_declare_many(uuid, uuid, jsonb) a44d6b1388212a0164ae065928d035d5367f9f0ec5a4d2b66327e86c35565967
--
-- TABLE-CREATE-SPEED-2 item 1 - A NEW TABLE IS ONE CALL.
-- "Create table" walked four doors from the browser, one round trip each: custom.person_kernel_id, custom.record_write
-- (the Home), custom.table_declare (the Table under it), custom.field_declare_many (its columns). Four round trips, and
-- because they were four transactions a refused column left a table behind that the client had to delete again.
-- custom.table_create walks the same three doors in ONE transaction (INVOKER: every check is still each door's own),
-- so a refusal anywhere leaves nothing, and answers {table_id, home_id, field_ids}.

CREATE FUNCTION custom.table_create(p_organization_id uuid, p_spec jsonb, p_fields jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY INVOKER
 SET search_path TO ''
AS $function$
declare
  v_home   uuid;
  v_table  uuid;
  v_fields uuid[];
begin
  if p_spec is null or jsonb_typeof(p_spec) <> 'object' or coalesce(btrim(p_spec ->> 'name'), '') = '' then
    raise exception 'A new table needs a name.'
      using errcode = '22023', hint = 'p_spec is the declaration custom.table_declare takes, with its name.';
  end if;
  -- the Home is an ordinary record of the person kernel Table (custom.person_kernel_id is a constant)
  v_home := custom.record_write(p_organization_id, custom.person_kernel_id(),
                                jsonb_build_object('name', btrim(p_spec ->> 'name') || ' Home'));
  v_table := custom.table_declare(p_organization_id, p_spec || jsonb_build_object('parent_id', v_home));
  v_fields := custom.field_declare_many(p_organization_id, v_table, coalesce(p_fields, '[]'::jsonb));
  return jsonb_build_object('table_id', v_table, 'home_id', v_home, 'field_ids', to_jsonb(v_fields));
end
$function$;

INSERT INTO platform.client_callable_door
  (schema_name, function_name, identity_args, identity_argtypes, reason, declared_by, signed_in_callers)
VALUES
  ('custom', 'table_create', 'p_organization_id uuid, p_spec jsonb, p_fields jsonb', ARRAY['uuid'::regtype, 'jsonb'::regtype, 'jsonb'::regtype]::oid[],
   'SECURITY INVOKER: the Home goes through custom.record_write, the Table through custom.table_declare and the columns through custom.field_declare_many, each making every check itself; this door only calls them in one transaction.',
   'migrations/campaign/tablecreatespeed2_a_a_table_its_home_and_its_columns_in_one_door.sql', true);

GRANT EXECUTE ON FUNCTION custom.table_create(uuid, jsonb, jsonb) TO authenticated;
