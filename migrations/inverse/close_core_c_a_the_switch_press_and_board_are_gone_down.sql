-- chair-step: inverse of close_core_c_a_the_switch_press_and_board_are_gone.sql; recreates the 11 switch functions byte for byte from their live definitions (pg_get_functiondef, 2026-10-22) with their owners, grants and comments. The forward step wrote and removed no data, so none is lost.

SET LOCAL check_function_bodies = off;

-- platform._final_switch_undo_retired()  sha256 d31b5b45e1ed301f9dbcf4dbe9ca180ace98e0c45d6bcadb9c86fd6d7f10dd98
CREATE OR REPLACE FUNCTION platform._final_switch_undo_retired()
 RETURNS platform.cutover_seam_press
 LANGUAGE sql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
  select r.* from (
    select p.* from platform.cutover_seam_press p
      join platform.cutover_seam s on s.seam_key = p.seam_key and s.retired_at is null
     where p.seam_key = 'final_switch_undo' and p.organization_id = platform._final_switch_platform_org()
       and p.outcome = 'done' and p.pressed_at >= s.registered_at
     order by p.pressed_at desc, p.id
     limit 1) r
   where r.direction = 'new';
$function$;
ALTER FUNCTION platform._final_switch_undo_retired() OWNER TO postgres;
REVOKE ALL ON FUNCTION platform._final_switch_undo_retired() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION platform._final_switch_undo_retired() TO postgres;
GRANT EXECUTE ON FUNCTION platform._final_switch_undo_retired() TO dashboard_user;
GRANT EXECUTE ON FUNCTION platform._final_switch_undo_retired() TO service_role;
GRANT EXECUTE ON FUNCTION platform._final_switch_undo_retired() TO svc_seo;

-- platform.data_tables_switched_for_me()  sha256 561cbb2cc27881853942ab696bdd46433eedb89c88de7fffa2eb30432b9dc5d6
CREATE OR REPLACE FUNCTION platform.data_tables_switched_for_me()
 RETURNS TABLE(organization_id uuid, organization_name text, switched_at timestamp with time zone, switched_by text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
  select o.id,
         o.name::text,
         p.pressed_at,
         coalesce(nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''),
                  nullif(btrim(u.raw_user_meta_data ->> 'name'), ''),
                  u.email::text)
    from iam.organization_member m
    join iam.organizations o on o.id = m.organization_id and o.archived_at is null
    cross join lateral platform._cutover_seam_last_done('older_tables', o.id) p
    left join auth.users u on u.id = p.pressed_by
   where m.user_id = (select auth.uid())
     and p.direction = 'new'
   order by p.pressed_at desc;
$function$;
ALTER FUNCTION platform.data_tables_switched_for_me() OWNER TO postgres;
COMMENT ON FUNCTION platform.data_tables_switched_for_me() IS 'SWITCH-AFTERMATH: the organizations the signed-in person is a member of whose Data tables switch (platform.cutover_seam_press, older_tables) is on the new system, with when and who pressed it. /data''s home reads it to list those organizations'' tables where they now live and to say "Data tables moved to the new system on <date> by <who>. Switch back". Members only; nothing about a table.';
REVOKE ALL ON FUNCTION platform.data_tables_switched_for_me() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION platform.data_tables_switched_for_me() TO postgres;
GRANT EXECUTE ON FUNCTION platform.data_tables_switched_for_me() TO authenticated;
GRANT EXECUTE ON FUNCTION platform.data_tables_switched_for_me() TO service_role;

-- platform.data_tables_born_in_the_new_system_for_me()  sha256 2c657cf5451444723421276831b2c427198749ecfaf2c5b7a80ceca1b363bacb
CREATE OR REPLACE FUNCTION platform.data_tables_born_in_the_new_system_for_me()
 RETURNS TABLE(organization_id uuid, organization_name text, table_id uuid)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
  -- SWITCH-BACK-CARRIES: a table made in the new system while its organization was switched lives
  -- only there (no older table has its id). After Switch back the home would lose it — it lists
  -- switched organizations' tables where they live and everyone else's from the older store — so it
  -- asks here and lists these too, where they live. Only organizations I am a member of, that are
  -- on the old side now, and only tables made after that organization's first switch.
  select o.id, o.name::text, t.id
    from iam.organization_member m
    join iam.organizations o on o.id = m.organization_id and o.archived_at is null
    cross join lateral platform._cutover_seam_last_done('older_tables', o.id) p
    join lateral (select min(x.pressed_at) as first_at from platform.cutover_seam_press x
                   where x.seam_key = 'older_tables' and x.organization_id = o.id
                     and x.outcome = 'done' and x.direction = 'new') f on f.first_at is not null
    join custom.record t on t.organization_id = o.id and t.data_class = 'table' and t.deleted_at is null
                        and not coalesce((t.data ->> 'kept_by_the_app')::boolean, false)
                        and t.created_at > f.first_at
                        and not (t.metadata ? 'moved_from')
   where m.user_id = (select auth.uid())
     and p.direction = 'old'
   order by o.name, t.id;
$function$;
ALTER FUNCTION platform.data_tables_born_in_the_new_system_for_me() OWNER TO postgres;
REVOKE ALL ON FUNCTION platform.data_tables_born_in_the_new_system_for_me() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION platform.data_tables_born_in_the_new_system_for_me() TO postgres;
GRANT EXECUTE ON FUNCTION platform.data_tables_born_in_the_new_system_for_me() TO authenticated;

-- platform._cutover_seam_readiness(text,uuid)  sha256 15a064bfd623da322e26b7f4c88a6727ed963ec405f2bff366b03adfe7483f07
CREATE OR REPLACE FUNCTION platform._cutover_seam_readiness(p_seam text, p_org uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  s platform.cutover_seam;
  v_checks jsonb := '[]'::jsonb;
  v_pre jsonb;
begin
  select * into s from platform.cutover_seam where seam_key = p_seam and retired_at is null;
  if s.seam_key is null then
    return jsonb_build_object('ready', false, 'checked_at', now(), 'checks', jsonb_build_array(
      jsonb_build_object('key', 'known', 'says', 'This switch exists', 'met', false,
                         'detail', format('There is no switch called %s.', p_seam))));
  end if;

  if s.press_kind = 'platform_switch' then
    return jsonb_build_object('ready', false, 'checked_at', now(), 'checks', jsonb_build_array(
      jsonb_build_object('key', 'pressed_here', 'says', 'Switched for one organization', 'met', false,
                         'detail', 'This one switches for everyone at once, in its own rehearsed step, not from an organization''s settings.')));
  elsif s.press_kind = 'already_switched' then
    return jsonb_build_object('ready', false, 'checked_at', now(), 'checks', jsonb_build_array(
      jsonb_build_object('key', 'already', 'says', 'Already on the new system', 'met', true,
                         'detail', s.flip_does)));
  end if;

  -- The Data tables switch (older_tables) and the scope switches were retired 2026-10-05: there is
  -- no older side left to measure, so only a seam's declared prerequisites are read here.
  for v_pre in select * from jsonb_array_elements(s.prerequisites) loop
    v_checks := v_checks || jsonb_build_object(
      'key', v_pre ->> 'key', 'says', v_pre ->> 'says',
      'met', coalesce((v_pre ->> 'met')::boolean, false),
      'detail', v_pre ->> 'evidence',
      'measured_at', v_pre ->> 'measured_at');
  end loop;

  return jsonb_build_object(
    'ready', not exists (select 1 from jsonb_array_elements(v_checks) c where not (c ->> 'met')::boolean),
    'checked_at', now(),
    'checks', v_checks);
end;
$function$;
ALTER FUNCTION platform._cutover_seam_readiness(text,uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION platform._cutover_seam_readiness(text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION platform._cutover_seam_readiness(text,uuid) TO postgres;
GRANT EXECUTE ON FUNCTION platform._cutover_seam_readiness(text,uuid) TO dashboard_user;
GRANT EXECUTE ON FUNCTION platform._cutover_seam_readiness(text,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION platform._cutover_seam_readiness(text,uuid) TO svc_seo;

-- platform._cutover_seam_reverse_readiness(text,uuid)  sha256 793396f658bf332436b15ab3c649f50fabe34287d60f189efd6be391f5ce3c28
CREATE OR REPLACE FUNCTION platform._cutover_seam_reverse_readiness(p_seam text, p_org uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_last platform.cutover_seam_press;
begin
  v_last := platform._cutover_seam_last_done(p_seam, p_org);
  if p_seam <> 'scopes_screens' and (v_last.id is null or v_last.direction <> 'new') then
    return jsonb_build_object('ready', false, 'checked_at', now(), 'checks', jsonb_build_array(
      jsonb_build_object('key', 'on_new', 'says', 'This is on the new system', 'met', false,
                         'detail', 'There is nothing to switch back.')));
  end if;

  if p_seam = 'scopes_screens' then
    return jsonb_build_object('ready', true, 'checked_at', now(), 'checks', jsonb_build_array(
      jsonb_build_object('key', 'both_sides_equal', 'says', 'Both systems hold the same scopes at every save', 'met', true,
                         'detail', 'While the record store writes this organization''s scopes, the current context tables are written in the same step, so switching back loses nothing and the copy simply follows the current tables again.')));
  end if;

  return jsonb_build_object('ready', true, 'checked_at', now(), 'checks', jsonb_build_array(
    jsonb_build_object('key', 'nothing_written', 'says', 'Nothing is written on the new side of this switch', 'met', true,
                       'detail', 'Switching back leaves nothing behind.')));
end;
$function$;
ALTER FUNCTION platform._cutover_seam_reverse_readiness(text,uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION platform._cutover_seam_reverse_readiness(text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION platform._cutover_seam_reverse_readiness(text,uuid) TO postgres;
GRANT EXECUTE ON FUNCTION platform._cutover_seam_reverse_readiness(text,uuid) TO dashboard_user;
GRANT EXECUTE ON FUNCTION platform._cutover_seam_reverse_readiness(text,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION platform._cutover_seam_reverse_readiness(text,uuid) TO svc_seo;

-- platform._cutover_seam_apply(text,uuid,text,uuid,uuid)  sha256 9d62d0f595e07fffe6a3de2d87bd55fdeca06dc72d559940f4206663143349b6
CREATE OR REPLACE FUNCTION platform._cutover_seam_apply(p_seam text, p_org uuid, p_to text, p_actor uuid, p_press uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog'
AS $function$
begin
  -- older_tables (the data-tables switch and its Switch back) was retired 2026-10-07: the rollback
  -- window closed 2026-10-03 and the older tables live in schema deprecated. agent_context and
  -- scopes_screens were retired 2026-10-05. No switch has a press step any more; the old body is
  -- kept as deprecated._cutover_seam_apply.
  raise exception 'the switch % has no press step: it was retired and cannot be pressed or switched back', p_seam
    using errcode = '22023', hint = 'Every organization is on the new system; there is nothing to switch.';
end
$function$;
ALTER FUNCTION platform._cutover_seam_apply(text,uuid,text,uuid,uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION platform._cutover_seam_apply(text,uuid,text,uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION platform._cutover_seam_apply(text,uuid,text,uuid,uuid) TO postgres;
GRANT EXECUTE ON FUNCTION platform._cutover_seam_apply(text,uuid,text,uuid,uuid) TO dashboard_user;
GRANT EXECUTE ON FUNCTION platform._cutover_seam_apply(text,uuid,text,uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION platform._cutover_seam_apply(text,uuid,text,uuid,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION platform._cutover_seam_apply(text,uuid,text,uuid,uuid) TO svc_seo;

-- deprecated._cutover_seam_apply(text,uuid,text,uuid,uuid)  sha256 ed25bd9b0e680e93cd19507b5a686a3a0bfb228b26550cf82933a828367351f7
CREATE OR REPLACE FUNCTION deprecated._cutover_seam_apply(p_seam text, p_org uuid, p_to text, p_actor uuid, p_press uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_feature text; v_key text;
  v_before jsonb;
  v_last platform.cutover_seam_press;
  v_ids uuid[] := '{}';
  v_id uuid;
  v_w jsonb;
  v_t record;
  v_rekeyed jsonb := '[]'::jsonb;
  v_cfg jsonb;
  v_resynced jsonb := '[]'::jsonb;
  v_lists uuid[] := '{}';
  v_note text := format('switched %s on the organization''s settings page (press %s)', p_to, p_press);
begin
  if p_seam = 'older_tables' then
    v_feature := 'data_tables'; v_key := 'older_tables_moved';
  -- agent_context and scopes_screens were retired 2026-10-05 (FTS-1g); they have no press step.
  else
    raise exception 'the switch % has no press step', p_seam using errcode = '22023';
  end if;

  select o.value into v_before from platform.knob_override o
   where o.feature = v_feature and o.key = v_key and o.scope_kind = 'organization'
     and o.scope_id = p_org and o.organization_id = p_org;

  if p_to = 'new' then
    if p_seam = 'older_tables' then
      -- THE COPY IS RE-SYNCED FROM THE OLDER TABLE FIRST (COPY-WRITABLE, chair ruling 2026-09-25):
      -- the older table is the truth at this moment, so every test edit people made on a copy is
      -- put back and every row they added is archived, with a log row per table. Then the flip.
      v_resynced := platform._cutover_copy_resync(p_org, p_press, p_actor);
      for v_id in
        select d.id from workbench.udt_datasets d
         where d.organization_id = p_org and d.deleted_at is null
         order by d.id
      loop
        perform workbench.udt_dataset_archive(v_id, v_id, v_note);
        v_ids := v_ids || v_id;
      end loop;
      -- PICK LISTS MOVE WITH THE TABLES (lane OLDER-DOORS-AFTER-SWITCH). The mover copied each
      -- older list into the store as a Table of choices under the same id; the press archives
      -- the older list with the same pointer (its copy refused if it is not there), so an
      -- organization never has a live older list beside its copy. Switch back restores them.
      for v_id in
        select l.id from workbench.udt_structured_lists l
         where l.organization_id = p_org and l.deleted_at is null
         order by l.id
      loop
        perform workbench.udt_structured_list_archive(v_id, v_id, v_note);
        v_lists := v_lists || v_id;
      end loop;
      -- "WHEN A ROW CHANGES, RUN AN AGENT" FOLLOWS THE TABLE (CUTOVER-PLAN D8). An automation on
      -- an older table listens for older row events, which stop the moment the table is archived;
      -- it is re-keyed to the copy's record events (same table id, same column keys — the mover
      -- keeps them; row.deleted becomes record.archived, the store's own word). Its config before
      -- is kept on the press and on the automation, so Switch back puts it back exactly.
      for v_t in
        select t.id, t.config from scheduler.sch_trigger t
         where t.organization_id = p_org and t.deleted_at is null and t.type = 'event'
           and t.config ->> 'entity_type' = 'user_table_row'
           and (t.config ->> 'table_id')::uuid = any (v_ids)
         order by t.id
         for update
      loop
        v_cfg := v_t.config
          || jsonb_build_object('entity_type', 'record:' || (v_t.config ->> 'table_id'))
          || case when v_t.config ? 'actions' then jsonb_build_object('actions', (
               select coalesce(jsonb_agg(distinct case a when 'row.deleted' then 'record.archived'
                                                     else regexp_replace(a, '^row\.', 'record.') end), '[]'::jsonb)
                 from jsonb_array_elements_text(v_t.config -> 'actions') a)) else '{}'::jsonb end;
        update scheduler.sch_trigger
           set config = v_cfg,
               metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('cutover_rekeyed',
                 jsonb_build_object('press', p_press, 'at', clock_timestamp(), 'config_before', v_t.config)),
               updated_at = now(), updated_by = p_actor
         where id = v_t.id;
        v_rekeyed := v_rekeyed || jsonb_build_object('id', v_t.id, 'config_before', v_t.config, 'config_now', v_cfg);
      end loop;
    end if;
    v_w := platform._knob_override_write(v_feature, v_key, 'organization', p_org, p_org,
                                         'true'::jsonb, v_note, p_actor);
    if not coalesce((v_w ->> 'ok')::boolean, false) then
      raise exception 'the setting %.% could not be written: %', v_feature, v_key, v_w::text using errcode = '22023';
    end if;
    return jsonb_build_object('archived', to_jsonb(v_ids), 'archived_lists', to_jsonb(v_lists),
                              'rekeyed', v_rekeyed,
                              'resynced', v_resynced,
                              'setting', v_feature || '.' || v_key,
                              'setting_before', coalesce(v_before, 'null'::jsonb), 'setting_now', true);
  end if;

  -- p_to = 'old': undo exactly what the last switch to new did.
  v_last := platform._cutover_seam_last_done(p_seam, p_org);
  if p_seam = 'older_tables' and v_last.id is not null then
    for v_id in select (jsonb_array_elements_text(coalesce(v_last.did -> 'archived', '[]'::jsonb)))::uuid loop
      perform workbench.udt_dataset_unarchive(v_id);
      v_ids := v_ids || v_id;
    end loop;
    -- The pick lists that press archived come back with them (lane OLDER-DOORS-AFTER-SWITCH).
    for v_id in select (jsonb_array_elements_text(coalesce(v_last.did -> 'archived_lists', '[]'::jsonb)))::uuid loop
      perform workbench.udt_structured_list_unarchive(v_id);
      v_lists := v_lists || v_id;
    end loop;
    -- Every automation the switch re-keyed listens to its older table again, exactly as before.
    for v_t in select * from jsonb_array_elements(coalesce(v_last.did -> 'rekeyed', '[]'::jsonb)) as r(x) loop
      update scheduler.sch_trigger
         set config = v_t.x -> 'config_before',
             metadata = coalesce(metadata, '{}'::jsonb) - 'cutover_rekeyed',
             updated_at = now(), updated_by = p_actor
       where id = (v_t.x ->> 'id')::uuid and deleted_at is null;
      v_rekeyed := v_rekeyed || jsonb_build_object('id', v_t.x ->> 'id', 'config_now', v_t.x -> 'config_before');
    end loop;
  end if;
  v_before := case when v_last.id is null then null
                   when v_last.did -> 'setting_before' = 'null'::jsonb then null
                   else v_last.did -> 'setting_before' end;
  v_w := platform._knob_override_write(v_feature, v_key, 'organization', p_org, p_org,
                                       v_before, v_note, p_actor);
  if not coalesce((v_w ->> 'ok')::boolean, false) then
    raise exception 'the setting %.% could not be put back: %', v_feature, v_key, v_w::text using errcode = '22023';
  end if;
  return jsonb_build_object('unarchived', to_jsonb(v_ids), 'unarchived_lists', to_jsonb(v_lists),
                            'rekeyed_back', v_rekeyed,
                            'setting', v_feature || '.' || v_key,
                            'setting_restored_to', coalesce(v_before, 'null'::jsonb),
                            'undid_press', v_last.id);
end;
$function$;
ALTER FUNCTION deprecated._cutover_seam_apply(text,uuid,text,uuid,uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION deprecated._cutover_seam_apply(text,uuid,text,uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION deprecated._cutover_seam_apply(text,uuid,text,uuid,uuid) TO postgres;
GRANT EXECUTE ON FUNCTION deprecated._cutover_seam_apply(text,uuid,text,uuid,uuid) TO dashboard_user;
GRANT EXECUTE ON FUNCTION deprecated._cutover_seam_apply(text,uuid,text,uuid,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION deprecated._cutover_seam_apply(text,uuid,text,uuid,uuid) TO svc_seo;

-- platform.cutover_seam_measure_record(text,uuid,text,boolean,text,jsonb,text)  sha256 a06107a076511ccab8f78d82e04aa011fd3e863942c817e35b10dde3e246413b
CREATE OR REPLACE FUNCTION platform.cutover_seam_measure_record(p_seam text, p_organization_id uuid, p_key text, p_met boolean, p_says text, p_detail jsonb, p_measured_by text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare v_id uuid;
begin
  if auth.uid() is not null then
    raise exception 'a switch''s measurement is recorded by its measuring script over the server''s own connection, never by a signed-in person'
      using errcode = '42501';
  end if;
  if not exists (select 1 from platform.cutover_seam s where s.seam_key = p_seam and s.retired_at is null) then
    raise exception 'there is no switch called %', p_seam using errcode = '22023';
  end if;
  if p_organization_id is null or p_key is null or p_met is null or coalesce(p_says, '') = '' or coalesce(p_measured_by, '') = '' then
    raise exception 'a measurement names its organization, what it measured, whether it was met, the sentence, and who measured it'
      using errcode = '22004';
  end if;
  insert into platform.cutover_seam_measure (seam_key, organization_id, key, met, says, detail, measured_by)
  values (p_seam, p_organization_id, p_key, p_met, p_says, coalesce(p_detail, '{}'::jsonb), p_measured_by)
  returning id into v_id;
  return v_id;
end;
$function$;
ALTER FUNCTION platform.cutover_seam_measure_record(text,uuid,text,boolean,text,jsonb,text) OWNER TO postgres;
REVOKE ALL ON FUNCTION platform.cutover_seam_measure_record(text,uuid,text,boolean,text,jsonb,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION platform.cutover_seam_measure_record(text,uuid,text,boolean,text,jsonb,text) TO postgres;
GRANT EXECUTE ON FUNCTION platform.cutover_seam_measure_record(text,uuid,text,boolean,text,jsonb,text) TO service_role;

-- platform.cutover_seams(uuid)  sha256 6458aa9f060ffd57ab8817ffcc8f1d53e183c85a141338c65412e93df4bbcce7
CREATE OR REPLACE FUNCTION platform.cutover_seams(p_organization_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_claims jsonb := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
  v_is_admin boolean := false;
  v_role text;
  v_may boolean := false;
  v_may_detail text;
  v_out jsonb := '[]'::jsonb;
  s platform.cutover_seam;
  v_last platform.cutover_seam_press;
  v_latest platform.cutover_seam_press;
  v_ready jsonb;
  v_state text;
  v_back jsonb;
begin
  if p_organization_id is null
     or not exists (select 1 from iam.organizations o where o.id = p_organization_id) then
    return jsonb_build_object('ok', false, 'reason', 'not_yours',
      'says', 'There is no organization with that id that you belong to.');
  end if;

  if v_uid is null then
    -- No person: only the server's own key or a direct database connection may read.
    if v_claims is not null and coalesce(v_claims ->> 'role', '') <> 'service_role' then
      return jsonb_build_object('ok', false, 'reason', 'not_signed_in', 'says', 'Sign in to see this organization''s switches.');
    end if;
    v_may_detail := 'Only an owner of this organization, signed in on its settings page, can press a switch.';
  else
    v_is_admin := public.is_admin();
    select m.role into v_role from iam.organization_member m
     where m.organization_id = p_organization_id and m.user_id = v_uid;
    if v_role is null and not v_is_admin then
      return jsonb_build_object('ok', false, 'reason', 'not_yours',
        'says', 'There is no organization with that id that you belong to.');
    end if;
    v_may := v_role = 'owner' or v_is_admin;
    v_may_detail := case when v_role = 'owner' then 'You are an owner of this organization.'
                         when v_is_admin then 'You are a platform admin.'
                         else 'Only an owner of this organization can press a switch.' end;
  end if;

  for s in select * from platform.cutover_seam where retired_at is null order by sort_order loop
    v_last := platform._cutover_seam_last_done(s.seam_key, p_organization_id);
    select p.* into v_latest from platform.cutover_seam_press p
     where p.seam_key = s.seam_key and p.organization_id = p_organization_id
     order by p.pressed_at desc, p.id limit 1;
    v_state := case when s.press_kind = 'already_switched' then 'new'
                    -- SCOPES-WRITE-THROUGH: which system writes, never press history.
                    when s.seam_key = 'scopes_screens'
                      then 'new'  -- every organization's scopes are written in the store (writer switch retired 2026-10-09)

                    when v_last.id is null then 'old'
                    else v_last.direction end;
    -- SWITCH-STEP-TWO: once the undo is retired the switches the final switch made are final, and their readiness
    -- (which measures the older tables, now archived) is not asked.
    if s.seam_key in ('older_tables', 'final_switch', 'final_switch_copy_again', 'final_switch_undo')
       and (platform._final_switch_undo_retired()).id is not null then
      v_ready := jsonb_build_object('ready', false, 'final', true, 'checks', '[]'::jsonb,
                                    'says', 'Switched for good at the final switch.');
      v_back := null;
    else
      v_ready := platform._cutover_seam_readiness(s.seam_key, p_organization_id);
      v_back := case when v_state = 'new' and s.press_kind = 'owner_press'
                     then platform._cutover_seam_reverse_readiness(s.seam_key, p_organization_id) end;
    end if;

    v_out := v_out || jsonb_build_object(
      'key', s.seam_key,
      'title', s.title,
      'old_side', s.old_side,
      'new_side', s.new_side,
      'per_organization', s.per_organization,
      'press_kind', s.press_kind,
      'state', v_state,
      'flip_does', s.flip_does,
      'needs_first', s.needs_first,
      'reverse_does', s.reverse_does,
      'readiness', v_ready,
      'reverse_readiness', v_back,
      -- The scopes switch is pressed for everyone at once by the final switch; one organization is
      -- switched here only by a platform admin, to test it (Arman, 2026-09-27).
      'may_flip', v_may and s.press_kind = 'owner_press' and v_state = 'old' and (v_ready ->> 'ready')::boolean
                  and (s.seam_key <> 'scopes_screens' or v_is_admin),
      'may_reverse', v_may and s.press_kind = 'owner_press' and v_state = 'new'
                     and coalesce((v_back ->> 'ready')::boolean, false)
                     and (s.seam_key <> 'scopes_screens' or v_is_admin),
      'pressed_for_everyone', s.seam_key = 'scopes_screens',
      'switched', case when v_last.id is null then null else jsonb_build_object(
          'direction', v_last.direction, 'at', v_last.pressed_at,
          'by', (select coalesce(u.raw_user_meta_data ->> 'full_name', u.email) from auth.users u where u.id = v_last.pressed_by),
          'did', v_last.did) end,
      'last_press', case when v_latest.id is null then null else jsonb_build_object(
          'direction', v_latest.direction, 'outcome', v_latest.outcome, 'at', v_latest.pressed_at,
          'refusal', v_latest.refusal, 'says', v_latest.says) end);
  end loop;

  return jsonb_build_object('ok', true, 'organization_id', p_organization_id, 'checked_at', now(),
                            'may_press', v_may, 'may_press_detail', v_may_detail, 'seams', v_out);
end;
$function$;
ALTER FUNCTION platform.cutover_seams(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION platform.cutover_seams(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION platform.cutover_seams(uuid) TO postgres;
GRANT EXECUTE ON FUNCTION platform.cutover_seams(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION platform.cutover_seams(uuid) TO service_role;

-- platform.cutover_seam_press(text,uuid,text,text,boolean)  sha256 ab81ffafb4870fbc010b5c098c75ba79576fe0473f6741583eb990a89dea644e
CREATE OR REPLACE FUNCTION platform.cutover_seam_press(p_seam_key text, p_organization_id uuid, p_to text, p_note text DEFAULT NULL::text, p_accept_not_carried boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_claims jsonb := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
  v_headers jsonb := nullif(current_setting('request.headers', true), '')::jsonb;
  v_role text;
  v_is_admin boolean;
  s platform.cutover_seam;
  v_last platform.cutover_seam_press;
  v_state text;
  v_back jsonb;
  v_ready jsonb;
  v_press uuid := gen_random_uuid();
  v_did jsonb;
  v_refusal text;
  v_says text;
  v_done text;
begin
  if p_organization_id is null or not exists (select 1 from iam.organizations o where o.id = p_organization_id) then
    return jsonb_build_object('ok', false, 'reason', 'not_yours', 'says', 'There is no organization with that id that you belong to.');
  end if;

  if v_uid is null or v_claims is null then
    v_refusal := 'not_a_person';
    v_says := 'A switch is pressed by a person signed in on the organization''s settings page. A server, a script or a database connection cannot press it.';
  elsif coalesce(v_claims ->> 'role', '') <> 'authenticated' or coalesce(v_claims ->> 'session_id', '') = '' then
    v_refusal := 'not_a_person';
    v_says := 'A switch is pressed by a person signed in on the organization''s settings page, not with a service key or a minted token.';
  elsif v_headers is null or coalesce(v_headers ->> 'origin', '') = '' then
    v_refusal := 'not_from_the_screen';
    v_says := 'A switch is pressed from the organization''s settings page in a browser. This request did not come from a page.';
  end if;

  if v_refusal is null then
    v_is_admin := public.is_admin();
    select m.role into v_role from iam.organization_member m
     where m.organization_id = p_organization_id and m.user_id = v_uid;
    if v_role is null and not v_is_admin then
      return jsonb_build_object('ok', false, 'reason', 'not_yours', 'says', 'There is no organization with that id that you belong to.');
    end if;
    if v_role is distinct from 'owner' and not v_is_admin then
      v_refusal := 'not_an_owner';
      v_says := 'Only an owner of this organization can press this switch.';
    end if;
  end if;

  if v_refusal is null then
    select * into s from platform.cutover_seam where seam_key = p_seam_key and retired_at is null;
    if s.seam_key is null then
      return jsonb_build_object('ok', false, 'reason', 'unknown_switch', 'says', format('There is no switch called %s.', p_seam_key));
    elsif p_to is null or p_to not in ('new', 'old') then
      v_refusal := 'bad_direction';
      v_says := 'A switch goes to the new system or back to the old one.';
    elsif s.press_kind <> 'owner_press' then
      v_refusal := 'not_pressed_here';
      v_says := case s.press_kind when 'already_switched' then 'This one is already on the new system.'
                  else 'This one switches for everyone at once, in its own rehearsed step, not from an organization''s settings.' end;
    end if;
  end if;

  if v_refusal is null then
    perform pg_advisory_xact_lock(hashtextextended('cutover_seam:' || p_seam_key || ':' || p_organization_id::text, 0));
    v_last := platform._cutover_seam_last_done(p_seam_key, p_organization_id);
    v_state := coalesce(v_last.direction, 'old');
    if p_seam_key = 'scopes_screens' then
      v_state := 'new';
      if not v_is_admin then
        v_refusal := 'not_pressed_here';
        v_says := 'The scope and context screens switch for every organization at once, in the final switch. A platform admin can switch one organization to test it.';
      end if;
    end if;
    if v_refusal is not null then
      null;
    elsif v_state = p_to then
      v_refusal := 'already_there';
      v_says := case p_to when 'new' then 'This organization is already on the new system here.'
                          else 'This organization is already on the old system here.' end;
    elsif p_to = 'new' then
      v_ready := platform._cutover_seam_readiness(p_seam_key, p_organization_id);
      if not (v_ready ->> 'ready')::boolean then
        v_refusal := 'not_ready';
        v_says := 'Not ready yet: ' || (
          select string_agg(c ->> 'says' || ' — ' || rtrim(coalesce(c ->> 'detail', ''), '.'), '; ')
            from jsonb_array_elements(v_ready -> 'checks') c where not (c ->> 'met')::boolean) || '.';
      end if;
    else
      v_back := platform._cutover_seam_reverse_readiness(p_seam_key, p_organization_id);
      v_ready := v_back;
      if not (v_back ->> 'ready')::boolean then
        v_refusal := 'not_ready';
        v_says := 'Not ready to switch back: ' || (
          select string_agg(c ->> 'says' || ' — ' || rtrim(coalesce(c ->> 'detail', ''), '.'), '; ')
            from jsonb_array_elements(v_back -> 'checks') c where not (c ->> 'met')::boolean) || '.';
      elsif coalesce((v_back ->> 'needs_confirm')::boolean, false) and not coalesce(p_accept_not_carried, false) then
        v_refusal := 'confirm_not_carried';
        v_says := 'Switching back leaves these in the new system: '
          || (select string_agg(x, ' ') from jsonb_array_elements_text(v_back -> 'not_carried') x)
          || ' Confirm that they stay behind, then switch back.';
      end if;
    end if;
  end if;

  if v_refusal is not null then
    if p_seam_key in (select seam_key from platform.cutover_seam) then
      insert into platform.cutover_seam_press
        (id, seam_key, organization_id, direction, outcome, refusal, says, pressed_by, readiness, note)
      values
        (v_press, p_seam_key, p_organization_id,
         case when p_to in ('new', 'old') then p_to else 'new' end,
         'refused', v_refusal, v_says, v_uid, v_ready, p_note);
    end if;
    return jsonb_build_object('ok', false, 'reason', v_refusal, 'says', v_says, 'press_id', v_press, 'readiness', v_ready);
  end if;

  begin
    v_did := platform._cutover_seam_apply(p_seam_key, p_organization_id, p_to, v_uid, v_press);
  exception when others then
    v_refusal := 'the_step_failed';
    v_says := 'Nothing was changed: the switch stopped part way and was rolled back whole. ' || sqlerrm;
    insert into platform.cutover_seam_press
      (id, seam_key, organization_id, direction, outcome, refusal, says, pressed_by, readiness, note)
    values
      (v_press, p_seam_key, p_organization_id, p_to, 'refused', v_refusal, v_says, v_uid, v_ready, p_note);
    return jsonb_build_object('ok', false, 'reason', v_refusal, 'says', v_says, 'press_id', v_press);
  end;

  v_done := case p_to when 'new' then 'Switched to the new system.' else 'Switched back to the old system.' end;

  insert into platform.cutover_seam_press
    (id, seam_key, organization_id, direction, outcome, says, pressed_by, readiness, did, note)
  values
    (v_press, p_seam_key, p_organization_id, p_to, 'done', v_done, v_uid, v_ready, v_did, p_note);

  return jsonb_build_object('ok', true, 'press_id', v_press, 'state', p_to, 'did', v_did, 'says', v_done);
end;
$function$;
ALTER FUNCTION platform.cutover_seam_press(text,uuid,text,text,boolean) OWNER TO postgres;
REVOKE ALL ON FUNCTION platform.cutover_seam_press(text,uuid,text,text,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION platform.cutover_seam_press(text,uuid,text,text,boolean) TO postgres;
GRANT EXECUTE ON FUNCTION platform.cutover_seam_press(text,uuid,text,text,boolean) TO authenticated;

-- platform.cutover_seam_press_everyone(text,text,text,boolean,uuid[],uuid)  sha256 32a2f5d802911a329f21f73388ffafc528d9831e15b24929b3d036ef15ecebaf
CREATE OR REPLACE FUNCTION platform.cutover_seam_press_everyone(p_seam_key text, p_to text, p_note text DEFAULT NULL::text, p_dry_run boolean DEFAULT false, p_organization_ids uuid[] DEFAULT NULL::uuid[], p_pressed_for uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_uid uuid := coalesce(auth.uid(), p_pressed_for);
  s platform.cutover_seam;
  o record;
  v_state text;
  v_ready jsonb;
  v_did jsonb;
  v_press uuid;
  v_done jsonb := '[]'::jsonb;
  v_already int := 0;
  v_skipped jsonb := '[]'::jsonb;
begin
  -- EVERY PRESS NAMES WHO. Over a direct connection the final switch names the person it runs for
  -- (a platform admin), exactly as a press from a page names the person signed in.
  if auth.uid() is null and (p_pressed_for is null or not exists (select 1 from admin.admins a where a.user_id = p_pressed_for)) then
    raise exception 'Switching every organization at once from a database connection names the platform admin it is pressed for (p_pressed_for).'
      using errcode = '22004';
  end if;
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'Only a platform admin, or the final switch over a direct database connection, switches every organization at once.'
      using errcode = '42501';
  end if;
  if v_uid is null and nullif(current_setting('request.jwt.claims', true), '') is not null
     and coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '') <> 'service_role' then
    raise exception 'Switching every organization at once needs a signed-in platform admin or a direct database connection.'
      using errcode = '42501';
  end if;
  select * into s from platform.cutover_seam where seam_key = p_seam_key and retired_at is null;
  if s.seam_key is null then
    raise exception 'There is no switch called %.', p_seam_key using errcode = '22023';
  end if;
  if not s.per_organization or s.press_kind <> 'owner_press' then
    raise exception 'The switch % is not switched organization by organization.', p_seam_key using errcode = '22023';
  end if;
  if p_to is null or p_to not in ('new', 'old') then
    raise exception 'A switch goes to the new system or back to the old one.' using errcode = '22023';
  end if;

  -- Every organization, or the batch named (the final switch may press in batches; a suite names its own).
  for o in select x.id, x.name from iam.organizations x
            where p_organization_ids is null or x.id = any (p_organization_ids)
            order by x.created_at, x.id loop
    perform pg_advisory_xact_lock(hashtextextended('cutover_seam:' || p_seam_key || ':' || o.id::text, 0));
    v_state := case when p_seam_key = 'scopes_screens'
                      then 'new'  -- every organization's scopes are written in the store (writer switch retired 2026-10-09)

                    else coalesce((platform._cutover_seam_last_done(p_seam_key, o.id)).direction, 'old') end;
    if v_state = p_to then
      v_already := v_already + 1;
      continue;
    end if;
    -- An organization whose record store is off stays on the old system: skipped, named, never a
    -- failed run (found by lane FINAL-SWITCH's rehearsal).
    if p_seam_key = 'scopes_screens' and p_to = 'new' and not custom.store_is_open(o.id) then
      v_skipped := v_skipped || jsonb_build_object('organization_id', o.id, 'organization', o.name,
        'says', format('%s has its record store switched off, so its scopes stay on the old tables.', o.name));
      continue;
    end if;
    v_ready := case when p_to = 'new' then platform._cutover_seam_readiness(p_seam_key, o.id)
                    else platform._cutover_seam_reverse_readiness(p_seam_key, o.id) end;
    if not coalesce((v_ready ->> 'ready')::boolean, false) then
      return jsonb_build_object('ok', false, 'stopped_at', o.id, 'organization', o.name,
        'says', format('%s is not ready: %s. Nothing after it was pressed.', o.name,
          (select string_agg(c ->> 'says' || ' — ' || coalesce(c ->> 'detail', ''), '; ')
             from jsonb_array_elements(v_ready -> 'checks') c where not (c ->> 'met')::boolean)),
        'readiness', v_ready, 'pressed', v_done, 'already', v_already, 'skipped', v_skipped);
    end if;
    if p_dry_run then
      v_done := v_done || jsonb_build_object('organization_id', o.id, 'organization', o.name, 'would', p_to);
      continue;
    end if;
    v_press := gen_random_uuid();
    v_did := platform._cutover_seam_apply(p_seam_key, o.id, p_to, v_uid, v_press);
    insert into platform.cutover_seam_press
      (id, seam_key, organization_id, direction, outcome, says, pressed_by, readiness, did, note)
    values (v_press, p_seam_key, o.id, p_to, 'done',
            case p_to when 'new' then 'Switched to the new system, with every organization at once.'
                      else 'Switched back to the old system, with every organization at once.' end,
            v_uid, v_ready, v_did || jsonb_build_object('everyone', true),
            coalesce(p_note, 'pressed for every organization at once'));
    v_done := v_done || jsonb_build_object('organization_id', o.id, 'organization', o.name, 'press_id', v_press);
  end loop;
  return jsonb_build_object('ok', true, 'seam', p_seam_key, 'to', p_to, 'dry_run', p_dry_run,
                            'pressed', v_done, 'pressed_count', jsonb_array_length(v_done), 'already', v_already,
                            'skipped', v_skipped, 'skipped_count', jsonb_array_length(v_skipped));
end;
$function$;
ALTER FUNCTION platform.cutover_seam_press_everyone(text,text,text,boolean,uuid[],uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION platform.cutover_seam_press_everyone(text,text,text,boolean,uuid[],uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION platform.cutover_seam_press_everyone(text,text,text,boolean,uuid[],uuid) TO postgres;
GRANT EXECUTE ON FUNCTION platform.cutover_seam_press_everyone(text,text,text,boolean,uuid[],uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION platform.cutover_seam_press_everyone(text,text,text,boolean,uuid[],uuid) TO service_role;

