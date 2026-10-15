"use client";

// lib/entity-list/dialogs/RecordBulkDialogsHost.tsx
//
// ONE host for the built-in bulk verbs' dialogs — `pickHome` (Move to…) and
// `shareWithPeople` (Share…). Mounted once in app/Providers.tsx beside
// <ConfirmDialogHost />; both dialogs sit behind this single `ssr:false` edge
// (code-splitting Method C — one boundary for a set that mounts together).

import dynamic from "next/dynamic";

const RecordBulkDialogsHostImpl = dynamic(() => import("./RecordBulkDialogsHostImpl"), {
  ssr: false,
  loading: () => null,
});

export function RecordBulkDialogsHost() {
  return <RecordBulkDialogsHostImpl />;
}
