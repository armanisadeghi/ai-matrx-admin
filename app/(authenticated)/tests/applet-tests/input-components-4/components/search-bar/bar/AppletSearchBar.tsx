"use client";

import React from "react";
import { useSearchTab } from "@/context/SearchTabContext";
import { TabSearchConfig } from "../../field-components/types";
import MobileAppletSearchBar from "./MobileAppletSearchBar";
import DesktopAppletSearchBar from "./DesktopAppletSearchBar";

interface AppletSearchBarProps {
    config: TabSearchConfig;
}

const AppletSearchBar: React.FC<AppletSearchBarProps> = ({ config }) => {
    const { isMobile } = useSearchTab();

    return isMobile ? <MobileAppletSearchBar config={config} /> : <DesktopAppletSearchBar config={config} />;
};

export default AppletSearchBar;
