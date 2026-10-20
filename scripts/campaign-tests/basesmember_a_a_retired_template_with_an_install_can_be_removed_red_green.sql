-- LANE BASES-MEMBER 1 - A RETIRED TEMPLATE'S PAGE STILL OPENS FOR THE WORKSPACE THAT HAS IT INSTALLED, SO THE INSTALL CAN BE REMOVED.
--
-- THE USE CASE. Priya saves her base as a template, installs it into her workspace, then archives the template. The install
-- is still there (its tables, forms, checklists and agent copy) and Remove lives on the template's page. That page read the
-- template through custom.templates, which hid every retired template, so the page said "not in the gallery" and nothing
-- could ever take the install away. Now the page's own read (by id, asking about her workspace) still finds a retired
-- template while her workspace has it installed. A shelf read never lists it; a workspace with no install of it finds nothing.
--
-- RED before 20261020020000_basesmember_a_a_retired_template_with_an_install_can_be_removed.sql: S1 fails (the read by id answers no card).
-- GREEN after: S1 the card is found with its install; S2 the same template is not on the shelf; S3 a workspace with no install
-- of it still finds nothing; S4 once uninstalled it is gone again. Seat: admin@admin.com, own fixture org, rolled back.

\set ON_ERROR_STOP on
\timing off
\set suite 'basesmember_a_a_retired_template_with_an_install_can_be_removed_red_green.sql'
\set requires 'function:custom.templates'
\i scripts/campaign-tests/_preamble.sql
\if :matrx_skip
\quit
\endif

begin;
set local statement_timeout = '60s';
do $t$
declare
  c_admin constant uuid := '87a6e699-3622-4869-8843-d0867456c0dd';
  v_org uuid := gen_random_uuid(); v_other uuid := gen_random_uuid(); v_tpl uuid := gen_random_uuid(); v_inst uuid := gen_random_uuid();
  v_out jsonb; v_cat text := 'ORG-BM-' || substr(gen_random_uuid()::text, 1, 8);
begin
  perform set_config('app.actor_system', 'campaign.basesmember.retired_template', true);
  perform set_config('request.jwt.claims', json_build_object('sub', c_admin, 'role', 'authenticated')::text, true);
  insert into iam.organizations (id, name, slug, abbreviation, created_by) values (v_org, 'BM Retired Fixture', 'bm-ret-' || substr(v_org::text,1,8), 'BMR', c_admin);
  insert into iam.memberships (organization_id, container_type, container_id, user_id, role, status) values (v_org, 'organization', v_org, c_admin, 'owner', 'active');
  insert into iam.organizations (id, name, slug, abbreviation, created_by) values (v_other, 'BM Retired Other', 'bm-oth-' || substr(v_other::text,1,8), 'BMO', c_admin);
  insert into iam.memberships (organization_id, container_type, container_id, user_id, role, status) values (v_other, 'organization', v_other, c_admin, 'owner', 'active');
  insert into custom.template (id, organization_id, scope, catalogue_id, template_version, card, spec, plan, declared_by, retired_at)
    values (v_tpl, v_org, 'org', v_cat, 1, '{"name":"BM retired"}'::jsonb, '{}'::jsonb, '{}'::jsonb, c_admin, now());
  insert into custom.template_install (id, organization_id, template_id, catalogue_id, template_version, state, install_day, timezone, installed_by)
    values (v_inst, v_org, v_tpl, v_cat, 1, 'installed', current_date, 'UTC', c_admin);

  -- S1 the page's own read (by id, about this workspace) finds the retired template with its install
  v_out := custom.templates(jsonb_build_object('id', v_tpl, 'installed_in', v_org));
  if jsonb_array_length(v_out -> 'cards') <> 1 or (v_out -> 'cards' -> 0 -> 'installed' ->> 'install_id') is distinct from v_inst::text then
    raise exception 'S1 RED: the read by id answered % cards (%), so Remove can never be reached', jsonb_array_length(v_out -> 'cards'), v_out -> 'cards';
  end if;
  raise notice 'S1 ok: the retired template opens with its install';

  -- S2 it is on no shelf
  v_out := custom.templates(jsonb_build_object('scope', 'org', 'organization_id', v_org, 'installed_in', v_org));
  if exists (select 1 from jsonb_array_elements(v_out -> 'cards') c where c ->> 'id' = v_tpl::text) then
    raise exception 'S2 a retired template is listed on the shelf';
  end if;
  raise notice 'S2 ok: not on the shelf';

  -- S3 a workspace with no install of it finds nothing
  v_out := custom.templates(jsonb_build_object('id', v_tpl, 'installed_in', v_other));
  if jsonb_array_length(v_out -> 'cards') <> 0 then raise exception 'S3 a workspace with no install read a retired template'; end if;
  raise notice 'S3 ok: no install, no card';

  -- S4 once removed it is gone again
  update custom.template_install set state = 'uninstalled' where id = v_inst;
  v_out := custom.templates(jsonb_build_object('id', v_tpl, 'installed_in', v_org));
  if jsonb_array_length(v_out -> 'cards') <> 0 then raise exception 'S4 a removed install still opens a retired template'; end if;
  raise notice 'GREEN S1-S4';
end
$t$;
rollback;
