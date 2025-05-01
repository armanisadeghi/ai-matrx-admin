"use client";

import React, { useState, useEffect } from "react";
import { Search } from "lucide-react";
import AppletBrokerContainer from "../container/AppletBrokerContainer";
import SearchGroupField from "../group/SearchGroupField";
import { useAppletData } from "@/context/AppletDataContext";
import { useGetorFetchRecords } from "@/app/entities/hooks/records/useGetOrFetch";
import { ALL_BROKER_IDS } from "../../../../sample-mock-data/constants";

interface DesktopAppletUserInputBarProps {
    appName: string;
}

const DesktopAppletUserInputBar: React.FC<DesktopAppletUserInputBarProps> = ({ appName }) => {
    const { activeTab, customAppConfig: config, submitButton, appletDefinition } = useAppletData();
    const [activeFieldId, setActiveFieldId] = useState<string | null>(null);

    const dataBrokers = useGetorFetchRecords("dataBroker", ALL_BROKER_IDS);

    useEffect(() => {
        setActiveFieldId(null);
    }, [activeTab]);

    const searchButtonWithMargin = (
        <div className="ml-2">
            {submitButton}
        </div>
    );

    return (
        <div className="w-full p-4">
            <AppletBrokerContainer
                activeFieldId={activeFieldId}
                onActiveFieldChange={setActiveFieldId}
                actionButton={searchButtonWithMargin}
                className="mx-auto max-w-4xl rounded-full"
            >
                {appletDefinition.map((group, index) => (
                    <SearchGroupField
                        key={group.id}
                        id={group.id}
                        label={group.label}
                        placeholder={group.placeholder}
                        description={group.description}
                        fields={group.fields}
                        isActive={activeFieldId === group.id}
                        onClick={() => {}} // Managed by Broker Container
                        onOpenChange={() => {}} // Managed by Broker Container
                        isLast={index === appletDefinition.length - 1}
                        isMobile={false}
                    />
                ))}
            </AppletBrokerContainer>
        </div>
    );
};

export default DesktopAppletUserInputBar;