// app/Providers.tsx

import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/styles/themes/ThemeProvider";
import StoreProvider from "@/providers/StoreProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { InitialReduxState } from "@/types/reduxTypes";
import { RefProvider } from "@/lib/refs";
import { ToastProvider } from "@/providers/toast-context";
import { ModuleHeaderProvider } from "@/providers/ModuleHeaderProvider";
import { ContextMenuProvider } from "@/providers/ContextMenuProvider";
import { FileSystemProvider } from "@/lib/redux/fileSystem/Provider";
import { FilePreviewProvider } from "@/components/file-system/preview";
import { PersistentComponentProvider } from "@/providers/persistance/PersistentComponentProvider";
import { SelectedImagesProvider } from "@/components/image/context/SelectedImagesProvider";
import { UniformHeightProvider } from "@/features/applet/runner/layouts/core/UniformHeightWrapper";
import { ReactQueryProvider } from "@/providers/ReactQueryProvider";
import { TranscriptsProvider } from "@/features/transcripts/context/TranscriptsContext";
import { AudioRecoveryProvider } from "@/features/audio/providers/AudioRecoveryProvider";
import DeferredSingletons from "./DeferredSingletons";
import {
  GlobalTaskShortcut,
  CreateTaskFromSourceDialog,
} from "@/features/tasks/widgets";

/*

NotesProvider removed — notes now use Redux (features/notes/redux/)
import { EntityProvider } from "@/providers/entity-context/EntityProvider";
import { SchemaProvider } from "@/providers/SchemaProvider";
import { AudioModalProvider } from "@/providers/AudioModalProvider";
import { FileSystemProvider as OldFileSystemProvider } from "@/providers/FileSystemProvider";


*/

const allowedBuckets = [
  "userContent",
  "Audio",
  "Images",
  "Documents",
  "Code",
  "any-file",
] as const;

let globalUserId: string | null = null;

export const setGlobalUserId = (id: string) => {
  globalUserId = id;
};

export const getGlobalUserId = () => globalUserId;

interface ProvidersProps {
  children: React.ReactNode;
  initialReduxState?: InitialReduxState;
}

export function Providers({ children, initialReduxState }: ProvidersProps) {
  setGlobalUserId(initialReduxState.user.id);

  return (
    // <SchemaProvider initialSchema={initialReduxState?.globalCache}>
    <ReactQueryProvider>
      <StoreProvider initialState={initialReduxState}>
        <ThemeProvider>
          <PersistentComponentProvider>
            {/* <EntityProvider> */}
            <ContextMenuProvider>
              <ToastProvider>
                <RefProvider>
                  <FileSystemProvider
                    initialBucket="Audio"
                    allowedBuckets={allowedBuckets}
                  >
                    <FilePreviewProvider>
                      {/* <OldFileSystemProvider> */}
                      <TooltipProvider delayDuration={200}>
                        {/* <AudioModalProvider> */}
                        <ModuleHeaderProvider>
                          <UniformHeightProvider>
                            <SelectedImagesProvider>
                              <TranscriptsProvider>
                                <AudioRecoveryProvider>
                                  {children}
                                  <DeferredSingletons />
                                  <GlobalTaskShortcut />
                                  <CreateTaskFromSourceDialog />
                                </AudioRecoveryProvider>
                              </TranscriptsProvider>
                            </SelectedImagesProvider>
                          </UniformHeightProvider>
                        </ModuleHeaderProvider>
                        <Toaster />
                        {/* </AudioModalProvider> */}
                      </TooltipProvider>
                      {/* </OldFileSystemProvider> */}
                    </FilePreviewProvider>
                  </FileSystemProvider>
                </RefProvider>
              </ToastProvider>
            </ContextMenuProvider>
            {/* </EntityProvider> */}
          </PersistentComponentProvider>
        </ThemeProvider>
      </StoreProvider>
    </ReactQueryProvider>
    // </SchemaProvider>
  );
}

/*
PROVIDER ANALYSIS:


- FileSystemProvider - Terrible on init


*/
