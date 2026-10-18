-- chair-step: removes the in_my_organizations overloads for crm.deal / crm.merge_candidate / crm.party_merge / platform.rulebook and platform.listed_in_my_organizations; the CRM deal list, duplicate review and masterwork browse then answer PGRST "column does not exist" until the client change is reverted too.
drop function if exists crm.in_my_organizations(crm.deal);
drop function if exists crm.in_my_organizations(crm.merge_candidate);
drop function if exists crm.in_my_organizations(crm.party_merge);
drop function if exists platform.in_my_organizations(platform.rulebook);
drop function if exists platform.listed_in_my_organizations(platform.rulebook);
notify pgrst, 'reload schema';
