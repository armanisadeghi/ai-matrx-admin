// record-view: none — an admin support view; the admin seat never edits an organization's fields
"use client";

import { use } from "react";
import { ShortcutDirectResolver } from "@/features/agent-shortcuts/components/ShortcutDirectResolver";

export default function AdminShortcutDirectPage({
  params,
}: {
  params: Promise<{ shortcutId: string }>;
}) {
  const { shortcutId } = use(params);

  return (
    <div className="h-full overflow-hidden">
      <ShortcutDirectResolver shortcutId={shortcutId} mode="admin" />
    </div>
  );
}
