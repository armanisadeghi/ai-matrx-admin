"use client";

// THE ADMIN ORGANIZATION, asked once (Arman, 2026-10-16). Work the admin runs from
// admin pages is filed in one of their OWN organizations, never Matrx System. When
// none is declared, the first admin page asks for it here instead of quietly
// falling back to whatever organization happened to be active. Choosing one saves
// it and the bar goes away for good; "Later" hides it for this tab only.
// Rule: lib/organizations/adminOrganization.ts. Picker for changing it afterwards:
// AdminOrganizationPicker (admin dashboard).

import { useState } from "react";
import { Building2 } from "lucide-react";
import { Button, Select } from "@ai-matrx/design-system/controls";
import { useSetting } from "@/features/settings/hooks/useSetting";
import { useUserOrganizations } from "@/features/organizations/hooks";
import { useAppSelector } from "@/lib/redux/hooks";
import type { RootState } from "@/lib/redux/store";

const NONE = "";
const LATER_KEY = "matrx.adminOrganizationAsk.later";

const selectPreferencesLoaded = (state: RootState): boolean =>
  state.userPreferences?._meta?.loadStatus === "loaded";

function laterThisTab(): boolean {
  try {
    return window.sessionStorage.getItem(LATER_KEY) === "1";
  } catch {
    return false;
  }
}

export function AdminOrganizationAsk() {
  const loaded = useAppSelector(selectPreferencesLoaded);
  const [declared, setDeclared] = useSetting<string | null>(
    "userPreferences.organization.adminOrganizationId",
  );
  const { organizations, loading } = useUserOrganizations();
  const [later, setLater] = useState(laterThisTab);

  // Never asks before the saved record has loaded: a person who already declared
  // one must not see this flash.
  if (!loaded || loading || declared || later || organizations.length === 0) return null;

  const options = [
    { value: NONE, label: "Choose an org" },
    ...organizations.map((org) => ({ value: org.id, label: org.name })),
  ];

  return (
    <div
      className="flex items-center gap-3 border-b border-border bg-background px-4 py-2"
      role="region"
      aria-label="Admin organization"
    >
      <Building2 className="h-4 w-4 text-muted-foreground" aria-hidden />
      <span className="type-label text-muted-foreground">Admin work runs in</span>
      <Select
        aria-label="Admin org: admin pages run work in this org"
        value={NONE}
        options={options}
        onValueChange={(next: string) => {
          if (next !== NONE) setDeclared(next);
        }}
      />
      <Button
        variant="quiet"
        onClick={() => {
          try {
            window.sessionStorage.setItem(LATER_KEY, "1");
          } catch {
            /* a tab that cannot remember simply asks again */
          }
          setLater(true);
        }}
      >
        Later
      </Button>
    </div>
  );
}
