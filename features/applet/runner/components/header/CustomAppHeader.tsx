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
}

export const CustomAppHeader = ({ appName, isDemo = false }: CustomAppHeaderProps) => {
  const { isMobile } = useAppletData();

  return isMobile ? (
    <MobileAppHeader appName={appName} isDemo={isDemo} />
  ) : (
    <DesktopAppHeader appName={appName} isDemo={isDemo} />
  );
};

export default CustomAppHeader;