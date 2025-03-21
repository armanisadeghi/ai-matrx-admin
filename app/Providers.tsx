// app/Providers.tsx

"use client";

import React from "react";
import { SchemaProvider } from "@/providers/SchemaProvider";
import { HeroUIProvider } from "@heroui/react"; // Changed from NextUIProvider
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/styles/themes";
import StoreProvider from "@/providers/StoreProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { InitialReduxState } from "@/types/reduxTypes";
import { SocketProvider } from "@/providers/SocketProvider";
import { RefProvider } from "@/lib/refs";
import { RecoilRoot } from "recoil";
import { ToastProvider } from "@/providers";
import { AudioModalProvider } from "@/providers/AudioModalProvider";
import { ModuleHeaderProvider } from "@/providers/ModuleHeaderProvider";
import { EntityProvider } from "@/providers/entity-context/EntityProvider";
import { FileSystemProvider as OldFileSystemProvider } from "@/providers/FileSystemProvider";
import { ContextMenuProvider } from "@/providers/ContextMenuProvider";
import { DialogProvider } from "@/providers/dialogs/DialogContext";
import { FileSystemDialogs } from "@/providers/dialogs/modules/filesystem";
import { FileSystemProvider } from "@/lib/redux/fileSystem/Provider";
import { ChipMenuProvider } from "@/features/rich-text-editor/components/ChipContextMenu";
import { PreferenceSyncProvider } from "@/providers/usePreferenceSync";
import { EditorProvider } from "@/providers/rich-text-editor/Provider";
import { SearchTabProvider } from "@/context/SearchTabContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { PersistentComponentProvider } from "@/providers/persistance/PersistentComponentProvider";
import { PersistentDOMConnector } from "@/providers/persistance/PersistentDOMConnector";
import GoogleAPIProvider from "@/providers/google-provider/GoogleApiProvider";
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

    return (
        <SchemaProvider initialSchema={initialReduxState?.globalCache}>
            <RecoilRoot>
                <StoreProvider initialState={initialReduxState}>
                    <ThemeProvider defaultTheme="dark" enableSystem={false}>
                        <PersistentComponentProvider>
                            <EntityProvider>
                                <SocketProvider>
                                    <DialogProvider>
                                        <ContextMenuProvider>
                                            <ChipMenuProvider>
                                                <ToastProvider>
                                                    <PreferenceSyncProvider>
                                                        <RefProvider>
                                                            <EditorProvider>
                                                                <FileSystemProvider initialBucket="Audio" allowedBuckets={allowedBuckets}>
                                                                    <OldFileSystemProvider>
                                                                        <FileSystemDialogs />
                                                                        <HeroUIProvider>
                                                                            <TooltipProvider delayDuration={200}>
                                                                                <AudioModalProvider>
                                                                                    <ModuleHeaderProvider>
                                                                                        <GoogleAPIProvider>
                                                                                            <SearchTabProvider isMobile={isMobile}>
                                                                                                <PersistentDOMConnector />
                                                                                                {children}
                                                                                            </SearchTabProvider>
                                                                                        </GoogleAPIProvider>
                                                                                    </ModuleHeaderProvider>
                                                                                    <Toaster />
                                                                                </AudioModalProvider>
                                                                            </TooltipProvider>
                                                                        </HeroUIProvider>
                                                                    </OldFileSystemProvider>
                                                                </FileSystemProvider>
                                                            </EditorProvider>
                                                        </RefProvider>
                                                    </PreferenceSyncProvider>
                                                </ToastProvider>
                                            </ChipMenuProvider>
                                        </ContextMenuProvider>
                                    </DialogProvider>
                                </SocketProvider>
                            </EntityProvider>
                        </PersistentComponentProvider>
                    </ThemeProvider>
                </StoreProvider>
            </RecoilRoot>
        </SchemaProvider>
    );
}
