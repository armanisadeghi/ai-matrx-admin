// components/AppletHeader/index.tsx
"use client";
import React from "react";
import { DesktopAppHeader } from "./DesktopAppHeader";
import MobileAppHeader from "./MobileAppHeader";
import { useAppletData } from "@/context/AppletDataContext";
import { CustomAppConfig } from "../field-components/types";


export interface CustomAppHeaderProps {
  config: CustomAppConfig;
  headerClassName?: string;
}

export const CustomAppHeader = ({ config }: CustomAppHeaderProps) => {
  const { isMobile } = useAppletData();

  return isMobile ? (
    <MobileAppHeader config={config} />
  ) : (
    <DesktopAppHeader config={config} />
  );
};

export default CustomAppHeader;