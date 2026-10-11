-- lane: ONE-LADDER-3
-- based-on: platform.set_shown_to(text, uuid, text) 0052397a834e752317400f46a6f27b6a312a4a7b5908dbc5f19a1ccddfc31444
-- Inverse of one_ladder_ui_doors.sql: restores set_shown_to verbatim and drops the thin door.

CREATE OR REPLACE FUNCTION platform.set_shown_to(p_resource_type text, p_resource_id uuid, p_shown_to text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  t record; v_owner uuid; v_vis text; v_child boolean := false; v_val platform.shown_to;
  v_cols text[] := platform.child_parent_columns(p_resource_type);
begin
  select * into t from platform._shown_to_table(p_resource_type);
  execute format('select r.created_by, r.visibility::text%s from %I.%I r where r.id = $1',
                 case when v_cols is null then ', false' else format(', r.%I is not null', v_cols[1]) end, t.s, t.tb)
    into v_owner, v_vis, v_child using p_resource_id;
  -- The creator decides; someone with full access to the record may too. Access is decided
  -- before existence, so a foreign id answers exactly like an unknown one.
  if v_owner is distinct from auth.uid()
     and not iam.has_access(p_resource_type, p_resource_id, 'admin'::public.permission_level) then
    raise exception using errcode = '42501',
      message = 'Only the person who created this (or someone with full access to it) can choose who it is shown to.';
  end if;
  if v_child then
    raise exception using errcode = '22023',
      message = 'This belongs to another record and is shown wherever that record is; it has no "Shown to" of its own.';
  end if;
  v_val := nullif(p_shown_to, '')::platform.shown_to;
  if v_val = 'everyone_on_ai_matrx' and t.data_class <> 'public' and v_vis is distinct from 'public' then
    raise exception using errcode = '22023',
      message = 'Publish this to the web first; only a record published to the web can be shown to everyone on AI Matrx.';
  end if;
  execute format('update %I.%I r set shown_to = $2 where r.id = $1', t.s, t.tb) using p_resource_id, v_val;
  return platform.shown_to_state(p_resource_type, p_resource_id);
end;
$function$

;

delete from platform.client_callable_door where schema_name = 'iam' and function_name = 'my_grantable_levels';
drop function if exists iam.my_grantable_levels(text, uuid);
