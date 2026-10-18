// THE words for an admin audit action (N2): "account_close" / "Account Close" → "Account close".
// The Admin history tab formats admin.admin_audit_log / iam.org_admin_audit rows with it, and the
// Activity tab re-formats the admin rows admin.user_activity titles (SQL initcap), so one action
// reads the same on both tabs.
export function adminActionWords(action: string): string {
  const words = action.replace(/[._]/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : action;
}
