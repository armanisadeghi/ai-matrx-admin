-- chair-step: inverse of close_core_c_b_the_last_switch_triggers_are_gone.sql; recreates the 7 final-switch functions byte for byte from their live definitions (pg_get_functiondef, 2026-10-22) with owners, grants and comments, then the 4 triggers in their live enabled/disabled state. No data was written or removed.

SET LOCAL check_function_bodies = off;

-- platform._final_switch_platform_org()  sha256 01d2e95f0363e4a59ec6f3e402d3cacf18903d49a46ebcf2616781805e0ccf35
CREATE OR REPLACE FUNCTION platform._final_switch_platform_org()
 RETURNS uuid
 LANGUAGE sql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
  select s.organization_id from platform.cutover_seam s where s.seam_key = 'final_switch';
$function$;
ALTER FUNCTION platform._final_switch_platform_org() OWNER TO postgres;
REVOKE ALL ON FUNCTION platform._final_switch_platform_org() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION platform._final_switch_platform_org() TO postgres;
GRANT EXECUTE ON FUNCTION platform._final_switch_platform_org() TO dashboard_user;
GRANT EXECUTE ON FUNCTION platform._final_switch_platform_org() TO service_role;
GRANT EXECUTE ON FUNCTION platform._final_switch_platform_org() TO svc_seo;

-- platform._final_switch_last()  sha256 e761c31c70bca863840e8885aa84cf950b094f4f251d72829dfd0c76ca985c60
CREATE OR REPLACE FUNCTION platform._final_switch_last()
 RETURNS platform.cutover_seam_press
 LANGUAGE sql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
  select p.* from platform.cutover_seam_press p
   where p.seam_key = 'final_switch' and p.organization_id = platform._final_switch_platform_org()
     and p.outcome = 'done'
   order by p.pressed_at desc, p.id
   limit 1;
$function$;
ALTER FUNCTION platform._final_switch_last() OWNER TO postgres;
REVOKE ALL ON FUNCTION platform._final_switch_last() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION platform._final_switch_last() TO postgres;
GRANT EXECUTE ON FUNCTION platform._final_switch_last() TO dashboard_user;
GRANT EXECUTE ON FUNCTION platform._final_switch_last() TO service_role;
GRANT EXECUTE ON FUNCTION platform._final_switch_last() TO svc_seo;

-- platform._final_switch_is_on()  sha256 3b13a69e2f810691c431523677c7880ba836887649cce068502b6feaabab7e25
CREATE OR REPLACE FUNCTION platform._final_switch_is_on()
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
  select coalesce(current_setting('app.final_switch_undoing', true), '') <> 'on'
     and coalesce((platform._final_switch_last()).direction, 'old') = 'new';
$function$;
ALTER FUNCTION platform._final_switch_is_on() OWNER TO postgres;
REVOKE ALL ON FUNCTION platform._final_switch_is_on() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION platform._final_switch_is_on() TO postgres;
GRANT EXECUTE ON FUNCTION platform._final_switch_is_on() TO dashboard_user;
GRANT EXECUTE ON FUNCTION platform._final_switch_is_on() TO service_role;
GRANT EXECUTE ON FUNCTION platform._final_switch_is_on() TO svc_seo;

-- platform._final_switch_holds_every_organization()  sha256 b7b98f00624970c036756b7003392c8dd8eb42b88c95097c063c53d61cbb8d79
CREATE OR REPLACE FUNCTION platform._final_switch_holds_every_organization()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog'
AS $function$
begin
  if new.outcome = 'done' and new.seam_key <> 'final_switch'
     and exists (select 1 from platform.cutover_seam s where s.seam_key = new.seam_key and s.per_organization)
     and coalesce(current_setting('app.final_switch_step', true), '') <> 'on'
     and platform._final_switch_is_on() then
    raise exception 'Every organization switched to the new system together with the final switch, so they switch back together too: Administration → Database → Final switch → Undo. Nothing was changed.'
      using errcode = '55000',
            hint = 'The final switch''s undo switches every organization back in one step; after it, each organization''s own switch works again.';
  end if;
  return new;
end;
$function$;
ALTER FUNCTION platform._final_switch_holds_every_organization() OWNER TO postgres;
REVOKE ALL ON FUNCTION platform._final_switch_holds_every_organization() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION platform._final_switch_holds_every_organization() TO postgres;

-- platform._final_switch_keeps_no_owner_lists_archived()  sha256 e3c076e93853eb4b55b6ffb9dd60f77e175911999a24e0da21c395b9c7c9b95a
CREATE OR REPLACE FUNCTION platform._final_switch_keeps_no_owner_lists_archived()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
begin
  -- A restore of a pick list the final switch archived with no owner organization, and only that.
  if old.deleted_at is not null and new.deleted_at is null
     and coalesce(old.metadata, '{}'::jsonb) ? 'final_switch_no_owner'
     and coalesce(current_setting('app.final_switch_step', true), '') <> 'on' then
    if platform._final_switch_is_on() then
      raise exception 'This pick list belonged to no organization, so the final switch archived it with no owner organization. Undoing the final switch (Administration → Database → Final switch) restores it; nothing was changed.'
        using errcode = '55000';
    end if;
  end if;
  return new;
end;
$function$;
ALTER FUNCTION platform._final_switch_keeps_no_owner_lists_archived() OWNER TO postgres;
REVOKE ALL ON FUNCTION platform._final_switch_keeps_no_owner_lists_archived() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION platform._final_switch_keeps_no_owner_lists_archived() TO postgres;

-- platform.older_tables_switched(uuid)  sha256 9574aab15729e6852491fe33aae6362e3032666100590afbbec560f48e6a8833
CREATE OR REPLACE FUNCTION platform.older_tables_switched(p_organization_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
  -- FINAL-SWITCH: true for every organization while the final switch is on (an organization with no
  -- older table of its own, or one made after the press, makes its tables and lists in the store).
  select p_organization_id is not null
     and (coalesce((platform._cutover_seam_last_done('older_tables', p_organization_id)).direction, 'old') = 'new'
          or platform._final_switch_is_on());
$function$;
ALTER FUNCTION platform.older_tables_switched(uuid) OWNER TO postgres;
COMMENT ON FUNCTION platform.older_tables_switched(uuid) IS 'LISTS-AFTER-SWITCH: true when the organization''s last done Data tables press went to the new system. The one question the older create doors and the INSERT guard ask; Switch back makes it false again.';
REVOKE ALL ON FUNCTION platform.older_tables_switched(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION platform.older_tables_switched(uuid) TO postgres;

-- workbench._switched_org_makes_nothing_older()  sha256 a3672ebaebaf33e9f56a6726622a36bd9a79623e06ae323bc1c5c922153caa0e
CREATE OR REPLACE FUNCTION workbench._switched_org_makes_nothing_older()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
begin
  if platform.older_tables_switched(new.organization_id) then
    raise exception '%',
      case when tg_table_name = 'udt_structured_lists'
           then 'This organization switched its Data tables to the new system, so a new list is made there, not in the older lists. Make it on /pick-lists (or through custom.pick_list_create, which makes it in the new system).'
           else 'This organization switched its Data tables to the new system, so a new table is made there, not in the older tables. Make it on /data (New table) — it is born in the new system.' end
      using errcode = '23514',
            detail = 'organization=' || new.organization_id,
            hint = 'Nothing was created. Switch back on the organization''s settings page (Data) returns the organization to the older tables.';
  end if;
  return new;
end;
$function$;
ALTER FUNCTION workbench._switched_org_makes_nothing_older() OWNER TO postgres;
COMMENT ON FUNCTION workbench._switched_org_makes_nothing_older() IS 'LISTS-AFTER-SWITCH: refuses an INSERT of a new older table (udt_datasets) or pick list (udt_structured_lists) in an organization whose Data tables switch is on the new system, naming where new ones are made. Bound to both tables so every create door decides it once.';
REVOKE ALL ON FUNCTION workbench._switched_org_makes_nothing_older() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION workbench._switched_org_makes_nothing_older() TO postgres;

CREATE TRIGGER final_switch_holds_every_organization BEFORE INSERT ON platform.cutover_seam_press FOR EACH ROW EXECUTE FUNCTION platform._final_switch_holds_every_organization();

CREATE TRIGGER final_switch_keeps_no_owner_lists_archived BEFORE UPDATE ON deprecated.udt_structured_lists FOR EACH ROW EXECUTE FUNCTION platform._final_switch_keeps_no_owner_lists_archived();
ALTER TABLE deprecated.udt_structured_lists DISABLE TRIGGER "final_switch_keeps_no_owner_lists_archived";

CREATE TRIGGER _0_switched_org_makes_nothing_older BEFORE INSERT ON deprecated.udt_datasets FOR EACH ROW EXECUTE FUNCTION workbench._switched_org_makes_nothing_older();
ALTER TABLE deprecated.udt_datasets DISABLE TRIGGER "_0_switched_org_makes_nothing_older";

CREATE TRIGGER _0_switched_org_makes_nothing_older BEFORE INSERT ON deprecated.udt_structured_lists FOR EACH ROW EXECUTE FUNCTION workbench._switched_org_makes_nothing_older();
ALTER TABLE deprecated.udt_structured_lists DISABLE TRIGGER "_0_switched_org_makes_nothing_older";

