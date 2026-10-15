"use client";

// lib/entity-list/dialogs/RecordBulkDialogsHostImpl.tsx — see RecordBulkDialogsHost.tsx.

import React from "react";
import { HomePickerHostDialog } from "@/features/scopes/homes/HomePickerHostDialog";
import { ShareWithPeopleHostDialog } from "@/features/sharing/bulk/ShareWithPeopleHostDialog";

export default function RecordBulkDialogsHostImpl() {
  return (
    <>
      <HomePickerHostDialog />
      <ShareWithPeopleHostDialog />
    </>
  );
}
