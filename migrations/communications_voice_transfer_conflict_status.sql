-- based-on: communication.set_voice_transfer_target(uuid, uuid, integer, text) 0873129433f44974ef66805fd21e0161038471257093cfddb6a6b7be0875e3ce
-- A stale form is an application conflict, not a retryable database transaction failure.
CREATE OR REPLACE FUNCTION communication.set_voice_transfer_target(
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
    RAISE EXCEPTION 'Destination changed; reload before saving' USING ERRCODE = 'PT409';
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
