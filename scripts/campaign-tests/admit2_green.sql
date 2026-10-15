-- ADMIT-2 — THE GREEN SUITE (2026-10-15). Ends in ROLLBACK and leaves nothing.
--
-- It asks, from each person's OWN SEAT (`authenticated` with that person's claims):
--   A. a person holding a share on ONE row reads the choice labels of THAT row's Table, and of no other Table;
--   B. a stranger (no membership, no share) is refused both;
--   C. a member of an ORGANIZATION a row was shared with is admitted exactly like a person share and sees only
--      the shared row;
--   D. an archived or expired organization share admits nobody.
-- Fixtures are real rows of one live organization (grants inserted inside this transaction only):
--   org 069ee468 (live, external_principal_enabled)  Table A (61d429cb, Field d96eecce has choices)  Table B (404d9100, Field 0b6f9a48 has choices)
begin;
set local lock_timeout = '10s';
set local statement_timeout = '60s';
create or replace function pg_temp.seat(p_user uuid, p_org uuid, p_field uuid) returns text
language plpgsql as $f$
declare v_n int;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated', 'aud', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_user::text, true);
  set local role authenticated;
  begin
    select count(*) into v_n from custom.field_options(p_org, p_field);
    reset role;
    return v_n::text;
  exception when others then
    reset role;
    return 'refused: ' || sqlerrm;
  end;
end $f$;
do $suite$
declare
  c_org    constant uuid := '069ee468-65f2-46a1-8fb4-f2b3dd3d9f0a';
  c_tab_a  constant uuid := '61d429cb-59a0-4a6f-85a1-1e74120c40a6';
  c_fld_a  constant uuid := 'd96eecce-3951-48b0-a528-8820ffb2168e';
  c_fld_b  constant uuid := '0b6f9a48-20f9-4870-a8e1-99b41f964169';
  c_rowshare constant uuid := '000eaa28-cf5d-402a-8f01-5e2c24191323';  -- member of another organization only
  c_orgmem   constant uuid := '0075faa5-9b61-47d1-988a-9bf697a9b993';  -- member of fb5bd1b7 only
  c_orgfrom  constant uuid := 'fb5bd1b7-429b-4cf9-b9e5-6899dad1a1e3';
  c_stranger constant uuid := 'e037f414-09fb-45d6-8f56-266744427fc3';
  v_row1 uuid; v_row2 uuid; v_perm uuid;
  v_n int; v_a text; v_b text; v_ids uuid[]; v_adm boolean;
begin
  select id into v_row1 from custom.record where table_id = c_tab_a and organization_id = c_org and deleted_at is null order by created_at limit 1;
  select id into v_row2 from custom.record where table_id = c_tab_a and organization_id = c_org and deleted_at is null order by created_at desc limit 1;
  assert v_row1 <> v_row2, 'fixture: need two rows';

  -- A. a share on ONE row
  insert into iam.permissions (resource_type, resource_id, granted_to_user_id, permission_level, status, created_by)
  values ('record', v_row1, c_rowshare, 'commenter', 'active', c_rowshare);
  v_a := pg_temp.seat(c_rowshare, c_org, c_fld_a); v_b := pg_temp.seat(c_rowshare, c_org, c_fld_b);
  assert v_a ~ '^[1-9][0-9]*$', format('A: row-share holder must get the choice labels of their row''s Table, got %s', v_a);
  assert v_b in ('0') or v_b like 'refused%', format('A: row-share holder must NOT get another Table''s choices, got %s', v_b);

  -- B. a stranger
  v_a := pg_temp.seat(c_stranger, c_org, c_fld_a); v_b := pg_temp.seat(c_stranger, c_org, c_fld_b);
  assert v_a like 'refused%' and v_b like 'refused%', format('B: stranger must be refused both, got %s / %s', v_a, v_b);

  -- C. an organization share
  perform set_config('iam.org_availability', iam._org_availability_token(), true);
  insert into iam.permissions (resource_type, resource_id, granted_to_organization_id, permission_level, status, created_by, granted_via)
  values ('record', v_row2, c_orgfrom, 'viewer', 'active', c_orgmem, 'availability') returning id into v_perm;
  assert custom.portal_admits(c_org, c_orgmem), 'C: a member of the organization a row was shared with must be admitted';
  v_a := pg_temp.seat(c_orgmem, c_org, c_fld_a); v_b := pg_temp.seat(c_orgmem, c_org, c_fld_b);
  assert v_a ~ '^[1-9][0-9]*$', format('C: org-share member must get their row''s Table choices, got %s', v_a);
  assert v_b in ('0') or v_b like 'refused%', format('C: org-share member must NOT get another Table''s choices, got %s', v_b);
  perform set_config('request.jwt.claims', json_build_object('sub', c_orgmem, 'role', 'authenticated', 'aud', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', c_orgmem::text, true);
  set local role authenticated;
  select array_agg(q) into v_ids from custom.query_visible_ids(c_org, c_tab_a) q;
  reset role;
  assert v_ids = array[v_row2], format('C: org-share member must see only the shared row, saw %s', v_ids);

  -- E. the link list an outsider reads names only links whose both ends they may see
  perform set_config('request.jwt.claims', json_build_object('sub', c_orgmem, 'role', 'authenticated', 'aud', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', c_orgmem::text, true);
  set local role authenticated;
  select count(*) into v_n from custom.query_relation_edges(c_org) e where not (e.parent_id = v_row2 and e.child_id = v_row2);
  reset role;
  assert v_n = 0, format('E: an outsider must read only links between rows they can see, read %s others', v_n);

  -- D. archived, then expired
  update iam.permissions set status = 'archived' where id = v_perm;
  assert not custom.portal_admits(c_org, c_orgmem), 'D: an archived organization share must admit nobody';
  assert pg_temp.seat(c_orgmem, c_org, c_fld_a) like 'refused%', 'D: archived org share must refuse the choices';
  update iam.permissions set status = 'active', expires_at = now() - interval '1 day' where id = v_perm;
  assert not custom.portal_admits(c_org, c_orgmem), 'D: an expired organization share must admit nobody';
  assert pg_temp.seat(c_orgmem, c_org, c_fld_a) like 'refused%', 'D: expired org share must refuse the choices';
  raise notice 'ADMIT-2 green: all assertions held';
end
$suite$;
rollback;
