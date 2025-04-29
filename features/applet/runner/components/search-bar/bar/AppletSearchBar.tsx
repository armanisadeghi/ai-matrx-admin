"use client";

import React from "react";
import { useAppletData } from "@/context/AppletDataContext";
import MobileAppletUserInputBar from "./MobileAppletUserInputBarr";
import DesktopAppletUserInputBar from "./DesktopAppletSearchBar";

interface AppletUserInputBarProps {
    initialAppName?: string;
}

const AppletUserInputBar: React.FC<AppletUserInputBarProps> = ({ initialAppName }) => {
    const { isMobile, appName: contextAppName } = useAppletData();
    
    const appName = initialAppName || contextAppName;

    return isMobile ? (
        <MobileAppletUserInputBar appName={appName} />
    ) : (
        <DesktopAppletUserInputBar appName={appName} />
    );
};

export default AppletUserInputBar;
