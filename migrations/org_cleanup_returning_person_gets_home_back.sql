-- ORG-CLEANUP (2026-10-18): NO SESSION EVER OUTSIDE AN ORGANIZATION.
-- iam.provision_signup_organization used to hand a returning person their ARCHIVED organization back: it
-- picked the first active membership without looking at organizations.archived_at. Now:
--   1. an active membership in a NOT archived organization is the answer (unchanged otherwise);
--   2. else the newest archived organization the person OWNS is restored (iam.organization_restore's
--      semantics: archive fields cleared, custom._organization_work_return, org_admin_audit row);
--   3. else a fresh home is provisioned exactly as before.
-- And the one trigger on auth.users (on_auth_user_mirror) now also fires on email_confirmed_at /
-- last_sign_in_at: when a person confirms or signs in holding no active organization, it calls (1)-(3).
-- It never blocks a sign-in: a failure is recorded in ops.system_error and raised as a warning.
-- based-on: iam.provision_signup_organization(uuid) 9a74d4076e7fd375f323716d93185bbbca27c769ba66606cd083bf51a7dc66c1
-- based-on: iam._mirror_sign_in_account() e5f977c732926742bb2ed86be06abdda2dd69c4d65b404af7a39590a0e0194f3
-- based-on: trigger on_auth_user_mirror on auth.users c1aba43a546c7daad61258ef42c9fb2974c07b63c1abb1da8d82022e2969dfa4

set local lock_timeout = '2s';

CREATE OR REPLACE FUNCTION iam.provision_signup_organization(p_user_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_email     text;
  v_meta      jsonb;
  v_org_id    uuid;
  v_org_name  text;
  v_base_slug text;
  v_slug      text;
  v_attempt   int := 0;
  v_hex       text;
  v_app       jsonb;
  v_back      jsonb;
begin
  if p_user_id is null then
    raise exception 'provision_signup_organization: p_user_id cannot be NULL';
  end if;
  if not exists (select 1 from auth.users u where u.id = p_user_id) then
    raise exception 'provision_signup_organization: user % does not exist', p_user_id;
  end if;

  -- REC-43 "exactly one … no exceptions, no branches", which has to survive a retry: the
  -- person's membership IS the fact (REC-42 — no organization type decides anything here).
  -- ORG-CLEANUP (2026-10-18): an ARCHIVED organization is not a home — only an open one counts.
  select m.organization_id into v_org_id
    from iam.memberships m
    join iam.organizations o on o.id = m.organization_id
   where m.user_id = p_user_id
     and m.container_type = 'organization'
     and m.status = 'active'
     and m.deleted_at is null
     and o.archived_at is null
   order by m.created_at, m.organization_id
   limit 1;

  -- ORG-CLEANUP (2026-10-18): a returning person whose every organization was archived gets the newest
  -- one they own back (iam.organization_restore's semantics, run for the person themselves).
  if v_org_id is null then
    select o.id into v_org_id
      from iam.memberships m
      join iam.organizations o on o.id = m.organization_id
     where m.user_id = p_user_id
       and m.container_type = 'organization'
       and m.status = 'active'
       and m.deleted_at is null
       and m.role = 'owner'
       and o.archived_at is not null
       and not coalesce(o.is_system, false)
     order by o.archived_at desc, o.created_at desc, o.id
     limit 1;

    if v_org_id is not null then
      update iam.organizations
         set archived_at = null, archived_by = null, archive_reason = null,
             updated_at = now(), updated_by = p_user_id
       where id = v_org_id;
      v_back := custom._organization_work_return(v_org_id, p_user_id);
      insert into iam.org_admin_audit (organization_id, actor_user_id, action, detail)
      values (v_org_id, p_user_id, 'organization.restored',
              jsonb_build_object('reason', 'returning person had no open organization',
                                 'source', 'iam.provision_signup_organization',
                                 'brought_back', v_back));
    end if;
  end if;

  if v_org_id is null then
    select u.email, u.raw_user_meta_data, coalesce(u.raw_app_meta_data, '{}'::jsonb) into v_email, v_meta, v_app
      from auth.users u where u.id = p_user_id;
    v_hex := substring(replace(p_user_id::text, '-', ''), 1, 8);

    -- REC-45 / Doctrine R12, REUSED and not re-implemented: first name -> last name ->
    -- cleaned email local part, title-cased, never "personal", never "workspace".
    v_org_name := iam.auto_organization_name(v_meta, v_email);
    if v_org_name is null then
      v_org_name := 'Organization ' || v_hex;
      raise warning 'organization naming: user % has no name metadata and no email; named %. Ask the person to rename it in Settings > Organizations.',
        p_user_id, v_org_name;
    end if;

    -- The SLUG keeps its live derivation (email local part): live URLs resolve through it
    -- (access_gate_resolve_slug), and R12 changes the NAME, never the address.
    v_base_slug := nullif(split_part(coalesce(v_email, ''), '@', 1), '');
    if v_base_slug is null or length(v_base_slug) < 3 then
      v_base_slug := 'user-' || v_hex;
    end if;
    v_base_slug := trim(both '-' from
                     regexp_replace(
                       regexp_replace(lower(v_base_slug), '[^a-z0-9]', '-', 'g'),
                       '-+', '-', 'g'));
    if v_base_slug is null or v_base_slug = '' then
      v_base_slug := 'user-' || v_hex;
    end if;

    loop
      v_attempt := v_attempt + 1;
      if    v_attempt = 1   then v_slug := v_base_slug;
      elsif v_attempt <= 10 then v_slug := v_base_slug || '-' || v_attempt::text;
      else                       v_slug := v_base_slug || '-' || replace(p_user_id::text, '-', '');
      end if;
      begin
        -- ORG-CLEANUP (2026-10-18): a persona-factory account (app_metadata.test_fixture) gets an organization
        -- that SAYS it is a fixture, so every census and sweep recognizes it without guessing from names.
        insert into iam.organizations (name, slug, created_by, settings)
        values (v_org_name, v_slug, p_user_id,
                case when v_app ? 'test_fixture'
                     then jsonb_build_object('test_fixture', true,
                                             'fixture_marker', 'persona:' || coalesce(v_app #>> '{test_fixture,suite}', 'unknown'))
                     else '{}'::jsonb end)
        returning id into v_org_id;
        exit;
      exception when unique_violation then
        -- A concurrent signup for the same person can win either the slug or the creator
        -- invariant. Re-read the membership before treating this as a slug collision.
        select m.organization_id into v_org_id
          from iam.memberships m
          join iam.organizations o on o.id = m.organization_id
         where m.user_id = p_user_id and m.container_type = 'organization'
           and m.status = 'active' and m.deleted_at is null
           and o.archived_at is null
         order by m.created_at, m.organization_id limit 1;
        if v_org_id is not null then exit; end if;
        if v_attempt > 11 then raise; end if;
      end;
    end loop;
  end if;

  insert into iam.memberships
    (organization_id, container_type, container_id, user_id, role, status)
  values
    (v_org_id, 'organization', v_org_id, p_user_id, 'owner', 'active')
  on conflict (container_type, container_id, user_id) do nothing;

  -- 🚨 THE DEFAULT-ORGANIZATION WRITE IS GONE (2026-09-19 ruling, F1): a default organization is a
  -- DISPLAY preference the person may state for themselves; the membership above is the real fact.
  -- The preferences ROW is still created (a missing one is its own regression); only the organization
  -- column is left alone. It lives in the organization this signup holds (tenancy column NOT NULL).
  insert into users.user_preferences (user_id, preferences, organization_id)
  values (p_user_id, '{}'::jsonb, v_org_id)
  on conflict (user_id) do nothing;

  return v_org_id;
end;
$function$;

CREATE OR REPLACE FUNCTION iam._mirror_sign_in_account()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
-- signup-organization-creation: iam._mirror_sign_in_account — a person who confirms or signs in holding no
-- open organization gets their own home back (restored) or a fresh one, through iam.provision_signup_organization.
-- It is that person's own home organization; nothing is routed anywhere else.
declare
  _auth_prev_tier   text;
  _auth_prev_system text;
  _auth_prev_agent  text;
begin
  -- The one trigger on auth.users: keeps iam.users in step. Sign-up side effects hang off iam.users.
  if tg_op = 'INSERT' then
    insert into iam.users (id, is_anonymous, created_at)
    values (new.id, coalesce(new.is_anonymous, false), coalesce(new.created_at, now()))
    on conflict (id) do nothing;
    return null;
  end if;

  if (old.is_anonymous, old.email, old.phone, old.raw_app_meta_data)
     is distinct from (new.is_anonymous, new.email, new.phone, new.raw_app_meta_data) then
    update iam.users set is_anonymous = coalesce(new.is_anonymous, false), updated_at = now()
     where id = new.id;
    if not found then
      insert into iam.users (id, is_anonymous, created_at)
      values (new.id, coalesce(new.is_anonymous, false), coalesce(new.created_at, now()));
    end if;
  end if;

  -- ORG-CLEANUP (2026-10-18): NO SESSION EVER OUTSIDE AN ORGANIZATION. Confirming the email or signing in
  -- with no open organization (every one archived) restores the person's own, or provisions a fresh home.
  if (new.email_confirmed_at is distinct from old.email_confirmed_at
      or new.last_sign_in_at is distinct from old.last_sign_in_at)
     and new.deleted_at is null
     and exists (select 1 from iam.users iu where iu.id = new.id)
     and not exists (
       select 1 from iam.memberships m
         join iam.organizations o on o.id = m.organization_id
        where m.user_id = new.id and m.container_type = 'organization'
          and m.status = 'active' and m.deleted_at is null and o.archived_at is null) then
    _auth_prev_tier   := current_setting('app.actor_tier', true);
    _auth_prev_system := current_setting('app.actor_system', true);
    _auth_prev_agent  := current_setting('app.actor_agent', true);
    begin
      perform set_config('app.actor_tier', 'system', true);
      perform set_config('app.actor_system', 'auth.user_provisioning', true);
      perform set_config('app.actor_agent', '', true);
      perform iam.provision_signup_organization(new.id);
    exception when others then
      -- Never block a sign-in; scream with the remedy.
      perform ops.record_system_error(jsonb_build_object(
        'organization_id', '39c38960-d30c-4840-b0c1-c9960de95582'::uuid,
        'user_id', new.id,
        'kind', 'sign_in_home_organization_failed',
        'error_type', sqlstate,
        'error_text', format(
          'iam._mirror_sign_in_account: person %s signed in with no open organization and restoring/provisioning '
          || 'their home failed: %s (%s). Remedy: select iam.provision_signup_organization(%L);',
          new.id, sqlerrm, sqlstate, new.id),
        'source_app', 'database',
        'source_feature', 'auth'));
      raise warning 'sign-in home organization failed for %: % (%)', new.id, sqlerrm, sqlstate;
    end;
    perform set_config('app.actor_tier', coalesce(_auth_prev_tier, ''), true);
    perform set_config('app.actor_system', coalesce(_auth_prev_system, ''), true);
    perform set_config('app.actor_agent', coalesce(_auth_prev_agent, ''), true);
  end if;
  return null;
end;
$function$;

CREATE OR REPLACE TRIGGER on_auth_user_mirror
  AFTER INSERT OR UPDATE OF is_anonymous, email, phone, raw_app_meta_data, email_confirmed_at, last_sign_in_at
  ON auth.users FOR EACH ROW EXECUTE FUNCTION iam._mirror_sign_in_account();
