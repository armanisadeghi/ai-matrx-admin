// File: features/applet/runner/layouts/core/AppletLayoutWrapper.tsx
"use client";

import React, { useState, useEffect } from "react";
import { AppletLayoutOption } from "@/types";
import AppletInputLayoutManager from "./AppletInputLayoutManager";
import { useAppSelector } from "@/lib/redux/hooks";
import {
    selectAppletRuntimeAccentColor,
    selectAppletRuntimeActiveApplet,
    selectAppletRuntimeAppletIcon,
    selectAppletRuntimeLayoutType,
} from "@/lib/redux/app-runner/slices/customAppletRuntimeSlice";
import { getSubmitButton } from "@/features/applet/styles/StyledComponents";

interface AppletLayoutWrapperProps {
    layoutTypeOverride?: AppletLayoutOption;
    className?: string;
    appId?: string;
}

const AppletInputLayoutWrapper: React.FC<AppletLayoutWrapperProps> = ({ layoutTypeOverride, className = "", appId }) => {
    const [activeFieldId, setActiveFieldId] = useState<string | null>(null);

    const layoutType = useAppSelector((state) => selectAppletRuntimeLayoutType(state, appId || "")) || layoutTypeOverride || "open";
    const accentColor = useAppSelector((state) => selectAppletRuntimeAccentColor(state, appId || "")) || "pink";
    const submitIconName = useAppSelector((state) => selectAppletRuntimeAppletIcon(state, appId || "")) || "Search";
    const activeApplet = useAppSelector((state) => selectAppletRuntimeActiveApplet(state)) || null;

    const submitButton = getSubmitButton({
        color: accentColor,
        icon: submitIconName,
        size: 24,
    });

    useEffect(() => {
        setActiveFieldId(null);
    }, [activeApplet]);

    // Add ml-2 margin to the submitButton for consistency with search bar components
    const actionButtonWithMargin = <div className="ml-2">{submitButton}</div>;

    return (
        <AppletInputLayoutManager
            layoutType={layoutType}
            appId={appId}
            activeFieldId={activeFieldId}
            setActiveFieldId={setActiveFieldId}
            actionButton={actionButtonWithMargin}
            className={className}
        />
    );
};

export default AppletInputLayoutWrapper;
