-- LANE CLOSE-SHARE — CD-SHARE-11: an outside person is marked Guest on the share list (public.get_resource_permissions).
-- RED before 20261021131000_closeshare_b_an_outside_person_is_marked_guest, GREEN after. One transaction, always ROLLBACK:
--   python3 scripts/campaign-tests/viewlink_run.py <this file> [<migration>]
-- Fixture: admin@admin.com's Space "Using this workspace" (admin's Workspace); test@test.com is a member there, the outside
-- person is not. Both grants are made inside the transaction.
do $t$
declare
  c_admin_j constant text := '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated"}';
  c_doc     constant uuid := '2d18584d-1dbd-403f-bb56-46b0c35f7bc5';
  c_member  constant uuid := '4060701e-706a-4c76-b3ca-0bbc69fa5a14';
  c_out     constant uuid := '000eaa28-cf5d-402a-8f01-5e2c24191323';
  v_m jsonb; v_o jsonb;
begin
  perform set_config('app.actor_system', 'campaign-test/closeshare', true);
  insert into iam.permissions (resource_type, resource_id, granted_to_user_id, permission_level, created_by)
  values ('document', c_doc, c_member, 'viewer', '87a6e699-3622-4869-8843-d0867456c0dd'),
         ('document', c_doc, c_out, 'viewer', '87a6e699-3622-4869-8843-d0867456c0dd')
  on conflict do nothing;
  perform set_config('request.jwt.claims', c_admin_j, true);
  select p.granted_to_user into v_m from public.get_resource_permissions('document', c_doc) p where p.granted_to_user_id = c_member;
  select p.granted_to_user into v_o from public.get_resource_permissions('document', c_doc) p where p.granted_to_user_id = c_out;
  if v_m is null or v_o is null then raise exception 'setup: the two grants are not listed (% / %)', v_m, v_o; end if;
  if (v_o ->> 'isGuest') is distinct from 'true' then raise exception '1: the outside person is not marked Guest (%)', v_o; end if;
  if (v_m ->> 'isGuest') is distinct from 'false' then raise exception '2: the member is marked %', v_m ->> 'isGuest'; end if;
  raise notice 'closeshare guest: 2/2 green';
end
$t$;
