// Compatibility path for account preference callers. The implementation lives
// with the one organization-choice reader so those columns have one owner.
export {
  forgetAccountPreferencesRow,
  readAccountPreferencesRow,
  type AccountPreferencesAnswer,
  type AccountPreferencesRow,
} from "@/lib/organizations/accountOrganizationChoices";
