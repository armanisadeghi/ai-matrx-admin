-- READ-SPEED-4 guard d: EVERY ACCESS-CHANGING DOOR MOVES THE ACCESS VERSION (chair ruling R2').
-- The kept reader judgement (custom.computed_reader_judgement) is honoured only while custom._access_versions is unchanged,
-- so a write to any table that decides who sees what must move it. For each access table: a statement that writes
-- (a DELETE matching nothing still fires statement triggers) must raise the platform version; a Field change must raise
-- the organization's. Run inside a transaction that is rolled back. RED before READ-SPEED-4 b, GREEN after.
-- Versions are read through custom._access_versions (VERSION-HOTROW a: base row + insert-only events), never the table.
-- VERSION-PER-ORG a: only the 3 platform-wide kernel rule tables still move the PLATFORM version on any statement. The 10
-- tables whose rows belong to an organization move the organizations their rows touch, so a statement that touches no
-- row moves nothing; for those this asserts the wiring (an INSERT, an UPDATE and a DELETE statement trigger with
-- transition tables running custom._access_version_bump_rows), and the per-row semantics are guard
-- versionperorg_a_each_access_write_moves_only_the_orgs_it_touches.sql.
DO $guard$
declare
  t text;
  v0 bigint; v1 bigint;
  v_bad text[] := '{}';
  v_org uuid;
begin
  -- the organization tables: one INSERT, one UPDATE and one DELETE statement trigger, each with its transition tables
  foreach t in array array['iam.permissions', 'platform.entity_grants', 'iam.memberships', 'iam.team', 'platform.share_links',
                           'custom.portal', 'custom.portal_principal', 'custom.portal_table', 'iam.access_setup',
                           'platform.knob_override'] loop
    if (select count(distinct case when (tg.tgtype & 4) <> 0 then 'i' when (tg.tgtype & 8) <> 0 then 'd' when (tg.tgtype & 16) <> 0 then 'u' end)
          from pg_trigger tg
         where tg.tgrelid = t::regclass and tg.tgenabled <> 'D' and not tg.tgisinternal
           and tg.tgfoid = 'custom._access_version_bump_rows()'::regprocedure and (tg.tgtype & 1) = 0
           and (tg.tgoldtable is not null or tg.tgnewtable is not null)) <> 3 then
      v_bad := v_bad || (t || ' (per-organization triggers)');
    end if;
  end loop;
  foreach t in array array['iam.membership_grant', 'custom.carrying_rule', 'platform.entity_relationships',
                           'platform.associations'] loop
    begin
      select (custom._access_versions(null))[2] into v0;
      execute format('delete from %s where false', t);
      select (custom._access_versions(null))[2] into v1;
      if t <> 'platform.associations' and v1 <= v0 then
        v_bad := v_bad || t;
      end if;
      raise exception using errcode = 'P0001', message = 'undo';
    exception when sqlstate 'P0001' then
      null;
    end;
  end loop;
  -- a Field's change (a mask, a column) moves its organization's version
  select f.organization_id into v_org from custom.record f
   where f.table_id = custom.field_kernel_id() and f.deleted_at is null limit 1;
  begin
    select (custom._access_versions(v_org))[1] into v0;
    update custom.record f set data = f.data || jsonb_build_object('guard_d_probe', true)
     where f.id = (select id from custom.record where table_id = custom.field_kernel_id() and organization_id = v_org and deleted_at is null limit 1);
    select (custom._access_versions(v_org))[1] into v1;
    if v1 <= v0 then
      v_bad := v_bad || 'custom.record (Field)'::text;
    end if;
    raise exception using errcode = 'P0001', message = 'undo';
  exception when sqlstate 'P0001' then
    null;
  end;
  if cardinality(v_bad) > 0 then
    raise exception 'RED: these access doors do not move the access version: %', array_to_string(v_bad, ', ');
  end if;
  raise notice 'GREEN: every access door moves the access version';
end
$guard$;
