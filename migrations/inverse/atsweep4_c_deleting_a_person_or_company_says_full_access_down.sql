-- INVERSE of atsweep4_c_deleting_a_person_or_company_says_full_access.sql: the earlier message text, body otherwise identical.
-- chair-step: restores the body of public.crm_party_purge (DELETE statements); the custom data chair authorized the up file.
-- based-on: public.crm_party_purge(uuid) f5ea092198dfc74abd6dc9ddf6ed7a0a938b9ed9f5a1dd3a5e5674f06d2c37e5
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
    raise exception 'crm_party_purge: admin access required on the party' using errcode = '42501';
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
