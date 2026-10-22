"use client";

// THE ADMIN ORGANIZATION setting (Arman, 2026-10-10; rule:
// lib/organizations/adminOrganization.ts). One of the admin's OWN
// organizations, made active on every admin page entry so work run from the
// admin section is filed there — never the platform tenant. Stored in the
// unified settings store (`userPreferences.organization.adminOrganizationId`).
// Choosing one applies at once; "Current org" clears it.
//
// Her organizations are a PAGE of a longer list (bounded organizations, 2026-10-17): the shared
// chooser searches server-side and pages.

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OrganizationChooser } from "@/features/organizations/components/OrganizationChooser";
import { useSetting } from "@/features/settings/hooks/useSetting";

export function AdminOrganizationPicker() {
  const [declared, setDeclared] = useSetting<string | null>(
    "userPreferences.organization.adminOrganizationId",
  );

  return (
    <div className="flex items-center gap-1" aria-label="Admin org: admin pages run work in this org">
      <OrganizationChooser value={declared ?? null} placeholder="Current org" onChange={(org) => setDeclared(org.id)} />
      {declared ? (
        <Button icon={<X aria-hidden />} variant="quiet" aria-label="Use the current org" onClick={() => setDeclared(null)} />
      ) : null}
    </div>
  );
}
