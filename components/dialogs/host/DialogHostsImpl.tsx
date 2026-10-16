"use client";

// components/dialogs/host/DialogHostsImpl.tsx — the body behind <DialogHosts />'s one edge.
// Every host renders statically here; never import this file anywhere else.

import { useEffect } from "react";
import { ConversationRenameDialogHost } from "@ai-matrx/chat/agents/components/conversation-actions/rename/ConversationRenameDialogHost";
import CloudFilesPickerHostBody from "@/features/files/components/pickers/CloudFilesPickerHostBody";
import UploadGuardHostBody from "@/features/files/upload/UploadGuardHostBody";
import ClipboardFallbackHostBody from "@/components/dialogs/clipboard-fallback/ClipboardFallbackHostBody";
import SandboxGateHostBody from "@/components/dialogs/sandbox-gate/SandboxGateHostBody";
import ValuePromptsDialogHostBody from "@/components/dialogs/value-prompts/ValuePromptsDialogHostBody";
import RecordBulkDialogsHostBody from "@/lib/entity-list/dialogs/RecordBulkDialogsHostBody";
import ScopeMismatchDialogHostBody from "@/components/dialogs/scope-mismatch/ScopeMismatchDialogHostBody";
import CantRemoveDialogHostBody from "@/features/access-gate/cant-remove/CantRemoveDialogHostBody";
import { markDialogHostsMounted } from "./dialogHostsLatch";

export default function DialogHostsImpl() {
  // A parent's effect runs after its children's, so every host above has registered by now.
  useEffect(() => {
    markDialogHostsMounted(true);
    return () => markDialogHostsMounted(false);
  }, []);

  return (
    <>
      <CloudFilesPickerHostBody />
      <UploadGuardHostBody />
      <ClipboardFallbackHostBody />
      <SandboxGateHostBody />
      <ValuePromptsDialogHostBody />
      <RecordBulkDialogsHostBody />
      <ScopeMismatchDialogHostBody />
      <CantRemoveDialogHostBody />
      <ConversationRenameDialogHost />
    </>
  );
}
