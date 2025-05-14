"use client";

import React, { useState, useEffect } from "react";
import AppletBrokerContainer from "../container/AppletBrokerContainer";
import { useAppSelector } from "@/lib/redux/hooks";
import {
    selectActiveAppletContainers,
    selectAppletRuntimeAccentColor,
    selectAppletRuntimeAppletIcon,
    selectAppletRuntimeActiveApplet,
    selectAppletRuntimeActiveAppletId,
    selectAppletRuntimeLayoutType,
} from "@/lib/redux/app-runner/slices/customAppletRuntimeSlice";
import { getSubmitButton } from "@/features/applet/styles/StyledComponents";
import SearchContainerField from "../group/SearchContainerField";

interface DesktopAppletUserInputBarProps {
    appletId: string;
}

const DesktopAppletUserInputBar: React.FC<DesktopAppletUserInputBarProps> = ({ appletId }) => {
    const activeAppletContainers = useAppSelector((state) => selectActiveAppletContainers(state));
    const activeAppletId = useAppSelector((state) => selectAppletRuntimeActiveAppletId(state));
    const accentColor = useAppSelector((state) => selectAppletRuntimeAccentColor(state, appletId || "")) || "pink";
    const submitIconName = useAppSelector((state) => selectAppletRuntimeAppletIcon(state, appletId || "")) || "search";

    const submitButton = getSubmitButton({
        color: accentColor,
        icon: submitIconName,
        size: 24,
    });

    const [activeFieldId, setActiveFieldId] = useState<string | null>(null);

    useEffect(() => {
        setActiveFieldId(null);
    }, [activeAppletId]);

    const searchButtonWithMargin = <div className="ml-2">{submitButton}</div>;

    return (
        <div className="w-full p-4">
            <AppletBrokerContainer
                activeFieldId={activeFieldId}
                onActiveFieldChange={setActiveFieldId}
                actionButton={searchButtonWithMargin}
                className="mx-auto max-w-4xl rounded-full"
            >
                {activeAppletContainers.map((container, index) => (
                    <SearchContainerField
                        key={container.id}
                        id={container.id}
                        label={container.label}
                        description={container.description}
                        fields={container.fields}
                        isActive={activeFieldId === container.id}
                        onClick={() => {}} // Managed by Broker Container
                        onOpenChange={() => {}} // Managed by Broker Container
                        isLast={index === activeAppletContainers.length - 1}
                        isMobile={false}
                    />
                ))}
            </AppletBrokerContainer>
        </div>
    );
};

export default DesktopAppletUserInputBar;
