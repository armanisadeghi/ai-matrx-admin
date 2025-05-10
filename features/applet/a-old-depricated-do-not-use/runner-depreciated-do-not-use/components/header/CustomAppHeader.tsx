// components/AppletHeader/index.tsx
"use client";
import React from "react";
import { DesktopAppHeader } from "./DesktopAppHeader";
import MobileAppHeader from "./MobileAppHeader";
import { useAppletData } from "@/context/AppletDataContext";


export interface CustomAppHeaderProps {
  appName?: string;
  headerClassName?: string;
  isDemo?: boolean;
  isDebug?: boolean;
}

export const CustomAppHeader = ({ appName, isDemo = false, isDebug = false }: CustomAppHeaderProps) => {
  const { isMobile } = useAppletData();

  if (isDebug) {
    // No other actions at this time!
    console.log("isDebug", isDebug);
  }

  return isMobile ? (
    <MobileAppHeader appName={appName} isDemo={isDemo} />
  ) : (
    <DesktopAppHeader appName={appName} isDemo={isDemo} />
  );
};

export default CustomAppHeader;