// components/AppletHeader/index.tsx
"use client";
import React from "react";
import { DesktopAppHeader } from "./desktop/DesktopAppHeader";
import MobileAppHeader from "./mobile/MobileAppHeader";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectAppRuntimeIsInitialized } from "@/lib/redux/app-runner/slices/customAppRuntimeSlice";
import { selectActiveAppletSlug } from "@/lib/redux/app-runner/slices/customAppletRuntimeSlice";
import { LoadingSpinner } from "@/components/ui/spinner";
import { brokerSelectors } from "@/lib/redux/brokerSlice";

export interface CustomAppHeaderProps {
  appId?: string;
  headerClassName?: string;
  isDemo?: boolean;
  isDebug?: boolean;
  initialActiveAppletSlug?: string;
}

export const CustomAppHeader = ({ appId, isDemo = false, isDebug = false, initialActiveAppletSlug }: CustomAppHeaderProps) => {
  const isMobile = useIsMobile();
  const isAppInitialized = useAppSelector(selectAppRuntimeIsInitialized);
  const activeAppletSlug = initialActiveAppletSlug || useAppSelector(selectActiveAppletSlug);
  const userIsCreator = useAppSelector((state) => brokerSelectors.selectValue(state, "APPLET_USER_IS_ADMIN"));
  const isAdmin = useAppSelector((state) => brokerSelectors.selectValue(state, "GLOBAL_USER_IS_ADMIN"));


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
    <MobileAppHeader appId={appId} activeAppletSlug={activeAppletSlug} isDemo={isDemo} isCreator={userIsCreator} isAdmin={isAdmin} />
  ) : (
    <DesktopAppHeader appId={appId} activeAppletSlug={activeAppletSlug} isDemo={isDemo} isCreator={userIsCreator} isAdmin={isAdmin} />
  );
};

export default CustomAppHeader;