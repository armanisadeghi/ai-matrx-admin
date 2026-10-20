-- chair-step: the inverse of READ-SPEED-6 c — every mask is worked out on every read again
-- lane: READ-SPEED-6
-- allows: revoke custom
-- based-on: custom.read_mask_for(uuid, uuid, uuid, permission_level, text) 4987ab6e970eb1ef7ba0ae4945e0ee3ee9910c79286abf173b29d4456f2e49e9
-- based-on: custom._computed_warm(uuid, uuid, uuid) f3439c12a8256ca68bdc35d369937872df299050e2ec6d727c9ec8f293dfc180
-- Inverse of migrations/campaign/20261022240100_readspeed6_c_a_readers_column_mask_is_kept_while_no_access_changed.sql
CREATE OR REPLACE FUNCTION custom.read_mask_for(p_user_id uuid, p_organization_id uuid, p_table_id uuid, p_level permission_level, p_action text DEFAULT 'read'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_key      text;
  v_hit      text;
  v_visible  text[];
  v_declared text[];
  v_notices  jsonb;
  v_key_ids  jsonb;
  v_all_ids  jsonb;
  v_out      jsonb;
begin
  if p_table_id is null then
    return jsonb_build_object('table_id', null, 'level', null,
                              'visible', '[]'::jsonb, 'declared', '[]'::jsonb,
                              'notices', '{}'::jsonb, 'key_ids', '{}'::jsonb,
                              'all_key_ids', '{}'::jsonb,
                              'undeclared_ride_along', true);
  end if;

  v_key := 'rmf:' || coalesce(p_user_id::text, '-') || ':' || coalesce(p_organization_id::text, '-')
        || ':' || p_table_id::text || ':' || coalesce(p_level::text, '-') || ':' || coalesce(p_action, '-');
  v_hit := platform.memo_k_get(v_key);
  if v_hit is not null then
    return v_hit::jsonb;
  end if;

  select coalesce(array_agg(f.field_key), '{}'::text[])
    into v_visible
    from iam.visible_field_ids(p_user_id, p_organization_id, p_table_id, p_level, p_action) f;

  select coalesce(array_agg(f.data ->> 'key'), '{}'::text[]),
         coalesce(jsonb_object_agg(f.data ->> 'key', f.id::text), '{}'::jsonb)
    into v_declared, v_all_ids
    from custom.record f
   where f.organization_id = p_organization_id
     and f.table_id = custom.field_kernel_id()
     and f.deleted_at is null
     and (f.data ->> 'entity_definition_id')::uuid = p_table_id;

  select coalesce(jsonb_object_agg(f.data ->> 'key', custom.hidden_field_notice(f, p_action)), '{}'::jsonb),
         coalesce(jsonb_object_agg(f.data ->> 'key', f.id::text), '{}'::jsonb)
    into v_notices, v_key_ids
    from custom.record f
   where f.organization_id = p_organization_id
     and f.table_id = custom.field_kernel_id()
     and f.deleted_at is null
     and (f.data ->> 'entity_definition_id')::uuid = p_table_id
     and not (f.data ->> 'key' = any (v_visible));

  v_out := jsonb_build_object(
    'table_id',    p_table_id,
    'level',       p_level,
    'visible',     to_jsonb(v_visible),
    'declared',    to_jsonb(v_declared),
    'notices',     v_notices,
    'key_ids',     v_key_ids,
    'all_key_ids', v_all_ids,
    'undeclared_ride_along', true);
  perform platform.memo_k_put(v_key, v_out::text);
  return v_out;
end;
$function$
;

CREATE OR REPLACE FUNCTION custom._computed_warm(p_me uuid, p_org uuid, p_table uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_ver bigint[] := custom._access_versions(p_org);
  v_ok  boolean;
begin
  if p_me is null or not custom._computed_eligible(p_org, p_table) then
    return false;
  end if;
  v_ok := custom._computed_reader_judge(p_me, p_org, p_table);
  insert into custom.computed_reader_judgement as j (reader_id, organization_id, table_id, versions, ok, judged_at)
  values (p_me, p_org, p_table, v_ver, v_ok, now())
  on conflict (reader_id, organization_id, table_id) do update set versions = excluded.versions, ok = excluded.ok, judged_at = excluded.judged_at;
  return v_ok;
end;
$function$;

drop function if exists custom._read_mask_compute(uuid, uuid, uuid, public.permission_level, text);
delete from platform.entity_types where schema_name = 'custom' and table_name = 'read_mask_kept';
drop table if exists custom.read_mask_kept;
