// Users & Access › Support sessions — the log of every time a super admin worked inside an account.
// Thin shell over the feature client.

import { SupportSessionsTableClient } from "@/features/admin/users/support-sessions/SupportSessionsTableClient";

export default function UsersSupportSessionsPage() {
  return <SupportSessionsTableClient />;
}
