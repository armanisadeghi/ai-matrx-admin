"use client";

// The Preferences route's entry: `?user=<id>` (from the Accounts cross-link) opens that person's
// preferences, otherwise the drift dashboard. The ONLY reader of the address — the views take props.

import { useSearchParams } from "next/navigation";
import { DriftDashboard, UserPreferencesView } from "./PreferencesTabClient";

export function PreferencesPageClient() {
  const focusUser = useSearchParams().get("user");
  return focusUser ? <UserPreferencesView userId={focusUser} /> : <DriftDashboard />;
}
