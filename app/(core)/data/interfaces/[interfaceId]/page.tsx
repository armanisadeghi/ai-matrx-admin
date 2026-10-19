// record-view: none — a full-viewport editor for a record, not the record view
"use client";

// app/(core)/data/interfaces/[interfaceId]/page.tsx — THE MOUNT, AND NOTHING MORE. One Interface (lane
// AT-INTERFACE); `new?table=<id>` makes one; `?page=<id>` is the page open. The screen is `InterfaceRoute`.
import { use } from "react";

import { InterfaceRoute } from "@/features/unified-data/pages/InterfaceRoute";

export default function DataInterfaceRoute({ params }: { params: Promise<{ interfaceId: string }> }) {
  const { interfaceId } = use(params);
  return <InterfaceRoute interfaceId={interfaceId} />;
}
