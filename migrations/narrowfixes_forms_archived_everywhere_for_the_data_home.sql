-- narrowfixes_forms_archived_everywhere_for_the_data_home.sql (lane NARROW-FIXES, 2026-10-17)
--
-- CREATES one SECURITY INVOKER door, custom.forms_archived_everywhere(), and declares it in
-- platform.client_callable_door. Nothing existing is replaced (a new function, so no based-on line applies);
-- no table, column, index, trigger or policy is touched; it writes nothing.
--
-- THE USE CASE. Dana Whitlock archived last spring's "Summer hours request" form from her /data list. The
-- list's Archived filter shows archived tables and portals of every organization she is in, but never a form,
-- so the form could be put away and then not found again. This door lists the archived forms and booking pages
-- of every organization the caller belongs to, the way custom.list_portals_everywhere lists portals: each
-- organization is asked through custom.forms_archived (its own wall and its own per-form table check), an
-- organization that refuses contributes nothing, each row carries its organization. The row's Restore is
-- custom.form_restore, in that organization.
--
-- INVERSE: migrations/inverse/narrowfixes_forms_archived_everywhere_for_the_data_home_down.sql

create or replace function custom.forms_archived_everywhere()
 returns jsonb
 language plpgsql
 stable
 set search_path to 'pg_catalog'
as $function$
declare
  v_org uuid;
  v_all jsonb := '[]'::jsonb;
begin
  for v_org in
    select o.id from iam.organizations o where o.id in (select iam.my_orgs()) and o.archived_at is null
  loop
    begin
      v_all := v_all || coalesce((
        select jsonb_agg(to_jsonb(x) || jsonb_build_object(
                 'organization_id', v_org,
                 'organization_name', (select g.name::text from iam.organizations g where g.id = v_org)))
          from custom.forms_archived(v_org, null, 200) x), '[]'::jsonb);
    exception when insufficient_privilege then
      continue;
    end;
  end loop;
  return jsonb_build_object('success', true, 'forms', v_all);
end
$function$;
comment on function custom.forms_archived_everywhere() is
  'NARROW-FIXES — the archived forms and booking pages of every organization the caller belongs to (iam.my_orgs()), each through custom.forms_archived with that organization named; an organization that refuses contributes nothing. Reads only.';

insert into platform.client_callable_door
  (schema_name, function_name, identity_args, identity_argtypes, reason, declared_by,
   non_client_lane, signed_in_callers, anonymous_callers, argument_rules)
values
  ('custom', 'forms_archived_everywhere', '', array[]::oid[],
   'SECURITY INVOKER wrapper. Lists the archived forms and booking pages of every organization the caller belongs to (iam.my_orgs()), each through custom.forms_archived with that organization named, so each meets custom.assert_client_may_reach and the per-table custom.my_level check in its own body; an organization that refuses contributes nothing. It only adds the answers together and writes nothing.',
   'narrowfixes_forms_archived_everywhere_for_the_data_home.sql', null, true, false,
   jsonb_build_object('version', '1', 'arguments', jsonb_build_object()))
on conflict do nothing;

grant execute on function custom.forms_archived_everywhere() to authenticated;
