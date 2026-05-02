"use client";

import { OrganizationList } from "@/features/organizations/components/OrganizationList";

export default function OrganizationsTab() {
  return (
    <div className="p-4 md:p-6">
      <OrganizationList />
    </div>
  );
}
