// app/Providers.tsx

"use client";

import React from "react";
import { SchemaProvider } from "@/providers/SchemaProvider";
import { NextUIProvider } from "@nextui-org/react";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/styles/themes";
import StoreProvider from "@/providers/StoreProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { InitialReduxState } from "@/types/reduxTypes";
import { SocketProvider } from "@/providers/SocketProvider";
import { RefProvider } from "@/lib/refs";
import { ShikiProvider } from "@/providers/ShikiProvider";
import { RecoilRoot } from "recoil";
import { ToastProvider } from "@/providers";
import { AudioModalProvider } from "@/providers/AudioModalProvider";
import { ModuleHeaderProvider } from "@/providers/ModuleHeaderProvider";
import { EntityProvider } from "@/providers/entity-context/EntityProvider";
import { FileSystemProvider } from "@/providers/FileSystemProvider";
import { ContextMenuProvider } from "@/providers/ContextMenuProvider";
import { DialogProvider } from "@/providers/dialogs/DialogContext";

export function Providers({
  children,
  initialReduxState,
}: {
  children: React.ReactNode;
  initialReduxState?: InitialReduxState;
}) {
  return (
    <SchemaProvider initialSchema={initialReduxState?.globalCache}>
      <RecoilRoot>
        <StoreProvider initialState={initialReduxState}>
          <EntityProvider>
            <SocketProvider>
              <DialogProvider>
                <ContextMenuProvider>
                  <ToastProvider>
                    <ThemeProvider defaultTheme="dark" enableSystem={false}>
                      <RefProvider>
                        <FileSystemProvider>
                          <NextUIProvider>
                            <TooltipProvider>
                              <AudioModalProvider>
                                <ModuleHeaderProvider>
                                  <ShikiProvider initialLanguages={[ "typescript", "javascript",]}>
                                    {children}
                                  </ShikiProvider>
                                </ModuleHeaderProvider>
                                <Toaster />
                              </AudioModalProvider>
                            </TooltipProvider>
                          </NextUIProvider>
                        </FileSystemProvider>
                      </RefProvider>
                    </ThemeProvider>
                  </ToastProvider>
                </ContextMenuProvider>
              </DialogProvider>
            </SocketProvider>
          </EntityProvider>
        </StoreProvider>
      </RecoilRoot>
    </SchemaProvider>
  );
}
