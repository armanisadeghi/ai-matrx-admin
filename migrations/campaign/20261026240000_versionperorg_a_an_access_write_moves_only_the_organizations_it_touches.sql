-- additive: yes
-- guard: custom/system_enabled
-- lane: VERSION-PER-ORG
-- lock: custom
-- allows: revoke custom
-- window-class: drop+recreate of the access-version statement trigger on 10 unpartitioned access tables (iam.permissions, platform.entity_grants, platform.share_links, iam.memberships, iam.team, custom.portal, custom.portal_principal, custom.portal_table, iam.access_setup, platform.knob_override): ACCESS EXCLUSIVE on each plus the supautils set until commit; the functions come first, the 40 trigger statements last
-- brief-lock: the same 40 trigger statements, rehearsed on the clone by db:rehearse (VERSION-PER-ORG: 6.3 s and 7.7 s wall over two passes, ceiling 10 s)
--
-- VERSION-PER-ORG a — AN ACCESS WRITE MOVES ONLY THE ORGANIZATIONS IT TOUCHES (chair ruling, 2026-10-20).
-- Kept values for a reader (custom.computed_reader_judgement, custom.read_mask_kept, custom.computed_reader_cols) are
-- stamped with custom._access_versions(org) = [that organization's version, the platform version]. Since READ-SPEED-4 c
-- the statement trigger zzzzzz_access_version on all 13 access tables ran custom._access_version_bump_stmt(), which
-- calls custom._access_version_bump(null): the PLATFORM version. VERSION-HOTROW a made that bump an insert (no writer
-- waits on another), but every access write anywhere still moved the platform half of every organization's stamp, so on
-- a busy platform partial readers almost never got kept values (ACCESS-REVOKE item 2).
--
-- Now, on the 10 access tables whose rows belong to an organization, three statement triggers per table
-- (zzzzzz_access_version, now AFTER INSERT only, replaced in place, plus zzzzzz_access_version_u / _d; PostgreSQL allows transition tables on single-event triggers only) read the
-- statement's own rows (NEW TABLE for an insert, OLD TABLE for a delete, both for an update) and bump exactly the
-- organizations those rows touch, once per transaction per organization, as before:
--   iam.permissions          the organization that owns the shared resource (resource_type, resource_id)
--   platform.entity_grants   the organization that owns the granted entity (entity_type, entity_id)
--   platform.share_links     the row's organization_id and the organization that owns the linked resource
--   iam.memberships          the row's organization_id; the organization that owns the container (a team, a project,
--                            a scope...); and, for an organization membership, every organization that owns a resource
--                            shared with that organization (iam.permissions.granted_to_organization_id, and
--                            platform.entity_grants with audience 'organization'), because a member of Y reads what
--                            X shared with Y, and X's kept values are stamped with X's version
--   iam.team, custom.portal, custom.portal_principal, custom.portal_table   the row's organization_id
--   iam.access_setup         the organization of the Table named by scope_key.table_id
--   platform.knob_override   the row's organization_id (and scope_id for an organization-scoped knob)
-- FAIL SAFE: a row whose organization cannot be worked out (no organization_id, a resource or container that cannot
-- be resolved, an access_setup row with no Table scope, a platform knob) bumps the PLATFORM version, as every row did
-- before. A statement that touched no row bumps nothing: no one's access changed.
--
-- The platform-wide bump stays, unchanged (custom._access_version_bump_stmt, any statement), on the 3 access tables
-- whose rows are platform-wide kernel rules and belong to no organization:
--   custom.carrying_rule          the kernel's carrying rules: which edge role conveys what, in every organization
--   iam.membership_grant          the system roles: what each container role confers, in every organization
--   platform.entity_relationships the kernel's parent/child containment map, read by every organization's ladder
-- and, through the fail-safe above, for platform-scoped rows of the others: an access_setup row with no Table scope
-- (an entity type's setup for everyone) and a knob_override row with no organization (a platform knob).
-- The 5-minute cap on every kept judgement, mask and column list is unchanged: it is the backstop.
-- Guard: scripts/campaign-tests/versionperorg_a_each_access_write_moves_only_the_orgs_it_touches.sql
-- Inverse: migrations/inverse/20261026240000_versionperorg_a_an_access_write_moves_only_the_organizations_it_touches_down.sql

-- (type, id) -> the organization that owns it; org is null when it cannot be worked out (the caller then bumps the
-- platform). One query per type, never one per row.
CREATE FUNCTION custom._access_owner_org_each(p_types text[], p_ids uuid[])
 RETURNS TABLE(t text, i uuid, org uuid)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_t      text;
  v_ids    uuid[];
  v_schema text;
  v_table  text;
  v_rel    regclass;
  v_hit    uuid[];
  v_hitorg uuid[];
  v_rest   uuid[];
  v_id     uuid;
  v_org    uuid;
begin
  for v_t, v_ids in
    select x.t, array_agg(distinct x.i) from unnest(p_types, p_ids) as x(t, i) group by x.t
  loop
    if v_t is null then
      return query select null::text, u, null::uuid from unnest(v_ids) as u;
      continue;
    end if;
    -- a missing id names nothing: the platform
    if array_position(v_ids, null) is not null then
      return query select v_t, null::uuid, null::uuid;
    end if;
    v_ids := array_remove(v_ids, null);
    if cardinality(v_ids) = 0 then
      continue;
    end if;
    if v_t = 'organization' then
      return query select v_t, u, u from unnest(v_ids) as u;
      continue;
    end if;
    v_hit := '{}'; v_hitorg := '{}'; v_schema := null; v_rel := null;
    select et.schema_name, et.table_name into v_schema, v_table
      from platform.entity_types et where et.token = v_t limit 1;
    if v_schema is not null then
      v_rel := to_regclass(format('%I.%I', v_schema, v_table));
    end if;
    if v_rel is not null
       and exists (select 1 from pg_attribute a where a.attrelid = v_rel and a.attname = 'organization_id'
                      and a.attnum > 0 and not a.attisdropped)
       and exists (select 1 from pg_attribute a where a.attrelid = v_rel and a.attname = 'id'
                      and a.attnum > 0 and not a.attisdropped) then
      execute format('select coalesce(array_agg(x.id), ''{}''), coalesce(array_agg(x.organization_id), ''{}'')'
                  || ' from %s x where x.id = any ($1) and x.organization_id is not null', v_rel)
         into v_hit, v_hitorg using v_ids;
    end if;
    v_rest := array(select unnest(v_ids) except select unnest(v_hit));
    -- a record-store stand-in (a scope, and any type kept as a record of the same id)
    if cardinality(v_rest) > 0 then
      select v_hit || coalesce(array_agg(r.id), '{}'), v_hitorg || coalesce(array_agg(r.organization_id), '{}')
        into v_hit, v_hitorg
        from custom.record r where r.id = any (v_rest) and r.organization_id is not null;
      v_rest := array(select unnest(v_ids) except select unnest(v_hit));
    end if;
    return query select v_t, h.i, h.o from unnest(v_hit, v_hitorg) as h(i, o);
    foreach v_id in array v_rest loop
      v_org := null;
      if v_schema is not null then
        begin
          v_org := (platform.entity_row_access_attrs(v_schema, v_table, v_id)).o_org;
        exception when others then
          v_org := null;
        end;
      end if;
      return query select v_t, v_id, v_org;
    end loop;
  end loop;
end;
$function$;
REVOKE ALL ON FUNCTION custom._access_owner_org_each(text[], uuid[]) FROM PUBLIC, anon, authenticated;

-- the organizations whose resources were shared with these organizations: a membership change in one of them changes
-- who reads those resources. An owner that cannot be worked out comes back as null (the platform).
CREATE FUNCTION custom._access_orgs_reaching(p_orgs uuid[])
 RETURNS uuid[]
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_t text[];
  v_i uuid[];
begin
  if p_orgs is null or cardinality(array_remove(p_orgs, null)) = 0 then
    return '{}';
  end if;
  select array_agg(s.t), array_agg(s.i) into v_t, v_i
    from (select p.resource_type as t, p.resource_id as i from iam.permissions p
           where p.granted_to_organization_id = any (p_orgs)
          union
          select g.entity_type, g.entity_id from platform.entity_grants g
           where g.audience = 'organization' and g.organization_id = any (p_orgs)) s;
  if v_t is null then
    return '{}';
  end if;
  return array(select distinct e.org from custom._access_owner_org_each(v_t, v_i) e);
end;
$function$;
REVOKE ALL ON FUNCTION custom._access_orgs_reaching(uuid[]) FROM PUBLIC, anon, authenticated;

-- the organizations one statement's rows touch, for one access table. A null element means the platform.
CREATE FUNCTION custom._access_orgs_touched(p_table text, p_rows jsonb)
 RETURNS uuid[]
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_t   text[];
  v_i   uuid[];
  v_out uuid[] := '{}';
begin
  if p_rows is null or jsonb_array_length(p_rows) = 0 then
    return '{}';
  end if;
  case p_table
  when 'iam.permissions' then
    select array_agg(r ->> 'resource_type'), array_agg((r ->> 'resource_id')::uuid) into v_t, v_i
      from jsonb_array_elements(p_rows) r;
    v_out := array(select distinct e.org from custom._access_owner_org_each(v_t, v_i) e);
  when 'platform.entity_grants' then
    select array_agg(r ->> 'entity_type'), array_agg((r ->> 'entity_id')::uuid) into v_t, v_i
      from jsonb_array_elements(p_rows) r;
    v_out := array(select distinct e.org from custom._access_owner_org_each(v_t, v_i) e);
  when 'platform.share_links' then
    select array_agg(r ->> 'resource_type'), array_agg((r ->> 'resource_id')::uuid) into v_t, v_i
      from jsonb_array_elements(p_rows) r;
    v_out := array(
      select distinct x.o
        from jsonb_array_elements(p_rows) r
        left join custom._access_owner_org_each(v_t, v_i) e
          on e.t = r ->> 'resource_type' and e.i = (r ->> 'resource_id')::uuid
        cross join lateral (
          select v.o from (values ((r ->> 'organization_id')::uuid), (e.org)) v(o) where v.o is not null
          union all
          select null::uuid where (r ->> 'organization_id') is null and e.org is null) x);
  when 'iam.memberships' then
    select array_agg(r ->> 'container_type'), array_agg((r ->> 'container_id')::uuid) into v_t, v_i
      from jsonb_array_elements(p_rows) r;
    v_out := array(
      select distinct x.o
        from jsonb_array_elements(p_rows) r
        left join custom._access_owner_org_each(v_t, v_i) e
          on e.t = r ->> 'container_type' and e.i = (r ->> 'container_id')::uuid
        cross join lateral (
          select v.o from (values ((r ->> 'organization_id')::uuid), (e.org)) v(o) where v.o is not null
          union all
          select null::uuid where (r ->> 'organization_id') is null and e.org is null) x);
    -- a member of Y reads what other organizations shared with Y
    v_out := v_out || custom._access_orgs_reaching(array(
      select distinct u from jsonb_array_elements(p_rows) r,
             lateral (values ((r ->> 'organization_id')::uuid),
                             (case when r ->> 'container_type' = 'organization' then (r ->> 'container_id')::uuid end)) v(u)
       where u is not null and r ->> 'container_type' = 'organization'));
  when 'iam.team', 'custom.portal', 'custom.portal_principal', 'custom.portal_table' then
    v_out := array(select distinct (r ->> 'organization_id')::uuid from jsonb_array_elements(p_rows) r);
  when 'iam.access_setup' then
    -- a Table's own setup belongs to the Table's organization; an entity type's setup for everyone is the platform's
    v_out := array(
      select distinct case when r -> 'scope_key' ->> 'table_id' is not null
                           then custom._organization_of_record((r -> 'scope_key' ->> 'table_id')::uuid) end
        from jsonb_array_elements(p_rows) r);
  when 'platform.knob_override' then
    v_out := array(
      select distinct x.o
        from jsonb_array_elements(p_rows) r
        cross join lateral (
          select v.o from (values ((r ->> 'organization_id')::uuid),
                                  (case when r ->> 'scope_kind' = 'organization' then (r ->> 'scope_id')::uuid end)) v(o)
           where v.o is not null
          union all
          select null::uuid where (r ->> 'organization_id') is null
                              and not (r ->> 'scope_kind' = 'organization' and r ->> 'scope_id' is not null)) x);
  else
    -- an access table this function does not know: the platform, as before
    v_out := array[null::uuid];
  end case;
  return v_out;
end;
$function$;
REVOKE ALL ON FUNCTION custom._access_orgs_touched(text, jsonb) FROM PUBLIC, anon, authenticated;

-- one bump per organization named (null: the platform); custom._access_version_bump keeps it once per transaction
CREATE FUNCTION custom._access_version_bump_orgs(p_orgs uuid[])
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_org uuid;
begin
  for v_org in select distinct u from unnest(p_orgs) as u loop
    perform custom._access_version_bump(v_org);
  end loop;
end;
$function$;
REVOKE ALL ON FUNCTION custom._access_version_bump_orgs(uuid[]) FROM PUBLIC, anon, authenticated;

-- the statement trigger: the rows this statement wrote, then the organizations they touch
CREATE FUNCTION custom._access_version_bump_rows()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_rows jsonb;
begin
  -- each branch names only its own transition tables (an INSERT trigger has no old_rows, a DELETE none of new_rows)
  if tg_op = 'INSERT' then
    select coalesce(jsonb_agg(to_jsonb(n)), '[]'::jsonb) into v_rows from new_rows n;
  elsif tg_op = 'DELETE' then
    select coalesce(jsonb_agg(to_jsonb(o)), '[]'::jsonb) into v_rows from old_rows o;
  else
    select coalesce(jsonb_agg(s.j), '[]'::jsonb) into v_rows
      from (select to_jsonb(o) as j from old_rows o union all select to_jsonb(n) from new_rows n) s;
  end if;
  if jsonb_array_length(v_rows) > 0 then
    perform custom._access_version_bump_orgs(custom._access_orgs_touched(tg_table_schema || '.' || tg_table_name, v_rows));
  end if;
  return null;
end;
$function$;
REVOKE ALL ON FUNCTION custom._access_version_bump_rows() FROM PUBLIC, anon, authenticated;

-- the swap, table by table, in this one transaction (no other session sees a moment with no bump): the old trigger is
-- replaced in place by the INSERT one, then the UPDATE and DELETE ones are added
CREATE OR REPLACE TRIGGER zzzzzz_access_version AFTER INSERT ON iam.permissions REFERENCING NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION custom._access_version_bump_rows();
CREATE TRIGGER zzzzzz_access_version_u AFTER UPDATE ON iam.permissions REFERENCING OLD TABLE AS old_rows NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION custom._access_version_bump_rows();
CREATE TRIGGER zzzzzz_access_version_d AFTER DELETE ON iam.permissions REFERENCING OLD TABLE AS old_rows FOR EACH STATEMENT EXECUTE FUNCTION custom._access_version_bump_rows();

CREATE OR REPLACE TRIGGER zzzzzz_access_version AFTER INSERT ON platform.entity_grants REFERENCING NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION custom._access_version_bump_rows();
CREATE TRIGGER zzzzzz_access_version_u AFTER UPDATE ON platform.entity_grants REFERENCING OLD TABLE AS old_rows NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION custom._access_version_bump_rows();
CREATE TRIGGER zzzzzz_access_version_d AFTER DELETE ON platform.entity_grants REFERENCING OLD TABLE AS old_rows FOR EACH STATEMENT EXECUTE FUNCTION custom._access_version_bump_rows();

CREATE OR REPLACE TRIGGER zzzzzz_access_version AFTER INSERT ON platform.share_links REFERENCING NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION custom._access_version_bump_rows();
CREATE TRIGGER zzzzzz_access_version_u AFTER UPDATE ON platform.share_links REFERENCING OLD TABLE AS old_rows NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION custom._access_version_bump_rows();
CREATE TRIGGER zzzzzz_access_version_d AFTER DELETE ON platform.share_links REFERENCING OLD TABLE AS old_rows FOR EACH STATEMENT EXECUTE FUNCTION custom._access_version_bump_rows();

CREATE OR REPLACE TRIGGER zzzzzz_access_version AFTER INSERT ON iam.memberships REFERENCING NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION custom._access_version_bump_rows();
CREATE TRIGGER zzzzzz_access_version_u AFTER UPDATE ON iam.memberships REFERENCING OLD TABLE AS old_rows NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION custom._access_version_bump_rows();
CREATE TRIGGER zzzzzz_access_version_d AFTER DELETE ON iam.memberships REFERENCING OLD TABLE AS old_rows FOR EACH STATEMENT EXECUTE FUNCTION custom._access_version_bump_rows();

CREATE OR REPLACE TRIGGER zzzzzz_access_version AFTER INSERT ON iam.team REFERENCING NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION custom._access_version_bump_rows();
CREATE TRIGGER zzzzzz_access_version_u AFTER UPDATE ON iam.team REFERENCING OLD TABLE AS old_rows NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION custom._access_version_bump_rows();
CREATE TRIGGER zzzzzz_access_version_d AFTER DELETE ON iam.team REFERENCING OLD TABLE AS old_rows FOR EACH STATEMENT EXECUTE FUNCTION custom._access_version_bump_rows();

CREATE OR REPLACE TRIGGER zzzzzz_access_version AFTER INSERT ON custom.portal REFERENCING NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION custom._access_version_bump_rows();
CREATE TRIGGER zzzzzz_access_version_u AFTER UPDATE ON custom.portal REFERENCING OLD TABLE AS old_rows NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION custom._access_version_bump_rows();
CREATE TRIGGER zzzzzz_access_version_d AFTER DELETE ON custom.portal REFERENCING OLD TABLE AS old_rows FOR EACH STATEMENT EXECUTE FUNCTION custom._access_version_bump_rows();

CREATE OR REPLACE TRIGGER zzzzzz_access_version AFTER INSERT ON custom.portal_principal REFERENCING NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION custom._access_version_bump_rows();
CREATE TRIGGER zzzzzz_access_version_u AFTER UPDATE ON custom.portal_principal REFERENCING OLD TABLE AS old_rows NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION custom._access_version_bump_rows();
CREATE TRIGGER zzzzzz_access_version_d AFTER DELETE ON custom.portal_principal REFERENCING OLD TABLE AS old_rows FOR EACH STATEMENT EXECUTE FUNCTION custom._access_version_bump_rows();

CREATE OR REPLACE TRIGGER zzzzzz_access_version AFTER INSERT ON custom.portal_table REFERENCING NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION custom._access_version_bump_rows();
CREATE TRIGGER zzzzzz_access_version_u AFTER UPDATE ON custom.portal_table REFERENCING OLD TABLE AS old_rows NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION custom._access_version_bump_rows();
CREATE TRIGGER zzzzzz_access_version_d AFTER DELETE ON custom.portal_table REFERENCING OLD TABLE AS old_rows FOR EACH STATEMENT EXECUTE FUNCTION custom._access_version_bump_rows();

CREATE OR REPLACE TRIGGER zzzzzz_access_version AFTER INSERT ON iam.access_setup REFERENCING NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION custom._access_version_bump_rows();
CREATE TRIGGER zzzzzz_access_version_u AFTER UPDATE ON iam.access_setup REFERENCING OLD TABLE AS old_rows NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION custom._access_version_bump_rows();
CREATE TRIGGER zzzzzz_access_version_d AFTER DELETE ON iam.access_setup REFERENCING OLD TABLE AS old_rows FOR EACH STATEMENT EXECUTE FUNCTION custom._access_version_bump_rows();

CREATE OR REPLACE TRIGGER zzzzzz_access_version AFTER INSERT ON platform.knob_override REFERENCING NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION custom._access_version_bump_rows();
CREATE TRIGGER zzzzzz_access_version_u AFTER UPDATE ON platform.knob_override REFERENCING OLD TABLE AS old_rows NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION custom._access_version_bump_rows();
CREATE TRIGGER zzzzzz_access_version_d AFTER DELETE ON platform.knob_override REFERENCING OLD TABLE AS old_rows FOR EACH STATEMENT EXECUTE FUNCTION custom._access_version_bump_rows();
