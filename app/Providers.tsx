// app/Providers.tsx

import React from "react";
import StoreProvider from "@/providers/StoreProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { InitialReduxState } from "@/types/reduxTypes";
import { RefProvider } from "@/lib/refs";
import { ToastProvider } from "@/providers/toast-context";
import { ModuleHeaderProvider } from "@/providers/ModuleHeaderProvider";
import { ContextMenuProvider } from "@/providers/ContextMenuProvider";
import { PersistentComponentProvider } from "@/providers/persistance/PersistentComponentProvider";
import { SelectedImagesProvider } from "@/components/image/context/SelectedImagesProvider";
import { UniformHeightProvider } from "@/features/applet/runner/layouts/core/UniformHeightWrapper";
import { ReactQueryProvider } from "@/providers/ReactQueryProvider";
import { TranscriptsProvider } from "@/features/transcripts/context/TranscriptsContext";
import { AudioRecoveryProvider } from "@/features/audio/providers/AudioRecoveryProvider";
import { RequestRecoveryProvider } from "@/features/request-recovery/providers/RequestRecoveryProvider";
import { RecoveryWindow } from "@/features/request-recovery/components/RecoveryWindow";
import { RecoveryNudge } from "@/features/request-recovery/components/RecoveryNudge";
import DeferredSingletons from "./DeferredSingletons";
import GlobalTaskShortcut from "@/features/tasks/widgets/GlobalTaskShortcut";
import CreateTaskFromSourceDialog from "@/features/tasks/widgets/CreateTaskFromSourceDialog";
import { CloudFilesPickerHost } from "@/features/files/components/pickers/CloudFilesPickerHost";

// Phase 11 — legacy file system providers removed:
//   - lib/redux/fileSystem/Provider (FileSystemProvider)
//   - components/file-system/preview (FilePreviewProvider)
//   - providers/FileSystemProvider (OldFileSystemProvider)
//   - providers/packs/FilesPack
// All file management now lives in features/files/* via Redux + realtime
// middleware. The CloudFilesPickerHost below exposes openFilePicker() /
// openFolderPicker() / openSaveAs() app-wide.
//
// Phase 4 PR 4.C: deleted setGlobalUserId / getGlobalUserId pair and the
// imperative `setGlobalUserIdAndToken` seed. The Redux preloaded state
// (initialReduxState.user) is the source of truth; non-React consumers
// read via `getIdentityContext()` from `@/lib/sync/identity`. See
// `phase-4-plan.md` §5.9.

interface ProvidersProps {
  children: React.ReactNode;
  initialReduxState?: InitialReduxState;
}

export function Providers({ children, initialReduxState }: ProvidersProps) {
  return (
    <ReactQueryProvider>
      <StoreProvider initialState={initialReduxState}>
        <PersistentComponentProvider>
          <ContextMenuProvider>
            <ToastProvider>
              <RefProvider>
                <TooltipProvider delayDuration={200}>
                  <ModuleHeaderProvider>
                    <UniformHeightProvider>
                      <SelectedImagesProvider>
                        <TranscriptsProvider>
                          <AudioRecoveryProvider>
                            <RequestRecoveryProvider>
                              {children}
                              <RecoveryWindow />
                              <RecoveryNudge />
                              <DeferredSingletons />
                              <GlobalTaskShortcut />
                              <CreateTaskFromSourceDialog />
                              {/* Cloud-files imperative pickers:
                                  openFilePicker() / openFolderPicker() / openSaveAs()
                                  are callable from anywhere in the app once this host
                                  mounts. See features/files/components/pickers/. */}
                              <CloudFilesPickerHost />
                              {/* File preview is delivered via a registered
                                  WindowPanel (`filePreviewWindow`) mounted by
                                  the UnifiedOverlayController — no host needed
                                  here. Anywhere in the app:
                                    import { openFilePreview } from
                                      "@/features/files/components/preview/openFilePreview";
                                    openFilePreview(fileId); */}
                            </RequestRecoveryProvider>
                          </AudioRecoveryProvider>
                        </TranscriptsProvider>
                      </SelectedImagesProvider>
                    </UniformHeightProvider>
                  </ModuleHeaderProvider>
                </TooltipProvider>
              </RefProvider>
            </ToastProvider>
          </ContextMenuProvider>
        </PersistentComponentProvider>
      </StoreProvider>
    </ReactQueryProvider>
  );
}
