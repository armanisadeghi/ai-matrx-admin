-- chair-step: replaces custom._access_version_bump and custom._access_versions in place (the version becomes a counted log of insert-only events); additive table, no trigger touched
-- additive: yes
-- guard: custom/system_enabled
-- lane: VERSION-HOTROW
-- lock: custom
-- allows: revoke custom
-- based-on: custom._access_version_bump(uuid) 2c7ff4e0acef064d989ef2c43a36087243d6cd7f504c6b75638e8cce01f65573
-- based-on: custom._access_versions(uuid) 2469dcd31f359aa73425fb4e33ee313256c815fd9b810939a62e7e29a0695482
--
-- VERSION-HOTROW a — TWO ACCESS WRITERS NEVER WAIT ON EACH OTHER.
-- READ-SPEED-4 made every access-changing write move a version: one custom.access_version row per organization, plus one
-- platform row that the statement triggers on all 13 access tables move. The bump was an UPDATE of that row, so any
-- transaction that changed access held it until it committed and every other access writer (in that organization, and
-- for the platform row, on the whole platform) waited behind it. In Template sweep (test) long transactions from other
-- lanes held it and table_archive / table_ensure waited for minutes.
--
-- Now a bump only INSERTS one row into custom.access_version_event (once per transaction per organization, as before).
-- An insert takes no lock any other writer waits for.
-- A version is custom.access_version.version (the folded base, 1 when absent) + the number of events of that organization
-- the reader can see. The set of visible events only grows, so ANY newly committed access change moves the version,
-- in the same commit that makes the change visible, whatever order the transactions took their sequence numbers in.
-- (A max(seq) version would miss a change whose seq is lower than one already committed.)
-- Folding: on every 64th event, the writer folds its organization's committed events into the base row, under a
-- try-advisory lock (a busy fold is skipped, never waited on) with a 100 ms lock_timeout, inside its own
-- subtransaction (a failed fold never stops the write). base + count is unchanged by a fold, so nothing kept goes stale
-- because of one. Only READ COMMITTED writers fold.
-- Existing kept judgements and masks stay valid: base rows are unchanged and the log starts empty.
-- Inverse: migrations/inverse/20261024240000_versionhotrow_a_access_writers_never_wait_on_each_other_down.sql
create table if not exists custom.access_version_event (
  seq             bigint generated always as identity primary key,
  organization_id uuid not null,
  at              timestamptz not null default now()
);
create index if not exists access_version_event_org_idx on custom.access_version_event (organization_id);
alter table custom.access_version_event enable row level security;
revoke all on table custom.access_version_event from public, anon, authenticated;
revoke all on sequence custom.access_version_event_seq_seq from public, anon, authenticated;
insert into platform.entity_types (token, schema_name, table_name, label, audit_class, audit_class_reason, table_ref)
values ('access_version_event', 'custom', 'access_version_event', 'Access Version Event', 'machinery',
        'machinery: one row per transaction per organization that changed who sees what; custom._access_versions counts them on top of custom.access_version (the folded base); insert-only for writers, folded by custom._access_version_fold; RLS on, no grants to anon or authenticated; schema custom is CLOSED',
        'custom.access_version_event'::regclass)
on conflict do nothing;
comment on table custom.access_version_event is 'VERSION-HOTROW a: insert-only access version events; version = custom.access_version.version (base) + count of visible events; folded into the base by custom._access_version_fold.';

CREATE FUNCTION custom._access_version_fold(p_org uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_n    bigint;
  v_lock text := current_setting('lock_timeout');
begin
  -- a fold is housekeeping: it never waits and never stops the write that asked for it
  if current_setting('transaction_isolation') <> 'read committed' then
    return;
  end if;
  if not pg_try_advisory_xact_lock(hashtextextended('custom.access_version_fold:' || p_org::text, 0)) then
    return;
  end if;
  perform set_config('lock_timeout', '100ms', true);
  begin
    with d as (delete from custom.access_version_event e where e.organization_id = p_org returning 1)
    select count(*) into v_n from d;
    if v_n > 0 then
      insert into custom.access_version as v (organization_id, version, bumped_at)
      values (p_org, 1 + v_n, now())
      on conflict (organization_id) do update set version = v.version + v_n, bumped_at = now();
    end if;
  exception when others then
    raise warning 'access version fold for % skipped: % (%)', p_org, sqlerrm, sqlstate;
  end;
  perform set_config('lock_timeout', v_lock, true);
end;
$function$;
REVOKE ALL ON FUNCTION custom._access_version_fold(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION custom._access_version_bump(p_org uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_org  uuid := coalesce(p_org, '00000000-0000-0000-0000-000000000000'::uuid);
  v_seen text := coalesce(current_setting('mx.access_bumped', true), '');
  v_tag  text := pg_current_xact_id()::text || ':' || v_org::text;
  v_seq  bigint;
begin
  -- once per transaction per organization: what a reader sees changes at commit, so one event is enough
  if position(v_tag in v_seen) > 0 then
    return;
  end if;
  -- insert-only: no writer ever waits on another writer's version row (VERSION-HOTROW a)
  insert into custom.access_version_event (organization_id) values (v_org) returning seq into v_seq;
  perform set_config('mx.access_bumped', right(v_seen, 4000) || ' ' || v_tag, true);
  if v_seq % 64 = 0 then
    perform custom._access_version_fold(v_org);
  end if;
end;
$function$;

CREATE OR REPLACE FUNCTION custom._access_versions(p_org uuid)
 RETURNS bigint[]
 LANGUAGE sql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
  select array[coalesce((select v.version from custom.access_version v where v.organization_id = p_org), 1)
                 + (select count(*) from custom.access_version_event e where e.organization_id = p_org),
               coalesce((select v.version from custom.access_version v
                          where v.organization_id = '00000000-0000-0000-0000-000000000000'::uuid), 1)
                 + (select count(*) from custom.access_version_event e
                     where e.organization_id = '00000000-0000-0000-0000-000000000000'::uuid)]
$function$;
