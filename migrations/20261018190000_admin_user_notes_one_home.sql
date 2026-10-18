-- admin.user_notes / admin.add_user_note / admin.my_user_notes — notes about a person, ONE home, shared
-- with every platform admin (users one-roof fix lane N2, 2026-10-18; owner ruling: notes about a person
-- are shared with all platform admins by default; any note can be "only me"). New functions; no based-on.
--
-- The home: platform Notes (workbench.notes) + one platform.associations edge note -> user (pair
-- registered by note_about_user_association_pair.sql, non-conveying).
--
-- Why a definer read (adversarial B1): the generic reader public.assoc_for_targets keeps an edge only
-- in an organization the READER belongs to, so admin B never saw a note admin A filed in A's admin
-- organization. admin.user_notes returns every live note linked to the person, to any platform admin,
-- hiding another author's "only me" notes (shown_to 'only_me').
--
-- Why a definer write: public.assoc_add needs viewer access to BOTH endpoints and iam.has_access('user',
-- <any person>) is false for everyone (even oneself, measured 2026-10-18), so the canonical door can never
-- write this pair, and a two-call client write could leave a note saved without its edge. add_user_note
-- writes the note and its edge in ONE transaction, in the organization the caller passes (their admin
-- organization: lib/organizations/adminOrganization.ts) — never a system organization, and only one the
-- caller belongs to.
--
-- Data: the 8 crm.party_research personal notes (all by one author) move into person-notes marked
-- "only me" for their author, in the row's own organization (the CRM organization). The research row
-- keeps its category, contact state and outreach (a category is not a note); its notes text is emptied
-- only after the note and edge exist. Counts are checked inside the transaction.

create or replace function admin.user_notes(p_user uuid)
returns table (
  id uuid,
  label text,
  content text,
  created_by uuid,
  shown_to platform.shown_to,
  pinned boolean,
  metadata jsonb,
  organization_id uuid,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' and session_user <> 'postgres'
     and not public.is_platform_admin() then
    raise exception 'admin.user_notes: platform admins only' using errcode = '42501';
  end if;
  -- idx_assoc_target_live (target_type, target_id) finds the edges; notes by pkey.
  return query
  select n.id, n.label, coalesce(n.content, ''), n.created_by, n.shown_to,
         coalesce((n.metadata->>'pinned')::boolean, false), n.metadata, n.organization_id,
         n.created_at, n.updated_at
    from (select distinct a.source_id
            from platform.associations a
           where a.target_type = 'user' and a.target_id = p_user
             and a.source_type = 'note' and a.deleted_at is null) e
    join workbench.notes n on n.id = e.source_id
   where n.deleted_at is null
     and (n.shown_to is distinct from 'only_me'::platform.shown_to or n.created_by = (select auth.uid()))
   order by coalesce((n.metadata->>'pinned')::boolean, false) desc, n.created_at desc;
end;
$$;

comment on function admin.user_notes(uuid) is
  'Every live note about one person (workbench.notes linked note -> user), for any platform admin; another author''s only-me notes are left out. The admin user page Notes tab reads this.';

create or replace function admin.my_user_notes()
returns table (
  user_id uuid,
  note_id uuid,
  content text,
  shown_to platform.shown_to,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'admin.my_user_notes: platform admins only' using errcode = '42501';
  end if;
  -- idx_notes_created_by, then idx_assoc_source_live (source_type, source_id).
  return query
  select a.target_id, n.id, coalesce(n.content, ''), n.shown_to, n.updated_at
    from workbench.notes n
    join platform.associations a
      on a.source_type = 'note' and a.source_id = n.id
     and a.target_type = 'user' and a.deleted_at is null
   where n.created_by = (select auth.uid()) and n.deleted_at is null
   order by n.updated_at desc;
end;
$$;

comment on function admin.my_user_notes() is
  'The caller''s own notes about people (note -> user edges), newest first. The Accounts "My notes" column and the Personal notes dialog read this.';

create or replace function admin.add_user_note(
  p_user uuid,
  p_organization_id uuid,
  p_content text,
  p_shown_to platform.shown_to default 'my_team',
  p_label text default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_note uuid;
begin
  if v_uid is null or not public.is_platform_admin() then
    raise exception 'admin.add_user_note: platform admins only' using errcode = '42501';
  end if;
  if p_organization_id is null then
    raise exception 'admin.add_user_note: an organization is required' using errcode = '23502';
  end if;
  if exists (select 1 from iam.organizations o where o.id = p_organization_id and o.is_system) then
    raise exception 'admin.add_user_note: notes about a person are never filed in a system organization' using errcode = '42501';
  end if;
  if not iam.has_org_access(p_organization_id) then
    raise exception 'admin.add_user_note: you are not a member of that organization' using errcode = '42501';
  end if;
  if not exists (select 1 from auth.users u where u.id = p_user) then
    raise exception 'admin.add_user_note: no such person' using errcode = 'P0002';
  end if;
  if coalesce(btrim(p_content), '') = '' then
    raise exception 'admin.add_user_note: the note is empty' using errcode = '23514';
  end if;

  insert into workbench.notes (label, content, organization_id, shown_to, created_by)
  values (coalesce(nullif(btrim(p_label), ''), 'Note about a person'), p_content, p_organization_id,
          coalesce(p_shown_to, 'my_team'::platform.shown_to), v_uid)
  returning id into v_note;

  insert into platform.associations (source_type, source_id, target_type, target_id, organization_id, created_by)
  values ('note', v_note, 'user', p_user, p_organization_id, v_uid);

  return v_note;
end;
$$;

comment on function admin.add_user_note(uuid, uuid, text, platform.shown_to, text) is
  'Write one note about a person and its note -> user edge in one transaction, in the caller''s organization (their admin organization; never a system one). Platform admins only.';

insert into platform.client_callable_door
  (schema_name, function_name, identity_args, identity_argtypes, reason, declared_by, non_client_lane, signed_in_callers, anonymous_callers, gate_predicate, argument_rules)
values
  ('admin', 'user_notes', 'p_user uuid', array['uuid'::regtype]::oid[],
   'READ. p_user is any auth user; the body refuses anyone but a platform admin (or the server) with 42501 and returns the notes linked to that person, minus other authors'' only-me notes.',
   'migrations/20261018190000_admin_user_notes_one_home.sql (users one-roof lane N2)',
   null, true, false, 'public.is_platform_admin()',
   '{"version":1,"arguments":{"p_user":{"type":"uuid","position":1,"optional":false,"check":"public.is_platform_admin() (or the service role), decided before the first read","foreign":{"note":"Any person; platform admins only.","bounded":true}}}}'::jsonb),
  ('admin', 'my_user_notes', '', array[]::oid[],
   'READ. No arguments; platform admins only (42501 otherwise); returns the caller''s own notes about people.',
   'migrations/20261018190000_admin_user_notes_one_home.sql (users one-roof lane N2)',
   null, true, false, 'public.is_platform_admin()',
   '{"version":1,"arguments":{}}'::jsonb),
  ('admin', 'add_user_note', 'p_user uuid, p_organization_id uuid, p_content text, p_shown_to platform.shown_to, p_label text',
   array['uuid'::regtype, 'uuid'::regtype, 'text'::regtype, 'platform.shown_to'::regtype, 'text'::regtype]::oid[],
   'WRITE. Platform admins only (42501); p_organization_id must be an organization the caller belongs to and never a system one; writes one workbench.notes row and its note -> user edge.',
   'migrations/20261018190000_admin_user_notes_one_home.sql (users one-roof lane N2)',
   null, true, false, 'public.is_platform_admin()',
   '{"version":1,"arguments":{"p_user":{"type":"uuid","position":1,"optional":false,"check":"public.is_platform_admin(), decided before the first write; the person must exist","foreign":{"note":"Any person; platform admins only.","bounded":true}},"p_organization_id":{"type":"uuid","position":2,"optional":false,"check":"iam.has_org_access(p_organization_id) and not a system organization","foreign":{"note":"An organization the caller belongs to.","bounded":true}},"p_content":{"type":"text","position":3,"optional":false,"foreign":{"not_an_id":true}},"p_shown_to":{"type":"platform.shown_to","position":4,"optional":true,"foreign":{"not_an_id":true},"null_rule":{"means":"shared with admins (my_team)"}},"p_label":{"type":"text","position":5,"optional":true,"foreign":{"not_an_id":true},"null_rule":{"means":"Note about a person"}}}}'::jsonb)
on conflict do nothing;

grant execute on function admin.user_notes(uuid) to authenticated, service_role;
grant execute on function admin.my_user_notes() to authenticated, service_role;
grant execute on function admin.add_user_note(uuid, uuid, text, platform.shown_to, text) to authenticated, service_role;

-- ── Data: crm.party_research personal notes -> person-notes, "only me" for their author ──────────────
do $$
declare
  v_src int;
  v_moved int := 0;
  v_note uuid;
  r record;
begin
  -- A server write names its system (platform._stamp_actor_tier).
  perform set_config('app.actor_system', 'migration:20261018190000_admin_user_notes_one_home', true);
  select count(*) into v_src from crm.party_research
   where deleted_at is null and coalesce(btrim(notes), '') <> '';

  for r in
    select pr.* from crm.party_research pr
     where pr.deleted_at is null and coalesce(btrim(pr.notes), '') <> ''
       and not exists (select 1 from workbench.notes n
                        where n.metadata->>'party_research_id' = pr.id::text and n.deleted_at is null)
  loop
    insert into workbench.notes (label, content, organization_id, shown_to, created_by, updated_by, created_at, metadata)
    values ('About ' || coalesce(nullif(btrim(r.label), ''), 'a person'), r.notes, r.organization_id,
            'only_me'::platform.shown_to, r.created_by, r.created_by, r.created_at,
            jsonb_build_object('migrated_from', 'crm.party_research', 'party_research_id', r.id::text))
    returning id into v_note;

    insert into platform.associations (source_type, source_id, target_type, target_id, organization_id, created_by, metadata)
    values ('note', v_note, 'user', r.subject_id, r.organization_id, r.created_by,
            jsonb_build_object('migrated_from', 'crm.party_research'));

    update crm.party_research set notes = '' where id = r.id;
    v_moved := v_moved + 1;
  end loop;

  if (select count(*) from workbench.notes n
        join platform.associations a on a.source_type = 'note' and a.source_id = n.id
                                    and a.target_type = 'user' and a.deleted_at is null
       where n.metadata->>'migrated_from' = 'crm.party_research' and n.deleted_at is null) < v_src then
    raise exception 'party_research notes migration lost a note: % source rows, % moved', v_src, v_moved;
  end if;
  if exists (select 1 from crm.party_research where deleted_at is null and coalesce(btrim(notes), '') <> '') then
    raise exception 'party_research notes migration left text behind';
  end if;
  raise notice 'party_research notes: % with text before, % moved into person-notes (only me)', v_src, v_moved;
end;
$$;
