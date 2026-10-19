// record-view: none — a list of approvals; each opens its own record page
// ApprovalRecordView — each approval opens at /administration/billing/approvals/<kind>/<subjectId>
// Billing › Spend approvals: every agent, mandate and automation whose single run cost more
// than the approval threshold, waiting first, with Approve / Reject (features/admin/spend-approvals).
// billing.run_approval_list(null) refuses anyone who is not a platform admin.
// The list itself is drawn by ./layout.tsx so it stays mounted as the record page's sidebar.
export default function SpendApprovalsPage() {
  return null;
}
