-- INVERSE of atsweep4_b_the_action_reads_in_lower_case_mid_sentence.sql: the two wall-refusal functions with the label as the map gives it.
-- chair-step: restores function bodies.
-- based-on: custom._not_a_member_refusal(text) 98b006d329920d43505d1b544f7bb14ce5701e798794d908d9d18fe464f43104
-- based-on: custom._not_a_member_refusal(text, uuid) 6c7c77f955b34ee4237a1b482939e2924930aea3238d5f214bb009c874bc1470
CREATE OR REPLACE FUNCTION custom._not_a_member_refusal(p_door text)
 RETURNS void
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'pg_catalog'
AS $function$
begin
  -- THE WALL'S REFUSAL, ONE SENTENCE IN ONE PLACE (moved here word for word from
  -- custom.assert_client_may_reach by CHAIR-WORLD-LANE, so the Table check says exactly the same).
  -- AT-SWEEP-4: the action in plain words, never the door; a door that is not in the map says what the client layer says.
  raise exception '%',
    case when custom._door_action_words(p_door) is null
         then 'You are not a member of that organization, so there is nothing for you to do there.'
         else format('You are not a member of that organization, so %s is not possible there.', custom._door_action_words(p_door)) end
    using errcode = '42501',
          hint = 'REC-29 / T15: organizations are hard walls, and a door decides who may reach one before it decides anything else. Switch to an organization you belong to, or ask an owner of that one to add you.';
end
$function$
;

CREATE OR REPLACE FUNCTION custom._not_a_member_refusal(p_door text, p_organization_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
begin
  -- HONEST-REFUSALS: a person who HAS a membership row on an organization that is ARCHIVED is not "not a
  -- member": the archive closed the organization (iam.has_org_access_for), the membership is kept so a
  -- restore gives everything back. She is told that, who can restore it, and the door that does.
  -- A non-member (or a null organization) meets the old sentence, word for word, below.
  if p_organization_id is not null and exists (
       select 1
         from iam.organization_member m
         join iam.organizations o on o.id = m.organization_id and o.archived_at is not null
        where m.organization_id = p_organization_id and m.user_id = (select auth.uid())) then
    raise exception '%',
      case when custom._door_action_words(p_door) is null
           then 'This organization is archived, so there is nothing for you to do there until an owner restores it.'
           else format('This organization is archived, so %s is not possible there until an owner restores it.', custom._door_action_words(p_door)) end
      using errcode = '42501',
            detail = 'organization_archived:' || p_organization_id::text,
            hint = 'Restore door: iam.organization_restore(p_org, p_confirm_name). Only an owner of the organization, or a super admin, can restore it; then every door works there again.';
  end if;
  perform custom._not_a_member_refusal(p_door);
end
$function$
;
