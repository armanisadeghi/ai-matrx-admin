-- lane: ONE-LADDER
-- chair-step: finishes the one access ladder: custom.share_lane_set now asks the one sharing check (iam.may_grant_as) like every other share door, and custom.entity_seat_level drops its dead edit_content branch (no grant holds that level after one_ladder_edit_is_content_full_is_structure.sql); Arman 2026-10-10 "Edit = Edit content, never structure", all data is test data.
-- based-on: custom.share_lane_set(uuid, uuid, text, permission_level) 5863cdb3ee0de0afc2904514d5088e3a76adabbde6af31a4f3e1230a1542363d
-- based-on: custom.entity_seat_level(uuid, text, uuid) ccf24b19ac0938a64df7d9447ab20da7574fc8f7c0b6bc1a14eb7c24d840c15a
-- Needs one_ladder_edit_is_content_full_is_structure.sql applied first (iam.may_grant_as).
-- share_lane_set: Edit may now choose "Everyone in the organization" (View / Comment / Edit, never above its own level)
-- and publish only when the knob access.sharing / outside_org_min_level allows (default Full access); "Only me" stays Full access.

CREATE OR REPLACE FUNCTION custom.share_lane_set(p_organization_id uuid, p_subject_id uuid, p_choice text, p_level permission_level DEFAULT NULL::permission_level)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
-- ACCESS LADDER (custom data adoption, 2026-10-03). The four old lane choices, kept as one door for the
-- records clients that call it, said in the ladder's words and written to the ladder's columns:
--   mine          -> Shown to "Only me": hidden from members' lists; members with the link still open it (T-36).
--   organization  -> Shown to the default; every member reaches it at the organization's member level.
--   community     -> Published to the web (anyone with the address opens it; not indexed).
--   world         -> Published to the web and Indexed by search engines.
-- Nothing here makes a record personal or locks it: every custom Table starts at Organization.
-- Publishing is written through custom.record_row_controls_set, the store's one row-controls door.
declare
  v_choice record;
  v_row    custom.record;
  v_word   text;
  v_level  public.permission_level;
  v_err    text;
begin
  perform custom.assert_store_door(p_organization_id, 'share_lane_set');
  perform custom.assert_client_may_change(p_organization_id, p_subject_id, 'share_lane_set',
                                          'editor'::public.permission_level, 'record');

  select r.* into v_row from custom.record r
   where r.organization_id = p_organization_id and r.id = p_subject_id;
  if not found then
    raise exception 'There is no such record in this organization.' using errcode = '02000';
  end if;
  v_word := case when v_row.table_id = custom.table_kernel_id() then 'table' else 'record' end;

  select * into v_choice from custom.share_lanes() l where l.choice = lower(btrim(coalesce(p_choice, '')));
  if not found then
    raise exception 'There is no choice called "%".', coalesce(p_choice, '<nothing>')
      using errcode = '22023',
            hint = 'The choices are mine (Only me), organization (Everyone in the organization), community (Published to the web) and world (Published to the web and indexed).';
  end if;

  -- ONE-LADDER: every share door asks iam.may_grant_as. Making it Only me takes sharing away, so it stays
  -- Full access; the other three choices grant (to the organization, or to anyone with the address).
  if not custom.query_is_store_owner() and custom.query_principal() is not null then
    if v_choice.choice = 'mine' then
      perform custom.assert_client_may_change(p_organization_id, p_subject_id, 'share_lane_set',
                                              'admin'::public.permission_level, 'record');
    else
      v_err := iam.may_grant_as(custom.query_principal(), 'record', p_subject_id,
                 case when v_choice.choice = 'organization'
                      then coalesce(p_level, iam.member_default_level(p_organization_id, v_row.table_id), 'viewer'::public.permission_level)
                      else 'viewer'::public.permission_level end,
                 case when v_choice.choice = 'organization' then 'organization' else 'anyone' end,
                 case when v_choice.choice = 'organization' then p_organization_id end);
      if v_err is not null then
        raise exception '%', v_err using errcode = '42501';
      end if;
    end if;
  end if;

  if v_choice.choice in ('community', 'world') then
    perform custom.record_row_controls_set(p_organization_id, p_subject_id,
      jsonb_build_object('published_to_web', true, 'indexed', v_choice.choice = 'world'));
    return jsonb_build_object(
      'lane', v_choice.choice,
      'message', case when v_choice.choice = 'world'
                      then format('Published to the web and indexed by search engines: anyone can open this %s.', v_word)
                      else format('Published to the web: anyone with the address can open this %s.', v_word) end);
  end if;

  -- Only me / Everyone in the organization are list choices (Shown to), and take it off the web.
  if v_row.published_to_web then
    perform custom.record_row_controls_set(p_organization_id, p_subject_id,
      jsonb_build_object('published_to_web', false,
                         'shown_to', case when v_choice.choice = 'mine' then 'only_me' end));
  else
    perform platform.set_shown_to('record', p_subject_id,
                                  case when v_choice.choice = 'mine' then 'only_me' end);
  end if;

  if v_choice.choice = 'organization' then
    v_level := coalesce(p_level, iam.member_default_level(p_organization_id, v_row.table_id),
                        'viewer'::public.permission_level);
    -- The organization's own availability row at the chosen level (SHARE-PEOPLE-ONLY): not a share
    -- with a person, so it is written through the availability arm, as before.
    perform iam._org_availability_arm();
    insert into iam.permissions (resource_type, resource_id, granted_to_organization_id,
                                 permission_level, created_by, status, granted_via)
    values ('record', p_subject_id, p_organization_id, v_level, custom.query_principal(), 'active', 'availability')
    on conflict (resource_type, resource_id, granted_to_organization_id) do update
       set permission_level = excluded.permission_level, status = 'active', expires_at = null,
           reviewed_by = null, reviewed_at = null;
  else
    -- delete means archive (T-32g); the one remover.
    perform iam.remove_grant(p.id, custom.query_principal(), true)
       from iam.permissions p
      where p.resource_type = 'record' and p.resource_id = p_subject_id and p.status <> 'archived'
        and (p.granted_to_organization_id = p_organization_id or p.is_public);
    v_level := null;
  end if;

  return jsonb_build_object(
    'lane', v_choice.choice,
    'level', v_level::text,
    'message', case when v_choice.choice = 'organization'
                    then format('Shown to everyone in this organization. Every member reaches this %s at %s.',
                                v_word, lower(iam.level_label(v_word, v_level)))
                    else format('Shown to you only. Members with the link can still open this %s.', v_word) end);
end;
$function$;

CREATE OR REPLACE FUNCTION custom.entity_seat_level(p_organization_id uuid, p_token text, p_record_id uuid)
 RETURNS permission_level
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  t        record;
  v_me     uuid := auth.uid();
  v_seen   boolean;
  v_mine   boolean;
  v_by     boolean;
begin
  perform custom.assert_entity_door(p_organization_id, 'custom.entity_seat_level');
  select * into t from custom.entity_table(p_token);
  perform custom.assert_entity_is_organization_scoped(t.token, t.label, t.has_organization);
  if v_me is null or p_record_id is null then
    return null;
  end if;

  select exists (select 1 from pg_attribute a
                  where a.attrelid = format('%I.%I', t.schema_name, t.table_name)::regclass
                    and a.attname = 'created_by' and a.attnum > 0 and not a.attisdropped)
    into v_by;
  execute format('select true, %s from %I.%I x where x.id = $1 and x.organization_id = $2',
                 case when v_by then 'x.created_by is not distinct from $3' else 'false' end,
                 t.schema_name, t.table_name)
    into v_seen, v_mine using p_record_id, p_organization_id, v_me;
  if not coalesce(v_seen, false) then
    return null;
  end if;

  begin
    if iam.has_org_admin(p_organization_id)
       or iam.has_access(t.token, p_record_id, 'admin'::public.permission_level) then
      return 'admin'::public.permission_level;
    end if;
    if coalesce(v_mine, false)
       or iam.has_access(t.token, p_record_id, 'editor'::public.permission_level) then
      return 'editor'::public.permission_level;
    end if;
  exception when others then
    -- A table whose access runs through a parent, or a probe that cannot answer: the row
    -- passed SELECT, so `viewer` is proven and nothing more is assumed.
    return 'viewer'::public.permission_level;
  end;
  return 'viewer'::public.permission_level;
end
$function$;
