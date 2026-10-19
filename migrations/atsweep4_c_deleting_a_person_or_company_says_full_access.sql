-- why: AT-SWEEP-4: public.crm_party_purge refused with "crm_party_purge: admin access required on the party" (the door name and a raw level word). It now says "Permanently deleting this needs Full access on this person or company." ONLY the text of that one message changes; the body (every DELETE and UPDATE, the access test, the activity log) is byte-identical. CHAIR STEP: the body holds DELETE statements; the custom data chair authorizes it.
-- Proof: scripts/campaign-tests/atsweep4_c_deleting_a_person_or_company_says_full_access.sql. Inverse: migrations/inverse/atsweep4_c_deleting_a_person_or_company_says_full_access_down.sql
-- chair-step: replaces public.crm_party_purge; its body holds DELETE statements, and only the text of the access refusal changes (diffed before/after in the lane report); the custom data chair authorized this file.
-- based-on: public.crm_party_purge(uuid) 334ef355ef61e8a6294a082be210412aa20685221ca08677610c2f92f2ea429c
CREATE OR REPLACE FUNCTION public.crm_party_purge(p_party uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_org uuid;
begin
  select organization_id into v_org from crm.party where id = p_party;
  if v_org is null then
    perform platform.refuse_not_found(format('crm_party_purge: party %s not found', p_party));
  end if;
  if not iam.has_access('party', p_party, 'admin') then
    raise exception 'Permanently deleting this needs Full access on this person or company.' using errcode = '42501';
  end if;

  delete from platform.associations
   where (source_type = 'party' and source_id = p_party) or (target_type = 'party' and target_id = p_party);
  delete from platform.comments where entity_type = 'party' and entity_id = p_party;
  delete from platform.user_entity_state where entity_type = 'party' and entity_id = p_party;
  delete from crm.outreach_list_member where party_id = p_party;
  delete from crm.interaction where party_id = p_party;
  delete from crm.party_contact_point where party_id = p_party;
  delete from crm.address where party_id = p_party;
  delete from crm.affiliation where party_id = p_party or employer_party_id = p_party;
  delete from crm.party_merge where winner_id = p_party or loser_id = p_party;
  delete from history.row_versions where entity_type in ('party','crm_affiliation') and row_id = p_party;
  update crm.party set canonical_id = null where canonical_id = p_party;
  update crm.party set source_party_id = null where source_party_id = p_party;
  update crm.party set primary_employer_party_id = null where primary_employer_party_id = p_party;
  update crm.deal set primary_party_id = null where primary_party_id = p_party;
  delete from crm.party where id = p_party;

  perform platform.log_activity(v_org, 'crm.party.purge', 'party', p_party, '{}'::jsonb);
end $function$
;
