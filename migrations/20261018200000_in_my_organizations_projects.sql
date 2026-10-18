-- why: bounded organizations lane C, continued (scope tree). The scope tree read her projects with
--   `organization_id in (<first page of her organizations>)`, so a person in more organizations than
--   the switcher page (knob organizations.switcher_page_size, 50) lost every project past it.
--   Extends the `in_my_organizations` computed-field family (per-row `iam.is_my_organization` probe
--   form, 20261018040000) to projects.projects; the client writes `.is("in_my_organizations", true)`.
create or replace function projects.in_my_organizations(r projects.projects) returns boolean
 language sql stable as $f$ select iam.is_my_organization($1.organization_id) $f$;
grant execute on function projects.in_my_organizations(projects.projects) to authenticated, service_role;

notify pgrst, 'reload schema';
