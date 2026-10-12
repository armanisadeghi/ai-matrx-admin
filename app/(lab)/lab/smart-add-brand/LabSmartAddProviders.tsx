"use client";

import type { ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GlobalAuthSync } from "@/features/auth/components/GlobalAuthSync";
import { ReactQueryProvider } from "@/providers/ReactQueryProvider";
import StoreProvider from "@/providers/StoreProvider";
import { ToastProvider } from "@/providers/toast-context";
import type { BaseReduxState } from "@/types/reduxTypes";

/** Keep the lab build scoped to the providers this workflow uses. */
export function LabSmartAddProviders({
  children,
  initialReduxState,
}: {
  children: ReactNode;
  initialReduxState: BaseReduxState;
}) {
  return (
    <ReactQueryProvider>
      <StoreProvider initialState={initialReduxState}>
        <GlobalAuthSync />
        <ToastProvider>
          <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
        </ToastProvider>
      </StoreProvider>
    </ReactQueryProvider>
  );
}
