"use client";

// components/dialogs/host/DialogHostsImpl.tsx — the body behind <DialogHosts />'s one edge.
// Every host renders statically here; never import this file anywhere else.

import { useEffect } from "react";
import { ConversationRenameDialogHost } from "@ai-matrx/chat/agents/components/conversation-actions/rename/ConversationRenameDialogHost";
import CloudFilesPickerHostBody from "@/features/files/components/pickers/CloudFilesPickerHostBody";
import UploadGuardHostBody from "@/features/files/upload/UploadGuardHostBody";
import ValuePromptsDialogHostBody from "@/components/dialogs/value-prompts/ValuePromptsDialogHostBody";
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
      <ValuePromptsDialogHostBody />
      <ConversationRenameDialogHost />
    </>
  );
}
