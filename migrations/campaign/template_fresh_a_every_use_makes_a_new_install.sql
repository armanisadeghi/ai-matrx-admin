-- template_fresh_a_every_use_makes_a_new_install.sql (lane TEMPLATE-FRESH, 2026-10-18)
-- based-on: custom.template_install(uuid, uuid, integer) b450ee0cdcfde78854fa52f95e86bbd4c52719f0d7ac953b51ca5f2e621a41b0
-- based-on: custom.template_upgrade(uuid, uuid, uuid) b228735876420557a48d9a115530aa1d902aa68b1bc773f0895d39a19af7ca65
-- based-on: custom.template_restore(uuid, uuid, integer) 39642aad3e486f6b1b3c31f765150fdaebf6a46ae37d572bb9664ff9c1f5de06
-- based-on: custom._template_answer(custom.template_install, jsonb) 953804e8b622991dc0e3ab3e83778a2036bed3da0e510a9e0676feaac8501a90
-- based-on: custom._template_agent(custom.template_install) bb328646b1849be95d3c12eeb663f49b3f08b5828f80cae3f395d6124eba7b1e
-- based-on: custom.space_templates(jsonb) 807b6dd1ecd60b05e123d20b123be0ffdaa29fc500ad5169fa8f1fc6f0aef228
-- based-on: custom.templates(jsonb) 0d03ea0e3432b73ff697ae7060443130d2de20842f505f4459a3aae2e286bc31
-- additive: yes (two nullable columns, one index split in two, one helper, one read door, function bodies).
-- chair-step: the one-live-install unique index is DROPPED and rebuilt with `and instance_no is null` so fresh copies
--   stand beside the default install (every existing row has instance_no null, so it holds exactly the rows it held);
--   the REVOKEs close the new private body custom._template_install_core and the helper to clients. No data is dropped.
-- Inverse: migrations/inverse/template_fresh_a_every_use_makes_a_new_install_down.sql.
--
-- THE USE CASE (Spaces + Board, Notion parity). Until now an organization had ONE install of a template: a second
-- "Use template" answered `already` with the same tables. Now custom.template_install_fresh: every
-- call without p_install_id makes a NEW install row (instance 2, 3, …; the default install is 1) with its own id map,
-- so every relation, roll-up, lookup, view, button, row template, form, dashboard, automation and portal its steps make
-- is wired to THAT instance's tables only. Its tables are named "<Table> · <title>" (title = p_title, else
-- "<template name> <n>"). The door is custom.template_install_fresh(org, template, title, install_id, budget); the
-- caller continues an unfinished fresh install with p_install_id (runTemplateDoor does). custom.template_install keeps
-- its signature and answers; both are thin doors over ONE private body, custom._template_install_core.
-- Upgrade, uninstall and restore already act by install id; restore's "installed again since" check is now per
-- instance; upgrade names a new table of the version the same way. Callers that pass no mode get exactly what they
-- got before: the default install is the row with instance_no null, found and answered as before.
-- custom.template_instances(org, catalogue) lists every install (default and fresh) with its upgrade hint.

alter table custom.template_install add column if not exists instance_no integer;
alter table custom.template_install add column if not exists instance_title text;
comment on column custom.template_install.instance_no is 'TEMPLATE-FRESH: null = the default (one per organization) install; 2, 3, … = a fresh copy (never reused).';
comment on column custom.template_install.instance_title is 'TEMPLATE-FRESH: a fresh copy''s title; its tables are named "<Table> · <title>".';

drop index if exists custom.template_install_one_live_idx;
create unique index template_install_one_live_idx on custom.template_install (organization_id, catalogue_id)
  where state <> 'uninstalled' and instance_no is null;
create unique index if not exists template_install_instance_no_idx on custom.template_install (organization_id, catalogue_id, instance_no)
  where instance_no is not null;

-- What a fresh copy changes in a step's arguments: the names a person sees in the organization's lists of tables, and
-- an explicit public slug (which is unique per organization). Every id is already the instance's own (its id map).
-- A null title (the default install) answers the arguments untouched.
create or replace function custom._template_instance_args(p_door text, p_args jsonb, p_title text, p_no integer)
 returns jsonb
 language plpgsql
 immutable
 set search_path to 'pg_catalog'
as $function$
declare
  v_args jsonb := p_args;
  v_sfx  text;
begin
  if p_title is null or p_args is null then
    return p_args;
  end if;
  v_sfx := ' · ' || p_title;
  if p_door = 'table_from_example' and jsonb_typeof(v_args #> '{p_example,tables}') = 'array' then
    v_args := jsonb_set(v_args, '{p_example,tables}', (
      select coalesce(jsonb_agg(case when nullif(t ->> 'name', '') is not null
                                     then t || jsonb_build_object('name', (t ->> 'name') || v_sfx) else t end order by o), '[]'::jsonb)
        from jsonb_array_elements(v_args #> '{p_example,tables}') with ordinality x(t, o)));
  elsif p_door = 'table_declare' and nullif(v_args #>> '{p_spec,name}', '') is not null then
    v_args := jsonb_set(v_args, '{p_spec,name}', to_jsonb((v_args #>> '{p_spec,name}') || v_sfx));
  end if;
  if p_door in ('form_declare', 'booking_declare', 'portal_declare') and nullif(v_args ->> 'p_slug', '') is not null then
    v_args := jsonb_set(v_args, '{p_slug}', to_jsonb((v_args ->> 'p_slug') || '-' || coalesce(p_no, 2)));
  end if;
  return v_args;
end;
$function$;

-- Every install of one template in an organization: the default one (instance 1) and each fresh copy.
create or replace function custom.template_instances(p_organization_id uuid, p_catalogue_id text)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to 'pg_catalog'
as $function$
begin
  perform custom.assert_client_may_reach(p_organization_id, 'custom.template_instances');
  if not iam.has_org_access(p_organization_id) then
    raise exception 'You are not a member of that organization.' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'install_id', i.id, 'instance_no', coalesce(i.instance_no, 1), 'mode', case when i.instance_no is null then 'default' else 'fresh' end,
             'title', i.instance_title, 'state', i.state, 'version', i.template_version, 'template_id', i.template_id,
             'started_at', i.started_at, 'finished_at', i.finished_at,
             'tables', (select coalesce(jsonb_agg(jsonb_build_object('ref', m ->> 'ref', 'id', m ->> 'id', 'title', m ->> 'title')), '[]'::jsonb)
                          from jsonb_array_elements(i.made) m where m ->> 'kind' = 'table'),
             'newer_version', case when n.template_version > i.template_version then n.template_version end,
             'upgrade', case when n.template_version > i.template_version and i.state = 'installed' then
                          jsonb_build_object('door', 'template_upgrade', 'install_id', i.id, 'template_id', n.id,
                                             'from_version', i.template_version, 'to_version', n.template_version) end)
           order by coalesce(i.instance_no, 1), i.started_at)
      from custom.template_install i
      left join lateral (select t.id, t.template_version from custom.template t
                          where t.catalogue_id = i.catalogue_id and t.retired_at is null
                            and (t.scope = 'platform' or t.organization_id = p_organization_id)
                          order by t.template_version desc, (t.scope = 'org') desc limit 1) n on true
     where i.organization_id = p_organization_id and i.catalogue_id = p_catalogue_id), '[]'::jsonb);
end;
$function$;

CREATE OR REPLACE FUNCTION custom._template_install_core(p_organization_id uuid, p_template_id uuid, p_budget_ms integer,
                                                          p_mode text, p_title text, p_install_id uuid, p_door text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog'
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
  v_left    jsonb;                   -- TEMPLATE-INSTALL-3: archived tables still to bring back this round
  v_next    jsonb;                   -- the ones refused this round, with the store's reason
  v_progress boolean;
  v_fresh   boolean := lower(coalesce(nullif(btrim(p_mode), ''), 'default')) = 'fresh';  -- TEMPLATE-FRESH
  v_no      integer;
  v_title   text;
  v_tn      integer;
begin
  if lower(coalesce(nullif(btrim(p_mode), ''), 'default')) not in ('default', 'fresh') then
    raise exception 'A template installs in the default way or fresh, and "%" is neither.', p_mode using errcode = '22023',
          hint = 'Leave the mode out for the one install per organization, or send fresh for a new independent copy each time.';
  end if;
  if not v_fresh and p_install_id is not null then
    raise exception 'Only a fresh install is continued by its install id; the default install is found by its template.' using errcode = '22023';
  end if;
  perform custom.assert_store_door(p_organization_id, p_door);
  perform custom.assert_client_may_reach(p_organization_id, p_door);
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

  -- TEMPLATE-FRESH (2026-10-18): THE DEFAULT INSTALL IS THE ONE WITHOUT AN INSTANCE NUMBER. A fresh install (instance 2,
  -- 3, …) is its own row with its own id map, so nothing below ever answers with, or wires to, another instance's tables.
  if v_fresh then
    if p_install_id is not null then
      select * into v_i from custom.template_install i
       where i.id = p_install_id and i.organization_id = p_organization_id and i.instance_no is not null
       for update;
      if not found or v_i.catalogue_id is distinct from v_t.catalogue_id then
        raise exception 'There is no such fresh install of this template in this organization.' using errcode = 'P0002',
              detail = jsonb_build_object('install_id', p_install_id)::text;
      end if;
      if v_i.state in ('installed', 'uninstalling', 'uninstalled') then
        return custom._template_answer(v_i, jsonb_build_object('already', true,
                 'newer_version', case when v_t.template_version > v_i.template_version then v_t.template_version else null end,
                 'upgrade', case when v_t.template_version > v_i.template_version and v_i.state = 'installed' then
                              jsonb_build_object('door', 'template_upgrade', 'install_id', v_i.id, 'template_id', v_t.id,
                                                 'from_version', v_i.template_version, 'to_version', v_t.template_version) end));
      end if;
      if v_i.template_id <> v_t.id then
        raise exception 'This copy is part-way through installing version % of this template, so version % cannot continue it.', v_i.template_version, v_t.template_version
          using errcode = '55000', detail = jsonb_build_object('install_id', v_i.id)::text;
      end if;
    else
      -- Instance numbers are never reused (the default install is 1); the title is unique among this template's live copies.
      select greatest(coalesce(max(i.instance_no), 1), 1) + 1 into v_no
        from custom.template_install i
       where i.organization_id = p_organization_id and i.catalogue_id = v_t.catalogue_id and i.instance_no is not null;
      v_title := left(regexp_replace(btrim(coalesce(p_title, '')), '\s+', ' ', 'g'), 120);
      if v_title = '' then
        v_title := coalesce(nullif(btrim(v_t.card ->> 'name'), ''), nullif(btrim(v_t.spec ->> 'name'), ''), v_t.catalogue_id) || ' ' || v_no;
      end if;
      v_tn := 1;
      while exists (select 1 from custom.template_install i
                     where i.organization_id = p_organization_id and i.catalogue_id = v_t.catalogue_id and i.state <> 'uninstalled'
                       and i.instance_no is not null
                       and lower(i.instance_title) = lower(case when v_tn = 1 then v_title else v_title || ' ' || v_tn end)) loop
        v_tn := v_tn + 1;
      end loop;
      if v_tn > 1 then v_title := v_title || ' ' || v_tn; end if;
      v_tz := coalesce(nullif(v_t.plan ->> 'timezone', ''), 'UTC');
      if not exists (select 1 from pg_timezone_names z where z.name = v_tz) then v_tz := 'UTC'; end if;
      insert into custom.template_install
        (organization_id, template_id, catalogue_id, template_version, state, install_day, timezone, installed_by, ids,
         instance_no, instance_title)
      values (p_organization_id, v_t.id, v_t.catalogue_id, v_t.template_version, 'installing',
              (now() at time zone v_tz)::date, v_tz, v_me,
              case when jsonb_typeof(v_t.plan -> 'ids') = 'object' then v_t.plan -> 'ids' else '{}'::jsonb end,
              v_no, v_title)
      returning * into v_i;
    end if;
  else
  select * into v_i from custom.template_install i
   where i.organization_id = p_organization_id and i.catalogue_id = v_t.catalogue_id and i.state <> 'uninstalled'
     and i.instance_no is null
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
    -- TEMPLATE-INSTALL-3 (2026-10-17): IN ROUNDS, NOT ONE PASS IN `made` ORDER. A table's roll-up reads through a
    -- link that lives on ANOTHER of the template's tables (Fundraising CRM: Investors' "Interactions logged" counts
    -- through Interactions.investor's back-link `interactions`). With both archived, Investors came first in `made`,
    -- its structure was refused whole (the link it reads is still archived) and the error ended the call, so the
    -- template could never come back. Now a table whose restore is refused waits while the others come back, and is
    -- asked again; only a round that brings nothing back refuses, naming the table and the store's own reason.
    if v_i.state = 'installed' then
      select coalesce(jsonb_agg(x order by o), '[]'::jsonb) into v_left
        from jsonb_array_elements(coalesce(v_i.made, '[]'::jsonb)) with ordinality as j(x, o)
       where x ->> 'kind' = 'table' and nullif(x ->> 'id', '') is not null
         and (exists (select 1 from custom.record r
                       where r.organization_id = p_organization_id and r.id = (x ->> 'id')::uuid and r.deleted_at is not null)
              or exists (select 1 from history.migration_log l
                          where l.organization_id = p_organization_id and l.target_id = (x ->> 'id')::uuid and l.verb = 'archive'
                            and l.undone_at is null and coalesce((l.inverse ->> 'restoring')::boolean, false)));
      v_next := '[]'::jsonb;
      while jsonb_array_length(v_left) > 0 loop
        v_next := '[]'::jsonb;
        v_progress := false;
        for v_m in select x from jsonb_array_elements(v_left) x loop
          begin
            v_res := custom.table_restore(p_organization_id, (v_m ->> 'id')::uuid, 1000);
          exception when others then
            get stacked diagnostics v_msg = message_text, v_code = returned_sqlstate, v_hint = pg_exception_hint;
            v_next := v_next || jsonb_build_array(v_m || jsonb_build_object('why', v_msg, 'code', v_code, 'why_hint', nullif(v_hint, '')));
            continue;
          end;
          v_did := coalesce((v_res ->> 'restored')::integer, 0) + coalesce((v_res ->> 'structure_restored')::integer, 0)
                 + coalesce((v_res ->> 'built_on_restored')::integer, 0);
          if not coalesce((v_res ->> 'done')::boolean, false) then
            if v_did = 0 then
              v_next := v_next || jsonb_build_array(v_m || jsonb_build_object('why', v_res ->> 'message', 'code', '55000'));
              continue;
            end if;
            v_wait := true;
          end if;
          v_progress := true;
          v_back := v_back || jsonb_build_array(jsonb_build_object('table_id', v_m ->> 'id', 'title', v_m ->> 'title',
                      'done', coalesce((v_res ->> 'done')::boolean, false), 'message', v_res ->> 'message'));
        end loop;
        exit when not v_progress;
        v_left := v_next;
      end loop;
      if jsonb_array_length(v_next) > 0 and not v_progress then
        v_m := v_next -> 0;
        raise exception 'The template''s % table is archived and could not be brought back: %', coalesce(v_m ->> 'title', 'one'), v_m ->> 'why'
          using errcode = '55000', detail = jsonb_build_object('install_id', v_i.id, 'table_id', v_m ->> 'id',
                                                               'waiting', (select jsonb_agg(w ->> 'title') from jsonb_array_elements(v_next) w))::text,
                hint = 'Restore it from the data home''s Archived list (change what the reason names first), then use the template again.';
      end if;
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
  end if;  -- TEMPLATE-FRESH: default lookup

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
      v_args := custom._template_instance_args(v_step ->> 'door', v_args, v_i.instance_title, v_i.instance_no);
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

CREATE OR REPLACE FUNCTION custom.template_upgrade(p_organization_id uuid, p_install_id uuid, p_template_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
 SET statement_timeout TO '90s'
AS $function$
declare
  v_me       uuid := auth.uid();
  v_t        custom.template;
  v_old      custom.template;
  v_i        custom.template_install;
  v_pre      jsonb;          -- the id map before this upgrade: what the install already has
  v_ids      jsonb;
  v_made     jsonb;
  v_steps    jsonb;
  v_n        integer;
  v_k        integer := -1;
  v_step     jsonb;
  v_args     jsonb;
  v_res      jsonb;
  v_name     text;
  v_path     jsonb;
  v_each     jsonb;
  v_el       jsonb;
  v_m        jsonb;
  v_refs     text[];
  v_tref     text;
  v_table    uuid;
  v_counts   jsonb := '{}'::jsonb;
  v_skipped  jsonb := '[]'::jsonb;
  v_queue    jsonb := '[]'::jsonb;   -- select → relation conversions, run after every new step
  v_q        jsonb;
  v_live     record;
  v_new_type text;
  v_spec     jsonb;
  v_key      text;
  v_new_key  text;
  v_seq      integer;
  v_old_fid  uuid;
  v_old_sort jsonb;
  v_opts     uuid;
  v_choices  jsonb;
  v_target   uuid;
  v_title    text;
  v_max      integer;
  v_new_fid  uuid;
  v_map      jsonb;            -- lower(label) -> target record id
  v_row      record;
  v_vals     jsonb;
  v_labels   text[];
  v_label    text;
  v_hit      uuid;
  v_links    jsonb;
  v_changes  jsonb;
  v_f        record;
  v_t0       timestamptz := clock_timestamp();
  v_msg      text;
  v_code     text;
  v_hint     text;
  v_detail   text;
  v_where    text;
  v_at       integer := -1;    -- the step being run, for the refusal (a FOR loop's own v_k is not seen outside it)
  v_bind     text[];
  v_have     jsonb;
  v_doc      jsonb;
  v_same     boolean;
  v_present  boolean;
  v_flips    jsonb := '[]'::jsonb;  -- a link the new version turns around: {a_table, a_key, b_ref, b_key}
  v_fl       jsonb;
  v_b_table  uuid;
begin
  perform custom.assert_store_door(p_organization_id, 'custom.template_upgrade');
  perform custom.assert_client_may_reach(p_organization_id, 'custom.template_upgrade');
  if v_me is null then
    raise exception 'Upgrading a template is done by a signed-in person, and nobody is signed in.' using errcode = '42501';
  end if;

  select * into v_i from custom.template_install i where i.id = p_install_id and i.organization_id = p_organization_id;
  if not found then
    raise exception 'There is no such install in this organization, so there is nothing to upgrade.' using errcode = 'P0002',
          detail = jsonb_build_object('install_id', p_install_id)::text;
  end if;
  select * into v_t from custom.template t where t.id = p_template_id and t.retired_at is null;
  if not found or (v_t.scope = 'org' and not iam.has_org_access(v_t.organization_id)) then
    raise exception 'There is no such template to upgrade to; it may have been retired.' using errcode = 'P0002',
          detail = jsonb_build_object('template_id', p_template_id)::text;
  end if;
  if v_t.catalogue_id is distinct from v_i.catalogue_id then
    raise exception 'That template is not a version of the one this install came from (% is not %).', v_t.catalogue_id, v_i.catalogue_id
      using errcode = '22023';
  end if;

  -- The same lock template_install takes: an install and an upgrade of one catalogue id wait for each other.
  perform pg_advisory_xact_lock(hashtextextended('custom.template_install:' || p_organization_id::text || ':' || v_i.catalogue_id, 0));
  select * into v_i from custom.template_install i where i.id = p_install_id for update;

  if v_i.state <> 'installed' then
    raise exception 'Only a finished install is upgraded, and this one is %.', v_i.state using errcode = '55000',
          hint = 'Finish the install (or restore it) first, then upgrade.';
  end if;
  if v_t.template_version <= v_i.template_version then
    -- Idempotent: an install already at (or past) this version changes nothing.
    return custom._template_answer(v_i, jsonb_build_object('already', true, 'upgraded', false,
             'from_version', v_i.template_version, 'to_version', v_i.template_version,
             'counts', '{}'::jsonb, 'skipped', '[]'::jsonb));
  end if;
  select * into v_old from custom.template t where t.id = v_i.template_id;

  v_pre := v_i.ids;
  v_ids := v_i.ids;
  v_made := v_i.made;
  v_steps := v_t.plan -> 'steps';
  v_n := jsonb_array_length(v_steps);

  begin
    -- ── PASS 4: a column the older version made and the new one no longer has is retired, never dropped ──
    -- TEMPLATE-UPGRADE: runs FIRST, so a back-link the new version names (inverseKey) is never shadowed by the
    -- hand-kept mirror column it replaces while the new roll-ups are declared.
    for v_f in select o.table_ref, o.key, f.id as field_id, coalesce(f.data ->> 'label', o.key) as label
                 from (select distinct p.table_ref, p.key from custom._template_plan_fields(v_old.plan) p) o
                 join custom.record f
                   on f.organization_id = p_organization_id and f.table_id = custom.field_kernel_id() and f.deleted_at is null
                  and f.data ->> 'entity_definition_id' = v_pre ->> ('ref:' || o.table_ref) and f.data ->> 'key' = o.key
                where v_pre ? ('ref:' || o.table_ref)
                  and not exists (select 1 from custom._template_plan_fields(v_t.plan) n where n.table_ref = o.table_ref and n.key = o.key) loop
      begin
        -- TEMPLATE-UPGRADE: A LINK THE NEW VERSION TURNS AROUND. The older version kept the link on this table (a
        -- hand-kept list, e.g. release.fixes -> bugs); the new one keeps it on the other table (bug.release) and names
        -- this side by its back-link (inverseKey "fixes"). Remembered here, its links copied once the new link exists.
        select jsonb_build_object('a_table', v_pre ->> ('ref:' || v_f.table_ref), 'a_key', v_f.key, 'b_ref', n.table_ref, 'b_key', n.key)
          into v_fl
          from custom._template_plan_fields(v_old.plan) o
          join custom._template_plan_fields(v_t.plan) n
            on n.door = 'field_declare' and n.spec ->> 'type' = 'relation'
           and n.spec ->> 'inverse_key' = v_f.key
           and n.spec ->> 'relation_target' = '${ref:' || v_f.table_ref || '}'
           and o.spec ->> 'relation_target' = '${ref:' || n.table_ref || '}'
         where o.table_ref = v_f.table_ref and o.key = v_f.key and o.spec ->> 'type' = 'relation'
         limit 1;
        if v_fl is not null then
          v_flips := v_flips || jsonb_build_array(v_fl);
          v_fl := null;
        end if;
        perform custom.field_retire(p_organization_id, v_f.field_id);
        v_counts := jsonb_set(v_counts, '{fields_retired}', to_jsonb(coalesce((v_counts ->> 'fields_retired')::integer, 0) + 1));
        v_ids := v_ids || jsonb_build_object('retired:fields.' || substr(v_f.table_ref, 8) || '.' || v_f.key, v_f.field_id);
      exception when others then
        get stacked diagnostics v_msg = message_text;
        v_skipped := v_skipped || jsonb_build_array(jsonb_build_object('kind', 'field', 'ref', v_f.table_ref || '.' || v_f.key,
          'reason', format('Version %s no longer has "%s", and it was kept: %s', v_t.template_version, v_f.label, v_msg)));
      end;
    end loop;

    -- ── PASS 2: a column the new version gives a table the install already has (inline in its table step) ──
    -- TEMPLATE-UPGRADE: runs before PASS 1, whose views and buttons may name the new column.
    for v_f in select n.table_ref, n.key, n.spec
                 from custom._template_plan_fields(v_t.plan) n
                where n.door = 'table_from_example' and v_pre ? ('ref:' || n.table_ref)
                  and not exists (select 1 from custom._template_plan_fields(v_old.plan) o where o.table_ref = n.table_ref and o.key = n.key)
                  and not exists (select 1 from custom._template_plan_fields(v_t.plan) d where d.door = 'field_declare' and d.table_ref = n.table_ref and d.key = n.key)
                  and coalesce(n.spec ->> 'parityType', n.spec ->> 'type', '') <> 'relation' loop
      v_table := (v_pre ->> ('ref:' || v_f.table_ref))::uuid;
      if exists (select 1 from custom.record f where f.organization_id = p_organization_id and f.table_id = custom.field_kernel_id()
                    and f.deleted_at is null and f.data ->> 'entity_definition_id' = v_table::text and f.data ->> 'key' = v_f.key) then
        continue;
      end if;
      begin
        -- TEMPLATE-UPGRADE (e): the same builder a fresh install uses (custom.table_from_example), so every setting the
        -- version declares on the column (status groups, a button, a formula, a roll-up's via/agg, …) lands.
        perform custom.field_declare(p_organization_id, v_table, custom._example_field_spec(v_f.spec));
        v_counts := jsonb_set(v_counts, '{fields}', to_jsonb(coalesce((v_counts ->> 'fields')::integer, 0) + 1));
      exception when others then
        get stacked diagnostics v_msg = message_text;
        v_skipped := v_skipped || jsonb_build_array(jsonb_build_object('kind', 'field', 'ref', v_f.table_ref || '.' || v_f.key, 'reason', v_msg));
      end;
    end loop;

    -- ── PASS 2b (TEMPLATE-UPGRADE): a column the new version RENAMES takes the new name, only where it still carries
    --            the older version's name (a name the organization gave it is theirs). Formulas name columns by label. ──
    for v_f in select distinct on (f.id) f.id as field_id, n.spec ->> 'label' as label
                 from custom._template_plan_fields(v_t.plan) n
                 join custom._template_plan_fields(v_old.plan) o on o.table_ref = n.table_ref and o.key = n.key
                 join custom.record f
                   on f.organization_id = p_organization_id and f.table_id = custom.field_kernel_id() and f.deleted_at is null
                  and f.data ->> 'entity_definition_id' = v_pre ->> ('ref:' || n.table_ref) and f.data ->> 'key' = n.key
                where v_pre ? ('ref:' || n.table_ref)
                  and nullif(n.spec ->> 'label', '') is not null and o.spec ->> 'label' is distinct from n.spec ->> 'label'
                  and f.data ->> 'label' = o.spec ->> 'label' loop
      begin
        perform custom.field_update(p_organization_id, v_f.field_id, jsonb_build_object('label', v_f.label));
        v_counts := jsonb_set(v_counts, '{fields_renamed}', to_jsonb(coalesce((v_counts ->> 'fields_renamed')::integer, 0) + 1));
      exception when others then
        get stacked diagnostics v_msg = message_text;
        v_skipped := v_skipped || jsonb_build_array(jsonb_build_object('kind', 'field', 'ref', v_f.field_id,
          'reason', format('It keeps its name; "%s" was refused: %s', v_f.label, v_msg)));
      end;
    end loop;

    -- ── PASS 1: every step of the new version the install does not already have ──
    for v_k in 0 .. v_n - 1 loop
      v_at := v_k;
      v_step := v_steps -> v_k;
      -- TEMPLATE-UPGRADE (2026-10-17): A COLUMN THE INSTALL ALREADY HAS IS BOUND FROM THE INSTALL. A newer version
      -- names a column by ${ref:fields.<table>.<key>} that an older install never saved (an inline column of a
      -- table step, saved at install only by an applicable_fields read, or one an older plan never named). The
      -- live column of that key on the install's own table is that column; bind it before anything resolves.
      for v_name in select distinct (regexp_matches((v_step -> 'args')::text, '\$\{ref:(fields\.[^}]+)\}', 'g'))[1] loop
        if not v_ids ? ('ref:' || v_name) then
          v_bind := regexp_match(v_name, '^fields\.([^.]+)\.(.+)$');
          if v_bind is not null and v_ids ? ('ref:tables.' || v_bind[1]) then
            select f.id into v_hit
              from custom.record f
             where f.organization_id = p_organization_id and f.table_id = custom.field_kernel_id()
               and f.data_class = 'field' and f.deleted_at is null
               and f.data ->> 'entity_definition_id' = v_ids ->> ('ref:tables.' || v_bind[1]) and f.data ->> 'key' = v_bind[2]
             limit 1;
            if v_hit is not null then
              v_ids := v_ids || jsonb_build_object('ref:' || v_name, v_hit);
            end if;
          end if;
        end if;
      end loop;
      v_refs := array(select m ->> 'ref' from jsonb_array_elements(coalesce(v_step -> 'made', '[]'::jsonb)) m
                      union select k from jsonb_object_keys(coalesce(v_step -> 'save', '{}'::jsonb)) k);
      v_tref := case when v_step #>> '{args,p_table_id}' ~ '^\$\{ref:.*\}$'
                     then regexp_replace(v_step #>> '{args,p_table_id}', '^\$\{ref:(.*)\}$', '\1') end;

      -- TEMPLATE-UPGRADE (f): A TABLE THE ORGANIZATION REMOVED STAYS REMOVED. A step naming a table the install made
      -- that is no longer a live table here (archived, moved away) is left out, and the upgrade says which.
      select string_agg(distinct r, ', ') into v_msg
        from (select (regexp_matches((v_step -> 'args')::text, '\$\{ref:(tables\.[^}]+)\}', 'g'))[1] as r) x
       where v_pre ? ('ref:' || r)
         and not exists (select 1 from custom.record t
                          where t.organization_id = p_organization_id and t.table_id = custom.table_kernel_id()
                            and t.deleted_at is null and t.id = platform.uuid_or_null(v_pre ->> ('ref:' || r)));
      if v_msg is not null then
        v_skipped := v_skipped || jsonb_build_array(jsonb_build_object('kind', 'step', 'ref', v_step ->> 'label',
          'reason', format('%s is no longer in this organization, so this step was left out.', v_msg)));
        v_msg := null;
        continue;
      end if;

      if cardinality(v_refs) = 0 and v_tref is null
         and not exists (select 1 from (select (regexp_matches((v_step -> 'args')::text, '\$\{ref:([^}]+)\}', 'g'))[1] as r) x
                          where not (v_pre ? ('ref:' || r)))
         and (v_step -> 'args')::text ~ '\$\{ref:' then
        -- TEMPLATE-UPGRADE (f): a step that records nothing, on things the install already had (publishing a form it
        -- made): it ran at install; running it again could act on something the organization has since changed.
        v_counts := jsonb_set(v_counts, '{kept}', to_jsonb(coalesce((v_counts ->> 'kept')::integer, 0) + 1));
        continue;
      end if;

      if cardinality(v_refs) = 0 then
        -- A step that records nothing (seed rows, a stage rule set): it runs only on a table this
        -- upgrade made. On a table the install already has, the rows there are the organization's own.
        -- TEMPLATE-UPGRADE: two such steps DO record something, through saveEach, and later steps name it:
        -- applicable_fields (a read: every column's id by key) and action_declare (row actions by name, which a
        -- button names). Both run on a table the install already has: the read changes nothing, and the actions
        -- are MERGED below (the table's own actions kept, only names it lacks added).
        if v_tref is not null and v_pre ? ('ref:' || v_tref)
           and not (v_step -> 'saveEach' is not null and v_step ->> 'door' in ('applicable_fields', 'action_declare')) then
          v_counts := jsonb_set(v_counts, '{kept}', to_jsonb(coalesce((v_counts ->> 'kept')::integer, 0) + 1));
          if v_step ->> 'door' not in ('record_write', 'record_write_many', 'record_change_many') then
            v_skipped := v_skipped || jsonb_build_array(jsonb_build_object('kind', 'step', 'ref', v_step ->> 'label',
              'reason', format('custom.%s on a table the install already has is not re-run: it records nothing, so running it again could make a second copy.', v_step ->> 'door')));
          end if;
          continue;
        end if;
      elsif not exists (select 1 from unnest(v_refs) r where not (v_ids ? ('ref:' || r)))
            and not (v_step ->> 'door' = 'field_declare' and v_tref is not null and v_pre ? ('ref:' || v_tref)) then
        v_counts := jsonb_set(v_counts, '{kept}', to_jsonb(coalesce((v_counts ->> 'kept')::integer, 0) + 1));
        continue;
      end if;
      -- TEMPLATE-UPGRADE: a field step the install already has still goes through the same-column check below, so
      -- what the new version ADDS to that column (status groups) lands and a renamed back-link is reported.
      v_present := not exists (select 1 from unnest(v_refs) r where not (v_ids ? ('ref:' || r)));

      -- A field step on a table the install already has, whose key is already a live column there.
      if v_step ->> 'door' = 'field_declare' and v_tref is not null and v_pre ? ('ref:' || v_tref) then
        v_table := (v_pre ->> ('ref:' || v_tref))::uuid;
        v_key := v_step #>> '{args,p_spec,key}';
        select f.id, f.data into v_live
          from custom.record f
         where f.organization_id = p_organization_id and f.table_id = custom.field_kernel_id()
           and f.data_class = 'field' and f.deleted_at is null
           and f.data ->> 'entity_definition_id' = v_table::text and f.data ->> 'key' = v_key
         limit 1;
        if found then
          v_new_type := coalesce(v_step #>> '{args,p_spec,type}', v_step #>> '{args,p_spec,parity_type}', 'text');
          -- TEMPLATE-UPGRADE: the same column is judged by what the store would KEEP for the new spec (a "select"
          -- or a "status" is kept as a choice list, a "number" as a range), not by the word the plan says.
          v_doc := null;
          begin
            v_doc := custom._field_document_for(p_organization_id, v_table,
                       custom._template_bind(v_step #> '{args,p_spec}', v_ids, p_organization_id, v_i.install_day, v_i.timezone));
          exception when others then
            v_doc := null;
          end;
          v_same := (v_live.data ->> 'type') = v_new_type
                    or (v_doc is not null and (v_live.data ->> 'type') = (v_doc ->> 'type')
                        and coalesce(v_live.data ->> 'parity_type', v_doc ->> 'parity_type', '') = coalesce(v_doc ->> 'parity_type', v_live.data ->> 'parity_type', '')
                        and coalesce((v_live.data ->> 'multi')::boolean, false) = coalesce((v_doc ->> 'multi')::boolean, false));
          if (v_live.data ->> 'type') = 'list' and v_new_type = 'relation' then
            v_queue := v_queue || jsonb_build_array(jsonb_build_object('step', v_k, 'table_ref', v_tref, 'key', v_key, 'field_id', v_live.id));
          elsif v_same then
            for v_name in select k from jsonb_object_keys(coalesce(v_step -> 'save', '{}'::jsonb)) k loop
              v_ids := v_ids || jsonb_build_object('ref:' || v_name, v_live.id);
            end loop;
            v_counts := jsonb_set(v_counts, '{kept}', to_jsonb(coalesce((v_counts ->> 'kept')::integer, 0) + 1));
            -- A choice list the new version gives status groups, where the column has none yet: the groups are
            -- added (custom.field_update merges them; a group the organization set is never replaced).
            if jsonb_typeof(v_step #> '{args,p_spec,status_groups}') = 'object'
               and coalesce(v_live.data -> 'config' -> 'status_groups', '{}'::jsonb) in ('{}'::jsonb, 'null'::jsonb) then
              perform custom.field_update(p_organization_id, v_live.id, jsonb_build_object('type', 'status', 'status_groups', v_step #> '{args,p_spec,status_groups}'));
              v_counts := jsonb_set(v_counts, '{fields_updated}', to_jsonb(coalesce((v_counts ->> 'fields_updated')::integer, 0) + 1));
            end if;
            -- A link the new version names differently on the other table (its back-link, inverseKey — the name that
            -- replaces a hand-kept mirror list there, which PASS 4 has already retired) takes the new name when nothing
            -- reads the old one there and the new one is free; otherwise it keeps its name and the upgrade says so.
            v_target := nullif(v_live.data ->> 'relation_target', '')::uuid;
            v_new_key := nullif(v_step #>> '{args,p_spec,inverse_key}', '');
            if (v_live.data ->> 'type') = 'relation' and v_new_key is not null
               and (v_live.data ->> 'inverse_key') is distinct from v_new_key
               and not exists (select 1 from custom.record f
                                where f.organization_id = p_organization_id and f.table_id = custom.field_kernel_id()
                                  and f.data_class = 'field' and f.deleted_at is null and f.id <> v_live.id
                                  and ((f.data ->> 'entity_definition_id' = v_target::text
                                        and (f.data ->> 'key' = v_new_key
                                             or coalesce(f.data -> 'config' ->> 'via', f.data ->> 'via') = (v_live.data ->> 'inverse_key')))
                                       or (f.data ->> 'type' = 'relation' and f.data ->> 'relation_target' = v_target::text
                                           and f.data ->> 'inverse_key' = v_new_key))) then
              update custom.record f
                 set data = jsonb_set(f.data, '{inverse_key}', to_jsonb(v_new_key)), version = f.version + 1, updated_at = now()
               where f.id = v_live.id;
              v_counts := jsonb_set(v_counts, '{links_renamed}', to_jsonb(coalesce((v_counts ->> 'links_renamed')::integer, 0) + 1));
            elsif (v_live.data ->> 'type') = 'relation' and v_new_key is not null
               and (v_live.data ->> 'inverse_key') is distinct from v_new_key then
              v_skipped := v_skipped || jsonb_build_array(jsonb_build_object('kind', 'field', 'ref', v_step ->> 'label',
                'reason', format('The link "%s" keeps its name "%s" on the table it points at; version %s calls it "%s".',
                                 coalesce(v_live.data ->> 'label', v_key), coalesce(v_live.data ->> 'inverse_key', ''), v_t.template_version,
                                 v_step #>> '{args,p_spec,inverse_key}')));
            end if;
          else
            -- Left as it is, and still the column of that key: later steps that name it get this one.
            for v_name in select k from jsonb_object_keys(coalesce(v_step -> 'save', '{}'::jsonb)) k loop
              v_ids := v_ids || jsonb_build_object('ref:' || v_name, v_live.id);
            end loop;
            v_skipped := v_skipped || jsonb_build_array(jsonb_build_object('kind', 'field', 'ref', v_step ->> 'label',
              'reason', format('The column "%s" is a %s here and a %s in version %s; only a choice list becoming a link is converted, so it was left as it is.',
                               coalesce(v_live.data ->> 'label', v_key), v_live.data ->> 'type', v_new_type, v_t.template_version)));
          end if;
          continue;
        elsif v_present and not exists (
                select 1 from custom.record f
                 where f.organization_id = p_organization_id and f.table_id = custom.field_kernel_id()
                   and f.data_class = 'field' and f.deleted_at = now()
                   and f.data ->> 'entity_definition_id' = v_table::text and f.data ->> 'key' = v_key) then
          -- The install made this column and it is gone now (the organization removed it): it stays gone. One
          -- retired by THIS upgrade (a roll-up over a link PASS 4 retired goes with it) is declared again below.
          v_counts := jsonb_set(v_counts, '{kept}', to_jsonb(coalesce((v_counts ->> 'kept')::integer, 0) + 1));
          continue;
        end if;
      end if;

      -- A new step: run exactly as custom.template_install runs it.
      for v_name in select distinct (regexp_matches((v_step -> 'args')::text, '\$\{new:([^}]+)\}', 'g'))[1] loop
        if not v_ids ? ('new:' || v_name) then
          v_ids := v_ids || jsonb_build_object('new:' || v_name, gen_random_uuid());
        end if;
      end loop;
      v_args := custom._template_bind(v_step -> 'args', v_ids, p_organization_id, v_i.install_day, v_i.timezone);
      v_args := custom._template_instance_args(v_step ->> 'door', v_args, v_i.instance_title, v_i.instance_no);  -- TEMPLATE-FRESH
      if v_step ->> 'door' = 'action_declare' and v_tref is not null and v_pre ? ('ref:' || v_tref) then
        -- The table's own actions stay as they are (ids kept); the version's actions it has no action of that name for are added.
        select coalesce(t.data -> 'row_actions', '[]'::jsonb) into v_have
          from custom.record t
         where t.organization_id = p_organization_id and t.id = (v_args ->> 'p_table_id')::uuid and t.table_id = custom.table_kernel_id();
        v_have := coalesce(v_have, '[]'::jsonb);
        v_args := jsonb_set(v_args, '{p_actions}', v_have || coalesce((
                    select jsonb_agg(a order by o) from jsonb_array_elements(coalesce(v_args -> 'p_actions', '[]'::jsonb)) with ordinality x(a, o)
                     where not exists (select 1 from jsonb_array_elements(v_have) h where lower(btrim(h ->> 'name')) = lower(btrim(a ->> 'name')))), '[]'::jsonb));
      end if;
      v_res := custom._template_call(v_step ->> 'door', v_args);
      for v_name, v_path in select key, value from jsonb_each(coalesce(v_step -> 'save', '{}'::jsonb)) loop
        if v_res #> array(select jsonb_array_elements_text(v_path)) is null
           or jsonb_typeof(v_res #> array(select jsonb_array_elements_text(v_path))) = 'null' then
          raise exception 'custom.% answered without the id the template saves as "%".', v_step ->> 'door', v_name using errcode = 'P0002';
        end if;
        v_ids := v_ids || jsonb_build_object('ref:' || v_name, v_res #>> array(select jsonb_array_elements_text(v_path)));
      end loop;
      v_each := v_step -> 'saveEach';
      if v_each is not null then
        for v_el in select x from jsonb_array_elements(coalesce(v_res #> array(select jsonb_array_elements_text(coalesce(v_each -> 'array', '[]'::jsonb))), '[]'::jsonb)) x loop
          if nullif(v_el #>> array(select jsonb_array_elements_text(v_each -> 'key')), '') is not null then
            v_ids := v_ids || jsonb_build_object('ref:' || (v_each ->> 'prefix') || (v_el #>> array(select jsonb_array_elements_text(v_each -> 'key'))),
                                                 v_el #>> array(select jsonb_array_elements_text(v_each -> 'value')));
          end if;
        end loop;
      end if;
      for v_m in select x from jsonb_array_elements(coalesce(v_step -> 'made', '[]'::jsonb)) x loop
        v_made := v_made || jsonb_build_array(jsonb_build_object(
          'kind', v_m ->> 'kind', 'ref', v_m ->> 'ref', 'title', v_m ->> 'title', 'step', v_k,
          'id', v_ids ->> ('ref:' || (v_m ->> 'ref')),
          'table_id', case when v_m ? 'table' then v_ids ->> ('ref:' || (v_m ->> 'table')) end));
        v_counts := jsonb_set(v_counts, array[(v_m ->> 'kind') || 's'], to_jsonb(coalesce((v_counts ->> ((v_m ->> 'kind') || 's'))::integer, 0) + 1));
      end loop;
      if v_step ->> 'door' in ('record_write_many') then
        v_counts := jsonb_set(v_counts, '{rows}', to_jsonb(coalesce((v_counts ->> 'rows')::integer, 0) + jsonb_array_length(coalesce(v_step #> '{args,p_rows}', '[]'::jsonb))));
      elsif v_step ->> 'door' = 'record_write' and v_step -> 'made' is null then
        v_counts := jsonb_set(v_counts, '{rows}', to_jsonb(coalesce((v_counts ->> 'rows')::integer, 0) + 1));
      end if;
    end loop;
    v_k := -1;
    v_at := -1;

    -- ── PASS 1b: a link the new version turns around keeps every link: each record the old list named now
    --            points back at the record that listed it (first one wins where the new link holds one). ──
    for v_fl in select x from jsonb_array_elements(v_flips) x loop
      v_b_table := (v_ids ->> ('ref:' || (v_fl ->> 'b_ref')))::uuid;
      v_key := v_fl ->> 'b_key';
      select coalesce(nullif(f.data ->> 'relation_max', '')::integer, case when (f.data ->> 'multi')::boolean then 0 else 1 end) into v_max
        from custom.record f
       where f.organization_id = p_organization_id and f.table_id = custom.field_kernel_id() and f.deleted_at is null
         and f.data ->> 'entity_definition_id' = v_b_table::text and f.data ->> 'key' = v_key
       limit 1;
      if v_max is null then
        continue;
      end if;
      v_changes := '[]'::jsonb;
      for v_row in
        select b.id, b.version, b.data -> v_key as have,
               jsonb_agg(to_jsonb(a.id::text) order by a.created_at, a.id) as listed_by
          from custom.record a
          cross join lateral jsonb_array_elements_text(case jsonb_typeof(a.data -> (v_fl ->> 'a_key'))
                                                       when 'array' then a.data -> (v_fl ->> 'a_key')
                                                       when 'string' then jsonb_build_array(a.data -> (v_fl ->> 'a_key'))
                                                       else '[]'::jsonb end) l(bid)
          join custom.record b
            on b.organization_id = p_organization_id and b.table_id = v_b_table and b.deleted_at is null
           and b.id = platform.uuid_or_null(l.bid)
         where a.organization_id = p_organization_id and a.table_id = (v_fl ->> 'a_table')::uuid and a.deleted_at is null
         group by b.id, b.version, b.data -> v_key loop
        if v_row.have is not null and jsonb_typeof(v_row.have) <> 'null' and v_row.have <> '[]'::jsonb then
          continue;   -- a link the organization already set is never replaced
        end if;
        if v_max = 1 and jsonb_array_length(v_row.listed_by) > 1 then
          v_skipped := v_skipped || jsonb_build_array(jsonb_build_object('kind', 'value', 'ref', v_row.id,
            'reason', format('%s records listed this one and "%s" holds one; it points at the first, and the retired column still holds every one.',
                             jsonb_array_length(v_row.listed_by), v_key)));
        end if;
        v_changes := v_changes || jsonb_build_array(jsonb_build_object('op', 'update', 'record_id', v_row.id, 'expected_version', v_row.version,
                       'patch', jsonb_build_object(v_key, case when v_max = 1 then v_row.listed_by -> 0 else v_row.listed_by end)));
        v_counts := jsonb_set(v_counts, '{links}', to_jsonb(coalesce((v_counts ->> 'links')::integer, 0) + 1));
        if jsonb_array_length(v_changes) >= 100 then
          perform custom.record_change_many(p_organization_id, v_b_table, v_changes);
          v_changes := '[]'::jsonb;
        end if;
      end loop;
      if jsonb_array_length(v_changes) > 0 then
        perform custom.record_change_many(p_organization_id, v_b_table, v_changes);
      end if;
    end loop;

    -- ── PASS 3: a choice list that became a link. New column, every value linked by title, old column retired. ──
    for v_q in select x from jsonb_array_elements(v_queue) x loop
      v_k := (v_q ->> 'step')::integer;
      v_at := v_k;
      v_step := v_steps -> v_k;
      v_table := (v_ids ->> ('ref:' || (v_q ->> 'table_ref')))::uuid;
      v_key := v_q ->> 'key';
      v_old_fid := (v_q ->> 'field_id')::uuid;
      select f.data -> 'sort', nullif(f.data -> 'config' ->> 'options_table_id', '')::uuid into v_old_sort, v_opts
        from custom.record f where f.id = v_old_fid;
      v_choices := case when v_opts is null then '{}'::jsonb else custom.choice_options(p_organization_id, v_opts) end;
      v_spec := custom._template_bind(v_step #> '{args,p_spec}', v_ids, p_organization_id, v_i.install_day, v_i.timezone);
      v_target := nullif(coalesce(v_spec ->> 'relation_target', v_spec ->> 'target_table'), '')::uuid;
      select t.data ->> 'title_field' into v_title from custom.record t
       where t.organization_id = p_organization_id and t.id = v_target and t.table_id = custom.table_kernel_id() and t.deleted_at is null;
      if v_title is null then
        raise exception 'The table "%" links to has no title column, so its values cannot be matched by title.', v_key using errcode = '23514';
      end if;
      v_max := coalesce(nullif(v_spec ->> 'relation_max', '')::integer, 1);

      -- The new column's key is one no column of this table has ever held: the old column keeps its
      -- key and its values under every record, so restoring it shows exactly what it showed.
      v_seq := 2;
      loop
        v_new_key := left(v_key, 44) || '_' || v_seq;
        exit when not exists (select 1 from custom.record f where f.organization_id = p_organization_id and f.table_id = custom.field_kernel_id()
                                 and f.data ->> 'entity_definition_id' = v_table::text and f.data ->> 'key' = v_new_key)
              and not exists (select 1 from custom.record t, jsonb_array_elements(coalesce(t.data -> 'fields', '[]'::jsonb)) e
                               where t.id = v_table and e ->> 'name' = v_new_key);
        v_seq := v_seq + 1;
      end loop;

      -- The old column is retired first (one transaction: nothing lands unless everything does), so the
      -- new column can carry the same name; field_retire archives it, it is never dropped.
      perform custom.field_retire(p_organization_id, v_old_fid);
      v_new_fid := custom.field_declare(p_organization_id, v_table,
                     v_spec || jsonb_build_object('key', v_new_key) || case when v_old_sort is not null then jsonb_build_object('sort', v_old_sort) else '{}'::jsonb end);
      v_counts := jsonb_set(v_counts, '{fields_converted}', to_jsonb(coalesce((v_counts ->> 'fields_converted')::integer, 0) + 1));
      v_counts := jsonb_set(v_counts, '{fields_retired}', to_jsonb(coalesce((v_counts ->> 'fields_retired')::integer, 0) + 1));

      -- Every live row's choice → its label → the target record with that title (case-insensitive), made when missing.
      v_map := '{}'::jsonb;
      v_changes := '[]'::jsonb;
      for v_row in select r.id, r.version, r.data -> v_key as val
                     from custom.record r
                    where r.organization_id = p_organization_id and r.table_id = v_table and r.deleted_at is null
                      and r.data ? v_key and jsonb_typeof(r.data -> v_key) <> 'null'
                    order by r.created_at, r.id loop
        v_vals := case when jsonb_typeof(v_row.val) = 'array' then v_row.val else jsonb_build_array(v_row.val) end;
        v_labels := array(select coalesce(v_choices -> (e #>> '{}') ->> 'label', e #>> '{}')
                            from jsonb_array_elements(v_vals) with ordinality a(e, o)
                           where nullif(btrim(e #>> '{}'), '') is not null order by o);
        v_links := '[]'::jsonb;
        foreach v_label in array v_labels loop
          v_hit := (v_map ->> lower(btrim(v_label)))::uuid;
          if v_hit is null then
            select t.id into v_hit from custom.record t
             where t.organization_id = p_organization_id and t.table_id = v_target and t.deleted_at is null
               and lower(btrim(t.data ->> v_title)) = lower(btrim(v_label))
             order by t.created_at, t.id limit 1;
            if v_hit is null then
              v_hit := (custom.record_write_many(p_organization_id, v_target,
                          array[jsonb_build_object(v_title, btrim(v_label), '_actor', 'user')], array[gen_random_uuid()]))[1];
              v_counts := jsonb_set(v_counts, '{targets_created}', to_jsonb(coalesce((v_counts ->> 'targets_created')::integer, 0) + 1));
            end if;
            v_map := v_map || jsonb_build_object(lower(btrim(v_label)), v_hit);
          end if;
          if not v_links @> jsonb_build_array(v_hit) then
            v_links := v_links || jsonb_build_array(v_hit);
          end if;
        end loop;
        if jsonb_array_length(v_links) = 0 then
          continue;
        end if;
        if jsonb_array_length(v_links) > v_max then
          v_skipped := v_skipped || jsonb_build_array(jsonb_build_object('kind', 'value', 'ref', v_row.id,
            'reason', format('The row held %s choices and the link holds %s; the first %s were linked and every choice is still in the retired column.',
                             jsonb_array_length(v_links), v_max, v_max)));
          v_links := (select jsonb_agg(l) from (select l from jsonb_array_elements(v_links) with ordinality a(l, o) order by o limit v_max) z);
        end if;
        v_changes := v_changes || jsonb_build_array(jsonb_build_object('op', 'update', 'record_id', v_row.id, 'expected_version', v_row.version,
                       'patch', jsonb_build_object(v_new_key, case when v_max = 1 then v_links -> 0 else v_links end)));
        v_counts := jsonb_set(v_counts, '{links}', to_jsonb(coalesce((v_counts ->> 'links')::integer, 0) + jsonb_array_length(v_links)));
        if jsonb_array_length(v_changes) >= 100 then
          perform custom.record_change_many(p_organization_id, v_table, v_changes);
          v_changes := '[]'::jsonb;
        end if;
      end loop;
      if jsonb_array_length(v_changes) > 0 then
        perform custom.record_change_many(p_organization_id, v_table, v_changes);
      end if;

      for v_name in select k from jsonb_object_keys(coalesce(v_step -> 'save', '{}'::jsonb)) k loop
        v_ids := v_ids || jsonb_build_object('ref:' || v_name, v_new_fid, 'retired:' || v_name, v_old_fid);
      end loop;
      for v_m in select x from jsonb_array_elements(coalesce(v_step -> 'made', '[]'::jsonb)) x loop
        v_made := v_made || jsonb_build_array(jsonb_build_object(
          'kind', v_m ->> 'kind', 'ref', v_m ->> 'ref', 'title', v_m ->> 'title', 'step', v_k,
          'id', v_new_fid, 'table_id', v_table));
      end loop;
    end loop;
    v_k := -1;
    v_at := -1;

    -- ── PASS 5: a seed row the install already has takes the new version's row icon, only where it
    --           has none — an icon the person set is never overwritten. ──
    for v_f in select (v_ids ->> ('ref:' || regexp_replace(s.x #>> '{args,p_table_id}', '^\$\{ref:(.*)\}$', '\1')))::uuid as table_id,
                      jsonb_agg(jsonb_build_object('op', 'update', 'record_id', r.id, 'expected_version', r.version,
                                                   'patch', jsonb_build_object('icon', btrim(w.v ->> 'icon')))) as changes
                 from jsonb_array_elements(v_steps) with ordinality s(x, n)
                 cross join lateral jsonb_array_elements(coalesce(s.x #> '{args,p_rows}', '[]'::jsonb)) with ordinality w(v, o)
                 join custom.record r
                   on r.organization_id = p_organization_id and r.deleted_at is null
                  and r.id = platform.uuid_or_null(v_ids ->> regexp_replace(s.x #>> array['args', 'p_ids', (w.o - 1)::text], '^\$\{(new:[^}]+)\}$', '\1'))
                  and r.table_id = platform.uuid_or_null(v_ids ->> ('ref:' || regexp_replace(s.x #>> '{args,p_table_id}', '^\$\{ref:(.*)\}$', '\1')))
                where s.x ->> 'door' = 'record_write_many'
                  and nullif(btrim(w.v ->> 'icon'), '') is not null
                  and nullif(btrim(r.data ->> 'icon'), '') is null
                group by s.n, 1 loop
      perform custom.record_change_many(p_organization_id, v_f.table_id, v_f.changes);
      v_counts := jsonb_set(v_counts, '{icons}', to_jsonb(coalesce((v_counts ->> 'icons')::integer, 0) + jsonb_array_length(v_f.changes)));
    end loop;

    update custom.template_install i
       set template_id = v_t.id, template_version = v_t.template_version, next_step = v_n,
           ids = v_ids, made = v_made, refusal = null,
           ms = i.ms + (extract(epoch from clock_timestamp() - v_t0) * 1000)::integer,
           calls = i.calls + 1, updated_at = now()
     where i.id = v_i.id
    returning * into v_i;
  exception when others then
    -- Everything this call did is rolled back: the install stays exactly as it was, on its old version.
    get stacked diagnostics v_msg = message_text, v_code = returned_sqlstate, v_hint = pg_exception_hint, v_detail = pg_exception_detail, v_where = pg_exception_context;
    return custom._template_answer(v_i, jsonb_build_object(
             'ok', false, 'upgraded', false, 'from_version', v_i.template_version, 'to_version', v_t.template_version,
             'counts', '{}'::jsonb, 'skipped', '[]'::jsonb,
             'refusal', jsonb_build_object('step', case when v_at >= 0 then v_at end,
                                           'label', case when v_at >= 0 then v_steps -> v_at ->> 'label' end,
                                           'door', case when v_at >= 0 then 'custom.' || (v_steps -> v_at ->> 'door') else 'custom.template_upgrade' end,
                                           'code', v_code, 'message', v_msg, 'hint', nullif(v_hint, ''), 'detail', nullif(v_detail, ''),
                                           'where', left(nullif(v_where, ''), 2000))));
  end;

  return custom._template_answer(v_i, jsonb_build_object(
           'upgraded', true, 'from_version', coalesce(v_old.template_version, 0), 'to_version', v_t.template_version,
           'counts', v_counts, 'skipped', v_skipped,
           'this_call_ms', (extract(epoch from clock_timestamp() - v_t0) * 1000)::integer));
end;
$function$;

CREATE OR REPLACE FUNCTION custom.template_restore(p_organization_id uuid, p_install_id uuid, p_budget_ms integer DEFAULT 4000)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
 SET statement_timeout TO '90s'
AS $function$
declare
  v_i        custom.template_install;
  v_a        jsonb;
  v_id       uuid;
  v_tbl      uuid;
  v_kind     text;
  v_title    text;
  v_left     jsonb;
  v_next     jsonb;
  v_progress boolean;
  v_t0       timestamptz := clock_timestamp();
  v_budget   integer := least(greatest(coalesce(p_budget_ms, 4000), 0), 600000);
  v_out      boolean := false;
  v_msg      text;
  v_code     text;
  v_hint     text;
  v_refusal  jsonb;
  v_slug     text;
  v_new_slug text;
  v_n        integer;
begin
  perform custom.assert_store_door(p_organization_id, 'custom.template_restore');
  perform custom.assert_client_may_reach(p_organization_id, 'custom.template_restore');
  select * into v_i from custom.template_install i
   where i.id = p_install_id and i.organization_id = p_organization_id for update;
  if not found then
    raise exception 'There is no such install in this organization.' using errcode = 'P0002';
  end if;
  if v_i.state not in ('uninstalled', 'uninstalling') then
    return custom._template_answer(v_i, jsonb_build_object('already', true));
  end if;
  if exists (select 1 from custom.template_install o
              where o.organization_id = p_organization_id and o.catalogue_id = v_i.catalogue_id
                and o.state <> 'uninstalled' and o.id <> v_i.id
                and o.instance_no is not distinct from v_i.instance_no) then  -- TEMPLATE-FRESH: per instance
    raise exception 'This template has been installed again since, so the earlier install cannot be brought back beside it.' using errcode = '55000';
  end if;

  -- `archived` lists newest-archived first; restore runs the other way (the Home before its tables).
  select coalesce(jsonb_agg(x order by n desc), '[]'::jsonb) into v_left
    from jsonb_array_elements(v_i.archived) with ordinality as e(x, n);

  loop
    v_progress := false;
    v_next := '[]'::jsonb;
    v_refusal := null;
    for v_a in select x from jsonb_array_elements(v_left) x loop
      if v_out or extract(epoch from clock_timestamp() - v_t0) * 1000 > v_budget then
        v_out := true;
        v_next := v_next || jsonb_build_array(v_a);
        continue;
      end if;
      v_kind := v_a ->> 'kind';
      v_id := (v_a ->> 'id')::uuid;
      v_title := v_a ->> 'title';
      begin
        case v_kind
          when 'table', 'record' then
            if exists (select 1 from custom.record r where r.organization_id = p_organization_id and r.id = v_id and r.deleted_at is not null) then
              perform custom.record_restore(p_organization_id, v_id);
            end if;
          when 'dashboard' then perform custom.dashboard_restore(p_organization_id, v_id);
          when 'document' then perform custom.doc_template_restore(p_organization_id, v_id);
          when 'portal' then perform custom.portal_restore(p_organization_id, v_id, v_title);
          when 'form' then
            select f.table_id, f.slug into v_tbl, v_slug from custom.anon_form f where f.organization_id = p_organization_id and f.id = v_id;
            perform custom.assert_client_may_change(p_organization_id, v_tbl, 'custom.template_restore');
            -- TEMPLATE-INSTALL-3: a form made since owns this link name (a later install of a template with the same
            -- form): the restored form comes back under the first free `<slug>-<n>`, never refused for it.
            v_n := 1;
            v_new_slug := v_slug;
            while v_new_slug is not null and exists (select 1 from custom.anon_form o
                                                       where o.organization_id = p_organization_id and o.slug = v_new_slug
                                                         and o.deleted_at is null and o.id <> v_id) loop
              v_n := v_n + 1;
              v_new_slug := v_slug || '-' || v_n;
            end loop;
            update custom.anon_form f set deleted_at = null, slug = v_new_slug, updated_at = now(), updated_by = auth.uid()
             where f.organization_id = p_organization_id and f.id = v_id;
          when 'view' then
            select v.subject_id into v_tbl from platform.saved_view v where v.organization_id = p_organization_id and v.id = v_id;
            perform custom.assert_client_may_change(p_organization_id, v_tbl, 'custom.template_restore');
            update platform.saved_view v set deleted_at = null, updated_at = now(), updated_by = auth.uid()
             where v.organization_id = p_organization_id and v.id = v_id;
          when 'applet' then
            update app.definition a set status = 'draft', deleted_at = null, updated_at = now()
             where a.id = v_id and a.organization_id = p_organization_id;
          else null;
        end case;
        v_progress := true;
      exception when others then
        get stacked diagnostics v_msg = message_text, v_code = returned_sqlstate, v_hint = pg_exception_hint;
        -- TEMPLATE-INSTALL-3: the refusal answered is the CAUSE: a table's (or record's) refusal is kept over that of
        -- a dashboard, view or form that only waits for the table (it said "counts a table that is archived").
        if v_refusal is null or v_kind in ('table', 'record') or (v_refusal ->> 'kind') not in ('table', 'record') then
          v_refusal := jsonb_build_object('kind', v_kind, 'id', v_id, 'title', v_title, 'code', v_code,
                                          'message', v_msg, 'hint', nullif(v_hint, ''));
        end if;
        v_next := v_next || jsonb_build_array(v_a);
      end;
    end loop;
    v_left := v_next;
    exit when v_out or not v_progress or jsonb_array_length(v_left) = 0;
  end loop;

  -- Back in `archived` order (newest first), so a later call or uninstall reads it the same way.
  select coalesce(jsonb_agg(x order by n desc), '[]'::jsonb) into v_left
    from jsonb_array_elements(v_left) with ordinality as e(x, n);
  update custom.template_install i
     set archived = v_left,
         state = case when jsonb_array_length(v_left) = 0 then 'installed' else i.state end,
         uninstalled_at = case when jsonb_array_length(v_left) = 0 then null else i.uninstalled_at end,
         uninstalled_by = case when jsonb_array_length(v_left) = 0 then null else i.uninstalled_by end,
         updated_at = now()
   where i.id = v_i.id
  returning * into v_i;
  return custom._template_answer(v_i, jsonb_build_object(
           'restored', jsonb_array_length(v_left) = 0,
           'done', jsonb_array_length(v_left) = 0,
           'waiting', jsonb_array_length(v_left),
           'refusal', case when not v_out and jsonb_array_length(v_left) > 0 then v_refusal end));
end;
$function$;

CREATE OR REPLACE FUNCTION custom._template_answer(p_install custom.template_install, p_extra jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
  select jsonb_build_object(
    'install_id', p_install.id,
    'organization_id', p_install.organization_id,
    'template_id', p_install.template_id,
    'catalogue_id', p_install.catalogue_id,
    'version', p_install.template_version,
    'state', p_install.state,
    'ok', p_install.state in ('installing', 'installed', 'uninstalling', 'uninstalled'),
    'done', p_install.state in ('installed', 'uninstalled'),
    'next_step', p_install.next_step,
    'made', p_install.made,
    'archived', p_install.archived,
    'refusal', p_install.refusal,
    'install_day', p_install.install_day,
    'ms', p_install.ms,
    'calls', p_install.calls,
    -- CHAIR-TEMPLATE-UPGRADE (2026-10-06): ONE agent shape for every door of the family.
    'agent', custom._template_agent(p_install),
    'host', (select jsonb_build_object(
                      'extra_agents', t.plan -> 'extraAgents',
                      'workflows', t.plan -> 'workflows',
                      'ids', coalesce((select jsonb_object_agg(substr(e.key, 5), e.value)
                                         from jsonb_each(p_install.ids) e
                                        where e.key like 'ref:tables.%' or e.key like 'new:row.%'), '{}'::jsonb))
               from custom.template t
              where t.id = p_install.template_id
                and (t.plan ? 'extraAgents' or t.plan ? 'workflows'
                     or jsonb_path_exists(t.plan, '$.agent.bindings[*].binding'))),
    'show', (select jsonb_strip_nulls(jsonb_build_object(
                      'guide', t.spec -> 'guide',
                      'agent_name', t.spec #>> '{agent,name}',
                      'agent_question', t.spec #>> '{agent,question,ask}',
                      'agent_try_it', t.spec #> '{agent,tryIt}',
                      'unrecorded', (select jsonb_agg(jsonb_build_object(
                                       'kind', x ->> 'kind', 'title', coalesce(x ->> 'name', x ->> 'token'),
                                       'ref', (x ->> 'kind') || '.' || coalesce(x ->> 'token', ''),
                                       'table_id', p_install.ids ->> ('ref:tables.' || (x ->> 'table'))))
                                       from jsonb_array_elements(coalesce(t.spec -> 'extras', '[]'::jsonb)) x
                                      where x ->> 'kind' = 'stage_rules')))
               from custom.template t where t.id = p_install.template_id))
  -- TEMPLATE-FRESH: a fresh copy says which one it is (the default install answers exactly as before).
  || case when p_install.instance_no is not null then
       jsonb_build_object('instance', jsonb_build_object('no', p_install.instance_no, 'title', p_install.instance_title,
                                                          'mode', 'fresh', 'suffix', ' · ' || p_install.instance_title))
     else '{}'::jsonb end
  || coalesce(p_extra, '{}'::jsonb)
$function$;

CREATE OR REPLACE FUNCTION custom._template_agent(p_install custom.template_install)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
  -- Only a finished install has an agent to answer (as a fresh install always said): its platform
  -- agent, its name, whether the host has copied it (an `agent` entry in `made`), and every binding
  -- with the table it binds resolved from the install's id map.
  select case when p_install.state = 'installed' then
           (select jsonb_build_object(
                     'platform_agent', t.plan -> 'agent' -> 'platformAgent',
                     'name', (t.plan -> 'agent' ->> 'name') || coalesce(' · ' || p_install.instance_title, ''),
                     'bindings', coalesce((select jsonb_agg(b || jsonb_build_object('table_id', p_install.ids ->> ('ref:tables.' || (b ->> 'tableToken'))) order by o)
                                             from jsonb_array_elements(coalesce(t.plan -> 'agent' -> 'bindings', '[]'::jsonb)) with ordinality x(b, o)), '[]'::jsonb),
                     'copied', exists (select 1 from jsonb_array_elements(coalesce(p_install.made, '[]'::jsonb)) m where m ->> 'kind' = 'agent'))
              from custom.template t
             where t.id = p_install.template_id and t.plan ? 'agent')
         end
$function$;

CREATE OR REPLACE FUNCTION custom.space_templates(p_filter jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  f        jsonb := coalesce(p_filter, '{}'::jsonb);
  v_me     uuid := auth.uid();
  v_inst   uuid := nullif(f ->> 'installed_in', '')::uuid;
  v_id     uuid := nullif(f ->> 'id', '')::uuid;
  v_out    jsonb;
begin
  if v_me is null then
    raise exception 'Sign in to see the Spaces templates.' using errcode = '42501';
  end if;
  if v_inst is not null and not iam.has_org_access(v_inst) then
    v_inst := null;
  end if;

  with latest as (
    select distinct on (t.organization_id, t.catalogue_id) t.*
      from custom.template t
     where t.retired_at is null
       and not t.ephemeral
       and t.card ? 'space'
       and (t.scope = 'platform' or iam.has_org_access(t.organization_id))
       and (v_id is null or t.id = v_id)
     order by t.organization_id, t.catalogue_id, t.template_version desc
  )
  select coalesce(jsonb_agg(
           jsonb_build_object(
             'id', l.id, 'catalogue_id', l.catalogue_id, 'version', l.template_version, 'scope', l.scope,
             'owner_organization_id', case when l.scope = 'platform' then null else l.organization_id end,
             'space', l.card -> 'space', 'footprint', l.card -> 'footprint', 'updated_at', l.updated_at,
             'installed', case when v_inst is null then null else
               (select jsonb_build_object('install_id', i.id, 'state', i.state, 'version', i.template_version)
                  from custom.template_install i
                 where i.organization_id = v_inst and i.catalogue_id = l.catalogue_id and i.state <> 'uninstalled' and i.instance_no is null)
             end)
           || case when v_id is null then '{}'::jsonb
                   else jsonb_build_object('spec', l.spec - 'spacePack', 'pack', l.spec -> 'spacePack') end
           order by l.card -> 'space' ->> 'title', l.catalogue_id), '[]'::jsonb)
    into v_out
    from latest l;

  return jsonb_build_object('cards', v_out);
end;
$function$;

CREATE OR REPLACE FUNCTION custom.templates(p_filter jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  f          jsonb := coalesce(p_filter, '{}'::jsonb);
  v_me       uuid := auth.uid();
  v_scope    text := coalesce(nullif(f ->> 'scope', ''), 'all');
  v_org      uuid := nullif(f ->> 'organization_id', '')::uuid;
  v_inst     uuid := nullif(f ->> 'installed_in', '')::uuid;
  v_limit    integer := least(greatest(coalesce((f ->> 'limit')::integer, 60), 1), 200);
  v_offset   integer := greatest(coalesce((f ->> 'offset')::integer, 0), 0);
  v_q        text := nullif(btrim(f ->> 'q'), '');
  v_id       uuid := nullif(f ->> 'id', '')::uuid;
  -- DESCRIBE-INSTALL b: the one-offs (describe runs) this organization has INSTALLED and not removed.
  v_oneoffs  boolean := coalesce((f ->> 'installed_one_offs')::boolean, false);
  v_out      jsonb;
  v_total    integer;
begin
  if v_me is null then
    raise exception 'Sign in to see the template gallery.' using errcode = '42501';
  end if;
  if v_scope not in ('all', 'platform', 'org') then
    raise exception 'The gallery shows all, platform or org templates; "%" is none of those.', v_scope using errcode = '22023';
  end if;
  if v_inst is not null and not iam.has_org_access(v_inst) then
    v_inst := null;   -- an organization she is not in marks nothing (and says nothing about it)
  end if;

  with latest as (
    select distinct on (t.organization_id, t.catalogue_id) t.*
      from custom.template t
     where t.retired_at is null
       and (t.scope = 'platform' or iam.has_org_access(t.organization_id))
       and (v_scope = 'all' or t.scope = v_scope)
       and (v_org is null or t.scope = 'platform' or t.organization_id = v_org)
       -- A one-off (a describe run) is on no shelf; it is read only by its own id, until it is kept.
       and (not t.ephemeral or t.id = v_id
            or (v_oneoffs and v_inst is not null
                and exists (select 1 from custom.template_install i
                             where i.organization_id = v_inst and i.catalogue_id = t.catalogue_id and i.state <> 'uninstalled')))
       and (not v_oneoffs or t.ephemeral)
       and (v_id is null or t.id = v_id)
     order by t.organization_id, t.catalogue_id, t.template_version desc
  ), picked as (
    select l.* from latest l
     where (f ->> 'industry' is null or l.card ->> 'industry' = f ->> 'industry')
       and (f ->> 'job' is null or l.card ->> 'job' = f ->> 'job')
       and (f ->> 'teaches' is null or l.card ->> 'teaches' = f ->> 'teaches')
       and (f ->> 'strength' is null or coalesce(l.card -> 'strengths', '[]'::jsonb) ? (f ->> 'strength'))
       and (v_q is null or (coalesce(l.card ->> 'name', '') || ' ' || coalesce(l.card ->> 'persona', '') || ' '
                            || coalesce(l.card ->> 'vertical', '') || ' ' || coalesce(l.card ->> 'business', '')) ilike '%' || v_q || '%')
  )
  select count(*)::integer,
         coalesce(jsonb_agg(c order by c ->> 'name') filter (where rn > v_offset and rn <= v_offset + v_limit), '[]'::jsonb)
    into v_total, v_out
    from (
      select row_number() over (order by p.card ->> 'name', p.catalogue_id) rn,
             jsonb_build_object(
               'id', p.id, 'catalogue_id', p.catalogue_id, 'version', p.template_version, 'scope', p.scope,
               'owner_organization_id', case when p.scope = 'platform' then null else p.organization_id end,
               'name', p.card ->> 'name', 'persona', p.card ->> 'persona',
               'business', p.card ->> 'business', 'vertical', p.card ->> 'vertical',
               'industry', p.card ->> 'industry', 'job', p.card ->> 'job', 'audience', p.card ->> 'audience',
               'teaches', p.card ->> 'teaches', 'strengths', coalesce(p.card -> 'strengths', '[]'::jsonb),
               'requires', coalesce(p.card -> 'requires', '[]'::jsonb),
               'footprint', p.card -> 'footprint', 'preview_image', p.card ->> 'previewImage',
               'install_door', 'custom.template_install', 'ephemeral', p.ephemeral,
               'installed', case when v_inst is null then null else
                 (select jsonb_build_object('install_id', i.id, 'state', i.state, 'version', i.template_version)
                    from custom.template_install i
                   where i.organization_id = v_inst and i.catalogue_id = p.catalogue_id and i.state <> 'uninstalled' and i.instance_no is null)
               end) c
        from picked p
    ) x;

  return jsonb_build_object('total', v_total, 'limit', v_limit, 'offset', v_offset, 'cards', v_out);
end;
$function$;

revoke all on function custom._template_install_core(uuid, uuid, integer, text, text, uuid, text) from public, anon, authenticated;
revoke all on function custom._template_instance_args(text, jsonb, text, integer) from public, anon;

-- The default door: the same signature, settings and answers as before, over the one body.
CREATE OR REPLACE FUNCTION custom.template_install(p_organization_id uuid, p_template_id uuid, p_budget_ms integer DEFAULT 4000)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
 SET statement_timeout TO '90s'
AS $function$
begin
  return custom._template_install_core(p_organization_id, p_template_id, p_budget_ms, 'default', null, null, 'custom.template_install');
end;
$function$;

-- TEMPLATE-FRESH: every call without p_install_id makes a NEW independent install (a copy); with it, continues that copy.
CREATE OR REPLACE FUNCTION custom.template_install_fresh(p_organization_id uuid, p_template_id uuid, p_title text DEFAULT NULL,
                                                        p_install_id uuid DEFAULT NULL, p_budget_ms integer DEFAULT 4000)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
 SET statement_timeout TO '90s'
AS $function$
begin
  return custom._template_install_core(p_organization_id, p_template_id, p_budget_ms, 'fresh', p_title, p_install_id, 'custom.template_install_fresh');
end;
$function$;

insert into platform.client_callable_door
  (schema_name, function_name, identity_args, identity_argtypes, declared_by, reason, anonymous_callers, signed_in_callers, refusal_only, argument_rules)
select 'custom', x.fn, pg_get_function_identity_arguments(p.oid), platform.door_argtypes(p.proargtypes),
       'template_fresh_a_every_use_makes_a_new_install.sql', x.reason, false, true, false, x.rules::jsonb
  from (values
    ('template_install_fresh', 'custom.template_install_fresh(uuid,uuid,text,uuid,integer)',
     'Installs a NEW independent copy of one template into one organization as the caller (or continues the copy p_install_id names): the same body as custom.template_install — custom.assert_store_door and custom.assert_client_may_reach first, then each plan step through a store door that judges the caller.',
     '{"version":1,"declared_by":"template_fresh_a_every_use_makes_a_new_install.sql","declared_at":"2026-10-18 lane TEMPLATE-FRESH","arguments":{"p_organization_id":{"type":"uuid","position":1,"entity":"organization","check":"custom.assert_client_may_reach(arg1) — the organization wall — before anything is read.","foreign":{"sqlstate":"42501","same_as_invented":true},"verified":"2026-10-18 lane TEMPLATE-FRESH — written with this body"},"p_template_id":{"type":"uuid","position":2,"entity":"template","check":"a platform template, or a template of an organization the caller is in.","foreign":{"sqlstate":"P0002","not_a_leak":true,"same_as_invented":true},"verified":"2026-10-18 lane TEMPLATE-FRESH — written with this body"},"p_install_id":{"type":"uuid","position":4,"entity":"template_install","check":"matched only with organization_id = arg1, a fresh copy, of the same catalogue id.","foreign":{"sqlstate":"P0002","not_a_leak":true,"same_as_invented":true},"verified":"2026-10-18 lane TEMPLATE-FRESH — written with this body"}}}'),
    ('template_instances', 'custom.template_instances(uuid,text)',
     'Lists every install (the default one and each fresh copy) of one template in one organization with its upgrade hint. custom.assert_client_may_reach and iam.has_org_access on the organization; rows are only that organization''s.',
     '{"version":1,"declared_by":"template_fresh_a_every_use_makes_a_new_install.sql","declared_at":"2026-10-18 lane TEMPLATE-FRESH","arguments":{"p_organization_id":{"type":"uuid","position":1,"entity":"organization","check":"custom.assert_client_may_reach(arg1) and iam.has_org_access(arg1) before anything is read.","foreign":{"sqlstate":"42501","same_as_invented":true},"verified":"2026-10-18 lane TEMPLATE-FRESH — written with this body"}}}')
  ) as x(fn, sig, reason, rules)
  join pg_proc p on p.oid = x.sig::regprocedure
 where not exists (select 1 from platform.client_callable_door c where c.schema_name = 'custom' and c.function_name = x.fn);

grant execute on function custom.template_install_fresh(uuid, uuid, text, uuid, integer) to authenticated;
grant execute on function custom.template_instances(uuid, text) to authenticated;
grant execute on function custom.template_install(uuid, uuid, integer) to authenticated;
notify pgrst, 'reload schema';
