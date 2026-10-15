-- lane: AT-SHARE
-- scope: custom.share_grant no longer refuses a whole Table for a person outside the organization (Arman ruling 2026-10-11: outside follows the inside rule; the ladder's iam.may_grant_as still caps the level). Replaces one body; same signature, no door-row change, no data touched.
-- additive: no (it removes a refusal, so more calls succeed; nothing existing stops working)
-- based-on: custom.share_grant(uuid, uuid, text, uuid, permission_level) 7e8ed31402173acd1b584e7c8043416c606f6a8836c3747d6b0c0b0ad2390a1a

CREATE OR REPLACE FUNCTION custom.share_grant(p_organization_id uuid, p_subject_id uuid, p_principal_kind text, p_principal_id uuid, p_level permission_level DEFAULT 'viewer'::permission_level)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_kind   text := lower(btrim(coalesce(p_principal_kind, '')));
  v_row    custom.record;
  v_word   text;
  v_perm   uuid;
  v_before public.permission_level;
begin
  perform custom.assert_store_door(p_organization_id, 'share_grant');
  -- THE ONE LADDER at the rung whose whole definition is "can change it and decide who else
  -- may". Not `created_by`: VIS-17 has one ladder and `admin` is on it.
  perform custom.assert_client_may_change(p_organization_id, p_subject_id, 'share_grant',
                                          'editor'::public.permission_level, 'record');
  if not custom.query_is_store_owner() and custom.query_principal() is not null
     and iam.may_grant_as(custom.query_principal(), 'record', p_subject_id, p_level, 'person', p_principal_id) is not null then
    raise exception '%', iam.may_grant_as(custom.query_principal(), 'record', p_subject_id, p_level, 'person', p_principal_id) using errcode = '42501';
  end if;

  select r.* into v_row from custom.record r
   where r.organization_id = p_organization_id and r.id = p_subject_id;
  if not found then
    raise exception 'There is no such record in this organization, so it cannot be shared.'
      using errcode = '02000';
  end if;
  v_word := case when v_row.table_id = custom.table_kernel_id() then 'table' else 'record' end;

  if p_level is null then
    raise exception 'A share has to say what the other person may do with it.'
      using errcode = '22004',
            hint = 'Pass one of viewer, commenter, editor, admin — call custom.share_levels() for what each one means.';
  end if;
  -- SHARE-PEOPLE-ONLY (owner ruling, Arman 2026-09-23: access is personal). A share names a
  -- PERSON. An organization is never a grantee here; "Add everyone in <organization>" in the
  -- dialog names each current member instead.
  if v_kind = 'organization' then
    raise exception 'Shares name a person, not an organization.'
      using errcode = '22023',
            hint = 'Name the people. The Share dialog''s "Add everyone in <organization>" lists the organization''s current members and grants each of them by name; people who join later are not included.';
  end if;
  if v_kind not in ('person', 'user') then
    raise exception 'A share names a person, and "%" is not one.', coalesce(p_principal_kind, '<nothing>')
      using errcode = '22023',
            hint = 'Use kind `person` with the person''s id.';
  end if;
  if p_principal_id is null then
    raise exception 'A share has to say WHO it is shared with.' using errcode = '22004';
  end if;

  -- Only a person reaches here (the organization kind was refused above).
  -- VIS-31: a person outside the organization is an EXTERNAL principal, and that lane is off
  -- UNLESS this organization has opened it by declaring a portal and naming this person in
  -- it (PORTAL, 2026-09-20). A portal principal is the one non-member this door will write a
  -- grant for, and it writes exactly the grant the portal's own binding asks for — on the
  -- client's own record, which is the thing every Job and Invoice of theirs hangs off.
  -- Everybody else still gets the refusal below, by name, rather than a grant that confers
  -- nothing.
  -- AT-SHARE 2026-10-15 (owner ruling, Arman 2026-10-11): sharing outside the organization follows
  -- the same rule as inside. A whole Table goes to any person at the levels the ladder allows
  -- (`iam.may_grant_as` above: Edit may share View / Comment / Edit, Full shares at Full), exactly
  -- as a row always could. The refusal that stood here for a non-member on a Table is gone; the
  -- outside invitation lane (`custom.table_share_outside_*`) stays for people with no account yet.

  -- WHAT WAS HELD BEFORE, read before the write, because the sentence at the bottom says
  -- "Changed from X to Y" and the write is about to make that unreadable.
  select p.permission_level into v_before
    from iam.permissions p
   where p.resource_type = 'record' and p.resource_id = p_subject_id
     and p.granted_to_user_id = p_principal_id;

  -- PORTAL-BIND: THE ONE WRITER. The authority for this call was decided four lines into
  -- this body (`assert_client_may_change` at admin on the subject) and the ownership rung
  -- and the level shape are judged inside the writer, where the other two callers get the
  -- same answers. This door hand-wrote the row until 2026-09-21 and so did
  -- `custom.table_share_outside_accept`, which is two implementations of one write.
  v_perm := custom._share_write_person(p_organization_id, p_subject_id, p_principal_id,
                                       p_level, custom.query_principal());

  -- The history row is already written: `zzz_history_grant_capture` fired inside this same
  -- statement. Nothing here files a second one.
  return jsonb_build_object(
    'shared', true,
    'subject', v_word,
    'permission_id', v_perm,
    'principal_kind', case when v_kind = 'user' then 'person' else v_kind end,
    'principal_id', p_principal_id,
    'level', p_level::text,
    'level_label', iam.level_label(v_word, p_level),
    'was', v_before::text,
    'message', case when v_before is null
                    then format('Shared at %s.', lower(iam.level_label(v_word, p_level)))
                    else format('Changed from %s to %s.', lower(iam.level_label(v_word, v_before)),
                                lower(iam.level_label(v_word, p_level))) end);
end;
$function$
