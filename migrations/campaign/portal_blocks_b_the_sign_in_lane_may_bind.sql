-- based-on: custom.portal_principal_bind(uuid, uuid, uuid) b10d96075340c0e5ead6014434bd2e1fe6dab9da0529f228dc624f357f106c8d
-- lane: PORTAL-BLOCKS
-- The portal sign-in route binds as service_role. The door admitted only the store owner, a signed-in person at their own address, or an organization admin, so the bind answered 'not a member of that organization' and the route still said ok. service_role may now bind when the auth user's address is the invited address.

CREATE OR REPLACE FUNCTION custom.portal_principal_bind(p_organization_id uuid, p_principal_id uuid, p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_pp    custom.portal_principal;
  v_p     custom.portal;
  v_lv    public.permission_level;
  v_email text;
  v_who   uuid := custom.query_principal();
begin
  perform custom.assert_store_door(p_organization_id, 'custom.portal_principal_bind');
  if p_user_id is null then
    raise exception 'Binding a portal principal needs the identity the platform''s auth gave them.'
      using errcode = '22004';
  end if;

  select * into v_pp from custom.portal_principal
   where id = p_principal_id and organization_id = p_organization_id;
  if not found then
    raise exception 'There is no such portal principal in this organization.' using errcode = '02000';
  end if;
  select * into v_p from custom.portal where id = v_pp.portal_id;

  -- AN INVITATION THAT IS ALREADY SOMEBODY'S STAYS THEIRS. Re-pointing a live portal login
  -- at a different person is a takeover, not a bind, and it belongs to no arm below.
  if v_pp.user_id is not null and v_pp.user_id <> p_user_id then
    raise exception 'That invitation already belongs to somebody else, so it cannot be bound again.'
      using errcode = '42501',
            hint = 'Withdraw it and invite the new person, so the customer who holds it now keeps their own record.';
  end if;

  -- WHO MAY BIND. The organization admin who invited them, the server lane that owns the
  -- store, or the invited person THEMSELF — and "themself" is settled by the address the
  -- invitation was sent to, read from the platform's own auth, never from an argument.
  if not custom.query_is_store_owner() then
    select u.email into v_email from auth.users u where u.id = p_user_id;
    if v_who is not null
       and v_who = p_user_id
       and v_email is not null
       and lower(btrim(v_email)) = lower(btrim(coalesce(v_pp.email, '')))
    then
      null;  -- the outsider arriving on their own link, at their own address
    elsif custom.caller_role() = 'service_role'::name
       and v_email is not null
       and lower(btrim(v_email)) = lower(btrim(coalesce(v_pp.email, '')))
    then
      -- PORTAL-BLOCKS 2026-10-18: THE SIGN-IN ROUTE'S OWN LANE. It holds the server key (no person,
      -- and service_role is not a member of the store owner's role, so the store-owner arm above
      -- never opened for it), and it binds only after `portal_invitation` said this address was
      -- invited, to the auth user minted for that same address. The address must still match.
      null;
    else
      perform custom.assert_client_may_change(p_organization_id, v_p.client_table_id,
                'custom.portal_principal_bind', 'admin'::public.permission_level, 'table');
    end if;
  end if;

  if not v_pp.is_active or not v_p.is_active then
    raise exception 'That invitation has been withdrawn, so it cannot be used to sign in.'
      using errcode = '42501';
  end if;

  update custom.portal_principal
     set user_id = p_user_id, bound_at = coalesce(bound_at, now())
   where id = v_pp.id;

  -- WHO DID IT. `iam._org_audit` stamps `actor_user_id` from `auth.uid()` inside itself, so
  -- the row names the seat that actually called this door.
  perform iam._org_audit(p_organization_id, p_user_id, 'portal_principal_bind',
            jsonb_build_object('principal_id', v_pp.id, 'portal_id', v_p.id, 'email', v_pp.email));

  -- THE ONE GRANT, WRITTEN AS THE AUTHORITY THIS DOOR ALREADY ESTABLISHED. This is the only
  -- access a portal ever writes: the outsider holds their own client record, and the
  -- association the portal declared carries every record that names it. Nothing here touches
  -- a Job or an Invoice, and nothing has to be re-run when one is written.
  --
  -- 🚨 PORTAL-BIND, 2026-09-21 — WHY THIS IS NO LONGER `custom.share_grant`. It was, and that
  -- is why the legitimate outsider could never finish: `share_grant` judges the CALLER at
  -- `admin` on the record being shared, and the customer arriving on her own link holds
  -- nothing on her client record — that is the whole point of her arriving. So the honest
  -- self-bind arm above was reachable, correct, and then died one call later, every time.
  -- (Lane GUARD-STAMPS measured it and named it as a product limitation for whoever owns this
  -- flow.) The authority for this grant was settled THIRTY LINES ABOVE, in this same
  -- transaction: the caller is the store owner, or an admin of the portal's client Table, or
  -- the invited person proved by the address the platform's own auth holds for them. Asking
  -- the arriving person for a level they can never hold was never a check — it was a bug that
  -- happened to look like one.
  --
  -- `invited_by` is carried as the author of the grant: the organization admin who invited
  -- this customer is who gave her this access, not the customer who followed the link.
  select max(pt.conveys_max) into v_lv from custom.portal_table pt where pt.portal_id = v_p.id;
  perform custom._share_write_person(p_organization_id, v_pp.client_record_id, p_user_id,
                                     coalesce(v_lv, 'viewer'::public.permission_level),
                                     coalesce(v_pp.invited_by, v_p.created_by), false);

  return jsonb_build_object(
    'bound', true,
    'principal_id', v_pp.id,
    'user_id', p_user_id,
    'client_record_id', v_pp.client_record_id,
    'level', coalesce(v_lv, 'viewer'::public.permission_level)::text,
    'say', format('%s now holds their own client record at %s, and every record that names it reaches them through it.',
                  v_pp.email, coalesce(v_lv, 'viewer'::public.permission_level)::text));
end $function$;
