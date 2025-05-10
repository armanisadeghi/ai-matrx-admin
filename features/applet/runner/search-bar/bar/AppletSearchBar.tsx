"use client";

import React from "react";
import MobileAppletUserInputBar from "./MobileAppletUserInputBarr";
import DesktopAppletUserInputBar from "./DesktopAppletSearchBar";
import { useIsMobile } from "@/hooks/use-mobile";
interface AppletUserInputBarProps {
    appId?: string;
}

const AppletUserInputBar: React.FC<AppletUserInputBarProps> = ({ appId }) => {
    const isMobile = useIsMobile();
    const appName = appId;

    return isMobile ? (
        <MobileAppletUserInputBar appName={appName} />
    ) : (
        <DesktopAppletUserInputBar appName={appName} />
    );
};

export default AppletUserInputBar;
