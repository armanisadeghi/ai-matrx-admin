-- spaces_redraw_template_install_never_answers_archived_tables.sql (lane SPACES-REDRAW, 2026-10-17)
--
-- REPLACES one function body: custom.template_install. No table, column, index, trigger or policy is touched.
--
-- THE USE CASE. Priya installed Fundraising CRM, later archived its six tables from her data home, then pressed
-- "Use template" again. The install row still said `installed`, so the door answered `already` with the six
-- archived tables and the new page tree pointed at them: every grid empty, every board "no choice column".
-- Now an `installed` answer first brings back any table it made that is archived (custom.table_restore, the
-- data home's own Restore, with everything its archive took); while a restore is still under way the answer is
-- `done: false` and the caller's loop calls again. The answer lists what came back under `restored`.
--
-- based-on: custom.template_install(uuid, uuid, integer) a1078fe2a0f52170671f843902bea173deb8fbf5477128aa1afe5cafb2f49336
--
-- INVERSE: migrations/inverse/spaces_redraw_template_install_never_answers_archived_tables_down.sql

CREATE OR REPLACE FUNCTION custom.template_install(p_organization_id uuid, p_template_id uuid, p_budget_ms integer DEFAULT 4000)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
 SET statement_timeout TO '90s'
AS $function$
declare
  v_me      uuid := auth.uid();
  v_t       custom.template;
  v_i       custom.template_install;
  v_steps   jsonb;
  v_n       integer;
  v_k       integer;
  v_from    integer;
  v_step    jsonb;
  v_args    jsonb;
  v_res     jsonb;
  v_ids     jsonb;
  v_made    jsonb;
  v_name    text;
  v_path    jsonb;
  v_each    jsonb;
  v_el      jsonb;
  v_m       jsonb;
  v_t0      timestamptz := clock_timestamp();
  v_budget  integer := least(greatest(coalesce(p_budget_ms, 4000), 0), 600000);
  v_tz      text;
  v_state   text;
  v_msg     text;
  v_code    text;
  v_hint    text;
  v_detail  text;
  v_where   text;
  v_back    jsonb := '[]'::jsonb;    -- tables archived by hand that this call brought back (or is bringing back)
  v_wait    boolean := false;        -- one of them is still coming back: the caller calls again
  v_did     integer;
begin
  perform custom.assert_store_door(p_organization_id, 'custom.template_install');
  perform custom.assert_client_may_reach(p_organization_id, 'custom.template_install');
  if v_me is null then
    raise exception 'Installing a template is done by a signed-in person, and nobody is signed in.' using errcode = '42501';
  end if;

  select * into v_t from custom.template t where t.id = p_template_id and t.retired_at is null;
  if not found or (v_t.scope = 'org' and not iam.has_org_access(v_t.organization_id)) then
    raise exception 'There is no such template to install; it may have been retired.' using errcode = 'P0002',
          detail = jsonb_build_object('template_id', p_template_id)::text;
  end if;

  -- One install of a catalogue id per organization at a time: two presses wait for each other.
  perform pg_advisory_xact_lock(hashtextextended('custom.template_install:' || p_organization_id::text || ':' || v_t.catalogue_id, 0));

  select * into v_i from custom.template_install i
   where i.organization_id = p_organization_id and i.catalogue_id = v_t.catalogue_id and i.state <> 'uninstalled'
   for update;
  if found and v_i.state in ('installed', 'uninstalling') then
    -- SPACES-REDRAW (2026-10-17): AN INSTALL NEVER ANSWERS WITH A TABLE THAT IS ARCHIVED. A table this
    -- install made can be archived on its own (the data home's Archive, custom.table_archive) while the
    -- install stays `installed`; answering `already` with it handed "Use template" a page tree over
    -- tables nobody can read (empty grids, "no choice column"). Each such table is brought back through
    -- the one restore door (custom.table_restore, the same passes the data home's Restore runs), with
    -- everything its archive took; while one is still coming back the answer is not done and the
    -- caller calls again (runTemplateDoor loops on `done`). A pass that brings nothing back and is not
    -- done says so by name instead of looping.
    if v_i.state = 'installed' then
      for v_m in select x from jsonb_array_elements(coalesce(v_i.made, '[]'::jsonb)) x
                  where x ->> 'kind' = 'table' and nullif(x ->> 'id', '') is not null loop
        continue when not (
          exists (select 1 from custom.record r
                   where r.organization_id = p_organization_id and r.id = (v_m ->> 'id')::uuid and r.deleted_at is not null)
          or exists (select 1 from history.migration_log l
                      where l.organization_id = p_organization_id and l.target_id = (v_m ->> 'id')::uuid and l.verb = 'archive'
                        and l.undone_at is null and coalesce((l.inverse ->> 'restoring')::boolean, false)));
        v_res := custom.table_restore(p_organization_id, (v_m ->> 'id')::uuid, 1000);
        v_did := coalesce((v_res ->> 'restored')::integer, 0) + coalesce((v_res ->> 'structure_restored')::integer, 0)
               + coalesce((v_res ->> 'built_on_restored')::integer, 0);
        if not coalesce((v_res ->> 'done')::boolean, false) then
          if v_did = 0 then
            raise exception 'The template''s % table is archived and could not be brought back: %', coalesce(v_m ->> 'title', 'one'), v_res ->> 'message'
              using errcode = '55000', detail = jsonb_build_object('install_id', v_i.id, 'table_id', v_m ->> 'id')::text,
                    hint = 'Restore it from the data home''s Archived list, then use the template again.';
          end if;
          v_wait := true;
        end if;
        v_back := v_back || jsonb_build_array(jsonb_build_object('table_id', v_m ->> 'id', 'title', v_m ->> 'title',
                    'done', coalesce((v_res ->> 'done')::boolean, false), 'message', v_res ->> 'message'));
      end loop;
    end if;
    return custom._template_answer(v_i, jsonb_build_object('already', true,
             'newer_version', case when v_t.template_version > v_i.template_version then v_t.template_version else null end,
             -- CHAIR-TEMPLATE-UPGRADE: what the caller needs to bring this install up to the newer version.
             'upgrade', case when v_t.template_version > v_i.template_version and v_i.state = 'installed' then
                          jsonb_build_object('door', 'template_upgrade', 'install_id', v_i.id, 'template_id', v_t.id,
                                             'from_version', v_i.template_version, 'to_version', v_t.template_version) end)
           || case when jsonb_array_length(v_back) > 0 then jsonb_build_object('restored', v_back) else '{}'::jsonb end
           || case when v_wait then jsonb_build_object('done', false) else '{}'::jsonb end);
  end if;
  if found and v_i.template_id <> v_t.id then
    raise exception 'This organization is part-way through installing version % of this template, so version % cannot start until it finishes or is uninstalled.', v_i.template_version, v_t.template_version
      using errcode = '55000', detail = jsonb_build_object('install_id', v_i.id)::text;
  end if;
  if not found then
    v_tz := coalesce(nullif(v_t.plan ->> 'timezone', ''), 'UTC');
    if not exists (select 1 from pg_timezone_names z where z.name = v_tz) then v_tz := 'UTC'; end if;
    insert into custom.template_install
      (organization_id, template_id, catalogue_id, template_version, state, install_day, timezone, installed_by, ids)
    values (p_organization_id, v_t.id, v_t.catalogue_id, v_t.template_version, 'installing',
            (now() at time zone v_tz)::date, v_tz, v_me,
            -- A table the template binds to (bindsTo) is known before the first step: its id seeds the map.
            case when jsonb_typeof(v_t.plan -> 'ids') = 'object' then v_t.plan -> 'ids' else '{}'::jsonb end)
    returning * into v_i;
  end if;

  v_steps := v_t.plan -> 'steps';
  v_n := jsonb_array_length(v_steps);
  v_from := v_i.next_step;
  v_k := v_from;
  v_ids := v_i.ids;
  v_made := v_i.made;

  begin
    while v_k < v_n loop
      -- Always at least one step per call; then stop when the budget is spent.
      exit when v_k > v_from and extract(epoch from clock_timestamp() - v_t0) * 1000 > v_budget;
      v_step := v_steps -> v_k;

      for v_name in select distinct (regexp_matches((v_step -> 'args')::text, '\$\{new:([^}]+)\}', 'g'))[1] loop
        if not v_ids ? ('new:' || v_name) then
          v_ids := v_ids || jsonb_build_object('new:' || v_name, gen_random_uuid());
        end if;
      end loop;
      v_args := custom._template_bind(v_step -> 'args', v_ids, p_organization_id, v_i.install_day, v_i.timezone);
      v_res := custom._template_call(v_step ->> 'door', v_args);

      -- save: {"NAME": [path…]} — [] is the whole answer.
      for v_name, v_path in select key, value from jsonb_each(coalesce(v_step -> 'save', '{}'::jsonb)) loop
        if v_res #> array(select jsonb_array_elements_text(v_path)) is null
           or jsonb_typeof(v_res #> array(select jsonb_array_elements_text(v_path))) = 'null' then
          raise exception 'custom.% answered without the id the template saves as "%".', v_step ->> 'door', v_name using errcode = 'P0002';
        end if;
        v_ids := v_ids || jsonb_build_object('ref:' || v_name, v_res #>> array(select jsonb_array_elements_text(v_path)));
      end loop;
      -- saveEach: {"array": [path], "key": [path], "value": [path], "prefix": "fields.patient."}
      v_each := v_step -> 'saveEach';
      if v_each is not null then
        for v_el in select x from jsonb_array_elements(coalesce(v_res #> array(select jsonb_array_elements_text(coalesce(v_each -> 'array', '[]'::jsonb))), '[]'::jsonb)) x loop
          if nullif(v_el #>> array(select jsonb_array_elements_text(v_each -> 'key')), '') is not null then
            v_ids := v_ids || jsonb_build_object('ref:' || (v_each ->> 'prefix') || (v_el #>> array(select jsonb_array_elements_text(v_each -> 'key'))),
                                                 v_el #>> array(select jsonb_array_elements_text(v_each -> 'value')));
          end if;
        end loop;
      end if;
      -- made: [{kind, ref, title, table}] — what uninstall archives.
      for v_m in select x from jsonb_array_elements(coalesce(v_step -> 'made', '[]'::jsonb)) x loop
        v_made := v_made || jsonb_build_array(jsonb_build_object(
          'kind', v_m ->> 'kind', 'ref', v_m ->> 'ref', 'title', v_m ->> 'title', 'step', v_k,
          'id', v_ids ->> ('ref:' || (v_m ->> 'ref')),
          'table_id', case when v_m ? 'table' then v_ids ->> ('ref:' || (v_m ->> 'table')) end));
      end loop;
      v_k := v_k + 1;
    end loop;

    v_state := case when v_k >= v_n then 'installed' else 'installing' end;
    update custom.template_install i
       set ids = v_ids, made = v_made, next_step = v_k, state = v_state, refusal = null,
           finished_at = case when v_state = 'installed' then now() end,
           ms = i.ms + (extract(epoch from clock_timestamp() - v_t0) * 1000)::integer,
           calls = i.calls + 1, updated_at = now()
     where i.id = v_i.id
    returning * into v_i;
  exception when others then
    -- Everything THIS call did is rolled back; what earlier calls made stays listed in `made`.
    get stacked diagnostics v_msg = message_text, v_code = returned_sqlstate, v_hint = pg_exception_hint, v_detail = pg_exception_detail, v_where = pg_exception_context;
    update custom.template_install i
       set state = 'refused',
           refusal = jsonb_build_object('step', v_k, 'label', v_steps -> v_k ->> 'label', 'door', 'custom.' || (v_steps -> v_k ->> 'door'),
                                        'code', v_code, 'message', v_msg, 'hint', nullif(v_hint, ''), 'detail', nullif(v_detail, ''),
                                        'where', left(nullif(v_where, ''), 2000)),
           ms = i.ms + (extract(epoch from clock_timestamp() - v_t0) * 1000)::integer,
           calls = i.calls + 1, updated_at = now()
     where i.id = v_i.id
    returning * into v_i;
  end;

  return custom._template_answer(v_i, jsonb_build_object(
           'steps', v_n, 'this_call_ms', (extract(epoch from clock_timestamp() - v_t0) * 1000)::integer));
end;
$function$;
