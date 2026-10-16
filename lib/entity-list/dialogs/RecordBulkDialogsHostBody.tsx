"use client";

// lib/entity-list/dialogs/RecordBulkDialogsHostBody.tsx — see RecordBulkDialogsHost.tsx.

import React from "react";
import { HomePickerHostDialog } from "@/features/scopes/homes/HomePickerHostDialog";
import { ShareWithPeopleHostDialog } from "@/features/sharing/bulk/ShareWithPeopleHostDialog";

export default function RecordBulkDialogsHostBody() {
  return (
    <>
      <HomePickerHostDialog />
      <ShareWithPeopleHostDialog />
    </>
  );
}
