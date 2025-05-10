// components/AppletHeader/index.tsx
"use client";
import React from "react";
import { DesktopAppHeader } from "./desktop/DesktopAppHeader";
import MobileAppHeader from "./mobile/MobileAppHeader";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectAppRuntimeIsInitialized } from "@/lib/redux/app-runner/slices/customAppRuntimeSlice";
import { selectAppletRuntimeActiveAppletId } from "@/lib/redux/app-runner/slices/customAppletRuntimeSlice";
import { LoadingSpinner } from "@/components/ui/spinner";

export interface CustomAppHeaderProps {
  appId?: string;
  headerClassName?: string;
  isDemo?: boolean;
  isDebug?: boolean;
  activeAppletId?: string;
}

export const CustomAppHeader = ({ appId, isDemo = false, isDebug = false, activeAppletId }: CustomAppHeaderProps) => {
  const isMobile = useIsMobile();
  const isAppInitialized = useAppSelector(selectAppRuntimeIsInitialized);
  const activeId = activeAppletId || useAppSelector(selectAppletRuntimeActiveAppletId) || '';

  if (isDebug) {
    console.log("isDebug", isDebug);
  }

  if (!isAppInitialized) {
    return (
      <div className="flex justify-center items-center h-full">
        <LoadingSpinner />
      </div>
    );
  }


  return isMobile ? (
    <MobileAppHeader appId={appId} activeAppletId={activeId} isDemo={isDemo}/>
  ) : (
    <DesktopAppHeader appId={appId} activeAppletId={activeId} isDemo={isDemo} />
  );
};

export default CustomAppHeader;