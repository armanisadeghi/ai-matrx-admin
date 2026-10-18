-- why: 20261018030000 shipped `in_my_organizations` as `organization_id in (select iam.my_organization_ids())`.
--   A computed field with a sub-select is never inlined, so that set was rebuilt for EVERY row: measured
--   live as test@test.com, platform.tag (9.3k rows) ran past the 8 s statement timeout. The per-row
--   form is one unique-index probe on iam.memberships (container_type, container_id, user_id):
--   iam.is_my_organization(uuid) — the scalar twin of iam.my_organization_ids(), SAME set (her
--   memberships, any status, not deleted, organization not archived). Also extends the family to the
--   CRM list tables (crm.party, crm.outreach_list, platform.outcome_event).
-- based-on: platform.in_my_organizations(platform.judge_verdict) e5cdd14fcaa70954e5ddb083e5a171f63e144a8611cdca10937a051cc6db63ff
-- based-on: platform.in_my_organizations(platform.saved_view) 09ec7e02352bf17b001b7d89c8f66e416e4c584349c059c2e07f35a80d4b6fc4
-- based-on: platform.in_my_organizations(platform.tag) e189e5f346d19aa8c24dd208451d9af57f9373e54380eb16c4b0eed602e88f18
-- based-on: media.in_my_organizations(media.source_library) 6e333fa64797798a832a4a9a5746a30e1a36ff818699899a1b7629502a7d2ba8
-- based-on: workflow.in_my_organizations(workflow.definition) 60a7045e522d1ef266228bb42d258d4f5a12fb8a82deca5a8b8f33a2df21b083
-- based-on: content_ir.in_my_organizations(content_ir.kind_instance) a4b3ca34b8e03fdfa1d9b732a02a6aa944627c7741ebb56ed476838e03d28c38
create or replace function iam.is_my_organization(p_organization_id uuid)
 returns boolean
 language plpgsql
 stable security definer
 set search_path to ''
as $function$
begin
  -- "Is this organization one of mine?" — the per-row form of iam.my_organization_ids() (same set:
  -- her membership row, any status, not deleted; the organization not archived). A question about
  -- the CALLER only: false with no session, never anyone else's answer.
  return p_organization_id is not null and exists (
    select 1 from iam.memberships m
      join iam.organizations o on o.id = m.container_id and o.archived_at is null
     where m.container_type = 'organization'
       and m.container_id = p_organization_id
       and m.user_id = (select auth.uid())
       and m.deleted_at is null);
end
$function$;
comment on function iam.is_my_organization(uuid) is
  'Per-row form of iam.my_organization_ids(): is this organization one of the caller''s (membership not deleted, organization not archived)? Behind every `in_my_organizations` computed field.';
insert into platform.client_callable_door (schema_name, function_name, identity_args, identity_argtypes, declared_by, reason, gate_predicate, anonymous_callers, anonymous_purpose, signed_in_callers)
values ('iam', 'is_my_organization', 'p_organization_id uuid', array['2950']::oid[], '20261018040000_in_my_organizations_per_row_lookup',
        'Caller-identity predicate: is this organization one of MY organizations (bounded organizations lane C). Answers only about the caller; false with no session. Called per row by the in_my_organizations computed fields.',
        null, true, 'Answers false with no session. Called per row by the in_my_organizations computed fields, which a signed-out read of a public row may evaluate.', true)
on conflict do nothing;
grant execute on function iam.is_my_organization(uuid) to anon, authenticated, service_role;

create or replace function platform.in_my_organizations(r platform.judge_verdict) returns boolean
 language sql stable as $f$ select iam.is_my_organization($1.organization_id) $f$;
create or replace function platform.in_my_organizations(r platform.tag) returns boolean
 language sql stable as $f$ select iam.is_my_organization($1.organization_id) $f$;
create or replace function platform.in_my_organizations(r platform.saved_view) returns boolean
 language sql stable as $f$ select iam.is_my_organization($1.organization_id) $f$;
create or replace function media.in_my_organizations(r media.source_library) returns boolean
 language sql stable as $f$ select iam.is_my_organization($1.organization_id) $f$;
create or replace function workflow.in_my_organizations(r workflow.definition) returns boolean
 language sql stable as $f$ select iam.is_my_organization($1.organization_id) $f$;
create or replace function content_ir.in_my_organizations(r content_ir.kind_instance) returns boolean
 language sql stable as $f$ select iam.is_my_organization($1.organization_id) $f$;
create or replace function crm.in_my_organizations(r crm.party) returns boolean
 language sql stable as $f$ select iam.is_my_organization($1.organization_id) $f$;
create or replace function crm.in_my_organizations(r crm.outreach_list) returns boolean
 language sql stable as $f$ select iam.is_my_organization($1.organization_id) $f$;
create or replace function platform.in_my_organizations(r platform.outcome_event) returns boolean
 language sql stable as $f$ select iam.is_my_organization($1.organization_id) $f$;
grant execute on function crm.in_my_organizations(crm.party) to authenticated, service_role;
grant execute on function crm.in_my_organizations(crm.outreach_list) to authenticated, service_role;
grant execute on function platform.in_my_organizations(platform.outcome_event) to authenticated, service_role;

notify pgrst, 'reload schema';
