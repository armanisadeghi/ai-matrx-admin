// app/Providers.tsx

"use client";

import React, { useEffect } from "react";
import { identifyUser } from "@/providers/PostHogProvider";
import { SchemaProvider } from "@/providers/SchemaProvider";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/styles/themes";
import StoreProvider from "@/providers/StoreProvider";
import { GlobalBrokerRegistration } from "@/providers/GlobalBrokerRegistration";
import { TooltipProvider } from "@/components/ui/tooltip";
import { InitialReduxState } from "@/types/reduxTypes";
import { RefProvider } from "@/lib/refs";
import { ToastProvider } from "@/providers/toast-context";
import { AudioModalProvider } from "@/providers/AudioModalProvider";
import { ModuleHeaderProvider } from "@/providers/ModuleHeaderProvider";
import { EntityProvider } from "@/providers/entity-context/EntityProvider";
import { FileSystemProvider as OldFileSystemProvider } from "@/providers/FileSystemProvider";
import { ContextMenuProvider } from "@/providers/ContextMenuProvider";
import { FileSystemProvider } from "@/lib/redux/fileSystem/Provider";
import { FilePreviewProvider } from "@/components/file-system/preview";
import { ChipMenuProvider } from "@/features/rich-text-editor/components/ChipContextMenu";
import { PreferenceSyncProvider } from "@/providers/usePreferenceSync";
import { EditorProvider } from "@/providers/rich-text-editor/Provider";
import { useIsMobile } from "@/hooks/use-mobile";
import { PersistentComponentProvider } from "@/providers/persistance/PersistentComponentProvider";
import { PersistentDOMConnector } from "@/providers/persistance/PersistentDOMConnector";
import GoogleAPIProvider from "@/providers/google-provider/GoogleApiProvider";
import { SelectedImagesProvider } from "@/components/image/context/SelectedImagesProvider";
import { UniformHeightProvider } from "@/features/applet/runner/layouts/core";
import { GlobalBrokersInitializer } from "@/components/broker/UserBrokerInitializer";
import ClientOverlayProvider from "@/components/overlays/ClientOverlayProvider";
import { ReactQueryProvider } from "@/providers/ReactQueryProvider";
import { NotesProvider } from "@/features/notes";
import { TaskProvider } from "@/features/tasks";
import { TranscriptsProvider } from "@/features/transcripts";

const allowedBuckets = ["userContent", "Audio", "Images", "Documents", "Code", "any-file"] as const;

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
    const isMobile = useIsMobile();

    useEffect(() => {
        if (initialReduxState.user.id) {
            identifyUser(initialReduxState.user.id, {
                email: initialReduxState.user.email,
            });
        }
    }, [initialReduxState.user.id, initialReduxState.user.email]);

    return (
        <SchemaProvider initialSchema={initialReduxState?.globalCache}>
            <ReactQueryProvider>
                <StoreProvider initialState={initialReduxState}>
                    <GlobalBrokerRegistration>
                        <GlobalBrokersInitializer user={initialReduxState.user} />
                        <ThemeProvider defaultTheme="dark" enableSystem={false}>
                            <PersistentComponentProvider>
                                <EntityProvider>
                                        <ContextMenuProvider>
                                            <ChipMenuProvider>
                                                <ToastProvider>
                                                    <PreferenceSyncProvider>
                                                        <RefProvider>
                                                            <EditorProvider>
                                                                <FileSystemProvider initialBucket="Audio" allowedBuckets={allowedBuckets}>
                                                                    <FilePreviewProvider>
                                                                        <OldFileSystemProvider>
                                                                            <TooltipProvider delayDuration={200}>
                                                                                <AudioModalProvider>
                                                                                    <ModuleHeaderProvider>
                                                                                        <GoogleAPIProvider>
                                                                                            <UniformHeightProvider>
                                                                                                <SelectedImagesProvider>
                                                                                                    <NotesProvider>
                                                                                                        <TaskProvider>
                                                                                                            <TranscriptsProvider>
                                                                                                                <PersistentDOMConnector />
                                                                                                                <ClientOverlayProvider />
                                                                                                                {children}
                                                                                                            </TranscriptsProvider>
                                                                                                        </TaskProvider>
                                                                                                    </NotesProvider>
                                                                                                </SelectedImagesProvider>
                                                                                            </UniformHeightProvider>
                                                                                        </GoogleAPIProvider>
                                                                                    </ModuleHeaderProvider>
                                                                                    <Toaster />
                                                                                </AudioModalProvider>
                                                                            </TooltipProvider>
                                                                    </OldFileSystemProvider>
                                                                </FilePreviewProvider>
                                                            </FileSystemProvider>
                                                            </EditorProvider>
                                                        </RefProvider>
                                                    </PreferenceSyncProvider>
                                                </ToastProvider>
                                            </ChipMenuProvider>
                                        </ContextMenuProvider>
                                </EntityProvider>
                            </PersistentComponentProvider>
                        </ThemeProvider>
                    </GlobalBrokerRegistration>
                </StoreProvider>
            </ReactQueryProvider>
        </SchemaProvider>
    );
}
