"use client";

// THE ADMIN ORGANIZATION setting (Arman, 2026-10-10; rule:
// lib/organizations/adminOrganization.ts). One of the admin's OWN
// organizations, made active on every admin page entry so work run from the
// admin section is filed there — never the platform tenant. Stored in the
// unified settings store (`userPreferences.organization.adminOrganizationId`).
// Choosing one applies at once; "Current org" clears it.

import { Building2 } from "lucide-react";
import { Select } from "@ai-matrx/design-system/controls";
import { useSetting } from "@/features/settings/hooks/useSetting";
import { useUserOrganizations } from "@/features/organizations/hooks";

const CURRENT = "";

export function AdminOrganizationPicker() {
  const [declared, setDeclared] = useSetting<string | null>(
    "userPreferences.organization.adminOrganizationId",
  );
  const { organizations, loading } = useUserOrganizations();

  const options = [
    { value: CURRENT, label: "Current org" },
    ...organizations.map((org) => ({ value: org.id, label: org.name })),
  ];

  return (
    <Select
      aria-label="Admin org: admin pages run work in this org"
      icon={<Building2 className="h-4 w-4" />}
      value={declared ?? CURRENT}
      options={options}
      onValueChange={(next: string) => setDeclared(next === CURRENT ? null : next)}
      disabled={loading}
    />
  );
}
