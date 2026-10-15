-- lane: NOTION-PEOPLE
-- lock: custom,iam
-- scope: new internal functions custom.unmatched_people_resolve / custom._person_cell_repoint / custom._unmatched_people_resolve_on_join (server_only door rows, no client grant), two triggers on iam.memberships (insert as active / becomes active), and custom._share_write_person re-created with ONE added line (perform custom.unmatched_people_resolve). No table, policy or client grant changes.
-- based-on: custom._share_write_person(uuid, uuid, uuid, permission_level, uuid, boolean) 30a5adcb1f62eefb730a33ded3dd66b8be97132cb2db38fd08f82a0638c09689
-- inverse: migrations/inverse/notionpeople_a_a_guest_becomes_the_real_user_on_join_down.sql
--
-- A GUEST BECOMES THE REAL USER WHEN THEY JOIN. A person cell written as {email, name} for someone
-- who is not a member is kept as an UNMATCHED Person (a custom.record of the Person kernel with
-- data.unmatched = true, the name and the email; table_api/values.py `_people`). Nothing turned it
-- back into the user when that email later joined. This is the one resolver, hung on the two events
-- that already exist: a membership row appearing (an invitation accepted, a person added, a signup
-- through an invite) and the ONE writer of a person's share (an outside invitation accepted, an
-- outside grant, a portal bind). No second people table and no schedule.
--
-- WHAT IT DOES, per organization the person is now in: for every unmatched Person there whose
-- email is the user's sign-in email,
--   . the user has no Person card there yet  -> the unmatched Person BECOMES the card (user_id set,
--     the unmatched flag cleared); every cell already points at it, so nothing else moves;
--   . the user already has a card            -> every person cell in that organization that names
--     the unmatched Person is re-pointed to the card, and the unmatched Person is archived.
-- A trigger never blocks the join: a failure is raised as a WARNING naming the cause.

create or replace function custom._person_cell_repoint(p_cell jsonb, p_from uuid, p_to uuid)
 returns jsonb
 language sql
 immutable
 set search_path to 'pg_catalog'
as $function$
  select case jsonb_typeof(p_cell)
    when 'string' then case when p_cell #>> '{}' = p_from::text then to_jsonb(p_to::text) else p_cell end
    when 'array' then (
      select coalesce(jsonb_agg(d.e order by d.ord), '[]'::jsonb)
        from (select distinct on (m.e::text) m.e, m.ord
                from (select case
                               when jsonb_typeof(x.e) = 'string' and x.e #>> '{}' = p_from::text then to_jsonb(p_to::text)
                               when jsonb_typeof(x.e) = 'object' and coalesce(x.e ->> 'id', x.e ->> 'record_id') = p_from::text
                                 then jsonb_set(x.e, '{id}', to_jsonb(p_to::text))
                               else x.e end as e, x.ord
                        from jsonb_array_elements(p_cell) with ordinality as x(e, ord)) m
               order by m.e::text, m.ord) d)
    else p_cell end;
$function$;

create or replace function custom.unmatched_people_resolve(p_organization_id uuid, p_user_id uuid)
 returns integer
 language plpgsql
 security definer
 set search_path to 'pg_catalog'
as $function$
declare
  v_email text;
  v_card  uuid;
  v_n     integer := 0;
  u       record;
  f       record;
begin
  -- Who it is: the sign-in email of the user. No email, nothing to match.
  select lower(nullif(trim(a.email::text), '')) into v_email from auth.users a where a.id = p_user_id;
  if v_email is null or p_organization_id is null then
    return 0;
  end if;

  for u in
    select r.id, r.data
      from custom.record r
     where r.organization_id = p_organization_id
       and r.table_id = custom.person_kernel_id()
       and r.deleted_at is null
       and r.data ->> 'unmatched' = 'true'
       and lower(coalesce(r.data ->> 'email', '')) = v_email
     order by r.created_at
  loop
    select c.id into v_card
      from custom.record c
     where c.organization_id = p_organization_id
       and c.table_id = custom.person_kernel_id()
       and c.deleted_at is null
       and c.data ->> 'user_id' = p_user_id::text
     order by c.created_at
     limit 1;

    if v_card is null then
      -- the first one becomes the user's card; every cell already points at it
      update custom.record
         set data = (data - 'unmatched') || jsonb_build_object('user_id', p_user_id::text)
       where id = u.id;
    else
      for f in
        select fl.key, fl.entity_definition_id
          from custom.field fl
         where fl.organization_id = p_organization_id
           and fl.relation_target = custom.person_kernel_id()
      loop
        update custom.record r
           set data = jsonb_set(r.data, array[f.key], custom._person_cell_repoint(r.data -> f.key, u.id, v_card))
         where r.organization_id = p_organization_id
           and r.table_id = f.entity_definition_id
           and r.data ? f.key
           and (r.data -> f.key)::text like '%' || u.id::text || '%';
      end loop;
      update custom.record set deleted_at = now() where id = u.id;
    end if;
    v_n := v_n + 1;
  end loop;
  return v_n;
end
$function$;
comment on function custom.unmatched_people_resolve(uuid, uuid) is
  'NOTION-PEOPLE — an email that joins an organization (membership row) or is shared into it (custom._share_write_person) turns every unmatched Person with that email into the real user: the Person becomes the user''s card, or its cells are re-pointed to the card that exists. Answers how many unmatched people were resolved. Server only.';

create or replace function custom._unmatched_people_resolve_on_join()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'pg_catalog'
as $function$
begin
  begin
    perform custom.unmatched_people_resolve(new.organization_id, new.user_id);
  exception when others then
    -- a tidy-up never blocks a person from joining, and never fails quietly
    raise warning 'unmatched people were not resolved for user % in organization %: % (%)', new.user_id, new.organization_id, sqlerrm, sqlstate;
  end;
  return new;
end
$function$;

-- iam.organization_member is a VIEW over iam.memberships (active organization rows), so the trigger
-- sits on the table: a row arriving active, or a row becoming active (an invitation accepted).
create trigger zz_unmatched_people_resolve_i
  after insert on iam.memberships
  for each row when (new.container_type = 'organization' and new.status = 'active' and new.deleted_at is null)
  execute function custom._unmatched_people_resolve_on_join();
create trigger zz_unmatched_people_resolve_u
  after update of status, deleted_at on iam.memberships
  for each row when (new.container_type = 'organization' and new.status = 'active' and new.deleted_at is null
                     and (old.status is distinct from 'active' or old.deleted_at is not null))
  execute function custom._unmatched_people_resolve_on_join();

create or replace function custom._share_write_person(p_organization_id uuid, p_subject_id uuid, p_user_id uuid, p_level permission_level, p_by uuid DEFAULT NULL::uuid, p_restore_removed boolean DEFAULT true)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_row  custom.record;
  v_word text;
  v_perm uuid;
  v_res  jsonb;
begin
  -- 🚨 THIS FUNCTION DECIDES NOTHING ABOUT THE CALLER, ON PURPOSE, AND HOLDS NO GRANT TO
  -- `authenticated`. Its three callers each hold a DIFFERENT authority — a caller at admin on
  -- the record, an invitation token an admin minted, and a portal bind ladder — and the one
  -- thing they share is the row they end up writing. Folding the authority in here would mean
  -- one shape for three authorities, which is how the portal door came to demand a level the
  -- arriving person could never hold. Its registry row in `platform.client_callable_door`
  -- carries this same sentence as a `non_client_lane`.
  if p_user_id is null then
    raise exception 'A share has to say WHO it is shared with.' using errcode = '22004';
  end if;
  if p_level is null then
    raise exception 'A share has to say what the other person may do with it.'
      using errcode = '22004',
            hint = 'Pass one of viewer, commenter, editor, admin — call custom.share_levels() for what each one means.';
  end if;

  select r.* into v_row from custom.record r
   where r.organization_id = p_organization_id and r.id = p_subject_id;
  if not found then
    raise exception 'There is no such record in this organization, so it cannot be shared.'
      using errcode = '02000';
  end if;
  v_word := case when v_row.table_id = custom.table_kernel_id() then 'table' else 'record' end;

  if p_user_id = v_row.created_by then
    raise exception 'That person already owns this %, which is the rung above every level you could grant.', v_word
      using errcode = '23505', hint = 'VIS-25: Owner is the top rung and is held on the record itself.';
  end if;

  -- THE ONE WRITER (T-32e). The store's door decided the authority; the level is set exactly.
  -- A grant a person removed comes back only on a deliberate share (p_restore_removed): an
  -- invitation accepted later or a portal bind never gives it back, and says so.
  v_res := iam.share_with_person('record', p_subject_id, p_user_id, p_level,
                                 coalesce(p_by, custom.query_principal()), p_restore_removed, 'record_store',
                                 null, true, null);
  if not coalesce((v_res ->> 'success')::boolean, false) then
    raise exception '%', v_res ->> 'error'
      using errcode = '42501', hint = 'Share it with them directly, from the record''s Share, to give it back.';
  end if;
  v_perm := (v_res ->> 'permission_id')::uuid;

  -- NOTION-PEOPLE: a guest the organization kept by name and email is now a person it shares with —
  -- every unmatched Person holding this email becomes this user. Never blocks the share.
  begin
    perform custom.unmatched_people_resolve(p_organization_id, p_user_id);
  exception when others then
    raise warning 'unmatched people were not resolved for user % in organization %: % (%)', p_user_id, p_organization_id, sqlerrm, sqlstate;
  end;

  -- The history row is already written: `zzz_history_grant_capture` fired inside the same
  -- statement. Nothing here files a second one.
  return v_perm;
end $function$;


insert into platform.client_callable_door
  (schema_name, function_name, identity_args, identity_argtypes, reason, declared_by,
   non_client_lane, signed_in_callers, anonymous_callers, anonymous_purpose, argument_rules)
values
  ('custom', 'unmatched_people_resolve', 'p_organization_id uuid, p_user_id uuid', array['uuid'::regtype, 'uuid'::regtype]::oid[],
   'Turns every unmatched Person of one organization whose email is the given user''s sign-in email into that user. Rewrites person cells of one organization only.',
   'notionpeople_a_a_guest_becomes_the_real_user_on_join.sql',
   'server_only: called only by the iam.memberships triggers (a membership row the join doors already judged) and by custom._share_write_person (the one writer of a person''s share, whose three callers each decided their authority). A client call would let anybody claim another person''s guests by naming their user id.',
   false, false, null, null),
  ('custom', '_unmatched_people_resolve_on_join', '', array[]::oid[],
   'Trigger function on iam.memberships: calls custom.unmatched_people_resolve for the new member and never blocks the join.',
   'notionpeople_a_a_guest_becomes_the_real_user_on_join.sql',
   'server_only: a trigger function; it takes no arguments and is never called by a client.',
   false, false, null, null),
  ('custom', '_person_cell_repoint', 'p_cell jsonb, p_from uuid, p_to uuid', array['jsonb'::regtype, 'uuid'::regtype, 'uuid'::regtype]::oid[],
   'Pure helper: one person cell value with one Person id replaced by another (string, list of strings, or {id} objects), without duplicates.',
   'notionpeople_a_a_guest_becomes_the_real_user_on_join.sql',
   'server_only: a pure helper of custom.unmatched_people_resolve; it reads no table.',
   false, false, null, null)
on conflict do nothing;

-- the door registry above says server_only; this makes the grants say it too (as every campaign door file does)
select custom.reopen_declared_doors();
