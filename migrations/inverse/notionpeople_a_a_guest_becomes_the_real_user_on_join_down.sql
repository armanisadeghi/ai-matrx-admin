-- INVERSE of migrations/campaign/notionpeople_a_a_guest_becomes_the_real_user_on_join.sql.
-- Removes the two membership triggers and the three functions and puts custom._share_write_person
-- back to its previous body. Unmatched people already resolved stay resolved (their rows were
-- ordinary Person records and keep the user_id they were given).
-- lane: NOTION-PEOPLE

drop trigger if exists zz_unmatched_people_resolve_i on iam.memberships;
drop trigger if exists zz_unmatched_people_resolve_u on iam.memberships;

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

  -- The history row is already written: `zzz_history_grant_capture` fired inside the same
  -- statement. Nothing here files a second one.
  return v_perm;
end $function$;


drop function if exists custom._unmatched_people_resolve_on_join();
drop function if exists custom.unmatched_people_resolve(uuid, uuid);
drop function if exists custom._person_cell_repoint(jsonb, uuid, uuid);
delete from platform.client_callable_door
 where declared_by = 'notionpeople_a_a_guest_becomes_the_real_user_on_join.sql';
