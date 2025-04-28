"use client";

import React from "react";
import { useAppletData } from "@/context/AppletDataContext";
import { AvailableAppletConfigs } from "../../field-components/types";
import MobileAppletUserInputBar from "./MobileAppletUserInputBarr";
import DesktopAppletUserInputBar from "./DesktopAppletSearchBar";

interface AppletUserInputBarProps {
    config: AvailableAppletConfigs;
}

const AppletUserInputBar: React.FC<AppletUserInputBarProps> = ({ config }) => {
    const { isMobile } = useAppletData();

    return isMobile ? <MobileAppletUserInputBar config={config} /> : <DesktopAppletUserInputBar config={config} />;
};

export default AppletUserInputBar;
