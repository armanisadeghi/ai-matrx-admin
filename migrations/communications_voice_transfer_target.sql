-- chair-step: New operator-only configuration function needs authenticated EXECUTE; revoke default access only on this newly created function. No existing rows or privileges change.
-- The birth DDL guard clears implicit PUBLIC EXECUTE before any registration (verified during apply).
-- Additive configuration door; existing metadata and voice behavior remain unchanged until an operator saves a target.
-- Operator configuration: merge only the transfer target under a row lock.
-- The voice webhook remains read-only and applies exact owner-beta admission.
CREATE FUNCTION communication.set_voice_transfer_target(
  p_destination_id uuid, p_organization_id uuid, p_expected_version integer,
  p_target text DEFAULT NULL
) RETURNS SETOF communication.sms_phone_numbers
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE v_row communication.sms_phone_numbers%ROWTYPE;
BEGIN
  IF NOT coalesce(public.is_platform_admin(), false) THEN
    RAISE EXCEPTION 'Platform admin lane required' USING ERRCODE = '42501';
  END IF;
  IF p_organization_id IS NULL OR p_destination_id IS NULL OR p_expected_version IS NULL THEN
    RAISE EXCEPTION 'Destination, organization and version required' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO v_row FROM communication.sms_phone_numbers
  WHERE id = p_destination_id AND organization_id = p_organization_id
    AND program_key = 'ai_matrx_owner_beta' AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Destination unavailable' USING ERRCODE = 'P0002'; END IF;
  IF v_row.version <> p_expected_version THEN
    RAISE EXCEPTION 'Destination changed; reload before saving' USING ERRCODE = '40001';
  END IF;
  IF jsonb_typeof(v_row.metadata) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Destination metadata requires repair' USING ERRCODE = '22023';
  END IF;
  IF p_target IS NOT NULL AND (p_target !~ '^\+1[2-9][0-9]{9}$' OR p_target = v_row.phone_number) THEN
    RAISE EXCEPTION 'Use a different US transfer number' USING ERRCODE = '22023';
  END IF;
  RETURN QUERY UPDATE communication.sms_phone_numbers
    SET metadata = CASE WHEN p_target IS NULL THEN metadata - 'voice_transfer_number'
      ELSE jsonb_set(metadata, '{voice_transfer_number}', to_jsonb(p_target)) END,
      organization_id = p_organization_id
    WHERE id = p_destination_id AND organization_id = p_organization_id
    RETURNING *;
END;
$function$;
REVOKE ALL ON FUNCTION communication.set_voice_transfer_target(uuid,uuid,integer,text) FROM anon,service_role;
INSERT INTO platform.client_callable_door
  (schema_name,function_name,identity_args,identity_argtypes,declared_by,reason,gate_predicate,anonymous_callers,signed_in_callers,argument_rules)
VALUES ('communication','set_voice_transfer_target',
  'p_destination_id uuid, p_organization_id uuid, p_expected_version integer, p_target text',
  ARRAY['uuid'::regtype::oid,'uuid'::regtype::oid,'integer'::regtype::oid,'text'::regtype::oid],'communications-platform',
  'Platform operators configure owner-beta voice transfers with exact row/org/version and metadata merge',
  'public.is_platform_admin()',false,true,
  '{"version":1,"arguments":{
    "p_destination_id":{"type":"uuid","position":1,"optional":false,"foreign":{"bounded":true,"note":"Platform admin lane gates all access; id must match explicit organization, owner-beta program and nondeleted row before update."}},
    "p_organization_id":{"type":"uuid","position":2,"optional":false,"foreign":{"bounded":true,"note":"Platform admin lane gates access; organization must equal the selected destination row, never reassigned."}},
    "p_expected_version":{"type":"integer","position":3,"optional":false,"foreign":{"not_an_id":true}},
    "p_target":{"type":"text","position":4,"optional":true,"sql_default":"NULL::text","foreign":{"not_an_id":true}}
  }}'::jsonb);
GRANT EXECUTE ON FUNCTION communication.set_voice_transfer_target(uuid,uuid,integer,text) TO authenticated;
NOTIFY pgrst, 'reload schema';
