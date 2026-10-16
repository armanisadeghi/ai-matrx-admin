"use client";

// The user menu's Admin group. Loaded ONLY through the admin gate + ONE dynamic
// edge in UserMenuPanel, so a non-admin downloads none of these items
// (Arman, 2026-10-15: admin parts never go past an early boolean check). Never
// import this file anywhere else.

import type { ReactNode } from "react";
import { LinkMenuItem } from "./LinkMenuItem";
import { AdminIndicatorMenuItem } from "./AdminIndicatorMenuItem";
import { CostUnitMenuItem } from "./CostUnitMenuItem";
import { ErrorInspectorMenuItem } from "./ErrorInspectorMenuItem";
import { MenuGroup } from "./MenuGroup";

export default function AdminMenuGroupImpl({ divider }: { divider: ReactNode }) {
  return (
    <>
      {divider}
      <MenuGroup
        id="admin"
        icon="Shield"
        label="Admin"
        iconClassName="[&_svg]:text-amber-500"
      >
        <LinkMenuItem
          href="/administration"
          icon="Shield"
          label="Admin Dashboard"
          className="[&_svg]:text-amber-500"
        />
        <AdminIndicatorMenuItem />
        <CostUnitMenuItem />
        <ErrorInspectorMenuItem />
      </MenuGroup>
    </>
  );
}
