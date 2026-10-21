-- LANE CLOSE-SHARE — CD-SHARE-07: a view link can stop copying of the data it shows.
-- RED before 20261021130000_closeshare_a_view_link_can_restrict_copy (the door is missing), GREEN after.
-- One transaction, always ROLLBACK: python3 scripts/campaign-tests/viewlink_run.py <this file> [<migration>]
-- Fixture: admin@admin.com's own view "All intakes" in admin's Workspace; the link is minted inside the transaction.
do $t$
declare
  c_admin_j constant text := '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated"}';
  c_out_j   constant text := '{"sub":"000eaa28-cf5d-402a-8f01-5e2c24191323","role":"authenticated"}';
  c_view    constant uuid := '7ac5c390-c180-4738-8001-a5ad52a218f3';
  v_made jsonb; v_link uuid; v_tok text; v_res jsonb; v_out jsonb; v_flag boolean;
begin
  perform set_config('request.jwt.claims', c_admin_j, true);
  v_made := public.create_share_link('platform_saved_view', c_view, 'viewer', null, null, 'closeshare test');
  select l.id, l.token into v_link, v_tok from platform.share_links l
   where l.resource_type = 'platform_saved_view' and l.resource_id = c_view and l.label = 'closeshare test' and l.is_active
   order by l.created_at desc limit 1;
  if v_link is null then raise exception 'setup: no link was made (%)', v_made; end if;

  -- 1. a new link copies freely
  v_out := custom.shared_view_read(v_tok, null, null);
  if v_out is null or v_out ? 'restrict_copy' then raise exception '1: a new link already restricts copy (%)', left(v_out::text, 200); end if;

  -- 2. an outsider cannot switch it
  perform set_config('request.jwt.claims', c_out_j, true);
  v_res := custom.set_view_share_link_copy(v_link, true);
  if coalesce((v_res ->> 'success')::boolean, false) then raise exception '2: an outsider changed the link (%)', v_res; end if;
  if v_res ->> 'error' is distinct from 'Link not found or not yours' then raise exception '2: refusal sentence was %', v_res; end if;

  -- 3. the maker switches it on: the list and the read door both say so
  perform set_config('request.jwt.claims', c_admin_j, true);
  v_res := custom.set_view_share_link_copy(v_link, true);
  if not coalesce((v_res ->> 'success')::boolean, false) then raise exception '3: the maker was refused (%)', v_res; end if;
  select s.restrict_copy into v_flag from custom.view_share_links(c_view) s where s.id = v_link;
  if v_flag is distinct from true then raise exception '3: the list says restrict_copy=%', v_flag; end if;
  v_out := custom.shared_view_read(v_tok, null, null);
  if (v_out ->> 'restrict_copy') is distinct from 'true' then raise exception '3: the read door did not pass restrict_copy (%)', left(v_out::text, 200); end if;

  -- 4. and off again
  v_res := custom.set_view_share_link_copy(v_link, false);
  select s.restrict_copy into v_flag from custom.view_share_links(c_view) s where s.id = v_link;
  v_out := custom.shared_view_read(v_tok, null, null);
  if v_flag is distinct from false or v_out ? 'restrict_copy' then raise exception '4: switching off did not stick (% / %)', v_flag, left(v_out::text, 200); end if;

  raise notice 'closeshare restrict copy: 4/4 green';
end
$t$;
