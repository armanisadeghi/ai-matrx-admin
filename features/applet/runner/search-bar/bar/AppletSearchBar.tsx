"use client";

import React from "react";
import MobileAppletUserInputBar from "./MobileAppletUserInputBarr";
import DesktopAppletUserInputBar from "./DesktopAppletSearchBar";
import { useIsMobile } from "@/hooks/use-mobile";
interface AppletUserInputBarProps {
    appletId: string;
}

const AppletUserInputBar: React.FC<AppletUserInputBarProps> = ({ appletId }) => {
    const isMobile = useIsMobile();

    return isMobile ? (
        <MobileAppletUserInputBar appletId={appletId} />
    ) : (
        <DesktopAppletUserInputBar appletId={appletId} />
    );
};

export default AppletUserInputBar;
