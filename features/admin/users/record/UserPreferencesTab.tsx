"use client";

// A person's Preferences tab: the Preferences page's own per-person view, given the id as a prop
// (never read from the address).

import { UserPreferencesView } from "../components/PreferencesTabClient";
import type { UserTabBodyProps } from "./UserRecordPage";

export function UserPreferencesTab({ userId }: UserTabBodyProps) {
  return <UserPreferencesView userId={userId} />;
}
