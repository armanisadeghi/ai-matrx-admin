-- lane: ONE-LADDER-3
-- purpose: the screen asks the same question the doors ask. (1) iam.my_grantable_levels(type, id): per level and for "outside the organization", NULL when the caller may give it, otherwise iam.may_grant_as's own sentence - the share dialog draws exactly that and nothing it would refuse. (2) platform.set_shown_to asks iam.may_grant_as, so Edit may choose "Everyone in the organization" like share_lane_set already allows; Only me and hiding stay with the creator or Full access. Arman 2026-10-10: Edit may share View / Comment / Edit inside the organization.
-- based-on: platform.set_shown_to(text, uuid, text) 919a1df3070ecb259777d38bf8061451c3be35acd4ee1875290da34b2ac7f66b
-- Needs one_ladder_edit_is_content_full_is_structure.sql applied first (iam.may_grant_as). Inverse: migrations/inverse/one_ladder_ui_doors_down.sql

create or replace function iam.my_grantable_levels(p_resource_type text, p_resource_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'pg_catalog'
as $fn$
-- For the CALLER only (auth.uid()): which levels may they give on this thing to someone inside its
-- organization, and may they share outside it. A level maps to NULL (yes) or the sentence to show.
-- iam.may_grant_as is the only rule; this door adds none.
declare
  v_actor uuid := auth.uid();
  v_res   record;
  v_org   uuid;
  v_out   jsonb := '{}'::jsonb;
  v_lvl   text;
begin
  if v_actor is null or p_resource_id is null then
    raise exception using errcode = '28000', message = 'Sign in to see what you may share.';
  end if;
  if p_resource_type = 'record' then
    select r.organization_id into v_org from custom.record r where r.id = p_resource_id;
  else
    begin
      select * into strict v_res from public.resolve_shareable_resource(p_resource_type);
      execute format('select organization_id from %I.%I where %I = $1', v_res.schema_name, v_res.table_name, v_res.id_column)
        into v_org using p_resource_id;
    exception when others then v_org := null;
    end;
  end if;
  foreach v_lvl in array array['viewer', 'commenter', 'editor', 'admin'] loop
    v_out := v_out || jsonb_build_object(v_lvl, to_jsonb(
      iam.may_grant_as(v_actor, p_resource_type, p_resource_id, v_lvl::public.permission_level,
                       case when v_org is null then 'anyone' else 'organization' end, v_org)));
  end loop;
  return jsonb_build_object(
    'levels', v_out,
    'outside', to_jsonb(iam.may_grant_as(v_actor, p_resource_type, p_resource_id, 'viewer'::public.permission_level, 'anyone', null)),
    'organization_id', v_org);
end
$fn$;

revoke all on function iam.my_grantable_levels(text, uuid) from public, anon;

insert into platform.client_callable_door
  (schema_name, function_name, identity_args, identity_argtypes, reason, declared_by, non_client_lane, signed_in_callers, anonymous_callers)
values
  ('iam', 'my_grantable_levels',
   iam.door_identity_args('iam.my_grantable_levels(text, uuid)'::regprocedure),
   array['text'::regtype::oid, 'uuid'::regtype::oid],
   'Both arguments name the thing being asked about; the answer is about THE CALLER (auth.uid()) and nobody else, and is only iam.may_grant_as''s verdict per level (NULL = may, else the sentence). It grants nothing and cannot be steered to ask for somebody else. Client-callable because the share dialog must offer only the levels the doors will accept.',
   'one_ladder_ui_doors.sql', null, true, false)
on conflict do nothing;

grant execute on function iam.my_grantable_levels(text, uuid) to authenticated;

CREATE OR REPLACE FUNCTION platform.set_shown_to(p_resource_type text, p_resource_id uuid, p_shown_to text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  t record; v_owner uuid; v_vis text; v_child boolean := false; v_val platform.shown_to; v_org uuid;
  v_cols text[] := platform.child_parent_columns(p_resource_type);
  v_why text;
begin
  select * into t from platform._shown_to_table(p_resource_type);
  execute format('select r.created_by, r.visibility::text%s from %I.%I r where r.id = $1',
                 case when v_cols is null then ', false' else format(', r.%I is not null', v_cols[1]) end, t.s, t.tb)
    into v_owner, v_vis, v_child using p_resource_id;
  -- ONE-LADDER: the creator decides; Full access may too. Widening who sees it (the organization,
  -- everyone on AI Matrx) is sharing, so it asks the one sharing rule (iam.may_grant_as) like every
  -- share door: Edit may, within the knobs. Hiding it (Only me) takes sharing away and stays with the
  -- creator or Full access. Access is decided before existence, so a foreign id answers like an unknown one.
  if v_owner is distinct from auth.uid()
     and not iam.has_access(p_resource_type, p_resource_id, 'admin'::public.permission_level) then
    if nullif(p_shown_to, '') is not distinct from 'only_me' then
      raise exception using errcode = '42501',
        message = 'Only the person who created this (or someone with full access to it) can choose who it is shown to.';
    end if;
    begin
      execute format('select r.organization_id from %I.%I r where r.id = $1', t.s, t.tb) into v_org using p_resource_id;
    exception when others then v_org := null;
    end;
    v_why := iam.may_grant_as(auth.uid(), p_resource_type, p_resource_id, 'viewer'::public.permission_level,
               case when p_shown_to = 'everyone_on_ai_matrx' then 'anyone' else 'organization' end, v_org);
    if v_why is not null then
      raise exception using errcode = '42501', message = v_why;
    end if;
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
$function$;
