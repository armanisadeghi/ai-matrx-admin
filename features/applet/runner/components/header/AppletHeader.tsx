// components/AppletHeader/index.tsx
"use client";
import React from "react";
import { DesktopAppletHeader } from "./DesktopAppletHeader";
import MobileAppletHeader from "./MobileAppletHeader";
import { useSearchTab } from "@/context/SearchTabContext";

import { TabConfig } from "./HeaderTabs";
import { ButtonConfig } from "./HeaderButtons";

export interface HeaderConfig {
  tabs: TabConfig[];
  buttons: ButtonConfig[];
}

interface AppletHeaderProps {
  config: HeaderConfig;
}

export const AppletHeader = ({ config }: AppletHeaderProps) => {
  const { isMobile } = useSearchTab();
  
  return isMobile ? (
    <MobileAppletHeader config={config} />
  ) : (
    <DesktopAppletHeader config={config} />
  );
};

export default AppletHeader;