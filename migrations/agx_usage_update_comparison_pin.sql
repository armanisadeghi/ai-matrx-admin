-- based-on: public.agx_usage_update_to_active(text, uuid, text) 60d31ddbecaa3dd35eac662fbef070b6b9542c70e62e4c8aa9ecd7584f724d3c
-- A battle (comparison entry) pinned to a version can be moved, one at a time,
-- on purpose. Bulk moves (agx_usage_update_all_to_active) still never touch
-- battles: they are built around testing specific versions.

CREATE OR REPLACE FUNCTION public.agx_usage_update_to_active(p_usage_type text, p_usage_id uuid, p_mode text DEFAULT 'repin_active'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_uid       uuid := auth.uid();
  v_super     boolean;
  v_owner     uuid;
  v_org       uuid;
  v_agent     uuid;
  v_live      integer;
  v_target    uuid;
  v_has_perm  boolean;
  v_res       jsonb;
  v_code_path text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'agx_usage_update_to_active: not authenticated' USING ERRCODE = '42501';
  END IF;
  IF p_mode NOT IN ('repin_active', 'follow_active') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_mode');
  END IF;
  v_super := public.is_super_admin();

  -- Resolve owner / org / target agent per usage type --------------------------
  IF p_usage_type = 'shortcut' THEN
    SELECT s.created_by, s.organization_id, COALESCE(s.agent_id, sv.agent_id)
      INTO v_owner, v_org, v_agent
    FROM agent.shortcut s LEFT JOIN agent.definition_version sv ON sv.id = s.agent_version_id
    WHERE s.id = p_usage_id;
  ELSIF p_usage_type = 'derived_agent' THEN
    SELECT d.created_by, d.organization_id, d.source_agent_id
      INTO v_owner, v_org, v_agent
    FROM agent.definition d WHERE d.id = p_usage_id AND d.source_agent_id IS NOT NULL;
  ELSIF p_usage_type = 'comparison' THEN
    SELECT COALESCE(cs.created_by, e.created_by), COALESCE(cs.organization_id, e.organization_id),
           COALESCE(ca.id, cv.agent_id)
      INTO v_owner, v_org, v_agent
    FROM agent.cmp_comparison_entries e
    LEFT JOIN agent.cmp_comparison_sets cs ON cs.id = e.comparison_set_id
    LEFT JOIN agent.definition ca ON ca.id = e.agent_id
    LEFT JOIN agent.definition_version cv ON cv.id = e.agent_id
    WHERE e.id = p_usage_id AND e.deleted_at IS NULL;
  ELSIF p_usage_type IN ('scheduled_task', 'surface_binding', 'sms_line') THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_pinnable',
      'message', 'This usage always follows the active version — nothing to update.');
  ELSIF p_usage_type = 'workflow_node' THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_remediable_in_sql',
      'workflow_id', p_usage_id,
      'message', 'Update the agent reference inside the workflow editor.');
  ELSIF p_usage_type = 'code' THEN
    SELECT r.code_path INTO v_code_path FROM agent.usage r WHERE r.id = p_usage_id;
    RETURN jsonb_build_object('success', false, 'error', 'code_managed',
      'code_path', v_code_path,
      'message', 'This usage is pinned in backend code — update the declaration and redeploy.');
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'invalid_usage_type');
  END IF;

  IF v_agent IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;

  v_has_perm := v_super OR v_owner = v_uid OR (
    v_org IS NOT NULL AND EXISTS (
      SELECT 1 FROM iam.organization_member om
      WHERE om.organization_id = v_org AND om.user_id = v_uid
        AND om.role IN ('owner', 'admin')));
  IF NOT v_has_perm THEN
    RAISE EXCEPTION 'agx_usage_update_to_active: not permitted for this usage' USING ERRCODE = '42501';
  END IF;

  SELECT a.version INTO v_live FROM agent.definition a WHERE a.id = v_agent;
  IF v_live IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'agent_not_found');
  END IF;

  -- Apply ----------------------------------------------------------------------
  IF p_usage_type = 'shortcut' THEN
    IF p_mode = 'follow_active' THEN
      UPDATE agent.shortcut SET use_latest = true, agent_version_id = NULL WHERE id = p_usage_id;
    ELSE
      SELECT v.id INTO v_target FROM agent.definition_version v
        WHERE v.agent_id = v_agent AND v.version_number = v_live;
      IF v_target IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'no_snapshot_for_active_version');
      END IF;
      UPDATE agent.shortcut SET agent_version_id = v_target, use_latest = false WHERE id = p_usage_id;
    END IF;



  ELSIF p_usage_type = 'comparison' THEN
    IF p_mode = 'follow_active' THEN
      UPDATE agent.cmp_comparison_entries
        SET agent_id = v_agent, agent_version = NULL, agent_version_snapshot_id = NULL
        WHERE id = p_usage_id;
    ELSE
      SELECT v.id INTO v_target FROM agent.definition_version v
        WHERE v.agent_id = v_agent AND v.version_number = v_live;
      IF v_target IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'no_snapshot_for_active_version');
      END IF;
      UPDATE agent.cmp_comparison_entries
        SET agent_id = v_agent, agent_version = v_live, agent_version_snapshot_id = v_target
        WHERE id = p_usage_id;
    END IF;

  ELSIF p_usage_type = 'derived_agent' THEN
    BEGIN
      v_res := public.agx_update_from_source(p_usage_id);
      IF NOT COALESCE((v_res ->> 'success')::boolean, false) THEN
        RETURN v_res;
      END IF;
      UPDATE agent.definition SET source_snapshot_at = now() WHERE id = p_usage_id;
    EXCEPTION WHEN OTHERS THEN
      RETURN jsonb_build_object('success', false, 'error', 'sync_failed', 'message', SQLERRM);
    END;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'usage_type', p_usage_type,
    'usage_id', p_usage_id,
    'mode', p_mode,
    'pinned_version_number', CASE WHEN p_mode = 'repin_active' THEN v_live END);
END;
$function$

;
