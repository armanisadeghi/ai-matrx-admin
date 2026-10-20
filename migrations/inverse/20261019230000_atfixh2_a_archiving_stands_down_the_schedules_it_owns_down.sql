-- inverse of 20261019230000_atfixh2_a_archiving_stands_down_the_schedules_it_owns: puts the four prior live bodies back, then drops the helpers and the base trigger.
-- chair-step: AT-FIX-H2 undo - the archive doors stop standing their schedules down.
DROP TRIGGER IF EXISTS zz_at_fix_h2_base_archive_moves_its_schedules ON custom.base;
CREATE OR REPLACE FUNCTION custom._table_takes_what_is_built_on_it(p_organization_id uuid, p_table_id uuid, p_event uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog'
AS $function$
declare
  -- THE TABLE'S OWN MOMENT when it already carries one (a writer that archived it first — the trigger
  -- below); otherwise now(), which is the value custom.record_delete writes right after calling this.
  v_now timestamptz := coalesce((select r.deleted_at from custom.record r
                                  where r.organization_id = p_organization_id and r.id = p_table_id), now());
  v_on  jsonb := '[]'::jsonb;
  v_n   integer := 0;
  v_k   integer;
begin
  with g as (
    update custom.anon_form f set deleted_at = v_now
     where f.organization_id = p_organization_id and f.table_id = p_table_id and f.deleted_at is null
    returning f.id)
  select v_on || coalesce(jsonb_agg(jsonb_build_object('kind', 'anon_form', 'id', g.id, 'at', v_now)), '[]'::jsonb), count(*)
    into v_on, v_k from g;
  v_n := v_n + v_k;
  with g as (
    update custom.anon_inbound i set deleted_at = v_now
     where i.organization_id = p_organization_id and i.table_id = p_table_id and i.deleted_at is null
    returning i.id)
  select v_on || coalesce(jsonb_agg(jsonb_build_object('kind', 'anon_inbound', 'id', g.id, 'at', v_now)), '[]'::jsonb), count(*)
    into v_on, v_k from g;
  v_n := v_n + v_k;
  with g as (
    update platform.saved_view v set deleted_at = v_now
     where v.organization_id = p_organization_id and v.subject_id = p_table_id and v.deleted_at is null
    returning v.id)
  select v_on || coalesce(jsonb_agg(jsonb_build_object('kind', 'saved_view', 'id', g.id, 'at', v_now)), '[]'::jsonb), count(*)
    into v_on, v_k from g;
  v_n := v_n + v_k;
  with g as (
    update custom.portal p
       set archived_at = v_now, archived_by = custom.query_principal(), archive_reason = 'Its table was archived.'
     where p.organization_id = p_organization_id and p.client_table_id = p_table_id and p.archived_at is null
    returning p.id)
  select v_on || coalesce(jsonb_agg(jsonb_build_object('kind', 'portal', 'id', g.id, 'at', v_now)), '[]'::jsonb), count(*)
    into v_on, v_k from g;
  v_n := v_n + v_k;
  if v_n > 0 and p_event is not null then
    update history.migration_log m
       set inverse = m.inverse || jsonb_build_object('built_on', coalesce(m.inverse -> 'built_on', '[]'::jsonb) || v_on)
     where m.organization_id = p_organization_id and m.id = p_event;
  end if;
  return v_n;
end;
$function$;

CREATE OR REPLACE FUNCTION custom._table_archive_reaches_what_is_built_on_it()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_n    integer;
  v_kind text;
  v_id   uuid;
begin
  if old.deleted_at is null and new.deleted_at is not null then
    -- ARCHIVE, by any writer. An open archive event (custom.table_archive's) gets the list written to it.
    v_n := custom._table_takes_what_is_built_on_it(new.organization_id, new.id,
             nullif(current_setting('custom.archive_event', true), '')::uuid);
    if v_n > 0 then
      raise notice '[table-archive] custom.record % archived; % thing(s) built on it followed at %',
        new.id, v_n, new.deleted_at;
    end if;
    return null;
  end if;

  -- RESTORE by a writer other than the event-driven restore, which brings back its own `built_on` list.
  if old.deleted_at is not null and new.deleted_at is null
     and coalesce(current_setting('history.mark_verb', true), '') <> 'undo of archive' then
    for v_kind, v_id in
      select 'anon_form', f.id from custom.anon_form f
       where f.organization_id = new.organization_id and f.table_id = new.id and f.deleted_at = old.deleted_at
      union all
      select 'anon_inbound', i.id from custom.anon_inbound i
       where i.organization_id = new.organization_id and i.table_id = new.id and i.deleted_at = old.deleted_at
      union all
      select 'saved_view', v.id from platform.saved_view v
       where v.organization_id = new.organization_id and v.subject_id = new.id and v.deleted_at = old.deleted_at
      union all
      select 'portal', p.id from custom.portal p
       where p.organization_id = new.organization_id and p.client_table_id = new.id
         and p.archived_at = old.deleted_at and p.archive_reason = 'Its table was archived.'
    loop
      begin
        if v_kind = 'anon_form' then
          update custom.anon_form set deleted_at = null where organization_id = new.organization_id and id = v_id;
        elsif v_kind = 'anon_inbound' then
          update custom.anon_inbound set deleted_at = null where organization_id = new.organization_id and id = v_id;
        elsif v_kind = 'saved_view' then
          update platform.saved_view set deleted_at = null where organization_id = new.organization_id and id = v_id;
        else
          update custom.portal set archived_at = null, archived_by = null, archive_reason = null
           where organization_id = new.organization_id and id = v_id;
        end if;
      exception when unique_violation then
        raise notice '[table-restore] custom.record % restored; its % % stays archived — a live one took its name meanwhile',
          new.id, v_kind, v_id;
      end;
    end loop;
  end if;
  return null;
end;
$function$;

CREATE OR REPLACE FUNCTION custom.automation_archive(p_organization_id uuid, p_automation_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
  select custom._automation_flip(p_organization_id, p_automation_id, 'custom.automation_archive',
           jsonb_build_object('archived_at', now(), 'enabled', false));
$function$;

CREATE OR REPLACE FUNCTION custom.automation_restore(p_organization_id uuid, p_automation_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
  select custom._automation_flip(p_organization_id, p_automation_id, 'custom.automation_restore', '{}'::jsonb, 'archived_at');
$function$;

delete from platform.client_callable_door where declared_by = '20261019230000_atfixh2_a_archiving_stands_down_the_schedules_it_owns';
DROP FUNCTION IF EXISTS custom._base_archive_moves_its_schedules();
DROP FUNCTION IF EXISTS custom._schedules_stand_up(uuid, text, uuid);
DROP FUNCTION IF EXISTS custom._schedules_stand_down(uuid, text, uuid, timestamp with time zone);
