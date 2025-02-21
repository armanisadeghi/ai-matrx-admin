// components/AppletHeader/index.tsx
"use client";
import React, { useEffect, useState } from "react";
import { DesktopAppletHeader } from "./DesktopAppletHeader";

import { TabConfig } from "./HeaderTabs";
import { ButtonConfig } from "./HeaderButtons";
import MobileAppletHeader from "./MobileAppletHeader";

export interface HeaderConfig {
  tabs: TabConfig[];
  buttons: ButtonConfig[];
}

interface AppletHeaderProps {
  config: HeaderConfig;
}

export const AppletHeader = ({ config }: AppletHeaderProps) => {
  // State to track if we're on mobile view
  const [isMobile, setIsMobile] = useState(false);
  
  // Effect to handle resize and determine if we're on mobile
  useEffect(() => {
    // Function to determine if mobile based on screen width
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768); // 768px is standard md breakpoint
    };
    
    // Initial check
    handleResize();
    
    // Set up resize listener
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  // Render the appropriate component based on viewport size
  return isMobile ? (
    <MobileAppletHeader config={config} />
  ) : (
    <DesktopAppletHeader config={config} />
  );
};

export default AppletHeader;